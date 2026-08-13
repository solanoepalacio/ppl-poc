import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  normalizeClientPhone,
  type WhatsappHandoff as WhatsappHandoffSummary,
} from '@pannico/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LinksService } from '../links/links.service';
import { WhatsappConfigService } from './whatsapp.config';

/**
 * Several messages from one sender inside this window are answered once. Long
 * enough to absorb "hola" / "quiero pedir" / "?" typed in a row, short enough
 * that a customer who comes back later is not ignored.
 */
const SUPPRESSION_MS = 90_000;

/**
 * How long a handover to a person survives **without the customer writing**. Not
 * a span from when it began: every further message pushes it forward, because a
 * conversation with a person outlasts anything worth hard-coding here and one
 * that ended on a clock would have the agent start answering in the middle of it.
 * Silence is what says the conversation is over.
 *
 * Three minutes is a testing value; the real one is longer, and raising it costs
 * nothing but a longer tail of silence after a conversation ends.
 */
const HANDOFF_IDLE_MS = 3 * 60_000;

/** The reply choices the link message offers, by the id they come back as. */
const BUTTON = { advisor: 'hablar_asesor', orderSent: 'pedido_enviado' } as const;

/** The minimum shape we read out of a delivery; Meta sends a great deal more. */
type InboundMessage = { wamid: string; from: string; buttonId?: string };

/** What acting on a delivery did, for the log and for the tests. */
export type InboundOutcome =
  | { kind: 'ignored'; reason: string }
  | { kind: 'suppressed' }
  | { kind: 'handed-over'; extended: boolean }
  | { kind: 'order-sent' }
  | { kind: 'unknown-sender' }
  | { kind: 'replied'; clientName: string; reused: boolean };

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger('WhatsappAgent');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: WhatsappConfigService,
    private readonly links: LinksService,
  ) {}

  /**
   * Verifies Meta's signature over the **raw** body.
   *
   * The raw bytes matter: a signature checked against a re-serialised payload
   * proves only that we can re-serialise, since any difference in key order or
   * whitespace changes the digest. Compared in constant time — a fast reject on
   * the first wrong byte is a way to learn the secret one byte at a time.
   */
  verifySignature(rawBody: Buffer, header: string | undefined): boolean {
    if (!header?.startsWith('sha256=')) return false;
    const expected = createHmac('sha256', this.config.require().appSecret)
      .update(rawBody)
      .digest();
    let given: Buffer;
    try {
      given = Buffer.from(header.slice('sha256='.length), 'hex');
    } catch {
      return false;
    }
    // timingSafeEqual throws on a length mismatch, which is itself a leak-free
    // reject — but it has to be caught rather than thrown at the caller.
    return given.length === expected.length && timingSafeEqual(given, expected);
  }

  /** Echoes the challenge only when the verify token is the configured one. */
  verifyChallenge(mode?: string, token?: string, challenge?: string): string | null {
    if (mode !== 'subscribe' || !challenge) return null;
    const expected = this.config.require().verifyToken;
    return token === expected ? challenge : null;
  }

  /**
   * Pulls the inbound messages out of a delivery, ignoring everything else.
   *
   * A delivery carries `messages` (what a customer sent) or `statuses` (what
   * became of a message *we* sent) on the same webhook. Reading a status as an
   * inbound message is the loop where every reply provokes another reply.
   */
  extractMessages(payload: unknown): InboundMessage[] {
    const out: InboundMessage[] = [];
    const entries = (payload as { entry?: unknown[] })?.entry;
    if (!Array.isArray(entries)) return out;
    for (const entry of entries) {
      const changes = (entry as { changes?: unknown[] })?.changes;
      if (!Array.isArray(changes)) continue;
      for (const change of changes) {
        const value = (change as { value?: Record<string, unknown> })?.value;
        // `statuses` present means this is about our own messages: skip it
        // outright rather than hoping `messages` is absent.
        if (!value || Array.isArray(value.statuses)) continue;
        const messages = value.messages;
        if (!Array.isArray(messages)) continue;
        for (const m of messages) {
          const msg = (m ?? {}) as {
            id?: string;
            from?: string;
            interactive?: { button_reply?: { id?: string } };
          };
          const { id, from } = msg;
          if (typeof id === 'string' && typeof from === 'string') {
            // A tapped choice arrives as an interactive message rather than
            // text, carrying the id we gave the button.
            const buttonId = msg.interactive?.button_reply?.id;
            out.push({
              wamid: id,
              from,
              ...(typeof buttonId === 'string' ? { buttonId } : {}),
            });
          }
        }
      }
    }
    return out;
  }

  /**
   * Acts on one inbound message.
   *
   * Never throws: the caller must acknowledge the delivery whatever happens, and
   * a rejection would only make Meta redeliver the same message for a week.
   */
  async handleMessage(message: InboundMessage): Promise<InboundOutcome> {
    const { wamid, from } = message;
    // The sender's canonical identity — and what everything downstream uses,
    // replies included.
    //
    // Replying to the raw `from` looks more correct (it is the id the platform
    // reported) but fails for Argentine numbers: the platform reports the sender
    // *with* the mobile `9` and keeps its recipient allow-list *without* it, so a
    // reply addressed to the raw value is rejected as a recipient that is not on
    // the list. Meta's own console sends to the form without the 9. Observed
    // against a real number: `5493814493148` inbound, `543814493148` accepted.
    const sender = normalizeClientPhone(from) ?? from;

    // Claim the message before doing anything. The primary key is what makes a
    // redelivery — or two deliveries racing — a no-op rather than a second link.
    try {
      await this.prisma.whatsappInbound.create({ data: { wamid, from: sender } });
    } catch {
      return { kind: 'ignored', reason: 'ya procesado' };
    }

    // Checked before anything else the agent might say. While a person has the
    // conversation, every message from this customer does exactly one thing:
    // push the handover further out. Nothing is sent, nothing is created.
    if (await this.extendHandoffIfActive(sender)) {
      return { kind: 'handed-over', extended: true };
    }

    if (message.buttonId === BUTTON.advisor) {
      await this.startHandoff(sender);
      // The acknowledgement is the last thing the agent says. Without it the
      // customer cannot tell being handed over from not having been heard.
      if (await this.send(sender, ADVISOR_ACK_TEXT)) await this.markReplied(wamid);
      return { kind: 'handed-over', extended: false };
    }

    if (message.buttonId === BUTTON.orderSent) {
      // Doing nothing is implemented rather than assumed: left to fall through,
      // this would be answered with another link, which is the opposite.
      return { kind: 'order-sent' };
    }

    if (await this.recentlyReplied(sender)) {
      return { kind: 'suppressed' };
    }

    const client = await this.prisma.client.findFirst({
      where: { phone: sender, active: true },
      select: { id: true, name: true },
    });

    if (!client) {
      if (await this.send(sender, UNKNOWN_SENDER_TEXT)) await this.markReplied(wamid);
      return { kind: 'unknown-sender' };
    }

    const { url, reused } = await this.links.linkForAgent(client.id);
    // Only a reply that actually went out marks the message replied. A failed
    // send that counted would suppress the customer's next message too, turning
    // one lost reply into silence for the whole window — exactly when they are
    // most likely to try again.
    if (await this.sendWithChoices(sender, orderText(client.name, url))) {
      await this.markReplied(wamid);
    }
    return { kind: 'replied', clientName: client.name, reused };
  }

  /**
   * Pushes an active handover forward and reports whether there was one.
   *
   * The deadline is recomputed from *now* rather than added to what was there,
   * so the handover always outlives the conversation by the same idle period
   * however long the conversation runs.
   */
  private async extendHandoffIfActive(sender: string): Promise<boolean> {
    const active = await this.prisma.whatsappHandoff.findFirst({
      where: { sender, expiresAt: { gt: new Date() } },
      select: { sender: true },
    });
    if (!active) return false;
    await this.prisma.whatsappHandoff.update({
      where: { sender },
      data: { expiresAt: new Date(Date.now() + HANDOFF_IDLE_MS) },
    });
    return true;
  }

  /** Starts or restarts a handover. An expired row is reused rather than left. */
  private async startHandoff(sender: string): Promise<void> {
    const expiresAt = new Date(Date.now() + HANDOFF_IDLE_MS);
    await this.prisma.whatsappHandoff.upsert({
      where: { sender },
      create: { sender, expiresAt },
      update: { expiresAt, startedAt: new Date() },
    });
  }

  /**
   * Sends the customer back what they just confirmed.
   *
   * Fire-and-forget by signature: it takes the order id and returns nothing, so
   * the order path cannot accidentally come to depend on it. Everything is
   * caught here — a confirmation that already happened must not be reported as a
   * failure because a courtesy message did not go out.
   *
   * The 24-hour service window governs this like any other free-form message,
   * and it is the reason this will not always arrive: a customer who reached the
   * form through a link the bakery pasted by hand has never written to the
   * number, so there is no window open to answer into and Meta refuses it. The
   * order is unaffected — only the receipt is.
   */
  orderConfirmed(orderId: string): void {
    void this.sendOrderSummary(orderId).catch((e: unknown) => {
      this.logger.error(
        `Summary for ${orderId} failed: ${e instanceof Error ? e.message : String(e)}`,
      );
    });
  }

  private async sendOrderSummary(orderId: string): Promise<void> {
    if (!this.config.enabled) return;
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        client: { select: { name: true, phone: true } },
        // Insertion order, which is the order the customer entered the products
        // in: ids are time-ordered, and the items are created in one go from the
        // list the form submitted. The summary therefore reads back the way it
        // read on screen rather than re-sorting it.
        items: {
          orderBy: { id: 'asc' },
          select: { quantity: true, product: { select: { name: true } } },
        },
      },
    });
    // No phone is not a failure: a client can be in the directory without one,
    // and there is simply nowhere to send this.
    if (!order?.client.phone || order.items.length === 0) return;
    await this.send(
      order.client.phone,
      orderSummaryText(
        order.client.name,
        order.items.map((i) => `${i.product.name} x ${i.quantity}`),
      ),
    );
  }

  /**
   * The conversations a person is currently handling, newest activity first.
   *
   * Ordering by the deadline *is* ordering by activity: every row's deadline is
   * its last message plus the same idle period, so the two sort identically.
   *
   * The client lookup is for a label and nothing else, so a retired client still
   * lends its name — knowing who the number belongs to is the point, and being
   * retired does not make the conversation anonymous. A number matching nobody
   * keeps its place in the list under its own number, since a conversation with
   * somebody the directory does not know is the likeliest one to need a person.
   */
  async listHandoffs(): Promise<WhatsappHandoffSummary[]> {
    const rows = await this.prisma.whatsappHandoff.findMany({
      where: { expiresAt: { gt: new Date() } },
      orderBy: { expiresAt: 'desc' },
    });
    if (rows.length === 0) return [];
    const clients = await this.prisma.client.findMany({
      where: { phone: { in: rows.map((r) => r.sender) } },
      select: { phone: true, name: true },
    });
    const names = new Map(clients.map((c) => [c.phone, c.name]));
    return rows.map((r) => ({
      sender: r.sender,
      clientName: names.get(r.sender) ?? null,
      startedAt: r.startedAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
    }));
  }

  /**
   * Ends one conversation by sender, reporting whether there was one to end.
   *
   * The row goes whether or not it had lapsed — a lapsed one is dead weight — but
   * only a live one counts as having been ended. Answering `false` for one that
   * was already gone is the honest report: the caller asked to change something
   * that had already changed.
   *
   * The customer is told the advisory is over — only when there was one to end,
   * so somebody who is not in a conversation is never informed that theirs
   * finished. Best-effort like every other send: a message that cannot be
   * delivered does not undo the ending, which has already happened.
   *
   * The suppression window goes with it. It is measured from the last reply that
   * went out, and the last reply was the handover's own acknowledgement — so
   * without this the customer keeps meeting silence for up to a minute and a half
   * after the conversation was handed back, which is the very thing ending it was
   * meant to stop. Clearing the flag does not weaken the dedupe: that turns on the
   * message id existing, not on this.
   */
  async endHandoff(sender: string): Promise<boolean> {
    const active = await this.prisma.whatsappHandoff.findFirst({
      where: { sender, expiresAt: { gt: new Date() } },
      select: { sender: true },
    });
    await this.prisma.whatsappHandoff.deleteMany({ where: { sender } });
    // Unconditional, like the delete: whoever asked wants this customer back with
    // the agent, and that is true whether or not the handover was still holding.
    await this.prisma.whatsappInbound.updateMany({
      where: { from: sender, replied: true },
      data: { replied: false },
    });
    // Sent last, after the state is already what it says it is: the notice
    // describes something that has happened, not something being attempted. It
    // deliberately does not count as a reply — the suppression was just cleared
    // so the customer can write back at once, and marking this would put it
    // straight back.
    if (active) await this.send(sender, HANDOFF_END_TEXT);
    return active !== null;
  }

  /** True when this sender was answered inside the window. Keyed on the canonical
   * identity, so the same person reaching us in two shapes is still one sender. */
  private async recentlyReplied(from: string): Promise<boolean> {
    const since = new Date(Date.now() - SUPPRESSION_MS);
    const recent = await this.prisma.whatsappInbound.findFirst({
      where: { from, replied: true, receivedAt: { gte: since } },
      select: { wamid: true },
    });
    return recent !== null;
  }

  private async markReplied(wamid: string): Promise<void> {
    await this.prisma.whatsappInbound.update({
      where: { wamid },
      data: { replied: true },
    });
  }

  /**
   * Sends a free-form text reply.
   *
   * Free-form rather than a template because the customer messaged first, which
   * opens the 24-hour service window: inside it this needs no approval and costs
   * nothing.
   *
   * Best-effort by design. A failure here must not undo the order that was just
   * created — the link still works and the manager can share it by hand — so it
   * is logged and swallowed. Reports whether it went out, which is what decides
   * if the message counts as replied.
   */
  private async send(to: string, body: string): Promise<boolean> {
    return this.post(to, { type: 'text', text: { body } });
  }

  /**
   * The link message, with the two choices the customer can tap.
   *
   * The link itself stays in the body: a reply choice returns an id, it does not
   * open a URL, so the two cannot be the same control.
   */
  private async sendWithChoices(to: string, body: string): Promise<boolean> {
    return this.post(to, {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: body },
        action: {
          buttons: [
            { type: 'reply', reply: { id: BUTTON.advisor, title: 'Hablar con un asesor' } },
            { type: 'reply', reply: { id: BUTTON.orderSent, title: 'Pedido enviado' } },
          ],
        },
      },
    });
  }

  private async post(to: string, payload: Record<string, unknown>): Promise<boolean> {
    const { graphBaseUrl, phoneNumberId, accessToken } = this.config.require();
    try {
      const res = await fetch(`${graphBaseUrl}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, ...payload }),
      });
      if (!res.ok) {
        // Meta's body carries the reason; it holds no credential of ours.
        this.logger.error(
          `Reply to ${redact(to)} rejected (${res.status}): ${(await res.text()).slice(0, 300)}`,
        );
        return false;
      }
      return true;
    } catch (e) {
      this.logger.error(
        `Reply to ${redact(to)} failed: ${e instanceof Error ? e.message : String(e)}`,
      );
      return false;
    }
  }
}

/** Provisional copy, to be reworded. */
const ADVISOR_ACK_TEXT =
  'Listo, una persona te responderá en un momento. Gracias';

/** Provisional copy, to be reworded. */
const HANDOFF_END_TEXT = 'Fin de asesoría.';

/** Provisional copy, to be reworded. */
const UNKNOWN_SENDER_TEXT =
  'Hola! No tenemos este número registrado. Dejanos tu pedido por acá y una persona lo va a tomar.';

/**
 * Provisional copy, to be reworded.
 *
 * One product per line rather than a sentence: this is read to be checked
 * against what the customer meant to order, and a list is checked line by line
 * while a paragraph has to be parsed.
 */
const orderSummaryText = (name: string, lines: string[]) =>
  `${name}, recibimos tu pedido:\n\n${lines.join('\n')}\n\n¡Gracias!`;

const orderText = (name: string, url: string) =>
  `Hola ${name}! Hacé tu pedido acá: ${url} — válido para el bloque actual`;

/** Keeps a customer's full number out of the logs. */
const redact = (phone: string) => `…${phone.slice(-4)}`;

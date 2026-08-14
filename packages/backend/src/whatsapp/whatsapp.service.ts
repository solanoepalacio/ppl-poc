import { Injectable, Logger } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { normalizeClientPhone } from '@pannico/shared';
import { PrismaService } from '../prisma/prisma.service';
import { LinksService } from '../links/links.service';
import {
  OrderIntentClassifier,
  type AbstainReason,
  type OrderIntentVerdict,
} from '../intent/order-intent.classifier';
import { WhatsappConfigService } from './whatsapp.config';

/**
 * Several messages from one sender inside this window are answered once. Long
 * enough to absorb "hola" / "quiero pedir" / "?" typed in a row, short enough
 * that a customer who comes back later is not ignored.
 */
const SUPPRESSION_MS = 90_000;

/**
 * Meta's service window: how long after a customer's own message we may still
 * send them free-form text. Fixed by the platform, not by us — outside it a
 * free-form send is rejected rather than delivered, and only an approved
 * template would go through.
 *
 * Shaved by a minute so a send started right at the boundary is not racing the
 * clock on Meta's side.
 */
const SERVICE_WINDOW_MS = 24 * 60 * 60 * 1000 - 60_000;

/**
 * Waits between attempts at the order recap, and how many attempts there are.
 *
 * The recap is not a courtesy. It is the customer's only evidence that the order
 * they just placed exists: the form's success screen closes with the window, and
 * what remains is a chat in which they said something and nothing came back.
 * Customers have said as much — they did not believe the order had gone through
 * because no message arrived. A dropped send is therefore a customer who thinks
 * the bakery has no record of them, and is liable to order again or ring up.
 *
 * The send is already off the customer's request path, so the time is free to
 * them; the schedule is bounded instead by how long a confirmation can arrive and
 * still be read as a confirmation rather than as a puzzle. Last attempt lands
 * around 26 seconds in, while they are still holding the phone.
 */
const RECAP_BACKOFF_MS = [1_000, 5_000, 20_000] as const;

/** How a send attempt ended, in the only terms retrying cares about. */
type SendOutcome =
  | { ok: true }
  | { ok: false; retryable: boolean; why: string };

/**
 * The minimum shape we read out of a delivery; Meta sends a great deal more.
 *
 * `type` and `text` are what the classifier needs. `text` is absent for every
 * message kind that carries none — audio, image, sticker, location, a reaction —
 * and that absence is the whole signal: those are not classified at all.
 */
export type InboundMessage = {
  wamid: string;
  from: string;
  type: string;
  text?: string;
};

/**
 * An inbound message as it was recorded, which is the form the rest of the flow
 * works in.
 *
 * `from` is the sender's canonical identity rather than the raw value Meta
 * reported — settled once, at intake, so nothing downstream has to remember to
 * normalise it again. `type` is gone: it existed only to decide whether there
 * was any text to read, and by here that question is answered.
 */
export type RecordedMessage = {
  wamid: string;
  from: string;
  text?: string;
};

/**
 * What intake made of one message.
 *
 * `duplicate` is an ordinary outcome rather than a failure: Meta redelivers a
 * message until it is acknowledged, so seeing the same one twice is the system
 * working. Failing to record at all is the exceptional case, and it is raised
 * rather than returned — there is nothing here to report about a message we do
 * not have.
 */
export type IntakeOutcome =
  | { kind: 'recorded'; message: RecordedMessage }
  | { kind: 'duplicate' };

/**
 * The message-shaped half of a Graph send — everything but the envelope
 * (`messaging_product`, `to`), which `send` fills in.
 *
 * Split out so the two replies can differ in kind without duplicating the
 * request: the order reply is an interactive button, the courtesy reply is
 * plain text because it has no link to put on a button.
 */
type OutboundMessage =
  | { type: 'text'; text: { body: string } }
  | {
      type: 'interactive';
      interactive: {
        type: 'cta_url';
        body: { text: string };
        action: {
          name: 'cta_url';
          parameters: { display_text: string; url: string };
        };
      };
    };

/**
 * What acting on a delivery did, for the log and for the tests.
 *
 * `not-order` and `abstain` are both silence to the customer and both end the
 * flow the same way, but they are kept apart here for the same reason they are
 * kept apart in the trace: one is the classifier working and the other is it
 * failing, and nothing else in the system can tell you which happened.
 */
export type InboundOutcome =
  | { kind: 'agent-disabled' }
  | { kind: 'suppressed' }
  | { kind: 'unknown-sender' }
  | { kind: 'not-order'; clientName: string }
  | { kind: 'abstain'; clientName: string; reason: AbstainReason }
  | { kind: 'replied'; clientName: string; reused: boolean };

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger('WhatsappAgent');

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: WhatsappConfigService,
    private readonly links: LinksService,
    private readonly intent: OrderIntentClassifier,
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
          const { id, from, type, text } = (m ?? {}) as {
            id?: string;
            from?: string;
            type?: string;
            text?: { body?: string };
          };
          if (typeof id === 'string' && typeof from === 'string') {
            out.push({
              wamid: id,
              from,
              // Meta always sends a type; defaulting keeps a malformed delivery
              // out of the "text" path rather than into it.
              type: typeof type === 'string' ? type : 'unknown',
              // Only a text message has a body. Anything else is left undefined,
              // which is what makes it unclassifiable further down.
              text:
                type === 'text' && typeof text?.body === 'string'
                  ? text.body
                  : undefined,
            });
          }
        }
      }
    }
    return out;
  }

  /**
   * The first half of handling a delivery: remember the message, and say
   * whether it is one we have already seen.
   *
   * Split from `processMessage` and run *before* the webhook is acknowledged,
   * because this is the only part whose failure Meta can do anything about.
   * Everything after this point is recoverable from the row — the verdict, the
   * link, the reply are all things a later pass could redo — and nothing after
   * this point is recoverable without it. It is a read and an insert, so the
   * acknowledgement stays prompt.
   *
   * Deduplication is the row's existence, checked and then enforced: `wamid` is
   * the primary key, so two deliveries racing collapse into one and the loser
   * learns it from the constraint rather than from a check that went stale
   * between reading and writing.
   *
   * The text is stored here rather than alongside the verdict, so a message
   * whose processing crashes is still readable afterwards. It is what the
   * classifier was given, which is the only version worth keeping when a verdict
   * later looks wrong.
   *
   * Raises when the row could not be written at all — see the webhook, which
   * turns that into the one delivery it does not acknowledge.
   */
  async recordMessage(message: InboundMessage): Promise<IntakeOutcome> {
    const { wamid, text } = message;
    // The sender's canonical identity — and what everything downstream uses,
    // replies included.
    //
    // Replying to the raw `from` looks more correct (it is the id the platform
    // reported) but fails for Argentine numbers: the platform reports the sender
    // *with* the mobile `9` and keeps its recipient allow-list *without* it, so a
    // reply addressed to the raw value is rejected as a recipient that is not on
    // the list. Meta's own console sends to the form without the 9. Observed
    // against a real number: `5493814493148` inbound, `543814493148` accepted.
    const from = normalizeClientPhone(message.from) ?? message.from;

    const seen = await this.prisma.whatsappInbound.findUnique({
      where: { wamid },
      select: { wamid: true },
    });
    if (seen) return { kind: 'duplicate' };

    try {
      await this.prisma.whatsappInbound.create({
        data: { wamid, from, text: text ?? null },
      });
    } catch (e) {
      // The other delivery of the same message got there between the read above
      // and this write. Same answer as having found it.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        return { kind: 'duplicate' };
      }
      // Anything else means we have no row, which is a different thing entirely
      // and is not for this method to swallow.
      throw e;
    }

    return { kind: 'recorded', message: { wamid, from, text } };
  }

  /**
   * The second half: act on a message that is already recorded.
   *
   * Runs after the delivery has been acknowledged, so nothing here is on Meta's
   * clock — which matters because it calls a language model, whose latency is
   * neither bounded by nor visible to them.
   *
   * Failures raise, and the caller logs them; by then there is no response left
   * to fail and no redelivery they could provoke. What they leave behind is a
   * row with text and no verdict on it, which is the shape a later rescue would
   * look for.
   */
  async processMessage(message: RecordedMessage): Promise<InboundOutcome> {
    const { wamid, from, text } = message;

    // With the agent switched off the webhook does nothing but remember. Before
    // the suppression check and before the client lookup, because none of those
    // questions have an answer worth having when nothing is going to be sent
    // either way — and *nothing* is sent, the courtesy reply to an unknown
    // number included. The number reads as the plain staffed inbox it was.
    //
    // The row is still written, with the reason on it, so a message that arrived
    // while the agent was off is not indistinguishable from one it read and
    // decided against.
    if (!this.intent.enabled) {
      await this.recordVerdict(wamid, {
        intent: 'abstain',
        reason: 'agent-disabled',
      });
      return { kind: 'agent-disabled' };
    }

    if (await this.recentlyReplied(from)) {
      return { kind: 'suppressed' };
    }

    const client = await this.prisma.client.findFirst({
      where: { phone: from, active: true },
      select: { id: true, name: true },
    });

    if (!client) {
      if (await this.send(from, UNKNOWN_SENDER_MESSAGE)) await this.markReplied(wamid);
      return { kind: 'unknown-sender' };
    }

    // The decision point: between knowing *who* wrote and doing anything about
    // it. A link is created only for a message that asks for one — every other
    // verdict ends the flow here, before `linkForAgent` is reached, so nothing
    // is created and nothing is sent.
    //
    // Fail-closed, and deliberately: this number is a staffed inbox, so a
    // message the agent does not answer is a message a person answers — the same
    // outcome the bakery had before any of this existed. Guessing the other way
    // puts a link in front of somebody who was not ordering and burns their slot
    // for the bloque, which nobody reading the thread afterwards can take back.
    const verdict = await this.intent.classify(text);
    await this.recordVerdict(wamid, verdict);
    if (verdict.intent === 'abstain') {
      return { kind: 'abstain', clientName: client.name, reason: verdict.reason };
    }
    if (verdict.intent === 'not-order') {
      return { kind: 'not-order', clientName: client.name };
    }

    const { url, reused } = await this.links.linkForAgent(client.id);
    // Only a reply that actually went out marks the message replied. A failed
    // send that counted would suppress the customer's next message too, turning
    // one lost reply into silence for the whole window — exactly when they are
    // most likely to try again.
    //
    // The same rule is what leaves an *unanswered* message consuming nothing:
    // the verdicts above return without reaching this, so the window is never
    // armed by a message we chose not to answer. A customer who says "gracias"
    // and then asks to order ten seconds later is served immediately.
    if (await this.send(from, orderMessage(url))) {
      await this.markReplied(wamid);
    }
    return { kind: 'replied', clientName: client.name, reused };
  }

  /**
   * Sends the customer a recap of the order they just confirmed, so the order
   * they placed is readable in the conversation it started in.
   *
   * Conditional on the **service window**. A free-form message is only permitted
   * inside the 24 hours opened by the customer's own inbound message, and a
   * back-office-generated link goes to customers who may never have messaged us
   * at all — a recap to one of those would be rejected by Meta, which is a failed
   * send in the logs rather than a silent no-op. So there is a check, and finding
   * no recent inbound is the expected case: nothing is sent, and nothing is
   * recorded as a failure.
   *
   * Best-effort with respect to the order, like every other send here: the order
   * is already confirmed and committed by the time this runs, and nothing this
   * method does can undo that.
   */
  async sendOrderConfirmation(orderId: string): Promise<void> {
    if (!this.config.enabled) return;

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        client: { select: { phone: true } },
        items: {
          orderBy: { id: 'asc' },
          select: { quantity: true, product: { select: { name: true } } },
        },
      },
    });
    // A client with no number cannot be messaged, and an order with no items is
    // not a recap worth sending.
    const phone = order?.client.phone;
    if (!phone || !order?.items.length) {
      this.logger.log(
        `Order ${orderId} confirmed with no recap: ${
          phone ? 'the order has no items' : 'the client has no number on file'
        }.`,
      );
      return;
    }

    if (!(await this.withinServiceWindow(phone))) {
      // Not a failure — a link the manager generated by hand goes to somebody who
      // may never have written to us, and Meta would refuse a free-form message
      // to them. Said out loud all the same, because the customer's experience is
      // identical to a recap that failed: they confirmed an order and heard
      // nothing. If those are the complaints, this line is where they show up,
      // and no amount of retrying is the fix.
      this.logger.log(
        `Order ${orderId} confirmed with no recap: ${redact(phone)} has not written ` +
          'inside the service window, so a free-form message is not permitted.',
      );
      return;
    }

    const delivered = await this.send(
      phone,
      orderRecapMessage(order.items),
      RECAP_BACKOFF_MS,
    );
    if (!delivered) {
      // Named apart from the send's own failure line, and carrying the order id,
      // because this is the one worth acting on: an order exists that its
      // customer has no evidence of. Somebody reading this can tell them.
      this.logger.error(
        `Order ${orderId} was confirmed but its recap never reached ${redact(phone)}. ` +
          'The customer has no confirmation of an order the bakery does have.',
      );
    }
  }

  /**
   * Whether this number has written to us recently enough that a free-form reply
   * is still permitted.
   *
   * Reads `WhatsappInbound`, which already records `from` and `receivedAt` for
   * every message — so this is a query against a table we keep rather than new
   * state. Note it looks at *every* inbound message, replied or not: the window
   * is opened by the customer writing, which happens whether or not we answered.
   */
  private async withinServiceWindow(phone: string): Promise<boolean> {
    const since = new Date(Date.now() - SERVICE_WINDOW_MS);
    const recent = await this.prisma.whatsappInbound.findFirst({
      where: { from: phone, receivedAt: { gte: since } },
      select: { wamid: true },
    });
    return recent !== null;
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
   * Writes the verdict onto the claimed row.
   *
   * The abstain reason is the point of this. `not-order` and `abstain` end the
   * flow identically and are identical in the chat, so without the reason beside
   * the verdict there is nothing that distinguishes an afternoon of the
   * classifier working from an afternoon of the model being unreachable — both
   * read as an agent that went quiet.
   *
   * Cleared rather than left alone for a decided verdict, so the column cannot
   * carry a stale reason from a row it does not apply to.
   */
  private async recordVerdict(
    wamid: string,
    verdict: OrderIntentVerdict,
  ): Promise<void> {
    await this.prisma.whatsappInbound.update({
      where: { wamid },
      data: {
        intent: verdict.intent,
        abstainReason: verdict.intent === 'abstain' ? verdict.reason : null,
      },
    });
  }

  /**
   * Sends a free-form reply.
   *
   * Free-form rather than a template because the customer messaged first, which
   * opens the 24-hour service window: inside it this needs no approval and costs
   * nothing. That holds for the interactive reply too — `cta_url` is a service
   * message like any other, not a template, so it needs no prior approval.
   *
   * Best-effort by design. A failure here must not undo the order that was just
   * created — the link still works and the manager can share it by hand — so it
   * is logged and swallowed. Reports whether it went out, which is what decides
   * if the message counts as replied.
   */
  private async send(
    to: string,
    message: OutboundMessage,
    backoffMs: readonly number[] = [],
  ): Promise<boolean> {
    for (let attempt = 0; ; attempt++) {
      const outcome = await this.attemptSend(to, message);
      if (outcome.ok) {
        if (attempt > 0) {
          this.logger.log(
            `Message to ${redact(to)} delivered on attempt ${attempt + 1}.`,
          );
        }
        return true;
      }

      const last = !outcome.retryable || attempt >= backoffMs.length;
      if (last) {
        this.logger.error(
          `Message to ${redact(to)} failed after ${attempt + 1} attempt(s)` +
            `${outcome.retryable ? ' (retries exhausted)' : ' (not retryable)'}: ${outcome.why}`,
        );
        return false;
      }

      const wait = backoffMs[attempt];
      this.logger.warn(
        `Message to ${redact(to)} failed (${outcome.why}); retrying in ${wait} ms.`,
      );
      await delay(wait);
    }
  }

  /**
   * One attempt, classified by whether repeating it could plausibly help.
   *
   * Status alone is not enough for Meta: its rate limits come back as **400**,
   * not 429, so reading them off the HTTP status would put the one failure that
   * is certain to pass later in the bucket that is never retried.
   */
  private async attemptSend(
    to: string,
    message: OutboundMessage,
  ): Promise<SendOutcome> {
    const { graphBaseUrl, phoneNumberId, accessToken } = this.config.require();
    try {
      const res = await fetch(`${graphBaseUrl}/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to,
          ...message,
        }),
      });
      if (res.ok) return { ok: true };

      // Meta's body carries the reason; it holds no credential of ours.
      const body = (await res.text()).slice(0, 300);
      return {
        ok: false,
        retryable: isRetryable(res.status, body),
        why: `rejected (${res.status}): ${body}`,
      };
    } catch (e) {
      // Never got an answer — a dropped connection, DNS, a reset. The one case
      // retrying exists for.
      return {
        ok: false,
        retryable: true,
        why: e instanceof Error ? e.message : String(e),
      };
    }
  }
}

/** Provisional copy, to be reworded. Plain text: there is no link to put on a
 * button, and an interactive message without one is not a thing. */
const UNKNOWN_SENDER_MESSAGE: OutboundMessage = {
  type: 'text',
  text: {
    body: 'Hola! No tenemos este número registrado. Dejanos tu pedido por acá y una persona lo va a tomar.',
  },
};

/**
 * The order reply, as a call-to-action button rather than a bare URL.
 *
 * `display_text` is capped at 20 characters by Meta and the body at 1024; the
 * copy below is well inside both, but any rewording has to stay there or the
 * send is rejected outright.
 *
 * Whether tapping this opens WhatsApp's in-app browser or the phone's default
 * one is **not** decided here — there is no flag for it. Meta gates that on the
 * sending number's messaging tier (≥1,000 business-initiated conversations/day)
 * and on the message kind, and their partner docs disagree about whether
 * free-form interactive messages qualify yet or only template CTA buttons do.
 * Below the tier this will simply open the default browser, which tells us
 * nothing either way.
 */
const orderMessage = (url: string): OutboundMessage => ({
  type: 'interactive',
  interactive: {
    type: 'cta_url',
    body: { text: ORDER_INVITATION },
    action: {
      name: 'cta_url',
      parameters: { display_text: 'Hacer mi pedido', url },
    },
  },
});

/**
 * What the message says, and why each line is in it.
 *
 * It **declares itself an agent** in the first line. This message is the first
 * thing an automated system says in a thread the customer believes is staffed by
 * the bakery, and letting them assume a person read their message and made this
 * judgement would be the wrong kind of quiet.
 *
 * It **names what it inferred** — that they want to order — because the whole
 * message rests on a guess, and a guess the reader can see is one they can
 * correct.
 *
 * It **promises the recap**, which is safe to promise here and only here: this
 * message is a reply to a message the customer just sent, so their own 24-hour
 * service window is open and a free-form recap will be permitted when they
 * confirm. The same sentence on a manager-generated link would be a promise the
 * service window does not let us keep.
 *
 * It **offers a way out** in the last line. Silence is the fail-closed ending
 * everywhere else in this flow, so on the one path where the agent does speak up
 * uninvited, the customer is told that ignoring it costs them nothing and still
 * reaches a person. Without that, a wrong guess reads as a demand.
 *
 * No client name: it greets nobody in particular now, which also keeps a
 * misrouted message from confirming a name to whoever received it.
 */
const ORDER_INVITATION = [
  'Hola! 👋 Soy un agente de IA de Panico.',
  'He detectado que quieres hacer un pedido.',
  'Puedes hacerlo directamente presionando el botón abajo.',
  'Luego de confirmar el pedido te escribiré de nuevo confirmándote el pedido.',
  'Si no tenías intención de hacer un pedido, ignora este mensaje y un humano te contestará en cuanto pueda.',
].join('\n');

/**
 * The recap of a confirmed order.
 *
 * Templated Spanish, like every other outbound message here: the model
 * classifies and does not write, so nothing it produced can reach a customer.
 *
 * Itemised rather than a bare acknowledgement, because a recap the customer
 * cannot check against what they chose is not a receipt. Plain text rather than
 * interactive: there is no link to put on a button, and this one is read, not
 * acted on. Meta caps a text body at 4096 characters — an order long enough to
 * approach that is not a real order, but the list is capped anyway so a
 * pathological one degrades to a shorter message instead of a rejected send.
 */
const orderRecapMessage = (
  items: { quantity: number; product: { name: string } }[],
): OutboundMessage => {
  const shown = items.slice(0, RECAP_MAX_LINES);
  const lines = shown.map((i) => `• ${i.quantity} x ${i.product.name}`);
  if (items.length > shown.length) {
    lines.push(`• y ${items.length - shown.length} producto(s) más`);
  }
  return {
    type: 'text',
    text: {
      body: [
        '¡Listo! Recibimos tu pedido:',
        '',
        ...lines,
        '',
        'Si algo no está bien, escribinos por acá.',
      ].join('\n'),
    },
  };
};

/** See `orderRecapMessage`: a guard against Meta's 4096-character body cap, not
 * a product decision. */
const RECAP_MAX_LINES = 60;

/**
 * Meta error codes that mean "later, not never".
 *
 * They arrive as HTTP **400**, which is why the status cannot be the whole
 * answer: throttling is the failure most certain to succeed on a second attempt,
 * and reading it off the status alone would file it under never-retry.
 */
const RETRYABLE_META_CODES = [
  130429, // rate limit hit — the account's throughput cap
  131048, // spam rate limit hit
  131056, // pair rate limit — too many messages to this one number
  133016, // account temporarily locked from a restore
];

/**
 * Whether repeating this send could plausibly change the answer.
 *
 * Everything unrecognised is treated as permanent. Most 4xx here are a message
 * Meta will refuse identically however often it is sent — a recipient not on the
 * allow-list, a body over a limit, a service window that has closed — and
 * hammering those buys nothing and delays the log line that says so.
 */
function isRetryable(status: number, body: string): boolean {
  if (status >= 500 || status === 429) return true;
  if (status !== 400) return false;
  const code = (() => {
    try {
      return (JSON.parse(body) as { error?: { code?: unknown } })?.error?.code;
    } catch {
      // A 400 whose body is not the JSON we expect is not one we can read a
      // reason out of, so it is left permanent rather than guessed at.
      return undefined;
    }
  })();
  return typeof code === 'number' && RETRYABLE_META_CODES.includes(code);
}

const delay = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Keeps a customer's full number out of the logs. */
const redact = (phone: string) => `…${phone.slice(-4)}`;

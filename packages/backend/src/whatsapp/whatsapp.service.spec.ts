import { createHmac } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { WhatsappService } from './whatsapp.service';
import type { WhatsappConfigService } from './whatsapp.config';
import type { PrismaService } from '../prisma/prisma.service';
import type { LinksService } from '../links/links.service';
import type {
  AbstainReason,
  OrderIntentClassifier,
} from '../intent/order-intent.classifier';

const APP_SECRET = 'secreto-de-prueba';

const config = {
  enabled: true,
  require: () => ({
    verifyToken: 'token-de-verificacion',
    appSecret: APP_SECRET,
    accessToken: 'access-token',
    phoneNumberId: '111',
    graphBaseUrl: 'https://graph.test/v21.0',
  }),
} as unknown as WhatsappConfigService;

/** A delivery carrying one inbound text message. */
const inbound = (wamid: string, from: string, body = 'hola') => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: '111' },
            messages: [
              { id: wamid, from, timestamp: '1', type: 'text', text: { body } },
            ],
          },
        },
      ],
    },
  ],
});

/** A delivery carrying an inbound message that has no text at all. */
const inboundAudio = (wamid: string, from: string) => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            messages: [
              {
                id: wamid,
                from,
                timestamp: '1',
                type: 'audio',
                audio: { id: 'media.1', mime_type: 'audio/ogg' },
              },
            ],
          },
        },
      ],
    },
  ],
});

/** A delivery carrying a status update for a message *we* sent. */
const statusOnly = {
  object: 'whatsapp_business_account',
  entry: [
    {
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            statuses: [{ id: 'wamid.out', status: 'delivered', recipient_id: '54381' }],
          },
        },
      ],
    },
  ],
};

describe('WhatsappService', () => {
  let prisma: {
    whatsappInbound: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    client: { findFirst: jest.Mock };
    order: { findUnique: jest.Mock };
  };
  let links: { linkForAgent: jest.Mock };
  let intent: { classify: jest.Mock; enabled: boolean };
  let service: WhatsappService;
  let fetchMock: jest.Mock;

  /** The classifier decided this. Defaults to an order, since most cases here
   * are about what happens *after* a message has been recognised as one. */
  const classifiesAs = (
    verdict:
      | { intent: 'order' | 'not-order' }
      | { intent: 'abstain'; reason: AbstainReason },
  ) => intent.classify.mockResolvedValue(verdict);

  /** Whether the row was marked replied. The row is also updated to record the
   * verdict, so "update was never called" no longer means "no reply went out" —
   * only this does. */
  const markedReplied = () =>
    prisma.whatsappInbound.update.mock.calls.some(
      ([arg]) => (arg as { data?: { replied?: boolean } }).data?.replied === true,
    );

  /** A text message from a sender, as `extractMessages` would hand it over. */
  const delivered = (wamid: string, from: string, text = 'hola') => ({
    wamid,
    from,
    type: 'text',
    text,
  });

  /** The same message once recorded: canonical sender, and no `type` left to
   * read, since whether there was any text is settled by then. */
  const message = (wamid: string, from: string, text = 'hola') => ({
    wamid,
    from,
    text,
  });

  /** A recorded message that carried no text at all — a voice note, a sticker. */
  const textless = (wamid: string, from: string) => ({ wamid, from });

  /** A unique-constraint violation, as Prisma raises it. */
  const uniqueViolation = () =>
    new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: '5',
    });

  beforeEach(() => {
    prisma = {
      whatsappInbound: {
        create: jest.fn().mockResolvedValue({}),
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      client: { findFirst: jest.fn().mockResolvedValue(null) },
      order: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    links = {
      linkForAgent: jest
        .fn()
        .mockResolvedValue({ url: 'https://t.test/order/abc', reused: false }),
    };
    intent = { classify: jest.fn().mockResolvedValue({ intent: 'order' }), enabled: true };
    fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new WhatsappService(
      prisma as unknown as PrismaService,
      config,
      links as unknown as LinksService,
      intent as unknown as OrderIntentClassifier,
    );
  });

  describe('verifySignature', () => {
    const body = Buffer.from('{"hello":"world"}');
    const sign = (b: Buffer, secret = APP_SECRET) =>
      'sha256=' + createHmac('sha256', secret).update(b).digest('hex');

    it('accepts a signature over the exact bytes received', () => {
      expect(service.verifySignature(body, sign(body))).toBe(true);
    });

    it('rejects a signature made with another secret', () => {
      expect(service.verifySignature(body, sign(body, 'otro'))).toBe(false);
    });

    it('rejects when the body differs by a single byte', () => {
      // This is the whole point of signing the raw bytes: a re-serialised
      // payload that means the same thing does not carry the same digest.
      expect(service.verifySignature(Buffer.from('{"hello":"World"}'), sign(body))).toBe(false);
    });

    it('rejects a missing, unprefixed or malformed signature', () => {
      expect(service.verifySignature(body, undefined)).toBe(false);
      expect(service.verifySignature(body, 'deadbeef')).toBe(false);
      expect(service.verifySignature(body, 'sha256=zz')).toBe(false);
    });
  });

  describe('verifyChallenge', () => {
    it('echoes the challenge for the configured token', () => {
      expect(service.verifyChallenge('subscribe', 'token-de-verificacion', 'reto')).toBe('reto');
    });

    it('refuses to echo for a wrong token or mode', () => {
      expect(service.verifyChallenge('subscribe', 'otro', 'reto')).toBeNull();
      expect(service.verifyChallenge('unsubscribe', 'token-de-verificacion', 'reto')).toBeNull();
    });
  });

  describe('extractMessages', () => {
    it('reads the inbound messages out of a delivery', () => {
      expect(
        service.extractMessages(inbound('wamid.1', '543815551234', 'quiero pedir')),
      ).toEqual([
        {
          wamid: 'wamid.1',
          from: '543815551234',
          type: 'text',
          // The body comes through: it is what the classifier reads, and
          // without it every message would be unclassifiable.
          text: 'quiero pedir',
        },
      ]);
    });

    it('carries the type but no text for a message that has none', () => {
      // A voice note is not classified and is not transcribed; the missing text
      // is what says so.
      expect(service.extractMessages(inboundAudio('wamid.2', '543815551234'))).toEqual([
        { wamid: 'wamid.2', from: '543815551234', type: 'audio', text: undefined },
      ]);
    });

    it('ignores a delivery that carries only status updates', () => {
      // Statuses describe our own replies; reading one as inbound is the loop
      // where each reply provokes another.
      expect(service.extractMessages(statusOnly)).toEqual([]);
    });

    it('survives a payload of an unexpected shape', () => {
      for (const junk of [null, {}, { entry: 'no' }, { entry: [{}] }]) {
        expect(service.extractMessages(junk)).toEqual([]);
      }
    });
  });

  /**
   * Intake: the half that runs before the webhook is acknowledged. Everything
   * downstream of it can be redone from the row it writes; nothing downstream of
   * it can be redone without one, which is why this is the part Meta waits for.
   */
  describe('recordMessage', () => {
    it('records the message and hands it on to be acted on', async () => {
      const out = await service.recordMessage(
        delivered('w1', '543815551234', 'me mandás 3 docenas?'),
      );

      expect(prisma.whatsappInbound.create).toHaveBeenCalledWith({
        data: { wamid: 'w1', from: '543815551234', text: 'me mandás 3 docenas?' },
      });
      // The text is stored here, with the claim, rather than beside the verdict:
      // a message whose processing crashes is still readable afterwards, and it
      // is what the classifier was given.
      expect(out).toEqual({
        kind: 'recorded',
        message: { wamid: 'w1', from: '543815551234', text: 'me mandás 3 docenas?' },
      });
    });

    it('stores no text for a message that carries none', async () => {
      const out = await service.recordMessage({
        wamid: 'w1',
        from: '543815551234',
        type: 'audio',
      });

      expect(prisma.whatsappInbound.create.mock.calls[0][0].data.text).toBeNull();
      expect(out).toMatchObject({ message: { text: undefined } });
    });

    it('canonicalises the sender once, here', async () => {
      const out = await service.recordMessage(delivered('w1', '5493815551234'));

      // Stored canonical, and handed on canonical: the same person reaching us
      // with and without the Argentine 9 must not read as two senders, and
      // nothing downstream should have to remember to normalise again.
      expect(prisma.whatsappInbound.create.mock.calls[0][0].data.from).toBe('543815551234');
      expect(out).toMatchObject({ message: { from: '543815551234' } });
    });

    it('reports a message it already has as a duplicate', async () => {
      prisma.whatsappInbound.findUnique.mockResolvedValue({ wamid: 'w1' });

      const out = await service.recordMessage(delivered('w1', '543815551234'));

      // Meta redelivers until acknowledged, so this is the system working, not a
      // failure. Nothing is written and nothing is handed on to be acted on.
      expect(out).toEqual({ kind: 'duplicate' });
      expect(prisma.whatsappInbound.create).not.toHaveBeenCalled();
    });

    it('reports a delivery that lost the race as a duplicate too', async () => {
      // Two deliveries of the same message in flight: the read found nothing and
      // the write lost. The primary key is what settles it, not the read.
      prisma.whatsappInbound.create.mockRejectedValue(uniqueViolation());

      const out = await service.recordMessage(delivered('w1', '543815551234'));

      expect(out).toEqual({ kind: 'duplicate' });
    });

    it('raises when the row could not be written at all', async () => {
      prisma.whatsappInbound.create.mockRejectedValue(new Error('database is locked'));

      // Not a duplicate, and not something to swallow: we have no row, so there
      // is nothing for a later pass to find and redelivery is the only thing
      // that brings the message back. The webhook turns this into a non-200.
      await expect(
        service.recordMessage(delivered('w1', '543815551234')),
      ).rejects.toThrow('database is locked');
    });

    it('sends nothing and decides nothing', async () => {
      await service.recordMessage(delivered('w1', '543815551234'));

      // Intake is on Meta's clock. The model, the link and the reply all belong
      // to the half that runs after the acknowledgement.
      expect(intent.classify).not.toHaveBeenCalled();
      expect(links.linkForAgent).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('processMessage', () => {
    const known = { id: 'c1', name: 'Alo Bar' };

    it('replies to a known sender whose message asks to order', async () => {
      prisma.client.findFirst.mockResolvedValue(known);
      classifiesAs({ intent: 'order' });

      const out = await service.processMessage(message('w1', '543815551234'));

      expect(out).toEqual({ kind: 'replied', clientName: 'Alo Bar', reused: false });
      expect(links.linkForAgent).toHaveBeenCalledWith('c1');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.to).toBe('543815551234');
      // Free-form interactive, not a template: the customer messaged first, so
      // the 24-hour window is open and a cta_url needs no prior approval.
      expect(body.type).toBe('interactive');
      expect(body.interactive.type).toBe('cta_url');
      expect(body.interactive.action).toEqual({
        name: 'cta_url',
        parameters: { display_text: 'Hacer mi pedido', url: 'https://t.test/order/abc' },
      });
      // The URL rides on the button only — a raw copy in the body would defeat
      // the point of the button and show a second, unstyled link.
      expect(body.interactive.body.text).not.toContain('https://');
    });

    describe('the classification gates everything', () => {
      it('creates nothing and sends nothing when it is not an order', async () => {
        prisma.client.findFirst.mockResolvedValue(known);
        classifiesAs({ intent: 'not-order' });

        const out = await service.processMessage(
          message('w1', '543815551234', 'a qué hora abren?'),
        );

        expect(out).toEqual({ kind: 'not-order', clientName: 'Alo Bar' });
        // A link that was never created cannot be sent to somebody who was not
        // ordering, and cannot occupy their slot for the bloque.
        expect(links.linkForAgent).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('creates nothing and sends nothing when there is no verdict', async () => {
        prisma.client.findFirst.mockResolvedValue(known);
        classifiesAs({ intent: 'abstain', reason: 'timeout' });

        const out = await service.processMessage(message('w1', '543815551234'));

        // Fail-closed: the same ending as "not an order", carrying the reason it
        // was reached, which is the only thing that tells the two apart.
        expect(out).toEqual({
          kind: 'abstain',
          clientName: 'Alo Bar',
          reason: 'timeout',
        });
        expect(links.linkForAgent).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('keeps every abstain reason distinguishable', async () => {
        prisma.client.findFirst.mockResolvedValue(known);

        for (const reason of ['unconfigured', 'no-text', 'transport'] as const) {
          classifiesAs({ intent: 'abstain', reason });
          await expect(
            service.processMessage(message(`w-${reason}`, '543815551234')),
          ).resolves.toEqual({ kind: 'abstain', clientName: 'Alo Bar', reason });
        }
      });

      it('classifies the message body, and only after resolving the client', async () => {
        prisma.client.findFirst.mockResolvedValue(known);

        await service.processMessage(
          message('w1', '543815551234', 'hola! me mandás 3 docenas?'),
        );

        expect(intent.classify).toHaveBeenCalledWith('hola! me mandás 3 docenas?');
      });

      it('does not classify a message from somebody we do not know', async () => {
        prisma.client.findFirst.mockResolvedValue(null);

        await service.processMessage(message('w1', '999'));

        // Nothing is sent to a stranger whatever they wrote, so paying for an
        // inference to decide something we will not act on is pure cost.
        expect(intent.classify).not.toHaveBeenCalled();
      });

      it('passes no text along for a message that carries none', async () => {
        prisma.client.findFirst.mockResolvedValue(known);
        classifiesAs({ intent: 'abstain', reason: 'no-text' });

        const out = await service.processMessage(textless('w1', '543815551234'));

        // The classifier is what declines to transcribe; the service just hands
        // over what the message had, which for a voice note is nothing.
        expect(intent.classify).toHaveBeenCalledWith(undefined);
        expect(out).toEqual({
          kind: 'abstain',
          clientName: 'Alo Bar',
          reason: 'no-text',
        });
        expect(fetchMock).not.toHaveBeenCalled();
      });
    });

    describe('with the agent switched off the webhook only remembers', () => {
      beforeEach(() => {
        intent.enabled = false;
      });

      it('records the message with the reason and does nothing else', async () => {
        prisma.client.findFirst.mockResolvedValue(known);

        const out = await service.processMessage(
          message('w1', '543815551234', 'quiero 3 docenas'),
        );

        expect(out).toEqual({ kind: 'agent-disabled' });
        // The row already carries the text, from intake; the reason goes on it
        // here, so a message that arrived while the agent was off is not
        // indistinguishable from one it read and decided against.
        expect(prisma.whatsappInbound.update).toHaveBeenCalledWith({
          where: { wamid: 'w1' },
          data: { intent: 'abstain', abstainReason: 'agent-disabled' },
        });
      });

      it('classifies nothing, creates nothing and sends nothing', async () => {
        prisma.client.findFirst.mockResolvedValue(known);

        await service.processMessage(message('w1', '543815551234'));

        expect(intent.classify).not.toHaveBeenCalled();
        expect(links.linkForAgent).not.toHaveBeenCalled();
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('stays silent for an unknown number too', async () => {
        prisma.client.findFirst.mockResolvedValue(null);

        const out = await service.processMessage(message('w1', '999'));

        // Off is reported as off, not as an unrecognised number: the reason on
        // the row has to say which, because the fix is a different one.
        expect(out).toEqual({ kind: 'agent-disabled' });
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it('does not bother resolving the client or the window', async () => {
        await service.processMessage(message('w1', '543815551234'));

        // Neither question has an answer worth having when nothing is going to
        // be sent either way.
        expect(prisma.client.findFirst).not.toHaveBeenCalled();
        expect(prisma.whatsappInbound.findFirst).not.toHaveBeenCalled();
      });

      it('leaves the order recap working', async () => {
        // The recap is not the webhook and has nothing to do with the model:
        // switching the classifier off must not stop a confirmed order coming
        // back to the customer.
        prisma.order.findUnique.mockResolvedValue({
          client: { phone: '543815551234' },
          items: [{ quantity: 1, product: { name: 'Pan' } }],
        });
        prisma.whatsappInbound.findFirst.mockResolvedValue({ wamid: 'w0' });

        await service.sendOrderConfirmation('o1');

        expect(fetchMock).toHaveBeenCalled();
      });
    });

    describe('what happened is recorded on the row', () => {
      /** The last thing written to the claimed row. */
      const written = () => {
        const calls = prisma.whatsappInbound.update.mock.calls;
        return calls.length ? calls[calls.length - 1][0].data : undefined;
      };

      it('records a decided verdict with no abstain reason', async () => {
        prisma.client.findFirst.mockResolvedValue(known);

        for (const intent of ['order', 'not-order'] as const) {
          prisma.whatsappInbound.update.mockClear();
          classifiesAs({ intent });
          await service.processMessage(message(`w-${intent}`, '543815551234'));

          // Cleared rather than left alone, so the column cannot carry a stale
          // reason from a row it does not apply to.
          expect(prisma.whatsappInbound.update.mock.calls[0][0].data).toEqual({
            intent,
            abstainReason: null,
          });
        }
      });

      it('records the abstain reason beside the verdict', async () => {
        prisma.client.findFirst.mockResolvedValue(known);
        classifiesAs({ intent: 'abstain', reason: 'timeout' });

        await service.processMessage(message('w1', '543815551234'));

        // This is the whole point of the column. Without it, an afternoon of the
        // classifier working and an afternoon of the model being unreachable are
        // the same rows and the same silence.
        expect(written()).toEqual({ intent: 'abstain', abstainReason: 'timeout' });
      });

      it('records nothing for a message that never reached the classifier', async () => {
        // A message answered inside the suppression window: null reads as "we
        // did not record it", which is true, and is not a verdict we never
        // reached. The other silent endings do write a reason.
        prisma.whatsappInbound.findFirst.mockResolvedValue({ wamid: 'w0' });

        await service.processMessage(message('w1', '543815551234'));

        expect(intent.classify).not.toHaveBeenCalled();
        expect(prisma.whatsappInbound.update).not.toHaveBeenCalled();
      });
    });

    describe('an unanswered message consumes nothing', () => {
      it('does not arm the suppression window', async () => {
        prisma.client.findFirst.mockResolvedValue(known);
        classifiesAs({ intent: 'not-order' });

        await service.processMessage(message('w1', '543815551234', 'gracias!'));

        // `markReplied` is tied to a reply that went out, and none did. The
        // window exists to stop *us* answering three times; a message we chose
        // not to answer is not an answer.
        expect(markedReplied()).toBe(false);
      });

      it('answers the order that follows a greeting moments later', async () => {
        prisma.client.findFirst.mockResolvedValue(known);
        classifiesAs({ intent: 'not-order' });
        await service.processMessage(message('w1', '543815551234', 'hola'));

        // Nothing was marked replied, so the window is still shut — the same
        // customer asking to order ten seconds later is served immediately
        // rather than met with silence for the rest of it.
        classifiesAs({ intent: 'order' });
        const out = await service.processMessage(
          message('w2', '543815551234', 'quiero 3 docenas de facturas'),
        );

        expect(out).toEqual({ kind: 'replied', clientName: 'Alo Bar', reused: false });
        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

    });

    it('keeps the button label and body inside Meta’s limits', async () => {
      prisma.client.findFirst.mockResolvedValue({ id: 'c1', name: 'X'.repeat(200) });

      await service.processMessage(message('w1', '543815551234'));

      // 20 and 1024 are hard caps: over either, the send is rejected outright
      // rather than truncated, so the customer gets nothing at all.
      const { interactive } = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(interactive.action.parameters.display_text.length).toBeLessThanOrEqual(20);
      expect(interactive.body.text.length).toBeLessThanOrEqual(1024);
      // Nothing about the client reaches the copy any more, so a message that
      // went to the wrong number confirms no name to whoever received it.
      expect(interactive.body.text).not.toContain('X');
    });

    it('says it is an agent, and that ignoring it still reaches a person', async () => {
      prisma.client.findFirst.mockResolvedValue(known);

      await service.processMessage(message('w1', '543815551234'));

      // Two promises to the customer rather than styling, which is why they are
      // pinned. This is an automated system speaking first in a thread they
      // believe is staffed, and it acts on a guess about what they meant — so it
      // says which it is, and says that a wrong guess costs them nothing.
      const { interactive } = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(interactive.body.text).toMatch(/agente de IA/);
      expect(interactive.body.text).toMatch(/ignora este mensaje/);
      expect(interactive.body.text).toMatch(/humano/);
    });

    it('takes the sender it was handed, already canonical', async () => {
      prisma.client.findFirst.mockResolvedValue(known);

      await service.processMessage(message('w1', '543815551234'));

      // Canonicalising is intake's job and happens once; this half looks the
      // client up and addresses the reply with what it was given.
      expect(prisma.client.findFirst.mock.calls[0][0].where).toEqual({
        phone: '543815551234',
        active: true,
      });
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toBe('543815551234');
    });

    it('only ever resolves an active client', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      const out = await service.processMessage(message('w1', '543815551234'));

      expect(prisma.client.findFirst.mock.calls[0][0].where.active).toBe(true);
      expect(out).toEqual({ kind: 'unknown-sender' });
      expect(links.linkForAgent).not.toHaveBeenCalled();
    });

    describe('a number we do not have on file gets no reply at all', () => {
      it('sends nothing and creates nothing', async () => {
        const out = await service.processMessage(message('w1', '999'));

        // The agent has nothing it can do for a stranger — there is no client to
        // make a link for — and the number is a staffed inbox, so silence hands
        // the message to a person rather than dropping it. The courtesy note
        // this used to send was the one place the agent addressed somebody it
        // knew nothing about.
        expect(out).toEqual({ kind: 'unknown-sender' });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(links.linkForAgent).not.toHaveBeenCalled();
      });

      it('does not arm the suppression window', async () => {
        await service.processMessage(message('w1', '999'));

        // Nothing went out, so nothing is owed. A real customer writing from a
        // second phone must not be met with silence for the rest of the window
        // on top of not being recognised.
        expect(markedReplied()).toBe(false);
      });

      it('says on the row why it was left alone', async () => {
        await service.processMessage(message('w1', '999'));

        // Otherwise the row is indistinguishable from one suppressed inside the
        // window, and this is the queue a person is meant to work through.
        expect(prisma.whatsappInbound.update).toHaveBeenCalledWith({
          where: { wamid: 'w1' },
          data: { intent: 'abstain', abstainReason: 'unknown-sender' },
        });
      });
    });

    it('suppresses a second reply to a sender answered moments ago', async () => {
      prisma.whatsappInbound.findFirst.mockResolvedValue({ wamid: 'w0' });

      const out = await service.processMessage(message('w1', '543815551234'));

      expect(out).toEqual({ kind: 'suppressed' });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(links.linkForAgent).not.toHaveBeenCalled();
      // The window looks only at messages actually replied to.
      expect(prisma.whatsappInbound.findFirst.mock.calls[0][0].where.replied).toBe(true);
    });

    it('suppresses on the canonical sender', async () => {
      prisma.client.findFirst.mockResolvedValue(known);

      await service.processMessage(message('w1', '543815551234'));

      // The same person reaching us with and without the Argentine 9 arrives
      // here as one sender, so one of the two cannot slip past the window.
      expect(prisma.whatsappInbound.findFirst.mock.calls[0][0].where.from).toBe('543815551234');
    });

    it('reports a reused link as reused', async () => {
      prisma.client.findFirst.mockResolvedValue(known);
      links.linkForAgent.mockResolvedValue({ url: 'https://t.test/order/old', reused: true });

      const out = await service.processMessage(message('w1', '543815551234'));

      expect(out).toEqual({ kind: 'replied', clientName: 'Alo Bar', reused: true });
    });

    it('keeps the order when the reply cannot be sent', async () => {
      prisma.client.findFirst.mockResolvedValue(known);
      fetchMock.mockRejectedValue(new Error('network down'));

      const out = await service.processMessage(message('w1', '543815551234'));

      // The link exists and the manager can share it by hand; throwing here
      // would only make Meta redeliver and mint another.
      expect(out).toEqual({ kind: 'replied', clientName: 'Alo Bar', reused: false });
      expect(links.linkForAgent).toHaveBeenCalled();
      // Not marked replied: a send that failed must not suppress the customer's
      // next message, which is when they are most likely to try again.
      expect(markedReplied()).toBe(false);
    });

    it('marks the message replied only when the send succeeded', async () => {
      prisma.client.findFirst.mockResolvedValue(known);

      await service.processMessage(message('w1', '543815551234'));

      expect(prisma.whatsappInbound.update).toHaveBeenCalledWith({
        where: { wamid: 'w1' },
        data: { replied: true },
      });
    });

    it('does not blow up when Meta rejects the send', async () => {
      prisma.client.findFirst.mockResolvedValue(known);
      fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' });

      await expect(
        service.processMessage(message('w1', '543815551234')),
      ).resolves.toMatchObject({ kind: 'replied' });
    });
  });

  describe('sendOrderConfirmation', () => {
    const confirmedOrder = {
      client: { phone: '543815551234' },
      items: [
        { quantity: 3, product: { name: 'Medialunas' } },
        { quantity: 1, product: { name: 'Pan de campo' } },
      ],
    };

    /** The client wrote to us this recently, or never. */
    const lastInbound = (recent: boolean) =>
      prisma.whatsappInbound.findFirst.mockResolvedValue(
        recent ? { wamid: 'w0' } : null,
      );

    it('sends the customer what they ordered', async () => {
      prisma.order.findUnique.mockResolvedValue(confirmedOrder);
      lastInbound(true);

      await service.sendOrderConfirmation('o1');

      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.to).toBe('543815551234');
      // Templated Spanish, and plain text: there is no link to put on a button,
      // and this one is read rather than acted on.
      expect(body.type).toBe('text');
      expect(body.text.body).toContain('3 x Medialunas');
      expect(body.text.body).toContain('1 x Pan de campo');
      // Meta rejects a text body over 4096 characters outright.
      expect(body.text.body.length).toBeLessThanOrEqual(4096);
    });

    it('looks only at inbound messages inside the service window', async () => {
      prisma.order.findUnique.mockResolvedValue(confirmedOrder);
      lastInbound(true);

      await service.sendOrderConfirmation('o1');

      const { where } = prisma.whatsappInbound.findFirst.mock.calls[0][0];
      expect(where.from).toBe('543815551234');
      expect(where.receivedAt.gte).toBeInstanceOf(Date);
      // Every inbound message counts, replied or not: the window is opened by
      // the customer writing, which happens whether or not we answered.
      expect(where.replied).toBeUndefined();
    });

    it('sends nothing, and reports no failure, without a recent inbound', async () => {
      prisma.order.findUnique.mockResolvedValue(confirmedOrder);
      lastInbound(false);

      // The expected case for a link the manager generated by hand: that
      // customer may never have messaged us, and a free-form send to them would
      // be rejected rather than delivered.
      await expect(service.sendOrderConfirmation('o1')).resolves.toBeUndefined();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends nothing for a client with no number on file', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...confirmedOrder,
        client: { phone: null },
      });
      lastInbound(true);

      await service.sendOrderConfirmation('o1');

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('sends nothing for an order with no items', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...confirmedOrder, items: [] });
      lastInbound(true);

      await service.sendOrderConfirmation('o1');

      expect(fetchMock).not.toHaveBeenCalled();
    });

    /**
     * The recap is the customer's only evidence that the order exists — the form's
     * success screen goes with the window, and what is left is a chat where they
     * said something and nothing came back. Customers reported not believing the
     * order had gone through for exactly that reason, so a dropped send is a
     * customer who thinks the bakery has no record of them.
     *
     * Driven on fake timers: the schedule is tens of seconds of real waiting, and
     * what is under test is which attempts are made, not how long they take.
     */
    describe('a recap that fails in transit is retried', () => {
      beforeEach(() => jest.useFakeTimers());
      afterEach(() => jest.useRealTimers());

      /** Runs the send to completion, letting every backoff elapse. */
      const runToCompletion = async () => {
        const done = service.sendOrderConfirmation('o1');
        await jest.advanceTimersByTimeAsync(120_000);
        await done;
      };

      const rejectsWith = (status: number, body = '{}') =>
        fetchMock.mockResolvedValue({ ok: false, status, text: async () => body });

      it('gives up only after four attempts when the network keeps dropping', async () => {
        prisma.order.findUnique.mockResolvedValue(confirmedOrder);
        lastInbound(true);
        fetchMock.mockRejectedValue(new Error('network down'));

        await runToCompletion();

        expect(fetchMock).toHaveBeenCalledTimes(4);
      });

      it('stops as soon as one gets through', async () => {
        prisma.order.findUnique.mockResolvedValue(confirmedOrder);
        lastInbound(true);
        fetchMock
          .mockRejectedValueOnce(new Error('network down'))
          .mockResolvedValueOnce({ ok: true, text: async () => '' });

        await runToCompletion();

        expect(fetchMock).toHaveBeenCalledTimes(2);
      });

      it('retries a server-side error', async () => {
        prisma.order.findUnique.mockResolvedValue(confirmedOrder);
        lastInbound(true);
        rejectsWith(503);

        await runToCompletion();

        expect(fetchMock).toHaveBeenCalledTimes(4);
      });

      it('retries a rate limit, which Meta reports as a 400', async () => {
        prisma.order.findUnique.mockResolvedValue(confirmedOrder);
        lastInbound(true);
        // The status alone would file this under never-retry, and it is the
        // failure most certain to succeed on a second attempt.
        rejectsWith(400, JSON.stringify({ error: { code: 130429, message: 'rate limit' } }));

        await runToCompletion();

        expect(fetchMock).toHaveBeenCalledTimes(4);
      });

      it('does not retry a rejection that will not change', async () => {
        prisma.order.findUnique.mockResolvedValue(confirmedOrder);
        lastInbound(true);
        // Outside the service window. Meta will refuse this identically however
        // often it is sent, and hammering it only delays the log line saying so.
        rejectsWith(400, JSON.stringify({ error: { code: 131047, message: 're-engagement' } }));

        await runToCompletion();

        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('does not retry a 400 it cannot read a reason out of', async () => {
        prisma.order.findUnique.mockResolvedValue(confirmedOrder);
        lastInbound(true);
        rejectsWith(400, '<html>bad gateway page</html>');

        await runToCompletion();

        expect(fetchMock).toHaveBeenCalledTimes(1);
      });

      it('never raises, whatever happens', async () => {
        prisma.order.findUnique.mockResolvedValue(confirmedOrder);
        lastInbound(true);
        fetchMock.mockRejectedValue(new Error('network down'));

        // The order is already confirmed and committed by the time this runs;
        // nothing here can, or should, undo it.
        const done = service.sendOrderConfirmation('o1');
        await jest.advanceTimersByTimeAsync(120_000);
        await expect(done).resolves.toBeUndefined();
      });

      it('waits longer between each attempt', async () => {
        prisma.order.findUnique.mockResolvedValue(confirmedOrder);
        lastInbound(true);
        fetchMock.mockRejectedValue(new Error('network down'));

        const done = service.sendOrderConfirmation('o1');
        await jest.advanceTimersByTimeAsync(0);
        expect(fetchMock).toHaveBeenCalledTimes(1);
        await jest.advanceTimersByTimeAsync(1_000);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        await jest.advanceTimersByTimeAsync(5_000);
        expect(fetchMock).toHaveBeenCalledTimes(3);
        await jest.advanceTimersByTimeAsync(20_000);
        // Last attempt lands around 26 s in, while the customer is still
        // holding the phone.
        expect(fetchMock).toHaveBeenCalledTimes(4);
        await done;
      });
    });

    it('does not retry the inbound reply, which has a manual fallback', async () => {
      // The order link is recoverable by hand — the manager can share it — and
      // the customer is waiting on the reply in real time. The recap is neither.
      prisma.client.findFirst.mockResolvedValue({ id: 'c1', name: 'Alo Bar' });
      fetchMock.mockRejectedValue(new Error('network down'));

      await service.processMessage(message('w1', '543815551234'));

      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('does not look anything up when the agent is not configured', async () => {
      const inert = new WhatsappService(
        prisma as unknown as PrismaService,
        { enabled: false } as unknown as WhatsappConfigService,
        links as unknown as LinksService,
        intent as unknown as OrderIntentClassifier,
      );

      await inert.sendOrderConfirmation('o1');

      expect(prisma.order.findUnique).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});

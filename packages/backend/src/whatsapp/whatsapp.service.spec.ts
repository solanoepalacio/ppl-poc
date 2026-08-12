import { createHmac } from 'node:crypto';
import { WhatsappService } from './whatsapp.service';
import type { WhatsappConfigService } from './whatsapp.config';
import type { PrismaService } from '../prisma/prisma.service';
import type { LinksService } from '../links/links.service';

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
const inbound = (wamid: string, from: string) => ({
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
              { id: wamid, from, timestamp: '1', type: 'text', text: { body: 'hola' } },
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
    whatsappInbound: { create: jest.Mock; findFirst: jest.Mock; update: jest.Mock };
    whatsappHandoff: { findFirst: jest.Mock; update: jest.Mock; upsert: jest.Mock };
    client: { findFirst: jest.Mock };
  };
  let links: { linkForAgent: jest.Mock };
  let service: WhatsappService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    prisma = {
      whatsappInbound: {
        create: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
      whatsappHandoff: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
        upsert: jest.fn().mockResolvedValue({}),
      },
      client: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    links = {
      linkForAgent: jest
        .fn()
        .mockResolvedValue({ url: 'https://t.test/order/abc', reused: false }),
    };
    fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = fetchMock as unknown as typeof fetch;
    service = new WhatsappService(
      prisma as unknown as PrismaService,
      config,
      links as unknown as LinksService,
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
      expect(service.extractMessages(inbound('wamid.1', '543815551234'))).toEqual([
        { wamid: 'wamid.1', from: '543815551234' },
      ]);
    });

    it('reads which choice was tapped out of an interactive message', () => {
      const tap = {
        object: 'whatsapp_business_account',
        entry: [{ changes: [{ field: 'messages', value: {
          messaging_product: 'whatsapp',
          messages: [{
            id: 'wamid.9', from: '543815551234', type: 'interactive',
            interactive: {
              type: 'button_reply',
              button_reply: { id: 'hablar_asesor', title: 'Hablar con un asesor' },
            },
          }],
        } }] }],
      };
      expect(service.extractMessages(tap)).toEqual([
        { wamid: 'wamid.9', from: '543815551234', buttonId: 'hablar_asesor' },
      ]);
    });

    it('leaves the choice absent on a plain text message', () => {
      expect(
        service.extractMessages(inbound('wamid.1', '543815551234'))[0],
      ).not.toHaveProperty('buttonId');
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

  describe('handleMessage', () => {
    const known = { id: 'c1', name: 'Alo Bar' };

    it('replies to a known sender with their link', async () => {
      prisma.client.findFirst.mockResolvedValue(known);

      const out = await service.handleMessage({ wamid: 'w1', from: '543815551234' });

      expect(out).toEqual({ kind: 'replied', clientName: 'Alo Bar', reused: false });
      expect(links.linkForAgent).toHaveBeenCalledWith('c1');
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.to).toBe('543815551234');
      // Interactive rather than plain text: the link comes with the two choices.
      // Still free-form — the customer messaged first — so no template.
      expect(body.type).toBe('interactive');
      expect(body.interactive.body.text).toContain('https://t.test/order/abc');
      expect(
        body.interactive.action.buttons.map(
          (x: { reply: { id: string } }) => x.reply.id,
        ),
      ).toEqual(['hablar_asesor', 'pedido_enviado']);
    });

    it('matches a sender whose stored number carries the Argentine 9', async () => {
      prisma.client.findFirst.mockResolvedValue(known);

      await service.handleMessage({ wamid: 'w1', from: '5493815551234' });

      // Both sides are canonicalised, so the stored number is looked up without
      // the 9 whichever way it was entered.
      expect(prisma.client.findFirst.mock.calls[0][0].where).toEqual({
        phone: '543815551234',
        active: true,
      });
    });

    it('only ever resolves an active client', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      const out = await service.handleMessage({ wamid: 'w1', from: '543815551234' });

      expect(prisma.client.findFirst.mock.calls[0][0].where.active).toBe(true);
      expect(out).toEqual({ kind: 'unknown-sender' });
      expect(links.linkForAgent).not.toHaveBeenCalled();
    });

    it('answers an unknown sender without creating anything', async () => {
      const out = await service.handleMessage({ wamid: 'w1', from: '999' });

      expect(out).toEqual({ kind: 'unknown-sender' });
      expect(links.linkForAgent).not.toHaveBeenCalled();
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).text.body).toMatch(
        /una persona lo va a tomar/,
      );
    });

    it('acts on a redelivered message once', async () => {
      // The primary key on wamid is what makes the second attempt a no-op.
      prisma.whatsappInbound.create.mockRejectedValue(new Error('unique'));

      const out = await service.handleMessage({ wamid: 'w1', from: '543815551234' });

      expect(out).toEqual({ kind: 'ignored', reason: 'ya procesado' });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('suppresses a second reply to a sender answered moments ago', async () => {
      prisma.whatsappInbound.findFirst.mockResolvedValue({ wamid: 'w0' });

      const out = await service.handleMessage({ wamid: 'w1', from: '543815551234' });

      expect(out).toEqual({ kind: 'suppressed' });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(links.linkForAgent).not.toHaveBeenCalled();
      // The window looks only at messages actually replied to.
      expect(prisma.whatsappInbound.findFirst.mock.calls[0][0].where.replied).toBe(true);
    });

    it('suppresses on the canonical sender, not the raw one', async () => {
      prisma.client.findFirst.mockResolvedValue(known);

      await service.handleMessage({ wamid: 'w1', from: '5493815551234' });

      // Stored canonical: the same person reaching us with and without the
      // Argentine 9 must not count as two senders and get two replies.
      expect(prisma.whatsappInbound.create.mock.calls[0][0].data).toEqual({
        wamid: 'w1',
        from: '543815551234',
      });
      expect(prisma.whatsappInbound.findFirst.mock.calls[0][0].where.from).toBe('543815551234');
      // The reply goes to the canonical form, not the raw wa_id: Argentina's
      // recipient allow-list is keyed without the mobile 9, and a reply
      // addressed with it comes back as "recipient not in allowed list".
      expect(JSON.parse(fetchMock.mock.calls[0][1].body).to).toBe('543815551234');
    });

    it('reports a reused link as reused', async () => {
      prisma.client.findFirst.mockResolvedValue(known);
      links.linkForAgent.mockResolvedValue({ url: 'https://t.test/order/old', reused: true });

      const out = await service.handleMessage({ wamid: 'w1', from: '543815551234' });

      expect(out).toEqual({ kind: 'replied', clientName: 'Alo Bar', reused: true });
    });

    it('keeps the order when the reply cannot be sent', async () => {
      prisma.client.findFirst.mockResolvedValue(known);
      fetchMock.mockRejectedValue(new Error('network down'));

      const out = await service.handleMessage({ wamid: 'w1', from: '543815551234' });

      // The link exists and the manager can share it by hand; throwing here
      // would only make Meta redeliver and mint another.
      expect(out).toEqual({ kind: 'replied', clientName: 'Alo Bar', reused: false });
      expect(links.linkForAgent).toHaveBeenCalled();
      // Not marked replied: a send that failed must not suppress the customer's
      // next message, which is when they are most likely to try again.
      expect(prisma.whatsappInbound.update).not.toHaveBeenCalled();
    });

    it('marks the message replied only when the send succeeded', async () => {
      prisma.client.findFirst.mockResolvedValue(known);

      await service.handleMessage({ wamid: 'w1', from: '543815551234' });

      expect(prisma.whatsappInbound.update).toHaveBeenCalledWith({
        where: { wamid: 'w1' },
        data: { replied: true },
      });
    });

    it('does not blow up when Meta rejects the send', async () => {
      prisma.client.findFirst.mockResolvedValue(known);
      fetchMock.mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' });

      await expect(
        service.handleMessage({ wamid: 'w1', from: '543815551234' }),
      ).resolves.toMatchObject({ kind: 'replied' });
    });
  
  describe('handover to a person', () => {
    const known = { id: 'c1', name: 'Alo Bar' };
    const advisor = { wamid: 'w1', from: '543815551234', buttonId: 'hablar_asesor' };

    it('acknowledges once and hands the conversation over', async () => {
      prisma.client.findFirst.mockResolvedValue(known);

      const out = await service.handleMessage(advisor);

      expect(out).toEqual({ kind: 'handed-over', extended: false });
      expect(prisma.whatsappHandoff.upsert).toHaveBeenCalled();
      // The acknowledgement is plain text and the last thing the agent says.
      const body = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(body.type).toBe('text');
      expect(body.text.body).toMatch(/una persona te responderá/i);
      // No link: asking for a person is not asking for the form.
      expect(links.linkForAgent).not.toHaveBeenCalled();
    });

    it('says nothing at all while the handover holds', async () => {
      prisma.whatsappHandoff.findFirst.mockResolvedValue({ sender: '543815551234' });
      prisma.client.findFirst.mockResolvedValue(known);

      const out = await service.handleMessage({ wamid: 'w2', from: '543815551234' });

      expect(out).toEqual({ kind: 'handed-over', extended: true });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(links.linkForAgent).not.toHaveBeenCalled();
    });

    it('extends the handover from the new message, not from when it began', async () => {
      prisma.whatsappHandoff.findFirst.mockResolvedValue({ sender: '543815551234' });

      const before = Date.now();
      await service.handleMessage({ wamid: 'w2', from: '543815551234' });

      const { expiresAt } = prisma.whatsappHandoff.update.mock.calls[0][0].data;
      // Recomputed from now, so the handover always outlives the conversation by
      // the same idle period however long the conversation runs.
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 3 * 60_000);
    });

    it('only treats a handover as active while it has not lapsed', async () => {
      prisma.whatsappHandoff.findFirst.mockResolvedValue(null);
      prisma.client.findFirst.mockResolvedValue(known);

      const out = await service.handleMessage({ wamid: 'w3', from: '543815551234' });

      expect(prisma.whatsappHandoff.findFirst.mock.calls[0][0].where.expiresAt).toEqual({
        gt: expect.any(Date),
      });
      // Lapsed, so the agent is back to what it did before.
      expect(out).toMatchObject({ kind: 'replied' });
    });

    it('is scoped to one conversation', async () => {
      prisma.whatsappHandoff.findFirst.mockResolvedValue(null);
      prisma.client.findFirst.mockResolvedValue(known);

      await service.handleMessage({ wamid: 'w4', from: '543819999999' });

      expect(prisma.whatsappHandoff.findFirst.mock.calls[0][0].where.sender).toBe(
        '543819999999',
      );
    });

    it('answers "pedido enviado" with silence, not another link', async () => {
      prisma.client.findFirst.mockResolvedValue(known);

      const out = await service.handleMessage({
        wamid: 'w5',
        from: '543815551234',
        buttonId: 'pedido_enviado',
      });

      expect(out).toEqual({ kind: 'order-sent' });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(links.linkForAgent).not.toHaveBeenCalled();
    });
  });

});
});

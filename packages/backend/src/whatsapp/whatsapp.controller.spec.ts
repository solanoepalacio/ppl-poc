import { ForbiddenException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { WhatsappController } from './whatsapp.controller';
import type { WhatsappConfigService } from './whatsapp.config';
import type { InboundMessage, WhatsappService } from './whatsapp.service';

/**
 * The webhook, which is where the delivery is split in two.
 *
 * What is under test here is the *order*: a message is written down before Meta
 * is told anything, and acted on only after. Everything either half does once it
 * is running belongs to the service's own tests.
 */
describe('WhatsappController', () => {
  let whatsapp: {
    verifyChallenge: jest.Mock;
    verifySignature: jest.Mock;
    extractMessages: jest.Mock;
    recordMessage: jest.Mock;
    processMessage: jest.Mock;
  };
  let controller: WhatsappController;

  /** A delivery of these messages, with a signature the service accepts. */
  const delivery = (...messages: InboundMessage[]) => {
    whatsapp.extractMessages.mockReturnValue(messages);
    return { rawBody: Buffer.from('{}'), body: {} } as never;
  };

  const message = (wamid: string): InboundMessage => ({
    wamid,
    from: '543815551234',
    type: 'text',
    text: 'hola',
  });

  /** Intake accepted this message. */
  const recorded = (wamid: string) => ({
    kind: 'recorded' as const,
    message: { wamid, from: '543815551234', text: 'hola' },
  });

  const receive = () => controller.receive(delivery(message('w1')), 'sha256=ok');

  beforeEach(() => {
    whatsapp = {
      verifyChallenge: jest.fn().mockReturnValue('reto'),
      verifySignature: jest.fn().mockReturnValue(true),
      extractMessages: jest.fn().mockReturnValue([]),
      recordMessage: jest.fn(async (m: InboundMessage) => recorded(m.wamid)),
      processMessage: jest.fn().mockResolvedValue({ kind: 'unknown-sender' }),
    };
    controller = new WhatsappController(
      { enabled: true } as unknown as WhatsappConfigService,
      whatsapp as unknown as WhatsappService,
    );
  });

  describe('an unconfigured agent has no endpoint at all', () => {
    beforeEach(() => {
      controller = new WhatsappController(
        { enabled: false } as unknown as WhatsappConfigService,
        whatsapp as unknown as WhatsappService,
      );
    });

    it('404s both halves of the webhook', async () => {
      // Not a broken endpoint — no endpoint. A half-configured deployment that
      // answered would look alive while doing the wrong thing.
      expect(() => controller.verify('subscribe', 't', 'reto')).toThrow(NotFoundException);
      await expect(receive()).rejects.toThrow(NotFoundException);
    });
  });

  describe('registration handshake', () => {
    it('echoes the challenge the service approved', () => {
      expect(controller.verify('subscribe', 'token', 'reto')).toBe('reto');
    });

    it('refuses when the service will not echo', () => {
      whatsapp.verifyChallenge.mockReturnValue(null);

      expect(() => controller.verify('subscribe', 'otro', 'reto')).toThrow(ForbiddenException);
    });
  });

  describe('a delivery we cannot vouch for is not a delivery', () => {
    it('rejects a bad signature without recording anything', async () => {
      whatsapp.verifySignature.mockReturnValue(false);

      await expect(receive()).rejects.toThrow(ForbiddenException);
      expect(whatsapp.recordMessage).not.toHaveBeenCalled();
    });

    it('rejects a request whose raw body was not kept', async () => {
      // A signature checked against a re-serialisation proves only that we can
      // re-serialise, so there is nothing honest to do but refuse.
      whatsapp.extractMessages.mockReturnValue([message('w1')]);

      await expect(
        controller.receive({ body: {} } as never, 'sha256=ok'),
      ).rejects.toThrow(ForbiddenException);
      expect(whatsapp.recordMessage).not.toHaveBeenCalled();
    });
  });

  describe('recorded before the acknowledgement, acted on after it', () => {
    it('records every message and acknowledges', async () => {
      const res = await controller.receive(
        delivery(message('w1'), message('w2')),
        'sha256=ok',
      );

      expect(res).toBe('EVENT_RECEIVED');
      expect(whatsapp.recordMessage).toHaveBeenCalledTimes(2);
    });

    it('does not wait for the processing before answering', async () => {
      // The whole reason for the split: handling calls a language model, and
      // Meta reads a slow acknowledgement as a failed delivery and sends the
      // message again — so waiting risks redelivering one already being handled.
      whatsapp.processMessage.mockReturnValue(new Promise(() => undefined));

      await expect(receive()).resolves.toBe('EVENT_RECEIVED');
    });

    it('is the recorded message that gets processed, not the raw one', async () => {
      // Canonicalised at intake, so the half that replies works from an identity
      // that has already been settled once.
      await receive();

      expect(whatsapp.processMessage).toHaveBeenCalledWith({
        wamid: 'w1',
        from: '543815551234',
        text: 'hola',
      });
    });

    it('acknowledges a delivery carrying nothing we act on', async () => {
      // Status updates about our own replies arrive on the same webhook.
      await expect(controller.receive(delivery(), 'sha256=ok')).resolves.toBe('EVENT_RECEIVED');
      expect(whatsapp.recordMessage).not.toHaveBeenCalled();
    });
  });

  describe('a message already recorded is left alone', () => {
    it('does not process it a second time', async () => {
      whatsapp.recordMessage.mockResolvedValue({ kind: 'duplicate' });

      await expect(receive()).resolves.toBe('EVENT_RECEIVED');

      // Meta redelivers until acknowledged, so this is the ordinary case. The
      // row is what makes it a no-op rather than a second link.
      expect(whatsapp.processMessage).not.toHaveBeenCalled();
    });

    it('still processes the ones in the same delivery that are new', async () => {
      whatsapp.recordMessage
        .mockResolvedValueOnce({ kind: 'duplicate' })
        .mockResolvedValueOnce(recorded('w2'));

      await controller.receive(delivery(message('w1'), message('w2')), 'sha256=ok');

      expect(whatsapp.processMessage).toHaveBeenCalledTimes(1);
      expect(whatsapp.processMessage.mock.calls[0][0].wamid).toBe('w2');
    });
  });

  describe('the one delivery that is not acknowledged', () => {
    it('refuses to acknowledge a message it could not record', async () => {
      whatsapp.recordMessage.mockRejectedValue(new Error('database is locked'));

      // Nothing was written, so there is no row to inspect and nothing for a
      // later pass to pick up: a redelivery is the only thing that brings this
      // message back, and only a non-200 asks for one.
      await expect(receive()).rejects.toThrow(ServiceUnavailableException);
    });

    it('still processes whatever did land before asking for the redelivery', async () => {
      whatsapp.recordMessage
        .mockResolvedValueOnce(recorded('w1'))
        .mockRejectedValueOnce(new Error('database is locked'));

      await expect(
        controller.receive(delivery(message('w1'), message('w2')), 'sha256=ok'),
      ).rejects.toThrow(ServiceUnavailableException);

      // The redelivery costs only the message that is actually missing: this one
      // is recorded, so it dedupes itself away on the way back through.
      expect(whatsapp.processMessage).toHaveBeenCalledTimes(1);
      expect(whatsapp.processMessage.mock.calls[0][0].wamid).toBe('w1');
    });
  });

  it('acknowledges a message it recorded but could not act on', async () => {
    whatsapp.processMessage.mockRejectedValue(new Error('the model is unreachable'));

    // The record is already there to act on at leisure, and a week of the same
    // message arriving again would not make the model any more reachable.
    await expect(receive()).resolves.toBe('EVENT_RECEIVED');
  });
});

import { Logger } from '@nestjs/common';
import { OrderIntentClassifier } from './order-intent.classifier';
import type { LlmService, LlmFailureKind } from '../llm/llm.service';

/**
 * The model is stubbed at the module boundary — Jest never reaches a provider.
 * Prompt *quality* is not something a unit test can assert; what is asserted
 * here is that every shape of answer, and every way of getting none, lands
 * somewhere deliberate.
 */
describe('OrderIntentClassifier', () => {
  let complete: jest.Mock;
  let classifier: OrderIntentClassifier;

  /** The model answered with this text. */
  const answers = (text: string) => complete.mockResolvedValue({ ok: true, text });
  /** The call failed this way. */
  const fails = (kind: LlmFailureKind) =>
    complete.mockResolvedValue({ ok: false, kind });

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    complete = jest.fn();
    classifier = new OrderIntentClassifier({
      complete,
    } as unknown as LlmService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('the vocabulary', () => {
    it('reads the positive label as an order', async () => {
      answers('PEDIDO');

      await expect(classifier.classify('quiero 3 docenas')).resolves.toEqual({
        intent: 'order',
      });
    });

    it('reads the negative label as not an order', async () => {
      answers('NO_PEDIDO');

      await expect(classifier.classify('gracias!')).resolves.toEqual({
        intent: 'not-order',
      });
    });

    it('ignores surrounding whitespace and letter case', async () => {
      for (const raw of ['  pedido  ', '\nPedido\n', 'pEdIdO']) {
        answers(raw);
        await expect(classifier.classify('dale')).resolves.toEqual({
          intent: 'order',
        });
      }
    });

    it('sends the message to the model as the input', async () => {
      answers('PEDIDO');

      await classifier.classify('  hola, me mandás facturas?  ');

      expect(complete).toHaveBeenCalledWith({
        system: expect.stringContaining('NO_PEDIDO'),
        // Trimmed, but otherwise the customer's own words: nothing is rewritten
        // on the way in.
        input: 'hola, me mandás facturas?',
      });
    });
  });

  describe('an answer that cannot be read is no verdict', () => {
    const unreadable = {
      'a word outside the vocabulary': 'QUIZAS',
      'a sentence instead of a label': 'El cliente parece querer hacer un pedido.',
      'both labels at once': 'PEDIDO NO_PEDIDO',
      'a label with an explanation attached': 'PEDIDO porque pide facturas',
      'an empty answer': '',
      'only whitespace': '   \n ',
      'the label as a JSON object': '{"intent":"PEDIDO"}',
    };

    for (const [name, raw] of Object.entries(unreadable)) {
      it(`abstains on ${name}`, async () => {
        answers(raw);

        await expect(classifier.classify('hola')).resolves.toEqual({
          intent: 'abstain',
          reason: 'unreadable-answer',
        });
      });
    }

    it('does not read the negative label as the positive one', async () => {
      // `NO_PEDIDO` contains `PEDIDO`. A parser that searched instead of matching
      // would send a link to somebody who was not ordering — the one mistake
      // that cannot be taken back.
      answers('NO_PEDIDO');

      await expect(classifier.classify('a qué hora abren?')).resolves.toEqual({
        intent: 'not-order',
      });
    });
  });

  describe('a reasoning preamble is discarded', () => {
    it('reads the label that follows a think block', async () => {
      // The provider is asked not to reason (`think: false`), but a parser that
      // depended on that flag having been honoured would abstain on every
      // message while the model answered correctly.
      answers('<think>El cliente pide facturas para mañana.</think>\nPEDIDO');

      await expect(classifier.classify('facturas para mañana')).resolves.toEqual({
        intent: 'order',
      });
    });

    it('handles a think block that was never closed', async () => {
      // A budget exhausted mid-thought leaves the opening tag with no partner,
      // and there is no label after it to find.
      answers('<think>Hmm, a ver. El cliente dice que');

      await expect(classifier.classify('hola')).resolves.toEqual({
        intent: 'abstain',
        reason: 'unreadable-answer',
      });
    });

    it('still abstains when the reasoning is followed by prose', async () => {
      answers('<think>pienso</think> creo que es un pedido');

      await expect(classifier.classify('hola')).resolves.toEqual({
        intent: 'abstain',
        reason: 'unreadable-answer',
      });
    });
  });

  describe('every failure resolves to no verdict, and keeps its name', () => {
    const kinds: LlmFailureKind[] = [
      'unconfigured',
      'timeout',
      'transport',
      'provider-error',
      'empty-answer',
    ];

    for (const kind of kinds) {
      it(`abstains with reason "${kind}"`, async () => {
        fails(kind);

        await expect(classifier.classify('hola')).resolves.toEqual({
          intent: 'abstain',
          reason: kind,
        });
      });
    }

    it('does not raise even when the module itself throws', async () => {
      // Nothing is expected to throw; the caller must get a verdict regardless,
      // since there is nothing it would do with an exception that it would not
      // also do with this abstain.
      complete.mockRejectedValue(new Error('boom'));

      await expect(classifier.classify('hola')).resolves.toEqual({
        intent: 'abstain',
        reason: 'provider-error',
      });
    });
  });

  describe('a message with no text is not classified', () => {
    for (const [name, text] of Object.entries({
      'a voice note or an image (no text at all)': undefined,
      'an empty body': '',
      'whitespace only': '   \n\t ',
    })) {
      it(`abstains on ${name} without calling the model`, async () => {
        const verdict = await classifier.classify(text);

        expect(verdict).toEqual({ intent: 'abstain', reason: 'no-text' });
        // No inference, and no transcription either: a message with no text is
        // one a person reads.
        expect(complete).not.toHaveBeenCalled();
      });
    }
  });

  describe('the two silent outcomes stay apart', () => {
    it('distinguishes "not an order" from "could not decide"', async () => {
      answers('NO_PEDIDO');
      const decided = await classifier.classify('gracias');
      fails('timeout');
      const undecided = await classifier.classify('gracias');

      // Both are silence to the customer. In the record they must not be the
      // same thing: one is the classifier working, the other is it failing.
      expect(decided).toEqual({ intent: 'not-order' });
      expect(undecided).toEqual({ intent: 'abstain', reason: 'timeout' });
    });
  });
});

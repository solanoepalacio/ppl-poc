import { Injectable, Logger } from '@nestjs/common';
import { getLangWatchTracer } from 'langwatch/observability';
import { LlmService } from '../llm/llm.service';

export type OrderIntent = 'order' | 'not-order' | 'abstain';

export type AbstainReason =
  | 'no-text'
  | 'unconfigured'
  | 'timeout'
  | 'transport'
  | 'provider-error'
  | 'empty-answer'
  | 'unreadable-answer';

export type OrderIntentVerdict =
  | { intent: 'order' | 'not-order' }
  | { intent: 'abstain'; reason: AbstainReason };

const VOCABULARY = {
  PEDIDO: 'order',
  NO_PEDIDO: 'not-order',
} as const satisfies Record<string, 'order' | 'not-order'>;

const SYSTEM_PROMPT = `Sos un clasificador. Recibís un mensaje de WhatsApp que un cliente le mandó a una panadería y decidís una sola cosa: si el cliente está pidiendo hacer un pedido o no.

Respondé EXACTAMENTE una de estas dos palabras, sin explicar nada, sin puntuación y sin ninguna otra palabra:

PEDIDO — el cliente quiere hacer un pedido: lo pide explícitamente, pide el link o el formulario, dice qué productos y cantidades quiere, o pregunta si puede encargar algo para una fecha o un turno.
NO_PEDIDO — cualquier otra cosa: un saludo suelto, un agradecimiento, una consulta por horarios, precios o ubicación, un reclamo, una confirmación de algo ya hablado, o un mensaje que no se entiende.

Tené en cuenta cómo se escribe en un chat:
- Hay errores de tipeo, faltan tildes y falta puntuación. "kiero", "facturaz", "manana" cuentan igual que las palabras bien escritas.
- Un saludo pegado a un pedido sigue siendo un pedido: "hola! me mandas 3 docenas de facturas para mañana" es PEDIDO.
- Un mensaje puede tener varias oraciones. Si en alguna de ellas pide algo, es PEDIDO.
- Preguntar si hay stock o si llegan a hacer algo, con la intención de encargarlo, es PEDIDO.
- Preguntar solamente a qué hora abren, cuánto sale algo o dónde están, sin encargar nada, es NO_PEDIDO.

Respondé solo con PEDIDO o NO_PEDIDO.`;

@Injectable()
export class OrderIntentClassifier {
  private readonly logger = new Logger('OrderIntent');
  private readonly tracer = getLangWatchTracer('pannico-intent');

  constructor(private readonly llm: LlmService) {}

  async classify(text: string | undefined): Promise<OrderIntentVerdict> {
    const input = text?.trim() ?? '';
    return this.tracer.startActiveSpan('intent.classify', async (span) => {
      try {
        if (input) span.setInput('text', input);
        const verdict = await this.decide(input);
        span.setAttribute('pannico.intent.verdict', verdict.intent);
        if (verdict.intent === 'abstain') {
          span.setAttribute('pannico.intent.abstain_reason', verdict.reason);
        }
        return verdict;
      } catch (e) {
        this.logger.error(
          `Classification failed unexpectedly: ${
            e instanceof Error ? e.message : String(e)
          }`,
        );
        span.setAttribute('pannico.intent.verdict', 'abstain');
        span.setAttribute('pannico.intent.abstain_reason', 'provider-error');
        return { intent: 'abstain', reason: 'provider-error' } as const;
      } finally {
        span.end();
      }
    });
  }

  private async decide(input: string): Promise<OrderIntentVerdict> {
    if (!input) {
      return { intent: 'abstain', reason: 'no-text' };
    }

    const answer = await this.llm.complete({
      system: SYSTEM_PROMPT,
      input,
    });

    if (!answer.ok) return { intent: 'abstain', reason: answer.kind };

    const intent = readVerdict(answer.text);
    if (!intent) {
      this.logger.warn(
        `Unreadable answer from the model: ${JSON.stringify(answer.text.slice(0, 120))}`,
      );
      return { intent: 'abstain', reason: 'unreadable-answer' };
    }
    return { intent };
  }
}

function readVerdict(raw: string): 'order' | 'not-order' | null {
  const withoutReasoning = raw
    // A closed block, and an unclosed one — a budget exhausted mid-thought
    // leaves the opening tag with no partner, and what follows is not an answer.
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/i, '')
    .trim()
    .toUpperCase();

  return Object.prototype.hasOwnProperty.call(VOCABULARY, withoutReasoning)
    ? VOCABULARY[withoutReasoning as keyof typeof VOCABULARY]
    : null;
}

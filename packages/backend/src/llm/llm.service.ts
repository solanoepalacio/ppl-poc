import { Injectable, Logger } from '@nestjs/common';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOllama } from '@langchain/ollama';
import { ChatAnthropic } from '@langchain/anthropic';
import { getLangWatchTracer } from 'langwatch/observability';
import { LangWatchCallbackHandler } from 'langwatch/observability/instrumentation/langchain';
import { LlmConfigService, type LlmConfig } from './llm.config';

/**
 * Why an inference produced no answer. Kept apart rather than collapsed into one
 * error: a caller is free to treat them identically — and the one caller does —
 * but the record is where they have to stay distinguishable, since every one of
 * them looks the same to a customer.
 */
export type LlmFailureKind =
  | 'unconfigured'
  | 'timeout'
  | 'transport'
  | 'provider-error'
  | 'empty-answer';

export type LlmResult =
  | { ok: true; text: string }
  | { ok: false; kind: LlmFailureKind };

/** One inference: an instruction and the text it applies to. */
export type LlmRequest = { system: string; input: string };

/**
 * Output budget.
 *
 * Deliberately hundreds of tokens for a one-word answer. A reasoning model
 * spends this budget on reasoning *before* it emits anything we can read, and on
 * a hosted provider that reasoning counts against the same cap — so a budget
 * sized for the expected answer returns an empty response while the model is
 * working perfectly. Measured: `qwen3.5:9b` with reasoning on burned 2,189 bytes
 * of thinking under a 512-token cap and returned empty content.
 */
const MAX_OUTPUT_TOKENS = 512;

/**
 * Temperature zero. Classification is not a task with a distribution worth
 * sampling from, and a stable answer is what makes a wrong one reproducible
 * enough to fix.
 */
const TEMPERATURE = 0;

/**
 * Keeps the model resident between calls instead of letting it be unloaded.
 *
 * Load-bearing rather than an optimisation. Ollama evicts an idle model after
 * about five minutes, and a bakery's WhatsApp goes quiet for hours — so without
 * this, *nearly every customer message* is a cold start at 15–30 s, against a
 * timeout sized in seconds. The agent would be silent in production and correct
 * only in tests, where messages arrive back to back.
 */
const OLLAMA_KEEP_ALIVE = -1;

/**
 * The backend's single door to a language model.
 *
 * Domain-agnostic on purpose: it takes an instruction and a text and returns the
 * model's answer. It knows nothing about orders, clients, bloques or WhatsApp,
 * and the prompt that does live one module out, in `intent/`.
 *
 * Never throws. Every way a call can fail — unconfigured, unreachable, slow,
 * refused, empty — comes back as a failure kind, because the caller has nothing
 * to do with an exception it would not also do with a failure.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger('Llm');
  private readonly tracer = getLangWatchTracer('pannico-llm');
  /** Built on first use and reused: constructing a client per call would drop
   * the provider's connection pooling for no gain. */
  private model: BaseChatModel | null = null;

  constructor(private readonly config: LlmConfigService) {}

  get enabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Runs one inference and returns the model's answer text.
   *
   * Wrapped in a span of its own rather than relying on the LangChain callback
   * handler alone. The handler traces *model calls*, so it cannot trace the
   * attempts that never became one — an unconfigured module, or a call abandoned
   * at the timeout — and those are precisely the attempts worth looking at,
   * since fail-closed renders them as the agent saying nothing.
   */
  async complete(request: LlmRequest): Promise<LlmResult> {
    return this.tracer.startActiveSpan('llm.complete', async (span) => {
      try {
        span.setType('llm');
        if (!this.config.enabled) {
          // No network request is attempted: there is nothing to attempt it
          // against, and pretending otherwise would turn a startup-visible
          // condition into a per-message timeout.
          span.setAttribute('pannico.llm.outcome', 'unconfigured');
          return { ok: false, kind: 'unconfigured' } as const;
        }

        const config = this.config.require();
        span.setRequestModel(config.model);
        span.setAttribute('pannico.llm.provider', config.provider);

        const result = await this.invoke(config, request);
        span.setAttribute(
          'pannico.llm.outcome',
          result.ok ? 'ok' : result.kind,
        );
        return result;
      } finally {
        span.end();
      }
    });
  }

  /** The call itself, with the timeout and the failure classification around it. */
  private async invoke(
    config: LlmConfig,
    request: LlmRequest,
  ): Promise<LlmResult> {
    const model = (this.model ??= buildModel(config));
    // The abort is ours, so an abort that fires is unambiguously our timeout and
    // not the provider's own — which is what lets `timeout` be reported as
    // itself rather than as a transport failure.
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), config.timeoutMs);

    try {
      const answer = await model
        .withConfig({ callbacks: [new LangWatchCallbackHandler()] })
        .invoke(
          [new SystemMessage(request.system), new HumanMessage(request.input)],
          { signal: abort.signal },
        );

      const text = answerText(answer.content);
      // An empty answer is a failure, not an answer. Returning '' would hand the
      // caller something to parse that can only ever fail to parse, one layer
      // further from the reason it was empty.
      return text ? { ok: true, text } : { ok: false, kind: 'empty-answer' };
    } catch (e) {
      if (abort.signal.aborted) {
        this.logger.warn(`Inference abandoned after ${config.timeoutMs} ms.`);
        return { ok: false, kind: 'timeout' };
      }
      const kind = classify(e);
      // The message can name a host or a status; it carries no credential of
      // ours, which is the only thing that must not reach a log.
      this.logger.error(
        `Inference failed (${kind}): ${e instanceof Error ? e.message : String(e)}`,
      );
      return { ok: false, kind };
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Builds the configured provider's chat model behind LangChain's common
 * interface — the whole point of the dependency, since it is what lets the
 * classifier be written once and neither know nor ask which one answered.
 */
function buildModel(config: LlmConfig): BaseChatModel {
  if (config.provider === 'ollama') {
    return new ChatOllama({
      baseUrl: config.baseUrl,
      model: config.model,
      temperature: TEMPERATURE,
      numPredict: MAX_OUTPUT_TOKENS,
      keepAlive: OLLAMA_KEEP_ALIVE,
      // Reasoning off where the provider supports saying so. On the qwen/deepseek
      // family the reasoning is emitted *into the response text* as a
      // `<think>…</think>` block, which a strict parser reads as no label — a
      // total, silent failure that looks nothing like a token budget. The parser
      // strips one anyway (see `intent/`): this flag must not be the only thing
      // standing between us and that.
      think: false,
    });
  }
  return new ChatAnthropic({
    apiKey: config.apiKey,
    model: config.model,
    temperature: TEMPERATURE,
    maxTokens: MAX_OUTPUT_TOKENS,
    // Explicit rather than left to the default, and disabled rather than given a
    // small budget: extended thinking counts against `maxTokens`, so a cap sized
    // for a one-word answer would truncate inside the thinking block and return
    // nothing at all. There is no classification here worth thinking about.
    thinking: { type: 'disabled' },
  });
}

/**
 * The answer text, and only that.
 *
 * A provider may hand back either a plain string or a list of typed blocks, and
 * where it reasons in a block of its own that block is not part of the answer —
 * it must not reach the caller as though it were.
 */
function answerText(content: unknown): string {
  if (typeof content === 'string') return content.trim();
  if (!Array.isArray(content)) return '';
  return content
    .filter(
      (block): block is { type: string; text: string } =>
        typeof block === 'object' &&
        block !== null &&
        (block as { type?: unknown }).type === 'text' &&
        typeof (block as { text?: unknown }).text === 'string',
    )
    .map((block) => block.text)
    .join('')
    .trim();
}

/**
 * Which kind of failure this was.
 *
 * A status means we reached the provider and it refused; the connection-level
 * errors mean we never did. Anything unrecognised is reported as a provider
 * error rather than a transport one — claiming the network was at fault when we
 * do not know is the more misleading of the two guesses.
 */
function classify(e: unknown): LlmFailureKind {
  const status = (e as { status?: unknown } | null)?.status;
  if (typeof status === 'number') return 'provider-error';

  const text = [
    e instanceof Error ? e.message : String(e),
    (e as { cause?: { code?: unknown } } | null)?.cause?.code ?? '',
  ]
    .join(' ')
    .toLowerCase();
  const transport = [
    'fetch failed',
    'econnrefused',
    'enotfound',
    'ehostunreach',
    'econnreset',
    'etimedout',
    'socket hang up',
    'network',
  ];
  return transport.some((needle) => text.includes(needle))
    ? 'transport'
    : 'provider-error';
}

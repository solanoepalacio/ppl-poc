import { Injectable, Logger } from '@nestjs/common';

/** The providers the module knows how to build a chat model for. */
export const LLM_PROVIDERS = ['ollama', 'anthropic'] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

const isLlmProvider = (value: string): value is LlmProvider =>
  (LLM_PROVIDERS as readonly string[]).includes(value);

/**
 * Everything the module needs to reach a model, once the selected provider's own
 * requirements are met.
 *
 * A union rather than a bag of optionals because the requirements differ:
 * Ollama needs a reachable base URL and has no key at all, a hosted provider
 * needs a key and defaults its URL. Modelling that as one shape with everything
 * optional would push the per-provider check out to every reader.
 */
export type LlmConfig = { timeoutMs: number } & (
  | { provider: 'ollama'; model: string; baseUrl: string }
  | { provider: 'anthropic'; model: string; apiKey: string }
);

/** LangWatch, when it is switched on. */
export type TracingConfig = { apiKey: string; endpoint?: string };

const DEFAULT_TIMEOUT_MS = 60_000;

/**
 * Reads LangWatch's configuration.
 *
 * Tracing is off unless `LANGWATCH_ENABLED` says otherwise, so a fresh copy of
 * `.env.example` traces nothing. Switching it on is a decision someone makes,
 * not something a stray key turns on by being present.
 *
 * Switched on **without** a key throws. The operator asked for tracing and
 * cannot have it, and the two ways of quietly proceeding are both worse: running
 * untraced contradicts what they wrote, and there is nothing to send traces to.
 */
export function readTracingConfig(): TracingConfig | null {
  if (!flag(process.env.LANGWATCH_ENABLED)) return null;

  const apiKey = process.env.LANGWATCH_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'LANGWATCH_ENABLED is set but LANGWATCH_API_KEY is empty. Set the key, or set LANGWATCH_ENABLED=false.',
    );
  }
  const endpoint = process.env.LANGWATCH_ENDPOINT?.trim();
  return endpoint ? { apiKey, endpoint } : { apiKey };
}

/** `true`/`1`/`yes` switch a flag on; anything else, including absence, leaves it off. */
function flag(raw: string | undefined): boolean {
  const value = raw?.trim().toLowerCase();
  return value === 'true' || value === '1' || value === 'yes';
}

@Injectable()
export class LlmConfigService {
  private readonly logger = new Logger('LlmConfig');
  private readonly config: LlmConfig | null;
  private readonly tracing: TracingConfig | null;

  constructor() {
    const provider = process.env.LLM_PROVIDER?.trim();
    const model = process.env.LLM_MODEL?.trim();
    const baseUrl = process.env.LLM_BASE_URL?.trim();
    const apiKey = process.env.LLM_API_KEY?.trim();
    const timeoutMs = positiveInt(process.env.LLM_TIMEOUT_MS) ?? DEFAULT_TIMEOUT_MS;

    // Names only — never values. `LLM_PROVIDER` is listed as missing when it is
    // set to something unrecognised too: a provider we cannot build is as good
    // as no provider, and naming it is what points at the typo.
    const missing: string[] = [];
    if (!provider || !isLlmProvider(provider)) missing.push('LLM_PROVIDER');
    if (!model) missing.push('LLM_MODEL');
    if (provider === 'ollama' && !baseUrl) missing.push('LLM_BASE_URL');
    if (provider === 'anthropic' && !apiKey) missing.push('LLM_API_KEY');

    this.config = null;
    if (model && baseUrl && provider === 'ollama') {
      this.config = { provider, model, baseUrl, timeoutMs };
    } else if (model && apiKey && provider === 'anthropic') {
      this.config = { provider, model, apiKey, timeoutMs };
    }

    this.tracing = readTracingConfig();

    if (this.config) {
      this.logger.log(
        `LLM configured — provider ${this.config.provider}, timeout ${timeoutMs} ms.`,
      );
    } else {
      this.logger.warn(
        `LLM inert — missing: ${missing.join(', ')}. The WhatsApp agent will not reply ` +
          'to anything until these are set; it does not fall back to replying.',
      );
    }

    if (!this.tracing) {
      this.logger.warn('LangWatch tracing off — LANGWATCH_ENABLED is not set.');
    }
  }

  get enabled(): boolean {
    return this.config !== null;
  }

  /** Throws rather than returning null, so callers cannot forget to check. */
  require(): LlmConfig {
    if (!this.config) {
      throw new Error('LLM is not configured.');
    }
    return this.config;
  }

  get tracingEnabled(): boolean {
    return this.tracing !== null;
  }
}

/** A positive integer, or nothing — an unreadable or zero value is not a timeout. */
function positiveInt(raw: string | undefined): number | null {
  const value = Number(raw?.trim());
  return Number.isInteger(value) && value > 0 ? value : null;
}

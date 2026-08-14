import { Injectable, Logger } from '@nestjs/common';

/** The providers the module knows how to build a chat model for. */
export const LLM_PROVIDERS = ['ollama', 'anthropic', 'groq'] as const;
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
  | { provider: 'groq'; model: string; apiKey: string }
);

/** Providers whose requirement is a key rather than a URL they can be pointed at. */
const KEYED_PROVIDERS = ['anthropic', 'groq'] as const;
type KeyedProvider = (typeof KEYED_PROVIDERS)[number];

const isKeyedProvider = (value: string | undefined): value is KeyedProvider =>
  (KEYED_PROVIDERS as readonly string[]).includes(value ?? '');

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
    this.tracing = readTracingConfig();
    if (!this.tracing) {
      this.logger.warn('LangWatch tracing off — LANGWATCH_ENABLED is not set.');
    }

    // Off unless someone said otherwise. A model that answers customers is not
    // something a half-filled .env should switch on by accident, and the flag is
    // also the off switch for the agent as a whole: with it unset the WhatsApp
    // webhook records what arrived and does nothing else.
    if (!flag(process.env.LLM_ENABLED)) {
      this.config = null;
      this.logger.warn(
        'LLM disabled — LLM_ENABLED is not set. The WhatsApp agent will record inbound ' +
          'messages and neither create links nor reply to anything.',
      );
      return;
    }

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
    if (isKeyedProvider(provider) && !apiKey) missing.push('LLM_API_KEY');

    // Switched on and incomplete is a contradiction, so it stops the boot rather
    // than degrading to inert. Degrading is what this used to do, and it made the
    // two states that matter look alike from outside: an agent somebody turned
    // off, and an agent somebody meant to turn on and mistyped.
    if (missing.length > 0) {
      throw new Error(
        `LLM_ENABLED is set but the configuration is incomplete — missing: ${missing.join(
          ', ',
        )}. Set them, or set LLM_ENABLED=false.`,
      );
    }

    this.config = null;
    if (model && baseUrl && provider === 'ollama') {
      this.config = { provider, model, baseUrl, timeoutMs };
    } else if (model && apiKey && isKeyedProvider(provider)) {
      this.config = { provider, model, apiKey, timeoutMs };
    }

    this.logger.log(
      `LLM enabled — provider ${provider}, timeout ${timeoutMs} ms.`,
    );
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

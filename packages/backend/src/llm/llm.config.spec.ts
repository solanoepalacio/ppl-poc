import { Logger } from '@nestjs/common';
import { LlmConfigService, readTracingConfig } from './llm.config';

/** Every variable the service reads, cleared before each case so one test's
 * environment cannot leak into the next. */
const VARS = [
  'LLM_PROVIDER',
  'LLM_MODEL',
  'LLM_BASE_URL',
  'LLM_API_KEY',
  'LLM_TIMEOUT_MS',
  'LANGWATCH_ENABLED',
  'LANGWATCH_API_KEY',
  'LANGWATCH_ENDPOINT',
] as const;

const OLLAMA = {
  LLM_PROVIDER: 'ollama',
  LLM_MODEL: 'gemma4:12b-it-qat',
  LLM_BASE_URL: 'http://inference.test:11434',
};

const ANTHROPIC = {
  LLM_PROVIDER: 'anthropic',
  LLM_MODEL: 'claude-sonnet-5',
  LLM_API_KEY: 'sk-ant-secretisimo',
};

describe('LlmConfigService', () => {
  let logs: string[];

  /** Everything the service said, so a test can assert on what was named — and,
   * more importantly, on what was not. */
  const build = (env: Record<string, string>) => {
    Object.assign(process.env, env);
    return new LlmConfigService();
  };

  beforeEach(() => {
    for (const name of VARS) delete process.env[name];
    logs = [];
    const capture = (message: unknown) => {
      logs.push(String(message));
    };
    jest.spyOn(Logger.prototype, 'log').mockImplementation(capture);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(capture);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const name of VARS) delete process.env[name];
  });

  describe('completeness is decided per provider', () => {
    it('reports ready with everything ollama needs', () => {
      const config = build(OLLAMA);

      expect(config.enabled).toBe(true);
      expect(config.require()).toEqual({
        provider: 'ollama',
        model: 'gemma4:12b-it-qat',
        baseUrl: 'http://inference.test:11434',
        timeoutMs: 60_000,
      });
    });

    it('reports ready with everything the hosted provider needs', () => {
      const config = build(ANTHROPIC);

      expect(config.enabled).toBe(true);
      expect(config.require()).toEqual({
        provider: 'anthropic',
        model: 'claude-sonnet-5',
        apiKey: 'sk-ant-secretisimo',
        timeoutMs: 60_000,
      });
    });

    it('does not require a key for ollama, nor a base URL for the hosted one', () => {
      // The asymmetry is the whole reason "is the LLM configured?" is a question
      // the provider answers: a value mandatory for one is irrelevant to the
      // other, so a single required-variable list would be wrong for both.
      expect(build(OLLAMA).enabled).toBe(true);
      for (const name of VARS) delete process.env[name];
      expect(build(ANTHROPIC).enabled).toBe(true);
    });
  });

  describe('a partial configuration counts as none', () => {
    it('is inert without a model, and names it', () => {
      const config = build({ LLM_PROVIDER: 'ollama', LLM_BASE_URL: OLLAMA.LLM_BASE_URL });

      expect(config.enabled).toBe(false);
      expect(logs.join('\n')).toContain('LLM_MODEL');
    });

    it('is inert when ollama has no base URL, and names it', () => {
      const config = build({ LLM_PROVIDER: 'ollama', LLM_MODEL: 'gemma4:12b-it-qat' });

      expect(config.enabled).toBe(false);
      expect(logs.join('\n')).toContain('LLM_BASE_URL');
    });

    it('is inert when the hosted provider has no key, and names it', () => {
      const config = build({ LLM_PROVIDER: 'anthropic', LLM_MODEL: 'claude-sonnet-5' });

      expect(config.enabled).toBe(false);
      expect(logs.join('\n')).toContain('LLM_API_KEY');
    });

    it('is inert with no provider at all', () => {
      const config = build({ LLM_MODEL: 'gemma4:12b-it-qat', LLM_BASE_URL: 'http://x' });

      expect(config.enabled).toBe(false);
      expect(logs.join('\n')).toContain('LLM_PROVIDER');
    });

    it('treats a provider it cannot build as no provider', () => {
      // Naming LLM_PROVIDER is what points at the typo; silently falling through
      // to a default would start the agent against a model nobody chose.
      const config = build({ ...OLLAMA, LLM_PROVIDER: 'ollma' });

      expect(config.enabled).toBe(false);
      expect(logs.join('\n')).toContain('LLM_PROVIDER');
    });

    it('throws from require() rather than handing back nothing', () => {
      expect(() => build({}).require()).toThrow(/not configured/i);
    });

    it('says that being inert means silence, not a fallback', () => {
      // The failure mode this is guarding against is somebody reading "LLM
      // inert" as "the agent carries on as before". It does not: it stops
      // replying entirely.
      build({});

      expect(logs.join('\n')).toMatch(/will not reply/i);
    });
  });

  describe('logging', () => {
    it('logs names, never values', () => {
      build({ ...ANTHROPIC, LANGWATCH_API_KEY: 'sk-lw-tambien-secreto' });

      const said = logs.join('\n');
      expect(said).toContain('anthropic');
      expect(said).not.toContain('sk-ant-secretisimo');
      expect(said).not.toContain('sk-lw-tambien-secreto');
      expect(said).not.toContain('claude-sonnet-5');
    });

    it('does not print the endpoint either', () => {
      build(OLLAMA);

      expect(logs.join('\n')).not.toContain('inference.test');
    });
  });

  describe('timeout', () => {
    it('takes the configured value', () => {
      expect(build({ ...OLLAMA, LLM_TIMEOUT_MS: '4500' }).require().timeoutMs).toBe(4500);
    });

    it('falls back to the default for an unreadable or non-positive value', () => {
      // A zero or negative timeout is not a shorter timeout, it is a call that
      // can never complete — so it is read as "unset" rather than obeyed.
      for (const raw of ['', 'pronto', '0', '-1', '1.5']) {
        for (const name of VARS) delete process.env[name];
        expect(build({ ...OLLAMA, LLM_TIMEOUT_MS: raw }).require().timeoutMs).toBe(60_000);
      }
    });
  });

  describe('tracing is configured separately from the model', () => {
    it('is off, and says so, when the flag is unset', () => {
      const config = build(OLLAMA);

      expect(config.tracingEnabled).toBe(false);
      // Off is a warning, not an error: the model is still fully configured.
      expect(config.enabled).toBe(true);
      expect(logs.join('\n')).toContain('LANGWATCH_ENABLED');
    });

    it('stays off for a key alone, without the flag', () => {
      // The flag is the switch. A key that happens to be in the environment —
      // shared with another project, left over from a trial — must not start
      // shipping customers' messages somewhere on its own.
      const config = build({ ...OLLAMA, LANGWATCH_API_KEY: 'sk-lw-1' });

      expect(config.tracingEnabled).toBe(false);
    });

    it('is on with the flag and a key, endpoint optional', () => {
      process.env.LANGWATCH_ENABLED = 'true';
      process.env.LANGWATCH_API_KEY = 'sk-lw-1';
      expect(readTracingConfig()).toEqual({ apiKey: 'sk-lw-1' });

      process.env.LANGWATCH_ENDPOINT = 'https://lw.test';
      expect(readTracingConfig()).toEqual({
        apiKey: 'sk-lw-1',
        endpoint: 'https://lw.test',
      });
    });

    it('accepts the usual spellings of on, and nothing else', () => {
      for (const raw of ['true', 'TRUE', '1', 'yes', ' true ']) {
        process.env.LANGWATCH_ENABLED = raw;
        process.env.LANGWATCH_API_KEY = 'sk-lw-1';
        expect(readTracingConfig()).not.toBeNull();
      }
      for (const raw of ['false', '0', 'no', '', 'sí', 'enabled']) {
        process.env.LANGWATCH_ENABLED = raw;
        expect(readTracingConfig()).toBeNull();
      }
    });

    it('refuses to start when switched on without a key', () => {
      // Asking for tracing and giving it nothing to authenticate with is a
      // contradiction the operator wrote. Running untraced would be ignoring it.
      expect(() => build({ ...OLLAMA, LANGWATCH_ENABLED: 'true' })).toThrow(
        /LANGWATCH_API_KEY/,
      );
    });

    it('does not make an otherwise inert model configured', () => {
      const config = build({ LANGWATCH_ENABLED: 'true', LANGWATCH_API_KEY: 'sk-lw-1' });

      expect(config.tracingEnabled).toBe(true);
      expect(config.enabled).toBe(false);
    });
  });
});

import { Logger } from '@nestjs/common';
import { LlmService } from './llm.service';
import type { LlmConfig, LlmConfigService } from './llm.config';

/**
 * The startup check, which is the one place this module is allowed to stop the
 * app. Two things have to hold — the provider answers, and it is serving the
 * configured model — and neither of them raises anything on its own at runtime:
 * both just make every message abstain, which fail-closed renders as an agent
 * that quietly stopped working.
 */
describe('LlmService startup check', () => {
  let fetchMock: jest.Mock;

  const OLLAMA: LlmConfig = {
    provider: 'ollama',
    model: 'qwen3:32b',
    baseUrl: 'http://inference.test:11434',
    timeoutMs: 5_000,
  };
  const ANTHROPIC: LlmConfig = {
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    apiKey: 'sk-ant-secretisimo',
    timeoutMs: 5_000,
  };
  const GROQ: LlmConfig = {
    provider: 'groq',
    model: 'qwen/qwen3-32b',
    apiKey: 'gsk-tambien-secreto',
    timeoutMs: 5_000,
  };

  const serviceFor = (config: LlmConfig | null) =>
    new LlmService({
      enabled: config !== null,
      require: () => {
        if (!config) throw new Error('LLM is not configured.');
        return config;
      },
    } as unknown as LlmConfigService);

  /** A provider answering with this status and body. */
  const answers = (status: number, body: unknown = {}) =>
    fetchMock.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: status === 401 ? 'Unauthorized' : 'Error',
      json: async () => body,
    });

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => jest.restoreAllMocks());

  it('checks nothing when the agent is switched off', async () => {
    await expect(serviceFor(null).onApplicationBootstrap()).resolves.toBeUndefined();

    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe('the request asks about the configured model', () => {
    it('asks ollama about that model by name', async () => {
      answers(200);

      await serviceFor(OLLAMA).onApplicationBootstrap();

      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe('http://inference.test:11434/api/show');
      // `/api/show` rather than the model list: it resolves a name exactly as an
      // inference call would, and reads a manifest instead of loading anything.
      expect(init.method).toBe('POST');
      expect(JSON.parse(init.body)).toEqual({ model: 'qwen3:32b' });
    });

    it('trims a trailing slash off the base URL', async () => {
      answers(200);

      await serviceFor({ ...OLLAMA, baseUrl: 'http://inference.test:11434/' })
        .onApplicationBootstrap();

      expect(fetchMock.mock.calls[0][0]).toBe('http://inference.test:11434/api/show');
    });

    it('asks anthropic about that model by path, authenticated', async () => {
      answers(200);

      await serviceFor(ANTHROPIC).onApplicationBootstrap();

      const [url, init] = fetchMock.mock.calls[0];
      // By path rather than by list, because this resolves aliases that the
      // listing does not carry as entries.
      expect(url).toBe('https://api.anthropic.com/v1/models/claude-sonnet-5');
      expect(init.headers).toEqual({
        'x-api-key': 'sk-ant-secretisimo',
        'anthropic-version': '2023-06-01',
      });
    });

    it('reads groq’s list and finds the model in it', async () => {
      answers(200, { data: [{ id: 'llama-3.3-70b-versatile' }, { id: 'qwen/qwen3-32b' }] });

      await expect(serviceFor(GROQ).onApplicationBootstrap()).resolves.toBeUndefined();

      expect(fetchMock.mock.calls[0][0]).toBe('https://api.groq.com/openai/v1/models');
      expect(fetchMock.mock.calls[0][1].headers).toEqual({
        Authorization: 'Bearer gsk-tambien-secreto',
      });
    });
  });

  describe('a model the provider does not have stops the boot', () => {
    it('fails on a 404 from a per-model endpoint', async () => {
      answers(404);

      await expect(serviceFor(ANTHROPIC).onApplicationBootstrap()).rejects.toThrow(
        /no model named "claude-sonnet-5"/,
      );
    });

    it('fails when a listing answers 200 without the model', async () => {
      // The status is only the preamble here: a list endpoint answers 200
      // whether or not it lists the model we asked for.
      answers(200, { data: [{ id: 'llama-3.3-70b-versatile' }] });

      await expect(serviceFor(GROQ).onApplicationBootstrap()).rejects.toThrow(
        /no model named "qwen\/qwen3-32b"/,
      );
    });

    it('names what the ollama server does have', async () => {
      // A name off by a tag looks identical to a model that was never pulled
      // until the list is beside it.
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ models: [{ model: 'qwen3:32b' }, { model: 'gpt-oss:20b' }] }),
        });

      await expect(
        serviceFor({ ...OLLAMA, model: 'qwen3' }).onApplicationBootstrap(),
      ).rejects.toThrow(/no model named "qwen3".*qwen3:32b, gpt-oss:20b/s);
    });

    it('still reports the missing model when the list cannot be fetched', async () => {
      // The follow-up is a courtesy; failing it must not replace the real error.
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 404, statusText: 'Not Found' })
        .mockRejectedValueOnce(new Error('gone'));

      await expect(serviceFor(OLLAMA).onApplicationBootstrap()).rejects.toThrow(
        /no model named "qwen3:32b"/,
      );
    });
  });

  describe('the other ways it can be unusable stay distinguishable', () => {
    it('reports a rejected credential as such, not as a missing model', async () => {
      // The fix is a different one, so the message has to be too.
      for (const status of [401, 403]) {
        answers(status);
        await expect(serviceFor(GROQ).onApplicationBootstrap()).rejects.toThrow(
          new RegExp(`rejected the credential \\(${status}\\)`),
        );
      }
    });

    it('reports any other refusal with its status', async () => {
      answers(500);

      await expect(serviceFor(OLLAMA).onApplicationBootstrap()).rejects.toThrow(
        /answered 500/,
      );
    });

    it('reports an unreachable provider', async () => {
      fetchMock.mockRejectedValue(new Error('fetch failed'));

      await expect(serviceFor(OLLAMA).onApplicationBootstrap()).rejects.toThrow(
        /fetch failed/,
      );
    });

    it('reports a provider that never answers as a timeout', async () => {
      fetchMock.mockImplementation(
        (_url, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => reject(new Error('aborted')));
          }),
      );

      await expect(
        serviceFor({ ...OLLAMA, timeoutMs: 20 }).onApplicationBootstrap(),
      ).rejects.toThrow(/no answer within 20 ms/);
    });

    it('always says how to start without the agent', async () => {
      // Whatever went wrong, the operator has two ways out and one of them is
      // always available.
      answers(500);

      await expect(serviceFor(OLLAMA).onApplicationBootstrap()).rejects.toThrow(
        /set LLM_ENABLED=false/,
      );
    });
  });
});

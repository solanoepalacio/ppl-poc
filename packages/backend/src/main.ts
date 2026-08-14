import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { setupObservability } from 'langwatch/observability/node';
import { AppModule } from './app.module';
import { readTracingConfig } from './llm/llm.config';

/**
 * Starts LangWatch, if it is configured at all.
 *
 * Before `NestFactory.create`, and deliberately: the tracer provider has to
 * exist before anything that might trace is instantiated, and a provider
 * installed afterwards is one the already-built spans never see.
 *
 * Two different failures, handled differently. Asking for tracing without a key
 * is a contradiction the operator wrote, and `readTracingConfig` throws it
 * outward. A collector that refuses the connection is not: an untraced backend
 * still takes orders, so that is logged and stepped over.
 */
function startTracing(): void {
  const tracing = readTracingConfig();
  if (!tracing) return;
  try {
    setupObservability({
      serviceName: 'pannico-backend',
      langwatch: { apiKey: tracing.apiKey, endpoint: tracing.endpoint },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(
      `LangWatch setup failed; continuing without tracing: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
}

async function bootstrap(): Promise<void> {
  startTracing();

  // `rawBody` keeps the exact bytes of each request body alongside the parsed
  // one. The WhatsApp webhook needs them: Meta's signature is an HMAC over what
  // was actually sent, and verifying it against a re-serialised payload proves
  // only that we can re-serialise — any difference in key order or whitespace
  // changes the digest.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Browser traffic reaches the backend through the Next.js proxy
  // (same-origin), so cross-origin CORS is normally unnecessary. Only enable it
  // when the backend is exposed directly, restricting to an explicit allowlist
  // via CORS_ORIGIN (comma-separated origins).
  if (process.env.CORS_ORIGIN) {
    const origin = process.env.CORS_ORIGIN.split(',').map((o) => o.trim());
    app.enableCors({ origin });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
}

void bootstrap();

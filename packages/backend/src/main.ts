import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

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

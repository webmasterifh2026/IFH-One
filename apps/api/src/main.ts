/**
 * main.ts — v2.10.0
 *
 * Startup improvements:
 *  - Structured startup logging (timestamps, milestones)
 *  - Raw /health endpoint registered BEFORE NestJS global prefix
 *    so it's always reachable at /health (no /api prefix) with zero auth
 *  - CORS includes all Vercel preview deploy patterns
 *  - PORT from environment (Railway injects this at runtime)
 */

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import packageJson from '../package.json';

const ALWAYS_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://ifh-one-web.vercel.app',
];

const startTime = Date.now();

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('⏳ IFH One API starting…');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
    bufferLogs: false,
  });

  // ── Static file serving for uploaded documents (gate entry photos, etc.) ───
  // Served BEFORE the global 'api' prefix is applied to routes, at /uploads/*
  // so URLs returned by the upload endpoint are stable regardless of prefix.
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads/' });

  // ── Global API prefix ───────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Security Headers (Helmet) ───────────────────────────────────────────────
  app.use(
    helmet({
      crossOriginResourcePolicy: false, // Allows images/assets to be loaded by Vercel frontend
    }),
  );

  // ── Increase Body Limit for Bulk Imports ────────────────────────────────────
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  // ── CORS ────────────────────────────────────────────────────────────────────
  const envOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const allowedOrigins = Array.from(
    new Set([...ALWAYS_ALLOWED_ORIGINS, ...envOrigins]),
  );
  logger.log(`CORS origins: ${allowedOrigins.join(', ')}`);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || origin === 'null') return callback(null, true); // server-to-server / curl / local file
      if (allowedOrigins.includes(origin)) return callback(null, true);
      if (origin.endsWith('.vercel.app')) return callback(null, true); // Vercel previews
      if (allowedOrigins.includes('*')) return callback(null, true);
      logger.warn(`CORS blocked: ${origin}`);
      callback(new Error(`CORS policy: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
    exposedHeaders: ['Content-Range', 'X-Total-Count'],
    optionsSuccessStatus: 200,
    preflightContinue: false,
  });

  // ── Validation ──────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // ── Swagger / OpenAPI Documentation ─────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('IFH One API')
    .setDescription(
      'Enterprise Procurement Management System API Documentation',
    )
    .setVersion(`v${packageJson.version}`)
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  // ── Exception filter ────────────────────────────────────────────────────────
  app.useGlobalFilters(new AllExceptionsFilter());

  // ── Raw /health — registered BEFORE listen, no global prefix, no JWT ────────
  // This is the endpoint used by the frontend ping probe and Railway health checks.
  // It is ALWAYS reachable at GET /health regardless of NestJS guard configuration.
  const httpAdapter = app.getHttpAdapter();
  httpAdapter.get('/health', (_req: any, res: any) => {
    res.setHeader('Content-Type', 'application/json');
    const memory = process.memoryUsage();
    res.end(
      JSON.stringify({
        status: 'ok',
        version: packageJson.version,
        ts: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        env: process.env.NODE_ENV ?? 'unknown',
        database: process.env.DATABASE_URL ? 'configured' : 'missing',
        emailService: process.env.SMTP_HOST ? 'configured' : 'missing',
        memory: {
          rss: `${Math.round(memory.rss / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)} MB`,
        },
      }),
    );
  });

  // ── Start listening ─────────────────────────────────────────────────────────
  const port = parseInt(process.env.PORT || '3001', 10);
  await app.listen(port, '0.0.0.0');

  const elapsed = Date.now() - startTime;
  logger.log(`✅ IFH One API ready on port ${port} (${elapsed}ms)`);
  logger.log(`   Health: http://0.0.0.0:${port}/health`);
  logger.log(`   Ping:   http://0.0.0.0:${port}/api/health/ping`);
}

bootstrap().catch((err) => {
  // Fatal startup error — log and exit so the process manager restarts cleanly
  const logger = new Logger('Bootstrap');
  logger.error('❌ Fatal startup error', err?.stack ?? String(err));
  process.exit(1);
});

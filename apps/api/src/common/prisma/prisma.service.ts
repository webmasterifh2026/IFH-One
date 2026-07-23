import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Append Neon-friendly pool params if not already present
    const rawUrl = process.env.DATABASE_URL || '';
    let url = rawUrl;
    if (url && !url.includes('pgbouncer=true') && url.includes('-pooler')) {
      url += (url.includes('?') ? '&' : '?') + 'pgbouncer=true';
    }
    if (!url.includes('connect_timeout')) {
      // Connection pool: 20 connections for concurrent operations
      // Neon serverless can handle this with pgbouncer
      url +=
        (url.includes('?') ? '&' : '?') +
        'connect_timeout=15&pool_timeout=15&connection_limit=20';
    }

    super({
      datasources: { db: { url } },
      // Neon serverless: log queries and errors in dev for debugging, errors only in prod
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'warn', 'error']
          : ['error'],
      // Transaction timeouts
      transactionOptions: {
        maxWait: 10_000,
        timeout: 30_000,
      },
    });
  }

  async onModuleInit() {
    let retries = 5;
    while (retries > 0) {
      try {
        await this.$connect();
        this.logger.log('✅ Successfully connected to Neon database');
        return;
      } catch (e) {
        retries--;
        this.logger.warn(`❌ DB connect failed, retries left: ${retries}`);
        if (retries === 0) {
          this.logger.error(
            `❌ Failed to connect to database after 5 retries`,
            e instanceof Error ? e.stack : String(e),
          );
          throw e;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

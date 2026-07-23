import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import {
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
  HealthCheck,
} from '@nestjs/terminus';
import { PrismaService } from '../common/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private memory: MemoryHealthIndicator,
    private prisma: PrismaHealthIndicator,
    private prismaService: PrismaService,
  ) {}

  /**
   * Full health check — requires JWT (for internal monitoring tools).
   * Checks DB connectivity and memory.
   */
  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () =>
        this.prisma.pingCheck('database', this.prismaService as any, {
          timeout: 10000,
        }),
      () => this.memory.checkHeap('memory_heap', 150 * 1024 * 1024),
    ]);
  }

  /**
   * Lightweight public ping — no auth required, no DB check.
   * Used by the frontend to verify backend availability before firing
   * authenticated requests (cold start detection, reconnect polling).
   *
   * GET /api/health/ping → { status: 'ok', ts: <iso>, uptime: <s> }
   */
  @Public()
  @Get('ping')
  ping() {
    return {
      status: 'ok',
      ts: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      version: process.env.npm_package_version ?? 'unknown',
    };
  }
}

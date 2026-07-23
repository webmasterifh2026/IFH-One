import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // OPTIONS preflight must always return 200 — never 500
    if (request.method === 'OPTIONS') {
      this.logger.warn(
        `OPTIONS preflight exception suppressed for ${request.url}`,
      );
      return response.status(200).end();
    }

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetail =
      exception instanceof Error ? exception.message : 'Unknown error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse() as any;
      message = typeof res === 'string' ? res : res.message || message;
      errorDetail = typeof res === 'string' ? res : res.error || errorDetail;
    } else {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}: ${errorDetail}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json({
      success: false,
      message,
      error: errorDetail,
    });
  }
}

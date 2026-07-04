import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

// Catches everything that reaches the HTTP layer. HttpExceptions keep their own
// body (validation messages, 401/403/404 details); unexpected errors return a
// generic message so internals aren't leaked, but are logged in full with the
// request's correlation id so a 500 is always traceable back to its request.
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @InjectPinoLogger(AllExceptionsFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<{ id?: unknown; url?: string }>();
    const correlationId = typeof req.id === 'string' ? req.id : undefined;

    const isHttp = exception instanceof HttpException;
    const status = isHttp
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const responseBody = isHttp ? exception.getResponse() : undefined;
    const base =
      responseBody && typeof responseBody === 'object'
        ? (responseBody as Record<string, unknown>)
        : {
            statusCode: status,
            message: isHttp ? String(responseBody) : 'Internal server error',
          };

    const logCtx = { correlation_id: correlationId, status, path: req.url };
    if (status >= 500) {
      // Something we didn't anticipate — log the full error + stack.
      this.logger.error({ ...logCtx, err: exception }, 'Unhandled exception');
    } else {
      // Client error — log at warn without stack noise.
      this.logger.warn(logCtx, isHttp ? exception.message : 'Request error');
    }

    httpAdapter.reply(
      ctx.getResponse(),
      { ...base, correlationId, timestamp: new Date().toISOString() },
      status,
    );
  }
}

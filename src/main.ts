import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { GracefulShutdownService } from './health/graceful-shutdown.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.listen(process.env.PORT ?? 3000);

  // Graceful shutdown. On a signal we flip readiness to not-ready and hold the
  // grace window first (so a load balancer drains), THEN app.close() runs the
  // Nest lifecycle — BullMQ workers finish in-flight jobs and DB/Redis close
  // cleanly. Doing the delay here (not in a lifecycle hook) keeps it strictly
  // before teardown, since onModuleDestroy would otherwise close Redis first.
  const shutdown = app.get(GracefulShutdownService, { strict: false });
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => {
      void (async () => {
        await shutdown.beginDrain(signal);
        await app.close();
        process.exit(0);
      })();
    });
  }
}
void bootstrap();

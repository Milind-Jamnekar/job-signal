import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import basicAuth from 'express-basic-auth';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { envValidationSchema } from './config/env.validation';
import { entities } from './database/entities';
import { EnrichmentModule } from './enrichment/enrichment.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';
import { NotificationModule } from './notifications/notification.module';
import { RedisModule } from './redis/redis.module';
import { S3Module } from './s3/s3.module';
import { SavedSearchesModule } from './saved-searches/saved-searches.module';
import { ScrapingModule } from './scraping/scraping.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty' }
            : undefined,
      },
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities,
        migrations: [__dirname + '/database/migrations/*.{ts,js}'],
        // Schema is owned by migrations, never auto-synced. In prod, apply them
        // explicitly as a deploy step (npm run migration:run); everywhere else
        // pending migrations run on boot for a frictionless dev/CI loop.
        synchronize: false,
        migrationsRun: config.get<string>('NODE_ENV') !== 'production',
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
        },
      }),
    }),
    BullBoardModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        route: '/admin/queues',
        adapter: ExpressAdapter,
        middleware: basicAuth({
          users: {
            [config.get<string>('BULL_BOARD_USER') ?? 'admin']:
              config.get<string>('BULL_BOARD_PASS') ?? 'admin',
          },
          challenge: true,
        }),
      }),
    }),
    RedisModule,
    S3Module,
    AuthModule,
    JobsModule,
    SavedSearchesModule,
    ScrapingModule,
    EnrichmentModule,
    NotificationModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

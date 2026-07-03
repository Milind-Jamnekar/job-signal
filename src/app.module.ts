import { ExpressAdapter } from '@bull-board/express';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import basicAuth from 'express-basic-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { envValidationSchema } from './config/env.validation';
import { Company } from './entities/company.entity';
import { Job } from './entities/job.entity';
import { JobOutbox } from './entities/job-outbox.entity';
import { SavedSearch } from './entities/saved-search.entity';
import { User } from './entities/user.entity';
import { AuthModule } from './auth/auth.module';
import { EnrichmentModule } from './enrichment/enrichment.module';
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
        entities: [Company, Job, JobOutbox, User, SavedSearch],
        synchronize: true,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

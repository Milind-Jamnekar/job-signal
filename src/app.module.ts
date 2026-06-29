import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import basicAuth from 'express-basic-auth';
import { AppController } from './app.controller';
import { envValidationSchema } from './config/env.validation';
import { AppService } from './app.service';
import { Company } from './entities/company.entity';
import { Job } from './entities/job.entity';
import { SavedSearch } from './entities/saved-search.entity';
import { User } from './entities/user.entity';
import { JobsModule } from './jobs/jobs.module';
import { RedisModule } from './redis/redis.module';
import { ScrapingModule } from './scraping/scraping.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        entities: [Company, Job, User, SavedSearch],
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
        route: '/queues',
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
    JobsModule,
    ScrapingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

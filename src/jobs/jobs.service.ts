import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import IORedis, { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import { Job } from '../entities/job.entity';
import { REDIS_CLIENT } from '../redis/redis.module';
import { ListJobsDto } from './dto/list-jobs.dto';

const CACHE_TTL_SECONDS = 300;

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name);
  private subscriber!: Redis;

  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    this.subscriber = new IORedis(
      this.config.get<string>('REDIS_URL') ?? 'redis://localhost:6379',
    );
    void this.subscriber.subscribe('INVALIDATE_JOBS_CACHE');
    this.subscriber.on('message', () => {
      void this.invalidateCache();
    });
  }

  onModuleDestroy() {
    this.subscriber.disconnect();
  }

  async findAll(dto: ListJobsDto): Promise<{ data: Job[]; total: number }> {
    const params = Object.entries(dto)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${String(v)}`)
      .join('&');
    const cacheKey = `jobs:list:${createHash('sha256').update(params).digest('hex')}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit ${cacheKey}`);
      return JSON.parse(cached) as { data: Job[]; total: number };
    }

    const { page, limit } = dto;
    const [data, total] = await this.jobRepo.findAndCount({
      where: { status: 'active' },
      order: { freshnessScore: 'DESC', scrapedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const result = { data, total };

    await this.redis.set(
      cacheKey,
      JSON.stringify(result),
      'EX',
      CACHE_TTL_SECONDS,
    );
    return result;
  }

  private async invalidateCache(): Promise<void> {
    let cursor = '0';
    let deleted = 0;
    do {
      const [next, keys] = await this.redis.scan(
        cursor,
        'MATCH',
        'jobs:list:*',
        'COUNT',
        100,
      );
      cursor = next;
      if (keys.length > 0) {
        await this.redis.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== '0');
    this.logger.log(`Cache invalidated (${deleted} keys)`);
  }
}

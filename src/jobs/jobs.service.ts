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
import { Brackets, Repository } from 'typeorm';
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
    // Without an 'error' listener, ioredis emitting 'error' on a connection blip
    // would crash the process (unhandled EventEmitter error).
    this.subscriber.on('error', (err: Error) =>
      this.logger.warn(`Cache-invalidation subscriber error: ${err.message}`),
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

    const cached = await this.safeCacheGet(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit ${cacheKey}`);
      return cached;
    }

    const { page, limit, keywords } = dto;
    const qb = this.jobRepo
      .createQueryBuilder('job')
      .where('job.status = :status', { status: 'active' });

    // A job matches if ANY keyword appears in its title or description.
    if (keywords && keywords.length > 0) {
      qb.andWhere(
        new Brackets((w) => {
          keywords.forEach((kw, i) => {
            w.orWhere(
              `(job.title ILIKE :kw${i} OR job.description ILIKE :kw${i})`,
              { [`kw${i}`]: `%${kw}%` },
            );
          });
        }),
      );
    }

    const [data, total] = await qb
      .orderBy('job.freshnessScore', 'DESC')
      .addOrderBy('job.scrapedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const result = { data, total };

    await this.safeCacheSet(cacheKey, result);
    return result;
  }

  // Cache is an optimization, not a hard dependency: a Redis outage (or a
  // corrupt entry) must fall through to Postgres rather than fail GET /jobs.
  private async safeCacheGet(
    key: string,
  ): Promise<{ data: Job[]; total: number } | null> {
    try {
      const cached = await this.redis.get(key);
      return cached
        ? (JSON.parse(cached) as { data: Job[]; total: number })
        : null;
    } catch (err) {
      this.logger.warn(
        `Cache read failed, serving from DB: ${(err as Error).message}`,
      );
      return null;
    }
  }

  private async safeCacheSet(
    key: string,
    value: { data: Job[]; total: number },
  ): Promise<void> {
    try {
      await this.redis.set(key, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(`Cache write failed: ${(err as Error).message}`);
    }
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

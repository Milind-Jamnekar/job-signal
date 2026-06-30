import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Job as BullJob, Queue } from 'bullmq';
import { createHash } from 'crypto';
import { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import { Company } from '../entities/company.entity';
import { Job } from '../entities/job.entity';
import { JobOutbox } from '../entities/job-outbox.entity';
import { REDIS_CLIENT } from '../redis/redis.module';
import { FreshnessScorer } from './freshness-scorer';
import { RemoteOkSource } from './sources/remote-ok.source';

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

@Processor('scrape')
export class ScraperWorker extends WorkerHost {
  private readonly logger = new Logger(ScraperWorker.name);

  constructor(
    @InjectQueue('scrape-dlq') private readonly dlqQueue: Queue,
    private readonly scorer: FreshnessScorer,
    private readonly remoteOkSource: RemoteOkSource,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    super();
  }

  async process(job: BullJob): Promise<void> {
    const scrapeJobId = job.id;
    const source = this.remoteOkSource;

    this.logger.log(
      `Starting scrape [${source.sourceName}] job=${scrapeJobId}`,
    );

    // fetchListings() errors propagate — BullMQ retry + DLQ handle them
    const listings = await source.fetchListings();

    // Keep only USD listings or listings with no currency (e.g. WeWorkRemotely)
    const filtered = listings.filter(
      (l) => l.currency == null || l.currency === 'USD',
    );

    let accepted = 0;
    let rejected = 0;

    for (const listing of filtered) {
      const repostKey = `repost:${sha256(listing.title + '\x00' + listing.companyName)}`;

      let isRepost = false;
      try {
        isRepost = (await this.redis.exists(repostKey)) === 1;
      } catch (err: unknown) {
        // Redis unavailable — optimistic fallback: assume first-seen
        this.logger.warn({ event: 'redis_unavailable', scrapeJobId, err });
        isRepost = false;
      }

      const score = this.scorer.score(listing, isRepost);

      if (score < 60) {
        await this.dlqQueue.add('rejected', {
          listing,
          score,
          reason: 'low_freshness_score',
        });
        rejected++;
        continue;
      }

      // Upsert job + insert outbox row in a single transaction
      await this.dataSource.transaction(async (em) => {
        // Find-or-create company
        await em
          .createQueryBuilder()
          .insert()
          .into(Company)
          .values({ name: listing.companyName })
          .orIgnore()
          .execute();

        const company = await em.findOneBy(Company, {
          name: listing.companyName,
        });

        const result = await em
          .createQueryBuilder()
          .insert()
          .into(Job)
          .values({
            title: listing.title,
            companyId: company?.id ?? null,
            url: listing.url,
            urlHash: sha256(listing.url),
            source: source.sourceName,
            salaryMin: listing.salaryMin ?? null,
            salaryMax: listing.salaryMax ?? null,
            currency: listing.currency ?? 'USD',
            description: listing.description ?? null,
            postedAt: listing.postedAt,
            freshnessScore: score,
          })
          .orUpdate(
            [
              'title',
              'company_id',
              'salary_min',
              'salary_max',
              'description',
              'posted_at',
              'freshness_score',
            ],
            ['url_hash'],
          )
          .returning('id')
          .execute();

        const jobId = result.raw[0]?.id as string;
        await em.insert(JobOutbox, {
          jobId,
          eventType: 'enrich_company',
          payload: { companyName: listing.companyName },
        });
      });

      // Write repost key only after successful transaction
      if (!isRepost) {
        await this.redis.set(repostKey, '1', 'EX', 60 * 60 * 24 * 60); // 60 days
      }

      accepted++;
    }

    if (accepted > 0) {
      await this.redis.publish('INVALIDATE_JOBS_CACHE', '1');
    }

    this.logger.log(
      `Scrape done [${source.sourceName}] accepted=${accepted} rejected=${rejected}`,
    );
  }
}

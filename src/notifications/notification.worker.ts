import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectDataSource } from '@nestjs/typeorm';
import { Job as BullJob } from 'bullmq';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { DataSource, MoreThan } from 'typeorm';
import { Job } from '../entities/job.entity';
import { getCorrelationId } from '../observability/correlation';
import { SavedSearch } from '../entities/saved-search.entity';
import { TelegramService } from './telegram.service';

@Processor('notify')
export class NotificationWorker extends WorkerHost {
  constructor(
    @InjectPinoLogger(NotificationWorker.name)
    private readonly logger: PinoLogger,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly telegram: TelegramService,
  ) {
    super();
  }

  async process(job: BullJob): Promise<void> {
    const logCtx = { correlation_id: getCorrelationId(job) };
    const since = new Date(Date.now() - 60 * 60 * 1000); // last hour

    const jobs = await this.dataSource.getRepository(Job).find({
      where: { status: 'active', scrapedAt: MoreThan(since) },
      relations: ['company'],
    });

    if (jobs.length === 0) return;

    const searches = await this.dataSource.getRepository(SavedSearch).find();

    let sent = 0;
    for (const job of jobs) {
      for (const search of searches) {
        if (!this.matches(job, search)) continue;

        const salaryPart =
          job.salaryMin && job.salaryMax
            ? ` | $${Math.round(job.salaryMin / 1000)}k–$${Math.round(job.salaryMax / 1000)}k`
            : '';

        const msg =
          `[Job Signal] ${job.title} at ${job.company?.name ?? 'Unknown'}` +
          `${salaryPart} | Score: ${job.freshnessScore} | ${job.url}`;

        await this.telegram.send(msg);
        sent++;
      }
    }

    this.logger.info({ ...logCtx, sent }, 'Notifications sent');
  }

  private matches(job: Job, search: SavedSearch): boolean {
    const titleLower = job.title.toLowerCase();
    const keywordMatch = (search.keywords ?? []).some((kw) =>
      titleLower.includes(kw.toLowerCase()),
    );
    if (!keywordMatch) return false;
    if (search.minSalary && (job.salaryMin ?? 0) < search.minSalary)
      return false;
    if (job.freshnessScore < search.minFreshnessScore) return false;
    return true;
  }
}

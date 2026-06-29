import { Injectable, Logger } from '@nestjs/common';
import { RawListing } from '../freshness-scorer';
import { JobSource } from '../job-source.interface';

interface RemoteOkJob {
  id: string;
  position: string;
  company: string;
  url: string;
  date: string;
  salary_min?: number;
  salary_max?: number;
  description?: string;
}

@Injectable()
export class RemoteOkSource implements JobSource {
  readonly sourceName = 'remoteok';
  private readonly logger = new Logger(RemoteOkSource.name);

  async fetchListings(): Promise<RawListing[]> {
    const res = await fetch('https://remoteok.com/api', {
      headers: { 'User-Agent': 'job-signal/1.0' },
    });

    if (!res.ok) {
      throw new Error(`RemoteOK returned ${res.status}`);
    }

    // First element is a legal notice object, skip it
    const data = (await res.json()) as RemoteOkJob[];
    const jobs = data.slice(1);

    this.logger.log(`Fetched ${jobs.length} listings from RemoteOK`);

    return jobs.map((job) => ({
      title: job.position,
      companyName: job.company,
      url: job.url,
      postedAt: job.date ? new Date(job.date) : null,
      salaryMin: job.salary_min ?? null,
      salaryMax: job.salary_max ?? null,
      currency: job.salary_min != null ? 'USD' : null,
      description: job.description ?? null,
    }));
  }
}

import { Injectable } from '@nestjs/common';
import { RawListing } from '../freshness-scorer';
import { JobSource } from '../job-source.interface';

interface RemotiveJob {
  title: string;
  company_name: string;
  url: string;
  salary: string;
  publication_date: string;
  description: string;
}

interface RemotiveResponse {
  jobs: RemotiveJob[];
}

function parseSalary(salary: string): {
  min: number | null;
  max: number | null;
} {
  const nums = salary.replace(/,/g, '').match(/\d+/g);
  if (!nums || nums.length < 2) return { min: null, max: null };
  const [a, b] = nums.map(Number);
  // Remotive often shows values in thousands (e.g. "100k") — normalise
  const normalise = (n: number) => (n < 1000 ? n * 1000 : n);
  return { min: normalise(a), max: normalise(b) };
}

@Injectable()
export class RemotiveSource implements JobSource {
  readonly sourceName = 'remotive';

  async fetchListings(): Promise<RawListing[]> {
    const res = await fetch('https://remotive.com/api/remote-jobs');
    if (!res.ok) throw new Error(`Remotive returned ${res.status}`);

    const data = (await res.json()) as RemotiveResponse;

    return data.jobs.map((j) => {
      const { min, max } = parseSalary(j.salary ?? '');
      return {
        title: j.title,
        companyName: j.company_name,
        url: j.url,
        postedAt: j.publication_date ? new Date(j.publication_date) : null,
        salaryMin: min,
        salaryMax: max,
        currency: min !== null ? 'USD' : null,
        description: j.description?.replace(/<[^>]+>/g, '').trim() ?? null,
      };
    });
  }
}

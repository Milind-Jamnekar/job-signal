import { Injectable, Logger } from '@nestjs/common';
import CircuitBreaker from 'opossum';

interface LevelsSalaryEntry {
  company: string;
  medianBaseSalary?: number;
}

@Injectable()
export class LevelsFyiSource {
  private readonly logger = new Logger(LevelsFyiSource.name);
  private readonly breaker: CircuitBreaker<[string], number | null>;

  constructor() {
    // Arrow (not .bind) so the action keeps its typed signature — .bind widens
    // it to `any` under @types/opossum, tripping no-unsafe-argument.
    this.breaker = new CircuitBreaker(
      (companyName: string) => this.fetchSalary(companyName),
      {
        errorThresholdPercentage: 50,
        volumeThreshold: 5,
        resetTimeout: 10_000,
        timeout: 8_000,
      },
    );

    this.breaker.on('open', () =>
      this.logger.warn({
        event: 'circuit_breaker',
        state: 'open',
        source: 'levels_fyi',
      }),
    );
    this.breaker.on('halfOpen', () =>
      this.logger.log({
        event: 'circuit_breaker',
        state: 'half_open',
        source: 'levels_fyi',
      }),
    );
    this.breaker.on('close', () =>
      this.logger.log({
        event: 'circuit_breaker',
        state: 'closed',
        source: 'levels_fyi',
      }),
    );
  }

  async getSalaryP50(companyName: string): Promise<number | null> {
    try {
      return await this.breaker.fire(companyName);
    } catch {
      // Circuit open or fetch failed — enrich gracefully degrades
      return null;
    }
  }

  private async fetchSalary(companyName: string): Promise<number | null> {
    const res = await fetch('https://levels.fyi/js/salaryData.json');
    if (!res.ok) throw new Error(`levels.fyi returned ${res.status}`);

    const data = (await res.json()) as LevelsSalaryEntry[];
    const match = data.find(
      (e) => e.company?.toLowerCase() === companyName.toLowerCase(),
    );
    return match?.medianBaseSalary ?? null;
  }
}

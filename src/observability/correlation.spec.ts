import { Job } from 'bullmq';
import { getCorrelationId } from './correlation';

describe('getCorrelationId', () => {
  it('uses the correlationId carried in job data (HTTP-originated jobs)', () => {
    const job = {
      id: '42',
      data: { correlationId: 'req-abc' },
    } as unknown as Job;
    expect(getCorrelationId(job)).toBe('req-abc');
  });

  it('falls back to the job id for scheduled jobs (no correlationId)', () => {
    const job = { id: 'repeat:enrich:123', data: {} } as unknown as Job;
    expect(getCorrelationId(job)).toBe('repeat:enrich:123');
  });

  it('falls back to the job id when data is undefined', () => {
    const job = { id: '7', data: undefined } as unknown as Job;
    expect(getCorrelationId(job)).toBe('7');
  });

  it('ignores a non-string correlationId and uses the job id', () => {
    const job = { id: '9', data: { correlationId: 123 } } as unknown as Job;
    expect(getCorrelationId(job)).toBe('9');
  });
});

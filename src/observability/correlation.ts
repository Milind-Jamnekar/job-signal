import { Job } from 'bullmq';

// Header used to accept an inbound correlation id and echo it back on responses,
// so a client (or an upstream proxy) can trace one request end to end.
export const CORRELATION_ID_HEADER = 'x-request-id';

// The correlation id for a job: the HTTP request id carried in job data for
// HTTP-originated jobs (e.g. export), otherwise the per-execution BullMQ job id
// for scheduled jobs (scrape/enrich/notify), which is unique per run.
export function getCorrelationId(job: Job): string {
  const carried = (job.data as { correlationId?: unknown } | undefined)
    ?.correlationId;
  return typeof carried === 'string' ? carried : String(job.id);
}

import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Repository } from 'typeorm';
import { Job } from '../entities/job.entity';
import { ListJobsDto } from './dto/list-jobs.dto';
import { JobsService } from './jobs.service';

describe('JobsService.findAll', () => {
  // The resilience tests deliberately trigger warn logs — keep test output clean.
  beforeAll(() => {
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });
  afterAll(() => jest.restoreAllMocks());

  let service: JobsService;
  let jobRepo: { findAndCount: jest.Mock };
  let redis: { get: jest.Mock; set: jest.Mock };

  const dto: ListJobsDto = { page: 1, limit: 20 };
  const job = { id: 'a' } as unknown as Job;
  const dbResult: [Job[], number] = [[job], 1];

  beforeEach(() => {
    jobRepo = { findAndCount: jest.fn().mockResolvedValue(dbResult) };
    redis = { get: jest.fn(), set: jest.fn().mockResolvedValue('OK') };
    service = new JobsService(
      jobRepo as unknown as Repository<Job>,
      redis as unknown as Redis,
      { get: jest.fn() } as unknown as ConfigService,
    );
  });

  it('returns cached result without hitting the DB on a cache hit', async () => {
    redis.get.mockResolvedValue(JSON.stringify({ data: [], total: 7 }));

    const result = await service.findAll(dto);

    expect(result).toEqual({ data: [], total: 7 });
    expect(jobRepo.findAndCount).not.toHaveBeenCalled();
  });

  it('queries the DB and populates the cache on a cache miss', async () => {
    redis.get.mockResolvedValue(null);

    const result = await service.findAll(dto);

    expect(result).toEqual({ data: dbResult[0], total: 1 });
    expect(jobRepo.findAndCount).toHaveBeenCalledTimes(1);
    expect(redis.set).toHaveBeenCalledTimes(1);
  });

  it('falls back to the DB when the cache read throws (Redis outage)', async () => {
    redis.get.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await service.findAll(dto);

    expect(result).toEqual({ data: dbResult[0], total: 1 });
    expect(jobRepo.findAndCount).toHaveBeenCalledTimes(1);
  });

  it('still returns the DB result when the cache write throws', async () => {
    redis.get.mockResolvedValue(null);
    redis.set.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await service.findAll(dto);

    expect(result).toEqual({ data: dbResult[0], total: 1 });
  });

  it('falls back to the DB when a cached entry is corrupt', async () => {
    redis.get.mockResolvedValue('not-json{');

    const result = await service.findAll(dto);

    expect(result).toEqual({ data: dbResult[0], total: 1 });
    expect(jobRepo.findAndCount).toHaveBeenCalledTimes(1);
  });
});

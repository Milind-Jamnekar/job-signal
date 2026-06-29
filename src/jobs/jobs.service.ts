import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../entities/job.entity';
import { ListJobsDto } from './dto/list-jobs.dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job) private readonly jobRepo: Repository<Job>,
  ) {}

  async findAll(dto: ListJobsDto): Promise<{ data: Job[]; total: number }> {
    const { page, limit } = dto;
    const [data, total] = await this.jobRepo.findAndCount({
      where: { status: 'active' },
      order: { freshnessScore: 'DESC', scrapedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total };
  }
}

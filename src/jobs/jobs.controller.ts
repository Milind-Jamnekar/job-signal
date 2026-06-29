import { Controller, Get, Query } from '@nestjs/common';
import { ListJobsDto } from './dto/list-jobs.dto';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  findAll(@Query() dto: ListJobsDto) {
    return this.jobsService.findAll(dto);
  }
}

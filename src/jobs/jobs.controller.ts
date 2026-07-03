import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { ListJobsDto } from './dto/list-jobs.dto';
import { ExportService } from './export.service';
import { JobsService } from './jobs.service';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly exportService: ExportService,
  ) {}

  @Get()
  findAll(@Query() dto: ListJobsDto) {
    return this.jobsService.findAll(dto);
  }

  @Post('export')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.ACCEPTED)
  export(@Request() req: AuthRequest) {
    return this.exportService.enqueue(req.user.sub);
  }

  @Get('export/:jobId')
  @UseGuards(JwtAuthGuard)
  async getExport(@Param('jobId') jobId: string, @Res() res: Response) {
    const result = await this.exportService.getResult(jobId);
    if (result.status === 'pending') {
      return res.status(HttpStatus.ACCEPTED).json(result);
    }
    if (result.status === 'failed') {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(result);
    }
    return res.status(HttpStatus.OK).json(result);
  }
}

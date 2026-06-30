import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { CreateSearchDto } from './dto/create-search.dto';
import { SavedSearchesService } from './saved-searches.service';

interface AuthRequest extends Request {
  user: JwtPayload;
}

@Controller('searches')
@UseGuards(JwtAuthGuard)
export class SavedSearchesController {
  constructor(private readonly service: SavedSearchesService) {}

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateSearchDto) {
    return this.service.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.service.findAll(req.user.sub);
  }

  @Delete(':id')
  remove(@Request() req: AuthRequest, @Param('id') id: string) {
    return this.service.remove(req.user.sub, id);
  }
}

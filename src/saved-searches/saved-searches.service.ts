import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedSearch } from '../entities/saved-search.entity';
import { CreateSearchDto } from './dto/create-search.dto';

@Injectable()
export class SavedSearchesService {
  constructor(
    @InjectRepository(SavedSearch)
    private readonly repo: Repository<SavedSearch>,
  ) {}

  create(userId: string, dto: CreateSearchDto): Promise<SavedSearch> {
    const search = this.repo.create({
      userId,
      keywords: dto.keywords,
      minSalary: dto.minSalary ?? null,
      minFreshnessScore: dto.minFreshnessScore ?? 60,
    });
    return this.repo.save(search);
  }

  findAll(userId: string): Promise<SavedSearch[]> {
    return this.repo.findBy({ userId });
  }

  async remove(userId: string, id: string): Promise<void> {
    const search = await this.repo.findOneBy({ id });
    if (!search) throw new NotFoundException();
    if (search.userId !== userId) throw new ForbiddenException();
    await this.repo.remove(search);
  }
}

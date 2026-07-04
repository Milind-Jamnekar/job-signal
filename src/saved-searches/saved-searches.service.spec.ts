import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SavedSearch } from '../entities/saved-search.entity';
import { CreateSearchDto } from './dto/create-search.dto';
import { SavedSearchesService } from './saved-searches.service';

describe('SavedSearchesService', () => {
  let service: SavedSearchesService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    findBy: jest.Mock;
    findOneBy: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(() => {
    repo = {
      create: jest.fn((s: Partial<SavedSearch>) => s as SavedSearch),
      save: jest.fn((s: SavedSearch) => Promise.resolve(s)),
      findBy: jest.fn(),
      findOneBy: jest.fn(),
      remove: jest.fn(),
    };
    service = new SavedSearchesService(
      repo as unknown as Repository<SavedSearch>,
    );
  });

  it('create defaults minFreshnessScore to 60 when omitted', async () => {
    const dto: CreateSearchDto = { keywords: ['go'] };

    await service.create('user-1', dto);

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        keywords: ['go'],
        minFreshnessScore: 60,
      }),
    );
  });

  describe('remove', () => {
    it('throws NotFoundException when the search does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);

      await expect(service.remove('user-1', 'x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException when the search belongs to another user', async () => {
      repo.findOneBy.mockResolvedValue({ id: 'x', userId: 'other' });

      await expect(service.remove('user-1', 'x')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(repo.remove).not.toHaveBeenCalled();
    });

    it('removes the search when the caller owns it', async () => {
      const owned = { id: 'x', userId: 'user-1' };
      repo.findOneBy.mockResolvedValue(owned);

      await service.remove('user-1', 'x');

      expect(repo.remove).toHaveBeenCalledWith(owned);
    });
  });
});

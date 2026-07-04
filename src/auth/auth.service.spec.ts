import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let userRepo: {
    findOneBy: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  const jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
  const hash = bcrypt.hash as jest.Mock;
  const compare = bcrypt.compare as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    userRepo = {
      findOneBy: jest.fn(),
      create: jest.fn((u: Partial<User>) => u as User),
      save: jest.fn((u: User) => Promise.resolve({ ...u, id: 'u1' })),
    };
    service = new AuthService(
      userRepo as unknown as Repository<User>,
      jwt as unknown as JwtService,
    );
  });

  describe('register', () => {
    const dto: RegisterDto = { email: 'a@b.com', password: 'pw' };

    it('rejects a duplicate email with ConflictException', async () => {
      userRepo.findOneBy.mockResolvedValue({ id: 'existing' });

      await expect(service.register(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(userRepo.save).not.toHaveBeenCalled();
    });

    it('hashes the password and returns a token on success', async () => {
      userRepo.findOneBy.mockResolvedValue(null);
      hash.mockResolvedValue('hashed-pw');

      const result = await service.register(dto);

      expect(hash).toHaveBeenCalledWith('pw', 12);
      expect(userRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ accessToken: 'signed.jwt.token' });
    });
  });

  describe('login', () => {
    const dto: LoginDto = { email: 'a@b.com', password: 'pw' };

    it('rejects an unknown email with UnauthorizedException', async () => {
      userRepo.findOneBy.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rejects a wrong password with UnauthorizedException', async () => {
      userRepo.findOneBy.mockResolvedValue({ id: 'u1', passwordHash: 'h' });
      compare.mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('returns a token on valid credentials', async () => {
      userRepo.findOneBy.mockResolvedValue({ id: 'u1', passwordHash: 'h' });
      compare.mockResolvedValue(true);

      const result = await service.login(dto);

      expect(result).toEqual({ accessToken: 'signed.jwt.token' });
    });
  });
});

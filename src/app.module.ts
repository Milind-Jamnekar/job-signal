import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Company } from './entities/company.entity';
import { Job } from './entities/job.entity';
import { SavedSearch } from './entities/saved-search.entity';
import { User } from './entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [Company, Job, User, SavedSearch],
      synchronize: true, // auto-creates tables in dev; replace with migrations before prod
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

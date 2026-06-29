import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Company } from './company.entity';

@Entity('jobs')
@Index('idx_jobs_scraped_freshness', ['scrapedAt', 'freshnessScore'], {
  where: `"status" = 'active'`,
})
export class Job {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  title!: string;

  @Column({ name: 'company_id', nullable: true })
  companyId!: string | null;

  @ManyToOne(() => Company, (company) => company.jobs, { nullable: true })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ unique: true })
  url!: string;

  @Column({ name: 'url_hash', unique: true })
  urlHash!: string;

  @Column()
  source!: string;

  @Column({ name: 'salary_min', nullable: true, type: 'int' })
  salaryMin!: number | null;

  @Column({ name: 'salary_max', nullable: true, type: 'int' })
  salaryMax!: number | null;

  @Column({ default: 'USD' })
  currency!: string;

  @Column({ nullable: true, type: 'text' })
  description!: string | null;

  @Column({ name: 'posted_at', nullable: true, type: 'timestamptz' })
  postedAt!: Date | null;

  @Column({ name: 'scraped_at', type: 'timestamptz', default: () => 'NOW()' })
  scrapedAt!: Date;

  @Column({ name: 'freshness_score', type: 'int' })
  freshnessScore!: number;

  @Column({ default: 'active' })
  status!: string;
}

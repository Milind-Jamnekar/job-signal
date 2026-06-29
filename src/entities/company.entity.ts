import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Job } from './job.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ name: 'salary_p50', nullable: true, type: 'int' })
  salaryP50: number | null;

  @Column({ nullable: true, type: 'int' })
  headcount: number | null;

  @Column({ name: 'last_enriched_at', nullable: true, type: 'timestamptz' })
  lastEnrichedAt: Date | null;

  @OneToMany(() => Job, (job) => job.company)
  jobs: Job[];
}

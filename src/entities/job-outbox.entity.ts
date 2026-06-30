import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Job } from './job.entity';

@Entity('job_outbox')
@Index('idx_job_outbox_unprocessed', ['processedAt'], { where: '"processed_at" IS NULL' })
export class JobOutbox {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'job_id' })
  jobId!: string;

  @ManyToOne(() => Job, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  job!: Job;

  @Column({ name: 'event_type', default: 'enrich_company' })
  eventType!: string;

  @Column({ type: 'jsonb', nullable: true })
  payload!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt!: Date | null;
}

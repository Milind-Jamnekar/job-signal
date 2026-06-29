import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('saved_searches')
@Index('idx_saved_searches_user_id', ['userId'])
export class SavedSearch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => User, (user) => user.savedSearches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'text', array: true, nullable: true })
  keywords!: string[] | null;

  @Column({ name: 'min_salary', nullable: true, type: 'int' })
  minSalary!: number | null;

  @Column({ name: 'min_freshness_score', type: 'int', default: 60 })
  minFreshnessScore!: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt!: Date;
}

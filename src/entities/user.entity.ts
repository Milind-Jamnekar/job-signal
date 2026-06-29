import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { SavedSearch } from './saved-search.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @OneToMany(() => SavedSearch, (search) => search.user)
  savedSearches: SavedSearch[];
}

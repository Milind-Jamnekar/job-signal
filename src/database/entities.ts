import { Company } from '../entities/company.entity';
import { Job } from '../entities/job.entity';
import { JobOutbox } from '../entities/job-outbox.entity';
import { SavedSearch } from '../entities/saved-search.entity';
import { User } from '../entities/user.entity';

// Single source of truth for the entity set, shared by the Nest runtime
// (app.module) and the standalone TypeORM CLI DataSource (data-source.ts)
// so the two can never drift apart.
export const entities = [Company, Job, JobOutbox, User, SavedSearch];

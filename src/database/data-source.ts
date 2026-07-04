import 'dotenv/config';
import { DataSource } from 'typeorm';
import { entities } from './entities';

// Standalone DataSource used only by the TypeORM CLI (migration:generate/run/
// revert). The Nest runtime configures its own DataSource in app.module.ts.
//
// __dirname makes the migrations glob resolve correctly in both worlds:
//   - CLI via ts-node   -> src/database/migrations/*.ts
//   - compiled (prod)   -> dist/database/migrations/*.js
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities,
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
});

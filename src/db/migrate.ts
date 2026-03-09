import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { db } from './index';

export async function runMigrations() {
  console.log('Running database migrations...');
  try {
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations complete.');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  }
}

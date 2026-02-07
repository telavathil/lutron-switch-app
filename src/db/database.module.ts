import { Module } from '@nestjs/common';
import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL } from './schema';
import { join, dirname } from 'path';
import { mkdirSync, existsSync } from 'fs';

export const DATABASE_TOKEN = 'DATABASE';

const databaseProvider = {
  provide: DATABASE_TOKEN,
  useFactory: () => {
    // Use DATABASE_PATH env var if set, otherwise use local path
    const dbPath = process.env.DATABASE_PATH || join(process.cwd(), 'lutron-config.sqlite');

    // Ensure directory exists
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const db = new Database(dbPath);

    db.pragma('foreign_keys = ON');

    db.exec(CREATE_TABLES_SQL);

    console.log(`Database initialized at: ${dbPath}`);

    return db;
  },
};

@Module({
  providers: [databaseProvider],
  exports: [DATABASE_TOKEN],
})
export class DatabaseModule {}

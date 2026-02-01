import { Module } from '@nestjs/common';
import Database from 'better-sqlite3';
import { CREATE_TABLES_SQL } from './schema';
import { join } from 'path';

export const DATABASE_TOKEN = 'DATABASE';

const databaseProvider = {
  provide: DATABASE_TOKEN,
  useFactory: () => {
    const dbPath = join(process.cwd(), 'lutron-config.sqlite');
    const db = new Database(dbPath);

    db.pragma('foreign_keys = ON');

    db.exec(CREATE_TABLES_SQL);

    return db;
  },
};

@Module({
  providers: [databaseProvider],
  exports: [DATABASE_TOKEN],
})
export class DatabaseModule {}

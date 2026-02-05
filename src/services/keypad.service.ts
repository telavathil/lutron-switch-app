import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import Database from 'better-sqlite3';
import { DATABASE_TOKEN } from '../db/database.module';
import { Keypad } from '../types/core';

@Injectable()
export class KeypadService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database.Database) {}

  findAll(projectId: string): Keypad[] {
    const stmt = this.db.prepare('SELECT * FROM keypads WHERE projectId = ? ORDER BY area, room');
    const rows = stmt.all(projectId) as any[];

    return rows.map(row => JSON.parse(row.data));
  }

  findById(id: string): Keypad {
    const stmt = this.db.prepare('SELECT * FROM keypads WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      throw new NotFoundException(`Keypad with ID ${id} not found`);
    }

    return JSON.parse(row.data);
  }

  findByProject(projectId: string): Map<string, Keypad[]> {
    const keypads = this.findAll(projectId);
    const grouped = new Map<string, Keypad[]>();

    for (const keypad of keypads) {
      const key = `${keypad.location.area}:${keypad.location.room}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key).push(keypad);
    }

    return grouped;
  }

  update(id: string, data: Partial<Keypad>): Keypad {
    const existing = this.findById(id);
    const updated = { ...existing, ...data };

    const stmt = this.db.prepare(`
      UPDATE keypads
      SET data = ?
      WHERE id = ?
    `);

    stmt.run(JSON.stringify(updated), id);

    return updated;
  }
}

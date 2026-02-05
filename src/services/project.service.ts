import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import Database from 'better-sqlite3';
import { DATABASE_TOKEN } from '../db/database.module';
import { ProjectState } from '../types/core';

@Injectable()
export class ProjectService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database.Database) {}

  create(name: string, keypads: any[], loads: any[]): ProjectState {
    const id = this.generateId();
    const now = Date.now();

    const project: ProjectState = {
      id,
      name,
      created: now,
      modified: now,
      originalState: { keypads, loads },
      currentState: { keypads, loads },
    };

    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, created, modified, originalState, currentState)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      project.id,
      project.name,
      project.created,
      project.modified,
      JSON.stringify(project.originalState),
      JSON.stringify(project.currentState)
    );

    this.insertKeypads(project.id, keypads);
    this.insertLoads(project.id, loads);

    return project;
  }

  findAll(): ProjectState[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY modified DESC');
    const rows = stmt.all() as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      created: row.created,
      modified: row.modified,
      originalState: JSON.parse(row.originalState),
      currentState: JSON.parse(row.currentState),
    }));
  }

  findById(id: string): ProjectState {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const row = stmt.get(id) as any;

    if (!row) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return {
      id: row.id,
      name: row.name,
      created: row.created,
      modified: row.modified,
      originalState: JSON.parse(row.originalState),
      currentState: JSON.parse(row.currentState),
    };
  }

  update(id: string, currentState: { keypads: any[]; loads: any[] }): ProjectState {
    const project = this.findById(id);

    const stmt = this.db.prepare(`
      UPDATE projects
      SET modified = ?, currentState = ?
      WHERE id = ?
    `);

    const now = Date.now();
    stmt.run(now, JSON.stringify(currentState), id);

    return {
      ...project,
      modified: now,
      currentState,
    };
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM keypads WHERE projectId = ?').run(id);
    this.db.prepare('DELETE FROM loads WHERE projectId = ?').run(id);
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }

  private insertKeypads(projectId: string, keypads: any[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO keypads (id, projectId, area, room, data)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const keypad of keypads) {
      stmt.run(
        keypad.id,
        projectId,
        keypad.location.area,
        keypad.location.room,
        JSON.stringify(keypad)
      );
    }
  }

  private insertLoads(projectId: string, loads: any[]): void {
    const stmt = this.db.prepare(`
      INSERT INTO loads (id, projectId, fullPath, area, data)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const load of loads) {
      stmt.run(
        load.id,
        projectId,
        load.fullPath,
        load.location.area,
        JSON.stringify(load)
      );
    }
  }

  private generateId(): string {
    return `proj-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

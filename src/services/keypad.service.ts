import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import Database from 'better-sqlite3';
import { DATABASE_TOKEN } from '../db/database.module';
import { Keypad, Button, Load } from '../types/core';
import { UpdateButtonDto } from '../dto/button.dto';

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

  findButtonById(id: string): Button {
    const stmt = this.db.prepare('SELECT * FROM keypads');
    const rows = stmt.all() as any[];

    for (const row of rows) {
      const keypad: Keypad = JSON.parse(row.data);
      const button = keypad.buttons.find(b => b.id === id);
      if (button) {
        return button;
      }
    }

    throw new NotFoundException(`Button with ID ${id} not found`);
  }

  getAllLoads(): Load[] {
    const stmt = this.db.prepare('SELECT * FROM loads');
    const rows = stmt.all() as any[];

    return rows.map(row => JSON.parse(row.data));
  }

  updateButton(id: string, updateDto: UpdateButtonDto): Keypad {
    const stmt = this.db.prepare('SELECT * FROM keypads');
    const rows = stmt.all() as any[];

    for (const row of rows) {
      const keypad: Keypad = JSON.parse(row.data);
      const buttonIndex = keypad.buttons.findIndex(b => b.id === id);

      if (buttonIndex !== -1) {
        keypad.buttons[buttonIndex].engraving.label = updateDto.label;
        if (updateDto.alignment) keypad.buttons[buttonIndex].engraving.alignment = updateDto.alignment;
        if (updateDto.fontType) keypad.buttons[buttonIndex].engraving.fontType = updateDto.fontType;
        if (updateDto.fontSize) keypad.buttons[buttonIndex].engraving.fontSize = updateDto.fontSize;

        keypad.buttons[buttonIndex].logic.ledLogic.type = updateDto.logic.ledLogicType;
        if (updateDto.logic.sceneNumber) {
          keypad.buttons[buttonIndex].logic.ledLogic.sceneNumber = updateDto.logic.sceneNumber;
        }

        if (updateDto.logic.pressActions) {
          keypad.buttons[buttonIndex].logic.actions.press = updateDto.logic.pressActions;
        }
        if (updateDto.logic.releaseActions) {
          keypad.buttons[buttonIndex].logic.actions.release = updateDto.logic.releaseActions;
        }
        if (updateDto.logic.doubleTapActions) {
          keypad.buttons[buttonIndex].logic.actions.doubleTap = updateDto.logic.doubleTapActions;
        }
        if (updateDto.logic.holdActions) {
          keypad.buttons[buttonIndex].logic.actions.hold = updateDto.logic.holdActions;
        }

        const updateStmt = this.db.prepare(`
          UPDATE keypads
          SET data = ?
          WHERE id = ?
        `);

        updateStmt.run(JSON.stringify(keypad), keypad.id);

        this.updateProjectCurrentState(keypad.id);

        return keypad;
      }
    }

    throw new NotFoundException(`Button with ID ${id} not found`);
  }

  private updateProjectCurrentState(keypadId: string) {
    const keypadStmt = this.db.prepare('SELECT * FROM keypads WHERE id = ?');
    const keypadRow = keypadStmt.get(keypadId) as any;

    if (!keypadRow) return;

    const projectStmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const projectRow = projectStmt.get(keypadRow.projectId) as any;

    if (!projectRow) return;

    const currentState = JSON.parse(projectRow.currentState);
    const allKeypadsStmt = this.db.prepare('SELECT * FROM keypads WHERE projectId = ?');
    const allKeypadRows = allKeypadsStmt.all(keypadRow.projectId) as any[];

    currentState.keypads = allKeypadRows.map(row => JSON.parse(row.data));

    const updateProjectStmt = this.db.prepare(`
      UPDATE projects
      SET currentState = ?, modified = ?
      WHERE id = ?
    `);

    updateProjectStmt.run(
      JSON.stringify(currentState),
      Date.now(),
      keypadRow.projectId,
    );
  }
}

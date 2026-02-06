import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import Database from 'better-sqlite3';
import { DATABASE_TOKEN } from '../db/database.module';
import { calculateProjectDiff, Change } from '../utils/diff.util';

@Injectable()
export class DiffService {
  constructor(@Inject(DATABASE_TOKEN) private readonly db: Database.Database) {}

  calculateDiffForProject(projectId: string): Change[] {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const project = stmt.get(projectId) as any;

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const originalState = JSON.parse(project.originalState);
    const currentState = JSON.parse(project.currentState);

    return calculateProjectDiff(originalState.keypads, currentState.keypads);
  }

  exportDiffAsMarkdown(projectId: string): string {
    const changes = this.calculateDiffForProject(projectId);

    let markdown = '# Configuration Changes\n\n';
    markdown += `Project ID: ${projectId}\n\n`;
    markdown += `Total Changes: ${changes.length}\n\n`;

    const grouped = this.groupChangesByKeypad(changes);

    for (const [keypadId, keypadChanges] of grouped) {
      markdown += `## Keypad: ${keypadId}\n\n`;

      for (const change of keypadChanges) {
        const icon = change.type === 'added' ? '➕' : change.type === 'removed' ? '➖' : '🔄';
        markdown += `${icon} **${change.type.toUpperCase()}**: ${change.description}\n`;

        if (change.oldValue !== undefined) {
          markdown += `   - Old: \`${JSON.stringify(change.oldValue)}\`\n`;
        }
        if (change.newValue !== undefined) {
          markdown += `   - New: \`${JSON.stringify(change.newValue)}\`\n`;
        }

        markdown += '\n';
      }
    }

    return markdown;
  }

  private groupChangesByKeypad(changes: Change[]): Map<string, Change[]> {
    const grouped = new Map<string, Change[]>();

    for (const change of changes) {
      const keypadId = change.path[1];
      if (!grouped.has(keypadId)) {
        grouped.set(keypadId, []);
      }
      grouped.get(keypadId).push(change);
    }

    return grouped;
  }
}

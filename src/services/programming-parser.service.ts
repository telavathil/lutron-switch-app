import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { Load, LoadType, Location, ButtonLogic, LoadAction } from '../types/core';
import { ProgrammingParseResult } from '../types/parser';

@Injectable()
export class ProgrammingParserService {
  async parseProgrammingReport(pdfPath: string): Promise<ProgrammingParseResult> {
    const errors: string[] = [];
    const buttonLogic = new Map<string, ButtonLogic>();
    const loads: Load[] = [];

    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const parser = new PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      await parser.destroy();
      const text = result.text;

      this.parseButtonLogic(text, buttonLogic, errors);
      this.parseLoads(text, loads, errors);
    } catch (error) {
      errors.push(`Failed to parse PDF: ${error.message}`);
    }

    return { buttonLogic, loads, errors };
  }

  private parseButtonLogic(text: string, buttonLogic: Map<string, ButtonLogic>, errors: string[]): void {
    const inputPattern = /Input\s+(\d+).*?Type:\s*(Toggle|Single Action).*?LED Logic:\s*(.+?)(?:\r?\n)/gs;
    const matches = text.matchAll(inputPattern);

    for (const match of matches) {
      try {
        const inputNumber = parseInt(match[1]);
        const type = match[2].toLowerCase().includes('toggle') ? 'toggle' : 'single-action';
        const ledLogicStr = match[3].trim();

        const ledLogic = this.parseLEDLogic(ledLogicStr);
        const actions = this.parseActions(text, inputNumber);

        const key = `input-${inputNumber}`;
        buttonLogic.set(key, {
          type,
          ledLogic,
          actions,
        });
      } catch (error) {
        errors.push(`Failed to parse button logic for input ${match[1]}: ${error.message}`);
      }
    }
  }

  private parseLEDLogic(ledLogicStr: string): { type: 'scene' | 'room' | 'local-load'; sceneNumber?: number } {
    if (ledLogicStr.includes('Scene')) {
      const sceneMatch = ledLogicStr.match(/Scene\s+(\d+)/);
      return {
        type: 'scene',
        sceneNumber: sceneMatch ? parseInt(sceneMatch[1]) : undefined,
      };
    } else if (ledLogicStr.includes('Room')) {
      return { type: 'room' };
    } else {
      return { type: 'local-load' };
    }
  }

  private parseActions(text: string, inputNumber: number): {
    press?: LoadAction[];
    release?: LoadAction[];
    doubleTap?: LoadAction[];
    hold?: LoadAction[];
  } {
    const actions: any = {};

    const actionTypes = ['Press On', 'Off Level', 'Double Tap', 'Hold'];
    const actionMap: Record<string, keyof typeof actions> = {
      'Press On': 'press',
      'Off Level': 'release',
      'Double Tap': 'doubleTap',
      'Hold': 'hold',
    };

    for (const actionType of actionTypes) {
      const pattern = new RegExp(
        `Input\\s+${inputNumber}.*?${actionType}.*?Load Table([\\s\\S]*?)(?=Input\\s+\\d+|$)`,
        'i'
      );
      const match = text.match(pattern);

      if (match) {
        const loadActions = this.parseLoadTable(match[1]);
        if (loadActions.length > 0) {
          actions[actionMap[actionType]] = loadActions;
        }
      }
    }

    return actions;
  }

  private parseLoadTable(tableText: string): LoadAction[] {
    const loadActions: LoadAction[] = [];
    const loadPattern = /(.+?)\s+(\d+)%\s+([\d.]+)s\s+([\d.]+)s/g;
    const matches = tableText.matchAll(loadPattern);

    for (const match of matches) {
      loadActions.push({
        loadFullPath: match[1].trim(),
        commandLevel: parseInt(match[2]),
        fadeTime: parseFloat(match[3]),
        delay: parseFloat(match[4]),
      });
    }

    return loadActions;
  }

  private parseLoads(text: string, loads: Load[], errors: string[]): void {
    const loadPattern = /Zone:\s*(.+?)\s+Area:\s*(.+?)\s+Room:\s*(.+?)\s+Type:\s*(Dimmer|Switched)/g;
    const matches = text.matchAll(loadPattern);

    for (const match of matches) {
      try {
        const zone = match[1].trim();
        const area = match[2].trim();
        const room = match[3].trim();
        const type = match[4].toLowerCase() as LoadType;

        const location: Location = { area, room };
        const fullPath = `Area:${area}:Zone:${zone}`;

        loads.push({
          id: this.generateLoadId(fullPath),
          fullPath,
          location,
          zone,
          type,
        });
      } catch (error) {
        errors.push(`Failed to parse load: ${error.message}`);
      }
    }
  }

  private generateLoadId(fullPath: string): string {
    return fullPath.replace(/\s+/g, '-').toLowerCase();
  }
}

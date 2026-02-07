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

      console.log('=== PROGRAMMING PDF TEXT (first 1000 chars) ===');
      console.log(text.substring(0, 1000));
      console.log('=== END SAMPLE ===');

      this.parseButtonLogic(text, buttonLogic, errors);
      console.log(`Found ${buttonLogic.size} button logic entries`);

      this.parseLoads(text, loads, errors);
      console.log(`Found ${loads.length} loads`);
    } catch (error) {
      errors.push(`Failed to parse PDF: ${error.message}`);
    }

    return { buttonLogic, loads, errors };
  }

  private parseButtonLogic(text: string, buttonLogic: Map<string, ButtonLogic>, errors: string[]): void {
    const keypadSections = this.splitIntoKeypadSections(text);

    for (const section of keypadSections) {
      try {
        const areaPathMatch = section.match(/Area Path:\s*(.+?)(?:\r?\n|Model)/);
        const gangMatch = section.match(/Gang Position:\s*(\d+)/);

        if (!areaPathMatch || !gangMatch) continue;

        const fullPath = areaPathMatch[1].trim();

        // Split on first 2 backslashes only: Floor\Room\SwitchName
        // SwitchName can contain additional backslashes
        const firstBackslash = fullPath.indexOf('\\');
        const secondBackslash = firstBackslash >= 0 ? fullPath.indexOf('\\', firstBackslash + 1) : -1;

        let floor = '';
        let room = '';
        let switchName = '';

        if (secondBackslash >= 0) {
          floor = fullPath.substring(0, firstBackslash).trim();
          room = fullPath.substring(firstBackslash + 1, secondBackslash).trim();
          switchName = fullPath.substring(secondBackslash + 1).trim();
        } else if (firstBackslash >= 0) {
          floor = fullPath.substring(0, firstBackslash).trim();
          room = fullPath.substring(firstBackslash + 1).trim();
        } else {
          floor = fullPath;
        }

        const areaPath = switchName ? `${floor}:${room}:${switchName}` : (room ? `${floor}:${room}` : floor);
        const gangPosition = gangMatch[1];

        console.log(`\n=== Programming Parser: Keypad Section ===`);
        console.log(`Full path: "${fullPath}"`);
        console.log(`  Floor: "${floor}"`);
        console.log(`  Room: "${room}"`);
        console.log(`  Switch name: "${switchName}"`);
        console.log(`  Area path: "${areaPath}"`);
        console.log(`  Gang: ${gangPosition}`);

        const inputPattern = /Input Number:\s*(\d+)\s+LED Logic:\s*(.+?)\s+Type:\s*(Toggle|Single Action)/gs;
        const matches = section.matchAll(inputPattern);

        // Track which input numbers we've already processed to avoid duplicates
        const processedInputs = new Set<number>();

        for (const match of matches) {
          const inputNumber = parseInt(match[1]);

          // Skip invalid input numbers (0, NaN, or already processed)
          if (!inputNumber || inputNumber < 1 || inputNumber > 19 || processedInputs.has(inputNumber)) {
            continue;
          }

          processedInputs.add(inputNumber);

          const ledLogicStr = match[2].trim();
          const type = match[3].toLowerCase().includes('toggle') ? 'toggle' : 'single-action';

          const ledLogic = this.parseLEDLogic(ledLogicStr);
          const actions = this.parseActionsInSection(section, inputNumber);

          const key = `${areaPath}_g${gangPosition}_input-${inputNumber}`;
          buttonLogic.set(key, {
            type,
            ledLogic,
            actions,
          });
          console.log(`  ✓ Stored button logic: ${key} (type: ${type}, actions: ${Object.keys(actions).join(', ')})`);
        }
      } catch (error) {
        errors.push(`Failed to parse keypad section: ${error.message}`);
      }
    }
  }

  private splitIntoKeypadSections(text: string): string[] {
    const sections: string[] = [];

    // Split on "Area Path:" but include everything until the next "Area Path:" or end
    // This ensures we capture all Input Numbers for a keypad, even across page breaks
    const pattern = /Area Path:[\s\S]*?(?=Area Path:|$)/g;
    const matches = text.matchAll(pattern);

    for (const match of matches) {
      // Clean up the section by removing page break markers that appear mid-section
      let section = match[0];

      // Remove "Programming Report" headers that appear after page breaks
      section = section.replace(/\n\s*--\s*\d+\s*of\s*\d+\s*--\s*\n\s*Programming Report\s*\n/g, '\n');

      sections.push(section);
    }

    console.log(`Split into ${sections.length} keypad sections in programming report`);
    return sections;
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

  private parseActionsInSection(section: string, inputNumber: number): {
    press?: LoadAction[];
    release?: LoadAction[];
    doubleTap?: LoadAction[];
    hold?: LoadAction[];
    on?: LoadAction[];
    off?: LoadAction[];
  } {
    const actions: any = {};

    // Action types for Single Action buttons
    const singleActionTypes = ['Press', 'Release', 'Double Tap', 'Hold'];
    // Action types for Toggle buttons
    const toggleActionTypes = ['Press On', 'Off Level'];

    const actionMap: Record<string, string> = {
      // Single Action mappings
      'Press': 'press',
      'Release': 'release',
      'Double Tap': 'doubleTap',
      'Hold': 'hold',
      // Toggle mappings
      'Press On': 'on',
      'Off Level': 'off',
    };

    // Try all action types
    const allActionTypes = [...singleActionTypes, ...toggleActionTypes];

    for (const actionType of allActionTypes) {
      const pattern = new RegExp(
        `Input Number:\\s*${inputNumber}[\\s\\S]*?Action:\\s*${actionType}[\\s\\S]*?(?=Input Number:\\s*${inputNumber}[\\s\\S]*?Action:|Input Number:\\s*(?!${inputNumber}\\s)|Area Path:|$)`,
        'i'
      );
      const match = section.match(pattern);

      if (match) {
        const loadActions = this.parseLoadTable(match[0]);
        if (loadActions.length > 0) {
          const mappedAction = actionMap[actionType];
          // For toggle buttons, we might have both Press On and Off Level
          // Combine them if both exist
          if (actions[mappedAction]) {
            actions[mappedAction] = [...actions[mappedAction], ...loadActions];
          } else {
            actions[mappedAction] = loadActions;
          }
        }
      }
    }

    return actions;
  }

  private parseLoadTable(tableText: string): LoadAction[] {
    const loadActions: LoadAction[] = [];
    const loadPattern = /Lighting - Zones\s+(.+?)\s+(\d+)%\s+(\d+)\s+s\s+(\d+)\s+s/g;
    const matches = tableText.matchAll(loadPattern);

    for (const match of matches) {
      const loadPath = match[1].trim().replace(/>/g, ':');
      loadActions.push({
        loadFullPath: loadPath,
        commandLevel: parseInt(match[2]),
        fadeTime: parseFloat(match[3]),
        delay: parseFloat(match[4]),
      });
    }

    return loadActions;
  }

  private parseLoads(text: string, loads: Load[], errors: string[]): void {
    const loadPattern = /Lighting - Zones\s+(.+?)(?:\s+\d+%|\s+Unaffected)/g;
    const matches = text.matchAll(loadPattern);
    const uniqueLoads = new Set<string>();

    for (const match of matches) {
      try {
        const pathStr = match[1].trim();
        const pathParts = pathStr.split('>').map(p => p.trim());

        if (pathParts.length >= 3 && !uniqueLoads.has(pathStr)) {
          uniqueLoads.add(pathStr);

          const area = pathParts[0];
          const room = pathParts[1];
          const zone = pathParts[2];

          const location: Location = { area, room };
          const fullPath = `${area}:${room}:${zone}`;

          loads.push({
            id: this.generateLoadId(fullPath),
            fullPath,
            location,
            zone,
            type: 'dimmer',
          });
        }
      } catch (error) {
        errors.push(`Failed to parse load: ${error.message}`);
      }
    }
  }

  private generateLoadId(fullPath: string): string {
    return fullPath.replace(/\s+/g, '-').toLowerCase();
  }
}

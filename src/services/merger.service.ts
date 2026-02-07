import { Injectable } from '@nestjs/common';
import { Keypad, Button } from '../types/core';
import { EngravingParseResult, ProgrammingParseResult, MergeResult } from '../types/parser';

@Injectable()
export class MergerService {
  mergeData(
    engravingResult: EngravingParseResult,
    programmingResult: ProgrammingParseResult
  ): MergeResult {
    const warnings: string[] = [];
    const errors: string[] = [];
    const keypads: Keypad[] = [];

    console.log('=== MERGE PROCESS ===');
    console.log(`Engraving keypads: ${engravingResult.keypads.length}`);
    console.log(`Programming button logic entries: ${programmingResult.buttonLogic.size}`);
    console.log(`Programming loads: ${programmingResult.loads.length}`);

    let totalButtons = 0;
    let matchedButtons = 0;

    errors.push(...engravingResult.errors, ...programmingResult.errors);

    for (const partialKeypad of engravingResult.keypads) {
      try {
        const mergeStats = { total: 0, matched: 0 };
        const mergedKeypad = this.mergeKeypad(partialKeypad, programmingResult, warnings, mergeStats);
        if (mergedKeypad) {
          keypads.push(mergedKeypad as Keypad);
          totalButtons += mergeStats.total;
          matchedButtons += mergeStats.matched;
        }
      } catch (error) {
        errors.push(`Failed to merge keypad ${partialKeypad.id}: ${error.message}`);
      }
    }

    console.log(`\n=== MERGE SUMMARY ===`);
    console.log(`Total buttons: ${totalButtons}`);
    console.log(`Buttons with programming: ${matchedButtons}`);
    console.log(`Buttons using defaults: ${totalButtons - matchedButtons}`);

    if (matchedButtons < totalButtons) {
      warnings.push(
        `${totalButtons - matchedButtons} of ${totalButtons} buttons don't have programming logic in the Programming Report. These buttons will use default toggle behavior.`
      );
    }

    return {
      keypads,
      loads: programmingResult.loads,
      warnings,
      errors,
    };
  }

  private mergeKeypad(
    partialKeypad: Partial<Keypad>,
    programmingResult: ProgrammingParseResult,
    warnings: string[],
    stats: { total: number; matched: number }
  ): Partial<Keypad> | null {
    if (!partialKeypad.buttons) {
      warnings.push(`Keypad ${partialKeypad.id} has no buttons`);
      return partialKeypad;
    }

    const areaPath = this.buildAreaPath(partialKeypad);
    const gangPosition = partialKeypad.wallplate?.gangPosition || 1;

    console.log(`\n=== Merging keypad: ${partialKeypad.id} ===`);
    console.log(`Area path: ${areaPath}, Gang: ${gangPosition}`);
    console.log(`Keypad location:`, partialKeypad.location);

    const allKeys = Array.from(programmingResult.buttonLogic.keys());
    console.log(`All available programming keys (${allKeys.length}):`, allKeys);

    const relevantKeys = allKeys.filter(k => {
      const parts = k.split('_g');
      return parts[0].includes(partialKeypad.location?.area || '') &&
             parts[0].includes(partialKeypad.location?.room || '');
    });
    console.log(`Keys matching area+room:`, relevantKeys);

    const mergedButtons: Button[] = [];

    for (const button of partialKeypad.buttons) {
      stats.total++;
      const inputNumber = button.position;

      // Try exact match first
      const exactKey = `${areaPath}_g${gangPosition}_input-${inputNumber}`;
      let logic = programmingResult.buttonLogic.get(exactKey);
      console.log(`Button ${button.position}: Trying exact key: ${exactKey}, found: ${logic ? 'YES' : 'NO'}`);

      // If no exact match, try fuzzy match (engraving name is prefix of programming name)
      if (!logic && partialKeypad.location?.subLocation) {
        const fuzzyKey = this.findFuzzyMatch(
          partialKeypad.location.area,
          partialKeypad.location.room,
          partialKeypad.location.subLocation,
          gangPosition,
          inputNumber,
          programmingResult.buttonLogic
        );

        if (fuzzyKey) {
          logic = programmingResult.buttonLogic.get(fuzzyKey);
          console.log(`Button ${button.position}: Fuzzy match found: ${fuzzyKey}`);
        } else {
          console.log(`Button ${button.position}: No fuzzy match found`);
        }
      }

      if (logic) {
        stats.matched++;
        mergedButtons.push({
          ...button,
          inputNumber,
          logic,
        });
        console.log(`✓ Merged button ${button.position} for keypad ${partialKeypad.id}`);
      } else {
        // No programming logic - use default behavior
        mergedButtons.push({
          ...button,
          inputNumber,
          logic: {
            type: 'toggle',
            ledLogic: { type: 'room' },
            actions: {},
          },
        });
      }
    }

    return {
      ...partialKeypad,
      buttons: mergedButtons,
    };
  }

  private findFuzzyMatch(
    area: string,
    room: string,
    subLocation: string,
    gangPosition: number,
    inputNumber: number,
    buttonLogicMap: Map<string, any>
  ): string | null {
    // Try to find a key where the subLocation is a prefix of the switch name
    // E.g., "Front Entry" matches "Front Entry\Foyer Entry"

    for (const key of buttonLogicMap.keys()) {
      // Parse the key: "Floor:Room:SwitchName_gX_input-Y"
      const match = key.match(/^(.+)_g(\d+)_input-(\d+)$/);
      if (!match) continue;

      const fullPath = match[1];
      const gang = parseInt(match[2]);
      const input = parseInt(match[3]);

      // Check gang and input match
      if (gang !== gangPosition || input !== inputNumber) continue;

      // Check if path starts with area:room:
      const expectedPrefix = `${area}:${room}:`;
      if (!fullPath.startsWith(expectedPrefix)) continue;

      // Extract switch name from full path
      const switchName = fullPath.substring(expectedPrefix.length);

      // Check if subLocation is a prefix of switchName (with or without backslash separator)
      if (switchName === subLocation || switchName.startsWith(`${subLocation}\\`)) {
        return key;
      }
    }

    return null;
  }

  private buildAreaPath(keypad: Partial<Keypad>): string {
    const loc = keypad.location;
    if (!loc) return '';

    let path = loc.area;
    if (loc.room) path += `:${loc.room}`;
    if (loc.subLocation) path += `:${loc.subLocation}`;

    return path;
  }

}

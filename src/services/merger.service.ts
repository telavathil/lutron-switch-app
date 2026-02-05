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

    errors.push(...engravingResult.errors, ...programmingResult.errors);

    for (const partialKeypad of engravingResult.keypads) {
      try {
        const mergedKeypad = this.mergeKeypad(partialKeypad, programmingResult, warnings);
        if (mergedKeypad) {
          keypads.push(mergedKeypad as Keypad);
        }
      } catch (error) {
        errors.push(`Failed to merge keypad ${partialKeypad.id}: ${error.message}`);
      }
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
    warnings: string[]
  ): Partial<Keypad> | null {
    if (!partialKeypad.buttons) {
      warnings.push(`Keypad ${partialKeypad.id} has no buttons`);
      return partialKeypad;
    }

    const mergedButtons: Button[] = [];

    for (const button of partialKeypad.buttons) {
      const inputNumber = this.findInputNumber(button, programmingResult);

      if (inputNumber) {
        const key = `input-${inputNumber}`;
        const logic = programmingResult.buttonLogic.get(key);

        if (logic) {
          mergedButtons.push({
            ...button,
            inputNumber,
            logic,
          });
        } else {
          warnings.push(
            `No programming logic found for keypad ${partialKeypad.id}, button ${button.position}`
          );
          mergedButtons.push({
            ...button,
            inputNumber: 0,
          });
        }
      } else {
        warnings.push(
          `Could not determine input number for keypad ${partialKeypad.id}, button ${button.position}`
        );
        mergedButtons.push(button);
      }
    }

    return {
      ...partialKeypad,
      buttons: mergedButtons,
    };
  }

  private findInputNumber(button: Button, programmingResult: ProgrammingParseResult): number | null {
    for (const [key, logic] of programmingResult.buttonLogic.entries()) {
      const inputMatch = key.match(/input-(\d+)/);
      if (inputMatch) {
        return parseInt(inputMatch[1]);
      }
    }
    return null;
  }
}

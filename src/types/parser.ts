import { Keypad, Load } from './core';

export interface EngravingParseResult {
  keypads: Partial<Keypad>[];
  errors: string[];
}

export interface ProgrammingParseResult {
  buttonLogic: Map<string, any>;
  loads: Load[];
  errors: string[];
}

export interface MergeResult {
  keypads: Keypad[];
  loads: Load[];
  warnings: string[];
  errors: string[];
}

import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { Keypad, Location, KeypadModel, Wallplate, Faceplate, ButtonEngraving } from '../types/core';
import { EngravingParseResult } from '../types/parser';

@Injectable()
export class EngravingParserService {
  async parseEngravingReport(pdfPath: string): Promise<EngravingParseResult> {
    const errors: string[] = [];
    const keypads: Partial<Keypad>[] = [];

    try {
      const dataBuffer = fs.readFileSync(pdfPath);
      const parser = new PDFParse({ data: dataBuffer });
      const result = await parser.getText();
      await parser.destroy();
      const text = result.text;

      const keypadSections = this.splitIntoKeypadSections(text);

      for (const section of keypadSections) {
        try {
          const keypad = this.parseKeypadSection(section);
          if (keypad) {
            keypads.push(keypad);
          }
        } catch (error) {
          errors.push(`Failed to parse keypad section: ${error.message}`);
        }
      }
    } catch (error) {
      errors.push(`Failed to parse PDF: ${error.message}`);
    }

    return { keypads, errors };
  }

  private splitIntoKeypadSections(text: string): string[] {
    const sections: string[] = [];
    const lines = text.split('\n');
    let currentSection: string[] = [];
    let inKeypadSection = false;

    for (const line of lines) {
      if (line.includes('Area Path:') || line.includes('Model #:')) {
        if (currentSection.length > 0) {
          sections.push(currentSection.join('\n'));
        }
        currentSection = [line];
        inKeypadSection = true;
      } else if (inKeypadSection) {
        currentSection.push(line);
        if (line.trim() === '' && currentSection.length > 5) {
          sections.push(currentSection.join('\n'));
          currentSection = [];
          inKeypadSection = false;
        }
      }
    }

    if (currentSection.length > 0) {
      sections.push(currentSection.join('\n'));
    }

    return sections;
  }

  private parseKeypadSection(section: string): Partial<Keypad> | null {
    const location = this.extractLocation(section);
    const model = this.extractModel(section);
    const wallplate = this.extractWallplate(section);
    const faceplate = this.extractFaceplate(section);
    const buttons = this.extractButtons(section);

    if (!location || !model) {
      return null;
    }

    const id = this.generateKeypadId(location, wallplate.gangPosition);

    return {
      id,
      location,
      model,
      wallplate,
      faceplate,
      buttons: buttons.map((engraving, index) => ({
        id: `${id}-btn-${index + 1}`,
        keypadId: id,
        inputNumber: 0,
        position: index + 1,
        engraving,
        logic: {
          type: 'toggle',
          ledLogic: { type: 'scene' },
          actions: {},
        },
      })),
    };
  }

  private extractLocation(section: string): Location | null {
    const areaPathMatch = section.match(/Area Path:\s*(.+?)(?:\r?\n|$)/);
    if (!areaPathMatch) return null;

    const pathParts = areaPathMatch[1].split(':').map(p => p.trim());

    if (pathParts.length < 2) return null;

    return {
      area: pathParts[0],
      room: pathParts[1],
      subLocation: pathParts[2],
    };
  }

  private extractModel(section: string): KeypadModel | null {
    const modelMatch = section.match(/Model #:\s*([A-Z0-9-]+)/);
    if (!modelMatch) return null;

    const modelStr = modelMatch[1];

    if (modelStr.includes('6BRL') || modelStr.includes('6B')) {
      return modelStr.includes('6BRL') ? 'hybrid-6' : '6-button';
    }

    return 'other';
  }

  private extractWallplate(section: string): Wallplate {
    const gangMatch = section.match(/Gang Position:\s*(\d+)/);
    const colorMatch = section.match(/-(BL|WH)/);
    const backboxMatch = section.match(/Backbox Size:\s*([\d.]+)/);

    return {
      type: 'standard',
      color: colorMatch ? (colorMatch[1] as 'BL' | 'WH') : 'WH',
      gangPosition: gangMatch ? parseInt(gangMatch[1]) : 1,
      backboxSize: backboxMatch ? parseFloat(backboxMatch[1]) : 0,
    };
  }

  private extractFaceplate(section: string): Faceplate {
    const labelMatch = section.match(/Faceplate Label:\s*(.+?)(?:\r?\n|$)/);

    return {
      label: labelMatch ? labelMatch[1].trim() : undefined,
      alignment: 'center',
      fontType: 'standard',
      fontSize: 12,
    };
  }

  private extractButtons(section: string): ButtonEngraving[] {
    const buttons: ButtonEngraving[] = [];
    const buttonMatches = section.matchAll(/Button\s+(\d+).*?Engraving:\s*(.+?)(?:\r?\n|Alignment)/gs);

    for (const match of buttonMatches) {
      const label = match[2].trim();
      buttons.push({
        label,
        alignment: 'center',
        fontType: 'standard',
        fontSize: 10,
      });
    }

    return buttons;
  }

  private generateKeypadId(location: Location, gangPosition: number): string {
    const area = location.area.replace(/\s+/g, '-').toLowerCase();
    const room = location.room.replace(/\s+/g, '-').toLowerCase();
    return `${area}_${room}_g${gangPosition}`;
  }
}

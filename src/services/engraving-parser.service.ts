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

      console.log('=== ENGRAVING PDF TEXT (first 1000 chars) ===');
      console.log(text.substring(0, 1000));
      console.log('=== END SAMPLE ===');

      const keypadSections = this.splitIntoKeypadSections(text);
      console.log(`Found ${keypadSections.length} keypad sections`);

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
      if (line.match(/^[A-Za-z]+ [A-Za-z]+ > .+/) || line.includes('RKD-')) {
        if (line.match(/^[A-Za-z]+ [A-Za-z]+ > .+/)) {
          if (currentSection.length > 0) {
            sections.push(currentSection.join('\n'));
          }
          currentSection = [line];
          inKeypadSection = true;
        } else if (inKeypadSection) {
          currentSection.push(line);
        }
      } else if (inKeypadSection) {
        currentSection.push(line);
        if (line.includes('File Name:') && currentSection.length > 5) {
          sections.push(currentSection.join('\n'));
          currentSection = [];
          inKeypadSection = false;
        }
      }
    }

    if (currentSection.length > 0) {
      sections.push(currentSection.join('\n'));
    }

    console.log(`Sections content preview:`, sections.slice(0, 2).map(s => s.substring(0, 200)));
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
    const locationMatch = section.match(/^(.+?) > (.+?) > (.+?)$/m);
    if (!locationMatch) return null;

    const location = {
      area: locationMatch[1].trim(),
      room: locationMatch[2].trim(),
      subLocation: locationMatch[3].trim(),
    };

    console.log(`\n=== Engraving Parser: Location ===`);
    console.log(`Raw: "${locationMatch[0]}"`);
    console.log(`  Area: "${location.area}"`);
    console.log(`  Room: "${location.room}"`);
    console.log(`  SubLocation: "${location.subLocation}"`);

    return location;
  }

  private extractModel(section: string): KeypadModel | null {
    const modelMatch = section.match(/RKD-[HW]?(6BRL|6B)[A-Z-]*/);
    if (!modelMatch) return null;

    const modelStr = modelMatch[0];

    if (modelStr.includes('6BRL')) {
      return 'hybrid-6';
    } else if (modelStr.includes('6B')) {
      return '6-button';
    }

    return 'other';
  }

  private extractWallplate(section: string): Wallplate {
    const wallplateMatch = section.match(/Wallplate:\s*CW-(\d+)-(BL|WH)/);
    const colorMatch = section.match(/Color:\s*(Black|White)/);
    const backboxMatch = section.match(/Backbox Size:\s*([\d.]+)/);

    let gangPosition = 1;
    let color: 'BL' | 'WH' = 'WH';

    if (wallplateMatch) {
      gangPosition = parseInt(wallplateMatch[1]);
      color = wallplateMatch[2] as 'BL' | 'WH';
    }

    if (colorMatch) {
      color = colorMatch[1] === 'Black' ? 'BL' : 'WH';
    }

    return {
      type: 'standard',
      color,
      gangPosition,
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

    const modelMatch = section.match(/RKD-[HW]?6BRL?[A-Z-]*/);
    if (!modelMatch) return buttons;

    const lines = section.split('\n');
    const modelIndex = lines.findIndex(line => line.includes(modelMatch[0]));

    if (modelIndex === -1) return buttons;

    for (let i = modelIndex + 1; i < lines.length && i < modelIndex + 7; i++) {
      const line = lines[i].trim();
      if (line && !line.includes('File Name:') && !line.includes('Sheet:')) {
        buttons.push({
          label: line,
          alignment: 'left',
          fontType: 'Arial',
          fontSize: 10,
        });
      }
    }

    console.log(`Extracted ${buttons.length} buttons:`, buttons.map(b => b.label));
    return buttons;
  }

  private generateKeypadId(location: Location, gangPosition: number): string {
    const area = location.area.replace(/\s+/g, '-').toLowerCase();
    const room = location.room.replace(/\s+/g, '-').toLowerCase();
    const subLocation = location.subLocation ? location.subLocation.replace(/\s+/g, '-').toLowerCase() : '';

    if (subLocation) {
      return `${area}_${room}_${subLocation}_g${gangPosition}`;
    }
    return `${area}_${room}_g${gangPosition}`;
  }
}

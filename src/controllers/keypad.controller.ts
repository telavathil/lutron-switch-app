import { Controller, Get, Param, Render } from '@nestjs/common';
import { KeypadService } from '../services/keypad.service';

@Controller('keypad')
export class KeypadController {
  constructor(private readonly keypadService: KeypadService) {}

  @Get(':id')
  @Render('keypad/visualizer')
  getKeypad(@Param('id') id: string) {
    const keypad = this.keypadService.findById(id);

    return {
      keypad,
    };
  }
}

import { Controller, Get, Post, Param, Body, Render } from '@nestjs/common';
import { KeypadService } from '../services/keypad.service';
import { UpdateButtonDto } from '../dto/button.dto';

@Controller()
export class ButtonController {
  constructor(private readonly keypadService: KeypadService) {}

  @Get('button/:id/edit')
  @Render('editor/button-form')
  async getButtonEditor(@Param('id') id: string) {
    const button = this.keypadService.findButtonById(id);
    const loads = this.keypadService.getAllLoads();

    return {
      button,
      loads,
    };
  }

  @Post('button/:id')
  @Render('keypad/visualizer')
  async updateButton(@Param('id') id: string, @Body() updateDto: UpdateButtonDto) {
    const keypad = this.keypadService.updateButton(id, updateDto);

    return {
      keypad,
    };
  }
}

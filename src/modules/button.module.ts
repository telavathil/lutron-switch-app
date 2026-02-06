import { Module } from '@nestjs/common';
import { ButtonController } from '../controllers/button.controller';
import { KeypadService } from '../services/keypad.service';
import { DatabaseModule } from '../db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ButtonController],
  providers: [KeypadService],
})
export class ButtonModule {}

import { Module } from '@nestjs/common';
import { KeypadController } from '../controllers/keypad.controller';
import { NavigationController } from '../controllers/navigation.controller';
import { KeypadService } from '../services/keypad.service';
import { ProjectService } from '../services/project.service';
import { DatabaseModule } from '../db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [KeypadController, NavigationController],
  providers: [KeypadService, ProjectService],
  exports: [KeypadService],
})
export class KeypadModule {}

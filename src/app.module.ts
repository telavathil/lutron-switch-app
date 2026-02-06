import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database.module';
import { ImportModule } from './modules/import.module';
import { KeypadModule } from './modules/keypad.module';
import { ButtonModule } from './modules/button.module';
import { DiffModule } from './modules/diff.module';

@Module({
  imports: [DatabaseModule, ImportModule, KeypadModule, ButtonModule, DiffModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

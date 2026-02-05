import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database.module';
import { ImportModule } from './modules/import.module';
import { KeypadModule } from './modules/keypad.module';

@Module({
  imports: [DatabaseModule, ImportModule, KeypadModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database.module';
import { ImportModule } from './modules/import.module';

@Module({
  imports: [DatabaseModule, ImportModule],
  controllers: [],
  providers: [],
})
export class AppModule {}

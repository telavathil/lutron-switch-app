import { Module } from '@nestjs/common';
import { ImportController } from '../controllers/import.controller';
import { EngravingParserService } from '../services/engraving-parser.service';
import { ProgrammingParserService } from '../services/programming-parser.service';
import { MergerService } from '../services/merger.service';
import { ProjectService } from '../services/project.service';
import { DatabaseModule } from '../db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ImportController],
  providers: [
    EngravingParserService,
    ProgrammingParserService,
    MergerService,
    ProjectService,
  ],
  exports: [ProjectService],
})
export class ImportModule {}

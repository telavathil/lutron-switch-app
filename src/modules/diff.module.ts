import { Module } from '@nestjs/common';
import { DiffController } from '../controllers/diff.controller';
import { DiffService } from '../services/diff.service';
import { ProjectService } from '../services/project.service';
import { DatabaseModule } from '../db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [DiffController],
  providers: [DiffService, ProjectService],
})
export class DiffModule {}

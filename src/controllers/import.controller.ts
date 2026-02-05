import { Controller, Get, Post, UploadedFiles, UseInterceptors, Body, Render } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { EngravingParserService } from '../services/engraving-parser.service';
import { ProgrammingParserService } from '../services/programming-parser.service';
import { MergerService } from '../services/merger.service';
import { ProjectService } from '../services/project.service';
import { ImportProjectDto } from '../dto/import.dto';
import { multerConfig } from '../config/multer.config';

@Controller()
export class ImportController {
  constructor(
    private readonly engravingParser: EngravingParserService,
    private readonly programmingParser: ProgrammingParserService,
    private readonly merger: MergerService,
    private readonly projectService: ProjectService,
  ) {}

  @Get('/')
  @Render('import/wizard')
  getImportWizard() {
    return {};
  }

  @Post('import')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'engravingReport', maxCount: 1 },
        { name: 'programmingReport', maxCount: 1 },
      ],
      multerConfig,
    ),
  )
  @Render('import/result')
  async importPDFs(
    @UploadedFiles()
    files: {
      engravingReport?: Express.Multer.File[];
      programmingReport?: Express.Multer.File[];
    },
    @Body() dto: ImportProjectDto,
  ) {
    try {
      if (!files.engravingReport || !files.programmingReport) {
        return {
          success: false,
          error: 'Both Engraving and Programming reports are required',
        };
      }

      const engravingFile = files.engravingReport[0];
      const programmingFile = files.programmingReport[0];

      const engravingResult = await this.engravingParser.parseEngravingReport(
        engravingFile.path,
      );
      const programmingResult = await this.programmingParser.parseProgrammingReport(
        programmingFile.path,
      );

      const mergeResult = this.merger.mergeData(engravingResult, programmingResult);

      if (mergeResult.errors.length > 0) {
        return {
          success: false,
          error: 'Errors occurred during parsing',
          errors: mergeResult.errors,
          warnings: mergeResult.warnings,
        };
      }

      const project = this.projectService.create(
        dto.projectName || 'Lutron Project',
        mergeResult.keypads,
        mergeResult.loads,
      );

      return {
        success: true,
        project,
        warnings: mergeResult.warnings,
        keypadCount: mergeResult.keypads.length,
        loadCount: mergeResult.loads.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

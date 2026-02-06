import { Controller, Get, Query, Render, Res } from '@nestjs/common';
import { Response } from 'express';
import { DiffService } from '../services/diff.service';
import { ProjectService } from '../services/project.service';

@Controller()
export class DiffController {
  constructor(
    private readonly diffService: DiffService,
    private readonly projectService: ProjectService,
  ) {}

  @Get('diff')
  @Render('diff/viewer')
  getDiff(@Query('projectId') projectId?: string) {
    const projects = this.projectService.findAll();

    if (!projectId && projects.length > 0) {
      projectId = projects[0].id;
    }

    let changes = [];
    if (projectId) {
      changes = this.diffService.calculateDiffForProject(projectId);
    }

    return {
      projects,
      currentProjectId: projectId,
      changes,
    };
  }

  @Get('diff/export')
  async exportDiff(@Query('projectId') projectId: string, @Res() res: Response) {
    const markdown = this.diffService.exportDiffAsMarkdown(projectId);

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', `attachment; filename="changes-${projectId}.md"`);
    res.send(markdown);
  }
}

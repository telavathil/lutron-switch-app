import { Controller, Get, Render, Query } from '@nestjs/common';
import { ProjectService } from '../services/project.service';
import { KeypadService } from '../services/keypad.service';

@Controller()
export class NavigationController {
  constructor(
    private readonly projectService: ProjectService,
    private readonly keypadService: KeypadService,
  ) {}

  @Get('sidebar')
  @Render('sidebar/nav')
  getSidebar(@Query('projectId') projectId?: string) {
    const projects = this.projectService.findAll();

    if (!projectId && projects.length > 0) {
      projectId = projects[0].id;
    }

    let groupedKeypads = new Map<string, any[]>();
    if (projectId) {
      groupedKeypads = this.keypadService.findByProject(projectId);
    }

    const navigation = this.buildNavigationTree(groupedKeypads);

    return {
      projects,
      currentProjectId: projectId,
      navigation,
    };
  }

  private buildNavigationTree(groupedKeypads: Map<string, any[]>): any[] {
    const areas = new Map<string, any>();

    for (const [key, keypads] of groupedKeypads.entries()) {
      const [area, room] = key.split(':');

      if (!areas.has(area)) {
        areas.set(area, {
          name: area,
          rooms: new Map<string, any>(),
        });
      }

      const areaData = areas.get(area);
      if (!areaData.rooms.has(room)) {
        areaData.rooms.set(room, {
          name: room,
          keypads: [],
        });
      }

      const roomData = areaData.rooms.get(room);
      roomData.keypads.push(...keypads);
    }

    return Array.from(areas.values()).map(area => ({
      name: area.name,
      rooms: Array.from(area.rooms.values()),
    }));
  }
}

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectsDbService } from './projects-db.service';

@Injectable()
export class ProjectsService {
  constructor(private projectsDb: ProjectsDbService) {}

  // ─── Find All ──────────────────────────────────────────────────────────────
  /**
   * Find all projects with pagination and search from projects_db.
   */
  async findAll(
    skip: number = 0,
    take: number = 25,
    search?: string,
    status?: string,
    departmentId?: string,
    minIndents?: number,
    maxIndents?: number,
    sortBy: string = 'project_name',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    return this.projectsDb.findAll(
      skip,
      take,
      search,
      minIndents,
      maxIndents,
      sortBy,
      sortOrder,
    );
  }

  /**
   * Find a specific project by project_id.
   */
  async findOne(id: string) {
    return this.projectsDb.findByProjectId(id);
  }

  /**
   * Search projects for dropdown typeahead.
   */
  async search(query: string, limit = 25, offset = 0) {
    return this.projectsDb.search(query, limit, offset);
  }

  /**
   * Get all projects (no pagination).
   */
  async getAll() {
    return this.projectsDb.getAll();
  }

  /**
   * Create — read-only data source.
   */
  async create(dto: any) {
    return this.projectsDb.create(dto);
  }

  /**
   * Update — read-only data source.
   */
  async update(id: string, dto: any) {
    return this.projectsDb.update(id, dto);
  }

  /**
   * Delete — read-only data source.
   */
  async delete(id: string) {
    return this.projectsDb.delete(id);
  }

  /**
   * Get projects by department — not supported from projects_db.
   */
  async findByDepartment(
    departmentId: string,
    skip: number = 0,
    take: number = 25,
  ) {
    // projects_db doesn't have department info, return all projects
    const result = await this.projectsDb.findAll(skip, take);
    return result.data;
  }

  /**
   * Get active projects — returns all from projects_db.
   */
  async getActiveProjects(skip: number = 0, take: number = 25) {
    const result = await this.projectsDb.findAll(skip, take);
    return result.data;
  }

  /**
   * Update project status — read-only data source.
   */
  async updateStatus(id: string, status: string) {
    throw new BadRequestException(
      'Cannot update project status in projects_db - it is a read-only external data source',
    );
  }

  /**
   * Get project progress — not applicable to projects_db master data.
   */
  async getProjectProgress(id: string) {
    const project = await this.findOne(id);
    return {
      project: {
        id: project.id,
        projectName: project.projectName,
        projectId: project.projectId,
      },
      progress: {
        completedStages: 0,
        totalStages: 0,
        progressPercentage: 0,
      },
      stages: [],
    };
  }
}

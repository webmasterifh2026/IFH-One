import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface ProjectDbRecord {
  project_id: string;
  project_name: string;
}

@Injectable()
export class ProjectsDbService {
  private readonly logger = new Logger(ProjectsDbService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Converts DB record to camelCase object.
   * Mapping: project_id → projectId, project_name → projectName
   */
  private recordToCamelCase(record: any, idx?: number) {
    return {
      id: record.id || idx || 0,
      projectId: record.projectId || '',
      projectCode: record.projectId || '', // alias for backward compat
      projectName: record.projectName || '',
      totalIndents: 0,
    };
  }

  /**
   * Find all projects with server-side pagination and search.
   */
  async findAll(
    skip = 0,
    take = 25,
    search?: string,
    minIndents?: number,
    maxIndents?: number,
    sortBy: string = 'project_name',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    // Clamp take to 25, 50, or 100
    const allowedSizes = [25, 50, 100];
    if (!allowedSizes.includes(take)) {
      take = allowedSizes.reduce((prev, curr) =>
        Math.abs(curr - take) < Math.abs(prev - take) ? curr : prev,
      );
    }

    try {
      let where: any = {};
      if (search && search.trim()) {
        where = {
          OR: [
            { projectId: { contains: search.trim(), mode: 'insensitive' } },
            { projectName: { contains: search.trim(), mode: 'insensitive' } },
          ],
        };
      }

      const validColumns = ['projectId', 'projectName'];
      const orderByField =
        sortBy === 'project_name'
          ? 'projectName'
          : sortBy === 'project_id_' || sortBy === 'project_id'
            ? 'projectId'
            : 'projectName';

      const orderBy = { [orderByField]: sortOrder };

      const total = await this.prisma.project.count({ where });

      const records = await this.prisma.project.findMany({
        where,
        orderBy,
        skip,
        take,
      });

      const data = records.map((row: any, idx: number) =>
        this.recordToCamelCase(row, skip + idx),
      );

      const page = Math.floor(skip / take) + 1;
      return {
        data,
        meta: {
          total,
          page,
          limit: take,
          totalPages: Math.ceil(total / take),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching projects', error);
      throw error;
    }
  }

  /**
   * Find a single project by project_id.
   */
  async findByProjectId(projectId: string) {
    try {
      const project = await this.prisma.project.findUnique({
        where: { projectId },
      });

      if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
      }

      return this.recordToCamelCase(project);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error fetching project ${projectId}`, error);
      throw error;
    }
  }

  /**
   * Search projects across project_id and project_name (for dropdown typeahead).
   *
   * CRITICAL FIX: Empty query now returns paginated results (limit 25) instead of
   * full table scan. This prevents connection pool exhaustion when user opens
   * dropdown without typing.
   *
   * Requests one extra row instead of running a separate count() alongside
   * the search (see SKUsService.searchEnterprise for why: a second query per
   * keystroke doubles pressure on Neon's small connection pool).
   *
   * Uses GIN trigram indexes for efficient partial text matching.
   */
  async search(query: string, limit = 25, offset = 0) {
    try {
      // FIXED: Cap limit to prevent excessive data transfer
      const safeLim = Math.min(limit, 100);
      const safeOffset = Math.max(0, offset);

      const where = query.trim()
        ? {
            OR: [
              {
                projectId: {
                  contains: query.trim(),
                  mode: 'insensitive' as const,
                },
              },
              {
                projectName: {
                  contains: query.trim(),
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}; // Empty query returns paginated results, NOT full table

      const rows = await this.prisma.project.findMany({
        where,
        orderBy: { projectName: 'asc' },
        take: safeLim + 1, // Fetch one extra to detect hasMore
        skip: safeOffset,
      });

      const hasMore = rows.length > safeLim;
      const records = hasMore ? rows.slice(0, safeLim) : rows;

      return {
        items: records.map((row: any, idx: number) =>
          this.recordToCamelCase(row, idx),
        ),
        total: offset + records.length + (hasMore ? 1 : 0), // lower-bound estimate
        hasMore,
      };
    } catch (error) {
      this.logger.error('Error searching projects', error);
      throw error;
    }
  }

  /**
   * Get all projects (no pagination).
   */
  async getAll() {
    try {
      const records = await this.prisma.project.findMany({
        orderBy: { projectName: 'asc' },
      });

      return records.map((row: any, idx: number) =>
        this.recordToCamelCase(row, idx),
      );
    } catch (error) {
      this.logger.error('Error fetching all projects', error);
      throw error;
    }
  }

  /** CRUD Operations on projects_db */

  async create(dto: any) {
    const projectId =
      dto.projectId || dto.projectCode || dto.project_id || dto.project_id_;
    const projectName = dto.projectName || dto.project_name;

    if (!projectId) {
      throw new BadRequestException(
        'Project ID (projectId/projectCode) is required',
      );
    }
    if (!projectName) {
      throw new BadRequestException('Project Name (projectName) is required');
    }

    try {
      // Check if project already exists
      const existing = await this.prisma.project.findUnique({
        where: { projectId },
      });
      if (existing) {
        throw new BadRequestException(
          `Project with ID ${projectId} already exists`,
        );
      }

      const result = await this.prisma.project.create({
        data: { projectId, projectName },
      });

      return this.recordToCamelCase(result);
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Error creating project', error);
      throw error;
    }
  }

  async update(id: string, dto: any) {
    try {
      const existing = await this.prisma.project.findUnique({
        where: { projectId: id },
      });

      if (!existing) {
        throw new NotFoundException(`Project with ID ${id} not found`);
      }

      const projectName =
        dto.projectName !== undefined
          ? dto.projectName
          : dto.project_name !== undefined
            ? dto.project_name
            : existing.projectName;

      if (!projectName) {
        throw new BadRequestException('Project Name cannot be empty');
      }

      const result = await this.prisma.project.update({
        where: { projectId: id },
        data: { projectName },
      });

      return this.recordToCamelCase(result);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      this.logger.error(`Error updating project ${id}`, error);
      throw error;
    }
  }

  async delete(id: string) {
    try {
      const existing = await this.prisma.project.findUnique({
        where: { projectId: id },
      });

      if (!existing) {
        throw new NotFoundException(`Project with ID ${id} not found`);
      }

      const result = await this.prisma.project.delete({
        where: { projectId: id },
      });

      return this.recordToCamelCase(result);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error(`Error deleting project ${id}`, error);
      throw error;
    }
  }

  async closeConnection() {
    // No-op for PrismaService, it handles its own connections
  }
}

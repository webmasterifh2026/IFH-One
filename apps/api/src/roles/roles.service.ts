import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: string;
  }) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;
    const orderBy: any = {};
    orderBy[query?.sortBy || 'createdAt'] = query?.sortOrder || 'desc';

    const where: any = {};
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query?.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: { select: { userRoles: true } },
          rolePermissions: { include: { permission: true } },
        },
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      data: data.map((r) => ({
        ...r,
        usersCount: r._count.userRoles,
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: { include: { permission: true } },
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                employeeId: true,
                designation: true,
                status: true,
              },
            },
          },
        },
        workflowStages: true,
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async create(data: { name: string; description?: string; status?: string }) {
    const existing = await this.prisma.role.findUnique({
      where: { name: data.name },
    });
    if (existing)
      throw new ConflictException(`Role "${data.name}" already exists`);

    return this.prisma.role.create({
      data: {
        name: data.name,
        description: data.description,
        status: data.status || 'ACTIVE',
      },
    });
  }

  async update(
    id: string,
    data: { name?: string; description?: string; status?: string },
  ) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    if (data.name && data.name !== role.name) {
      const existing = await this.prisma.role.findUnique({
        where: { name: data.name },
      });
      if (existing)
        throw new ConflictException(`Role "${data.name}" already exists`);
    }

    return this.prisma.role.update({
      where: { id },
      data,
    });
  }

  async updateStatus(id: string, status: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.role.update({
      where: { id },
      data: { status },
    });
  }

  async cloneRole(id: string, newName: string) {
    const source = await this.prisma.role.findUnique({
      where: { id },
      include: {
        rolePermissions: true,
        workflowStages: true,
      },
    });
    if (!source) throw new NotFoundException('Source role not found');

    const existing = await this.prisma.role.findUnique({
      where: { name: newName },
    });
    if (existing)
      throw new ConflictException(`Role "${newName}" already exists`);

    const cloned = await this.prisma.role.create({
      data: {
        name: newName,
        description: `Cloned from ${source.name}`,
        status: 'ACTIVE',
      },
    });

    // Copy permissions
    if (source.rolePermissions.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: source.rolePermissions.map((rp) => ({
          roleId: cloned.id,
          permissionId: rp.permissionId,
        })),
      });
    }

    // Copy workflow stage permissions
    if (source.workflowStages.length > 0) {
      await this.prisma.workflowStagePermission.createMany({
        data: source.workflowStages.map((ws) => ({
          roleId: cloned.id,
          workflowStage: ws.workflowStage,
          canView: ws.canView,
          canEdit: ws.canEdit,
          canApprove: ws.canApprove,
        })),
      });
    }

    return cloned;
  }

  async getPermissions(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { rolePermissions: { include: { permission: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role.rolePermissions.map((rp) => rp.permission);
  }

  async setPermissions(
    id: string,
    permissionIds: string[],
    performedById?: string,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    // Delete all existing permissions for this role
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });

    // Create new permission links
    if (permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((pid) => ({ roleId: id, permissionId: pid })),
      });
    }

    if (performedById) {
      await this.prisma.auditLog.create({
        data: {
          action: 'Role Permissions Updated',
          performedById,
          // We can optionally store the role ID in userId if needed,
          // or just rely on the action description. Here we put it in userId since the model doesn't have an entityId.
          userId: id,
        },
      });
    }

    return this.getPermissions(id);
  }

  async getUsers(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                employeeId: true,
                designation: true,
                status: true,
              },
            },
          },
        },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role.userRoles.map((ur) => ur.user);
  }

  async assignUser(roleId: string, userId: string) {
    const role = await this.prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      update: {},
      create: { userId, roleId },
    });
  }

  async removeUser(roleId: string, userId: string) {
    return this.prisma.userRole.deleteMany({
      where: { roleId, userId },
    });
  }

  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { key: 'asc' }],
    });
  }

  async getWorkflowStages(id: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    return this.prisma.workflowStagePermission.findMany({
      where: { roleId: id },
      orderBy: { workflowStage: 'asc' },
    });
  }

  async setWorkflowStages(
    id: string,
    stages: {
      workflowStage: number;
      canView: boolean;
      canEdit: boolean;
      canApprove: boolean;
      canHold?: boolean;
      canReject?: boolean;
      canBulkUpdate?: boolean;
      canExport?: boolean;
      canReassign?: boolean;
    }[],
    performedById?: string,
  ) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.workflowStagePermission.deleteMany({
      where: { roleId: id },
    });

    if (stages.length > 0) {
      await this.prisma.workflowStagePermission.createMany({
        data: stages.map((s) => ({
          roleId: id,
          workflowStage: s.workflowStage,
          canView: s.canView,
          canEdit: s.canEdit,
          canApprove: s.canApprove,
          canHold: s.canHold ?? false,
          canReject: s.canReject ?? false,
          canBulkUpdate: s.canBulkUpdate ?? false,
          canExport: s.canExport ?? false,
          canReassign: s.canReassign ?? false,
        })),
      });
    }

    if (performedById) {
      await this.prisma.auditLog.create({
        data: {
          action: 'Role Workflow Stages Updated',
          performedById,
          userId: id,
        },
      });
    }

    return this.getWorkflowStages(id);
  }
}

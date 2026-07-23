import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DepartmentCreateDto, DepartmentUpdateDto } from './dto';

/**
 * Department management service
 *
 * Note: Since the Prisma schema doesn't include a dedicated Department model yet,
 * this implementation provides a contract for future integration.
 * The departmentId field exists on User and Procurement models but Department master doesn't exist.
 * This service is designed to work with a future Department model schema update.
 */
@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  // ─── Find All ──────────────────────────────────────────────────────────────
  /**
   * Find all departments with pagination and filtering
   */
  async findAll(
    skip: number = 0,
    take: number = 10,
    search?: string,
    status?: string,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    if (take > 100) take = 100;

    // Currently returns mock data with instructions for schema update
    // Once Department model is added to schema, implement full database queries

    const mockDepartments = [
      {
        id: 'dept-001',
        departmentCode: 'DEPT-001',
        departmentName: 'Procurement',
        description: 'Procurement and Vendor Management',
        status: 'ACTIVE',
        managerUserId: null,
        parentDepartmentId: null,
        location: 'Main Office',
        userCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'dept-002',
        departmentCode: 'DEPT-002',
        departmentName: 'Operations',
        description: 'Operations and Project Management',
        status: 'ACTIVE',
        managerUserId: null,
        parentDepartmentId: null,
        location: 'Main Office',
        userCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'dept-003',
        departmentCode: 'DEPT-003',
        departmentName: 'Finance',
        description: 'Finance and Billing',
        status: 'ACTIVE',
        managerUserId: null,
        parentDepartmentId: null,
        location: 'Main Office',
        userCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const filtered = mockDepartments.filter((dept) => {
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          dept.departmentName.toLowerCase().includes(searchLower) ||
          dept.departmentCode.toLowerCase().includes(searchLower) ||
          dept.description.toLowerCase().includes(searchLower)
        );
      }
      if (status && dept.status !== status) {
        return false;
      }
      return true;
    });

    const total = filtered.length;
    const paged = filtered.slice(skip, skip + take);

    return {
      data: paged,
      pagination: {
        skip,
        take,
        total,
        pages: Math.ceil(total / take),
      },
      note: 'Mock data - Department model not yet in schema. Full functionality pending schema update.',
    };
  }

  /**
   * Find a specific department by ID
   */
  async findOne(id: string) {
    // Get users assigned to this department from the User model
    const users = await this.prisma.user.findMany({
      where: { departmentId: id },
      select: {
        id: true,
        fullName: true,
        email: true,
        designation: true,
      },
    });

    // Return mock department with actual user data
    const mockDepartment = {
      id,
      departmentCode: `DEPT-${id.slice(0, 3).toUpperCase()}`,
      departmentName: 'Department Name',
      description: 'Department description',
      status: 'ACTIVE',
      managerUserId: null,
      parentDepartmentId: null,
      location: 'Main Office',
      users,
      userCount: users.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return mockDepartment;
  }

  /**
   * Create a new department
   */
  async create(createDepartmentDto: DepartmentCreateDto) {
    // Mock implementation
    const newDepartment = {
      id: `dept-${Date.now()}`,
      departmentCode:
        createDepartmentDto.departmentCode ||
        `DEPT-${Math.floor(Math.random() * 10000)}`,
      departmentName: createDepartmentDto.departmentName,
      description: createDepartmentDto.description,
      status: createDepartmentDto.status || 'ACTIVE',
      managerUserId: createDepartmentDto.managerUserId,
      parentDepartmentId: createDepartmentDto.parentDepartmentId,
      location: createDepartmentDto.location,
      users: [],
      userCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Assign users if provided
    if (createDepartmentDto.userIds) {
      const userIds = createDepartmentDto.userIds
        .split(',')
        .map((id) => id.trim());
      await Promise.all(
        userIds.map((userId) =>
          this.prisma.user.update({
            where: { id: userId },
            data: { departmentId: newDepartment.id },
          }),
        ),
      );
    }

    return newDepartment;
  }

  /**
   * Update an existing department
   */
  async update(id: string, updateDepartmentDto: DepartmentUpdateDto) {
    const department = await this.findOne(id);

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Update user department assignments if userIds provided
    if (updateDepartmentDto.userIds && updateDepartmentDto.userIds.trim()) {
      const userIds = updateDepartmentDto.userIds
        .split(',')
        .map((uid: string) => uid.trim())
        .filter((uid: string) => uid.length > 0);

      // Remove old assignments
      await this.prisma.user.updateMany({
        where: { departmentId: id },
        data: { departmentId: null },
      });

      // Add new assignments
      if (userIds.length > 0) {
        await Promise.all(
          userIds.map((userId: string) =>
            this.prisma.user.update({
              where: { id: userId },
              data: { departmentId: id },
            }),
          ),
        );
      }
    }

    return {
      ...department,
      ...updateDepartmentDto,
      updatedAt: new Date(),
    };
  }

  /**
   * Delete a department
   */
  async delete(id: string) {
    const department = await this.findOne(id);

    if (!department) {
      throw new NotFoundException(`Department with ID ${id} not found`);
    }

    // Check if department has users
    if (department.userCount > 0) {
      throw new BadRequestException(
        `Cannot delete department with ${department.userCount} assigned user(s)`,
      );
    }

    // Remove department assignment from users
    await this.prisma.user.updateMany({
      where: { departmentId: id },
      data: { departmentId: null },
    });

    return { message: `Department ${id} deleted successfully` };
  }

  /**
   * Get users in a department
   */
  async getDepartmentUsers(
    departmentId: string,
    skip: number = 0,
    take: number = 10,
  ) {
    const users = await this.prisma.user.findMany({
      where: { departmentId },
      skip,
      take,
      select: {
        id: true,
        employeeId: true,
        fullName: true,
        email: true,
        phone: true,
        designation: true,
        status: true,
        userRoles: {
          include: { role: true },
        },
      },
      orderBy: { fullName: 'asc' },
    });

    const total = await this.prisma.user.count({
      where: { departmentId },
    });

    return {
      data: users,
      pagination: {
        skip,
        take,
        total,
        pages: Math.ceil(total / take),
      },
    };
  }

  /**
   * Assign users to a department
   */
  async assignUsers(departmentId: string, userIds: string[]) {
    // Verify department exists
    const department = await this.findOne(departmentId);

    if (!department) {
      throw new NotFoundException(
        `Department with ID ${departmentId} not found`,
      );
    }

    // Verify all users exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
    });

    if (users.length !== userIds.length) {
      throw new BadRequestException('One or more users not found');
    }

    // Assign users to department
    await Promise.all(
      userIds.map((userId) =>
        this.prisma.user.update({
          where: { id: userId },
          data: { departmentId },
        }),
      ),
    );

    return {
      departmentId,
      assignedUsers: userIds.length,
      message: `Successfully assigned ${userIds.length} user(s) to department`,
    };
  }

  /**
   * Remove users from a department
   */
  async removeUsers(departmentId: string, userIds: string[]) {
    await Promise.all(
      userIds.map((userId) =>
        this.prisma.user.update({
          where: { id: userId },
          data: { departmentId: null },
        }),
      ),
    );

    return {
      departmentId,
      removedUsers: userIds.length,
      message: `Successfully removed ${userIds.length} user(s) from department`,
    };
  }

  /**
   * Get department hierarchy
   */
  async getDepartmentHierarchy() {
    const users = await this.prisma.user.findMany({
      select: {
        departmentId: true,
      },
      distinct: ['departmentId'],
    });

    const departments = users
      .map((u) => u.departmentId)
      .filter((d) => d !== null);

    const hierarchy: any = {};

    for (const deptId of departments) {
      const deptUsers = await this.getDepartmentUsers(deptId, 0, 100);
      hierarchy[deptId] = {
        userCount: deptUsers.pagination.total,
        users: deptUsers.data,
      };
    }

    return hierarchy;
  }

  /**
   * Get department statistics
   */
  async getDepartmentStats(departmentId: string) {
    const deptUsers = await this.prisma.user.findMany({
      where: { departmentId },
    });

    const activeUsers = deptUsers.filter((u) => u.status === 'ACTIVE').length;
    const inactiveUsers = deptUsers.filter(
      (u) => u.status === 'INACTIVE',
    ).length;

    return {
      departmentId,
      totalUsers: deptUsers.length,
      activeUsers,
      inactiveUsers,
      lockedUsers: deptUsers.filter((u) => u.status === 'LOCKED').length,
    };
  }
}

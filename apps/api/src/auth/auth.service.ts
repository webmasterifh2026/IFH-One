import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: { permission: true },
                },
                workflowStages: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    // SUPER_ADMIN is never locked out
    const isSuperAdmin = user.userRoles?.some(
      (ur) => ur.role.name === 'SUPER_ADMIN',
    );

    if (user.status !== 'ACTIVE' && !isSuperAdmin) {
      throw new UnauthorizedException(
        'Your account is inactive or locked. Contact administrator.',
      );
    }

    // If super admin is locked, silently restore them
    if (isSuperAdmin && user.status !== 'ACTIVE') {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { status: 'ACTIVE', failedLoginAttempts: 0, lockedAt: null },
      });
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      const attempts = user.failedLoginAttempts + 1;
      let newStatus = user.status;
      let lockedAt = user.lockedAt;

      // Never lock super admin
      if (!isSuperAdmin && attempts >= 5) {
        newStatus = 'LOCKED';
        lockedAt = new Date();
        await this.prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'Account Locked',
            performedById: user.id,
          },
        });
      } else {
        await this.prisma.auditLog.create({
          data: {
            userId: user.id,
            action: 'Failed Login',
            performedById: user.id,
          },
        });
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: isSuperAdmin ? 0 : attempts,
          status: newStatus,
          lockedAt,
        },
      });

      if (newStatus === 'LOCKED') {
        throw new UnauthorizedException(
          'Account locked due to too many failed attempts.',
        );
      }
      throw new UnauthorizedException('Invalid email or password.');
    }

    // Successful login - reset counters
    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lastLogin: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'User Login',
        performedById: user.id,
      },
    });

    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = new Set<string>();
    user.userRoles.forEach((ur) => {
      ur.role.rolePermissions.forEach((rp) => {
        permissions.add(rp.permission.key);
      });
    });

    // Aggregate workflow stage permissions across all roles (for frontend use)
    const stagePermMap = new Map<
      number,
      {
        canView: boolean;
        canEdit: boolean;
        canApprove: boolean;
        canHold: boolean;
        canReject: boolean;
        canBulkUpdate: boolean;
        canExport: boolean;
        canReassign: boolean;
      }
    >();
    user.userRoles.forEach((ur) => {
      (ur.role as any).workflowStages?.forEach((ws: any) => {
        const existing = stagePermMap.get(ws.workflowStage) ?? {
          canView: false,
          canEdit: false,
          canApprove: false,
          canHold: false,
          canReject: false,
          canBulkUpdate: false,
          canExport: false,
          canReassign: false,
        };
        stagePermMap.set(ws.workflowStage, {
          canView: existing.canView || ws.canView,
          canEdit: existing.canEdit || ws.canEdit,
          canApprove: existing.canApprove || ws.canApprove,
          canHold: existing.canHold || (ws.canHold ?? false),
          canReject: existing.canReject || (ws.canReject ?? false),
          canBulkUpdate: existing.canBulkUpdate || (ws.canBulkUpdate ?? false),
          canExport: existing.canExport || (ws.canExport ?? false),
          canReassign: existing.canReassign || (ws.canReassign ?? false),
        });
      });
    });

    const payload = {
      sub: user.id,
      email: user.email,
      roles: roles,
      permissions: Array.from(permissions),
    };

    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 hours absolute
    // Create a generic session if required by specs
    const session = await this.prisma.session.create({
      data: {
        userId: user.id,
        sessionToken: this.jwtService.sign(payload, { expiresIn: '8h' }),
        expiresAt,
        lastActivity: new Date(),
      },
    });

    return {
      access_token: session.sessionToken,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        employeeId: user.employeeId,
        designation: user.designation ?? '',
        departmentId: user.departmentId ?? '',
        phone: user.phone ?? '',
        roles,
        permissions: Array.from(permissions),
        stagePermissions: Object.fromEntries(stagePermMap),
      },
    };
  }

  private readonly userCache = new Map<string, { data: any; expiry: number }>();

  async validateUserById(id: string, token?: string) {
    if (this.userCache.size > 2000) this.userCache.clear();

    const cacheKey = `${id}:${token || 'notoken'}`;
    const now = Date.now();
    const cached = this.userCache.get(cacheKey);
    if (cached && cached.expiry > now) {
      return cached.data;
    }

    if (token) {
      const session = await this.prisma.session.findUnique({
        where: { sessionToken: token },
      });
      // If session row exists and is explicitly expired, reject
      if (session && new Date() > session.expiresAt) {
        throw new UnauthorizedException('Session expired or invalid');
      }
      // If session row is missing, fall through — JWT expiry is the authoritative check
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is inactive or locked');
    }

    this.userCache.set(cacheKey, { data: user, expiry: now + 60000 }); // Cache for 60 seconds
    return user;
  }

  async heartbeat(userId: string, token: string) {
    const session = await this.prisma.session.findUnique({
      where: { sessionToken: token },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    const now = new Date();

    // Check absolute timeout
    if (now > session.expiresAt) {
      await this.prisma.session.delete({ where: { id: session.id } });
      throw new UnauthorizedException('Session expired');
    }

    // Check idle timeout (30 mins)
    const idleTime = now.getTime() - session.lastActivity.getTime();
    if (idleTime > 30 * 60 * 1000) {
      await this.prisma.session.delete({ where: { id: session.id } });
      await this.prisma.auditLog.create({
        data: {
          userId: userId,
          action: 'Session Expired',
          performedById: userId,
        },
      });
      throw new UnauthorizedException('Session expired due to inactivity');
    }

    // Valid, update last activity
    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastActivity: now },
    });

    return { success: true };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: { include: { permission: true } },
                workflowStages: true,
              },
            },
          },
        },
      },
    });
    if (!user) throw new UnauthorizedException('User not found');
    const roles = user.userRoles.map((ur) => ur.role.name);
    const permissions = new Set<string>();
    user.userRoles.forEach((ur) =>
      ur.role.rolePermissions.forEach((rp) =>
        permissions.add(rp.permission.key),
      ),
    );

    // Aggregate workflow stage permissions across all roles
    const stagePermMap = new Map<
      number,
      {
        canView: boolean;
        canEdit: boolean;
        canApprove: boolean;
        canHold: boolean;
        canReject: boolean;
        canBulkUpdate: boolean;
        canExport: boolean;
        canReassign: boolean;
      }
    >();

    user.userRoles.forEach((ur) => {
      ur.role.workflowStages.forEach((ws: any) => {
        const existing = stagePermMap.get(ws.workflowStage) ?? {
          canView: false,
          canEdit: false,
          canApprove: false,
          canHold: false,
          canReject: false,
          canBulkUpdate: false,
          canExport: false,
          canReassign: false,
        };
        stagePermMap.set(ws.workflowStage, {
          canView: existing.canView || ws.canView,
          canEdit: existing.canEdit || ws.canEdit,
          canApprove: existing.canApprove || ws.canApprove,
          canHold: existing.canHold || (ws.canHold ?? false),
          canReject: existing.canReject || (ws.canReject ?? false),
          canBulkUpdate: existing.canBulkUpdate || (ws.canBulkUpdate ?? false),
          canExport: existing.canExport || (ws.canExport ?? false),
          canReassign: existing.canReassign || (ws.canReassign ?? false),
        });
      });
    });

    return {
      id: user.id,
      name: user.fullName,
      email: user.email,
      employeeId: user.employeeId,
      designation: user.designation ?? '',
      departmentId: user.departmentId ?? '',
      phone: user.phone ?? '',
      roles,
      permissions: Array.from(permissions),
      stagePermissions: Object.fromEntries(stagePermMap),
    };
  }

  async logout(userId: string, token: string) {
    await this.prisma.session.deleteMany({
      where: { sessionToken: token },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: userId,
        action: 'User Logout',
        performedById: userId,
      },
    });

    return { success: true };
  }

  async unlockAccount(email: string, newPassword?: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('User not found');
    const updateData: any = {
      status: 'ACTIVE',
      failedLoginAttempts: 0,
      lockedAt: null,
    };
    if (newPassword) {
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }
    await this.prisma.user.update({ where: { email }, data: updateData });
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'Account Unlocked (emergency)',
        performedById: user.id,
      },
    });
    return {
      success: true,
      message: `Account ${email} unlocked${newPassword ? ' and password reset' : ''}`,
    };
  }
}

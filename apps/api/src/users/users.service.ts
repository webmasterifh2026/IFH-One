import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  private safeSelect = {
    id: true,
    employeeId: true,
    fullName: true,
    email: true,
    designation: true,
    departmentId: true,
    phone: true,
    status: true,
    lastLogin: true,
    createdAt: true,
    updatedAt: true,
    userRoles: { include: { role: true } },
  };

  async findAll() {
    return this.prisma.user.findMany({
      select: this.safeSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.safeSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async create(data: any) {
    const { password, passwordHash: _ph, ...rest } = data;
    const hash = await bcrypt.hash(password || 'Temporary@123', 10);
    return this.prisma.user.create({
      data: { ...rest, passwordHash: hash },
      select: this.safeSelect,
    });
  }

  async update(id: string, data: any) {
    const { password, passwordHash: _ph, ...rest } = data;
    const updateData: any = { ...rest };
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: this.safeSelect,
    });
  }

  async remove(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status: 'DELETED', deletedAt: new Date() },
      select: this.safeSelect,
    });
  }

  async restore(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE', deletedAt: null },
      select: this.safeSelect,
    });
  }

  async unlock(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE', lockedAt: null, failedLoginAttempts: 0 },
      select: this.safeSelect,
    });
  }

  async changePassword(id: string, data: any) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('Not found');
    const isValid = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash,
    );
    if (!isValid) throw new Error('Invalid password');
    const hash = await bcrypt.hash(data.newPassword, 10);
    return this.prisma.user.update({
      where: { id },
      data: { passwordHash: hash, passwordChangedAt: new Date() } as any,
    });
  }

  async updatePreferences(id: string, data: any) {
    return this.prisma.user.update({
      where: { id },
      data: { preferences: data } as any,
    });
  }

  async getSessions(id: string) {
    return this.prisma.session.findMany({ where: { userId: id } });
  }

  async revokeSession(userId: string, sessionId: string) {
    if (sessionId === 'all')
      return this.prisma.session.deleteMany({ where: { userId } });
    return this.prisma.session.delete({ where: { id: sessionId, userId } });
  }

  async getAnalytics(id: string) {
    const pendingApprovals = await this.prisma.procurementStage.count({
      where: { assignedToId: id, status: 'PENDING' },
    });
    const activeTasks = pendingApprovals;
    const assignedProjects = 0;
    const slaCompliance = 100;

    return { activeTasks, pendingApprovals, assignedProjects, slaCompliance };
  }

  async getPermissions(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        },
      },
    });
    if (!user) return { roles: [], permissions: [] };

    const roleNames = user.userRoles.map((r: any) => r.role.name);
    const perms: any[] = [];
    user.userRoles.forEach((r: any) => {
      r.role.rolePermissions.forEach((rp: any) => {
        if (!perms.find((p) => p.id === rp.permission.id)) {
          perms.push(rp.permission);
        }
      });
    });
    return { roles: roleNames, permissions: perms };
  }

  async getUserStatistics(id: string) {
    const indentsCreated = await this.prisma.procurement.count({
      where: { requestedById: id },
    });
    const indentsApproved = await this.prisma.procurementHistory.count({
      where: { performedById: id, action: 'APPROVED' },
    });
    const rejectedIndents = await this.prisma.procurementHistory.count({
      where: { performedById: id, action: 'REJECTED' },
    });
    const pendingApprovals = await this.prisma.procurementStage.count({
      where: { assignedToId: id, status: 'PENDING' },
    });

    const vendorsManaged = await this.prisma.auditLog.count({
      where: { performedById: id, action: { contains: 'VENDOR' } },
    });
    const purchaseOrdersCreated = 0;
    const purchaseOrdersApproved = 0;
    const billsProcessed = 0;
    const projectsAssigned = 0;

    return {
      indentsCreated,
      indentsApproved,
      rejectedIndents,
      pendingApprovals,
      vendorsManaged,
      purchaseOrdersCreated,
      purchaseOrdersApproved,
      billsProcessed,
      projectsAssigned,
      averageApprovalTime: '24h',
    };
  }

  async getUserActivity(id: string) {
    return this.prisma.auditLog.findMany({
      where: { performedById: id },
      orderBy: { timestamp: 'desc' },
      take: 20,
    });
  }

  async getCharts(id: string) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const procs = await this.prisma.procurement.findMany({
      where: { requestedById: id, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });

    const history = await this.prisma.procurementHistory.findMany({
      where: { performedById: id, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    });

    const loginLogs = await this.prisma.auditLog.findMany({
      where: {
        performedById: id,
        action: 'LOGIN',
        timestamp: { gte: sixMonthsAgo },
      },
      select: { timestamp: true },
    });

    const formatMonth = (d: Date) =>
      d.toLocaleString('default', { month: 'short' });

    const procActivityMap: Record<string, number> = {};
    const approvalTrendMap: Record<string, number> = {};
    const loginTrendMap: Record<string, number> = {};

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = formatMonth(d);
      procActivityMap[m] = 0;
      approvalTrendMap[m] = 0;
      loginTrendMap[m] = 0;
    }

    procs.forEach((p) => {
      const m = formatMonth(p.createdAt);
      if (procActivityMap[m] !== undefined) procActivityMap[m]++;
    });
    history.forEach((h) => {
      const m = formatMonth(h.createdAt);
      if (approvalTrendMap[m] !== undefined) approvalTrendMap[m]++;
    });
    loginLogs.forEach((l) => {
      const m = formatMonth(l.timestamp);
      if (loginTrendMap[m] !== undefined) loginTrendMap[m]++;
    });

    return {
      procurementActivity: Object.entries(procActivityMap).map(
        ([name, value]) => ({ name, value }),
      ),
      approvalTrend: Object.entries(approvalTrendMap).map(([name, value]) => ({
        name,
        value,
      })),
      loginTrend: Object.entries(loginTrendMap).map(([name, value]) => ({
        name,
        value,
      })),
    };
  }

  async getAchievements(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    const loginCount = await this.prisma.auditLog.count({
      where: { performedById: id, action: 'LOGIN' },
    });

    let completion = 0;
    if (user) {
      if (user.fullName) completion += 20;
      if (user.email) completion += 20;
      if (user.phone) completion += 10;
      if (user.address) completion += 10;
      if (user.profileImage) completion += 20;
      if (user.departmentId) completion += 20;
    }

    return {
      loginCount,
      profileCompletion: completion,
      consecutiveLoginDays: loginCount > 0 ? 1 : 0,
    };
  }

  async getPublicStats() {
    const [skus, vendors, departments, users, procurements] = await Promise.all(
      [
        this.prisma.sKU.count().catch(() => 0),
        this.prisma.vendor.count().catch(() => 0),
        this.prisma.department.count().catch(() => 0),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }).catch(() => 0),
        this.prisma.procurement.count().catch(() => 0),
      ],
    );
    return { items: skus, vendors, departments, users, procurements };
  }
}

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { WorkflowStageGuard } from './auth/guards/workflow-stage.guard';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProcurementModule } from './procurement/procurement.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ProjectsModule } from './projects/projects.module';
import { VendorsModule } from './vendors/vendors.module';
import { SKUsModule } from './skus/skus.module';
import { IndentsModule } from './indents/indents.module';
import { RfqsModule } from './rfqs/rfqs.module';
import { QuotationsModule } from './quotations/quotations.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { ReceiptsModule } from './receipts/receipts.module';
import { InspectionsModule } from './inspections/inspections.module';
import { GateEntryModule } from './gate-entry/gate-entry.module';
import { BillingModule } from './billing/billing.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AuditModule } from './audit/audit.module';
import { EmailModule } from './common/email/email.module';
import { PrismaModule } from './common/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { VersionModule } from './version/version.module';
import { VendorRfqPortalModule } from './vendor-rfq-portal/vendor-rfq-portal.module';
import { RfqFloatModule } from './rfq-float/rfq-float.module';

import { configModuleOptions } from './common/config/config';

import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot(configModuleOptions),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    ProcurementModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    ProjectsModule,
    VendorsModule,
    SKUsModule,
    IndentsModule,
    RfqsModule,
    QuotationsModule,
    PurchaseOrdersModule,
    ApprovalsModule,
    ReceiptsModule,
    InspectionsModule,
    GateEntryModule,
    BillingModule,
    PaymentsModule,
    NotificationsModule,
    AuditModule,
    PrismaModule,
    HealthModule,
    VersionModule,
    VendorRfqPortalModule,
    RfqFloatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: WorkflowStageGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}

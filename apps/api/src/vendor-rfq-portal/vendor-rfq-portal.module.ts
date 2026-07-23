import { Module } from '@nestjs/common';
import { VendorRfqFormService } from './services/vendor-rfq-form.service';
import { VendorQuotationService } from './services/vendor-quotation.service';
import { VendorRfqEmailService } from './services/vendor-rfq-email.service';
import { VendorNegotiationService } from './services/vendor-negotiation.service';
import { VendorRfqPortalController } from './controllers/vendor-rfq-portal.controller';
import { PrismaService } from '../common/prisma/prisma.service';

@Module({
  providers: [
    PrismaService,
    VendorRfqFormService,
    VendorQuotationService,
    VendorRfqEmailService,
    VendorNegotiationService,
  ],
  controllers: [VendorRfqPortalController],
  exports: [
    VendorRfqFormService,
    VendorQuotationService,
    VendorRfqEmailService,
    VendorNegotiationService,
  ],
})
export class VendorRfqPortalModule {}

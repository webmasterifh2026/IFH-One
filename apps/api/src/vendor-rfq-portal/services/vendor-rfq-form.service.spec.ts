import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { VendorRfqFormService } from './vendor-rfq-form.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import dayjs from 'dayjs';

describe('VendorRfqFormService', () => {
  let service: VendorRfqFormService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    vendorRFQForm: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    vendorFormAccessLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorRfqFormService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VendorRfqFormService>(VendorRfqFormService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateVendorForms', () => {
    it('should generate vendor forms for new RFQ', async () => {
      const rfqId = 'rfq-123';
      const vendors = [
        {
          vendorId: 'v-1',
          vendorCode: 'VENDOR001',
          vendorName: 'Vendor One',
          vendorEmail: 'vendor1@example.com',
          contactPerson: 'John Doe',
        },
      ];
      const rfqData = {
        rfqNumber: 'RFQ-2026-001',
        createdAt: new Date(),
        submissionDeadline: dayjs().add(14, 'days').toDate(),
        expectedDelivery: dayjs().add(30, 'days').toDate(),
        deliveryTerms: 'FOB',
        createdBy: { fullName: 'Procurement Manager' },
        specialInstructions: 'Urgent requirement',
      };

      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue(null);
      mockPrismaService.vendorRFQForm.create.mockResolvedValue({
        id: 'form-1',
        rfqId,
        vendorCode: vendors[0].vendorCode,
        vendorName: vendors[0].vendorName,
        secureToken: expect.any(String),
        formStatus: 'PENDING',
      });

      const result = await service.generateVendorForms(rfqId, vendors, rfqData);

      expect(result).toHaveLength(1);
      expect(result[0].formStatus).toBe('PENDING');
      expect(mockPrismaService.vendorRFQForm.create).toHaveBeenCalled();
    });

    it('should skip if form already exists for vendor', async () => {
      const rfqId = 'rfq-123';
      const vendors = [
        {
          vendorCode: 'VENDOR001',
          vendorName: 'Vendor One',
          vendorEmail: 'vendor1@example.com',
        },
      ];
      const rfqData = { rfqNumber: 'RFQ-001' };

      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue({
        id: 'existing-form',
      });

      const result = await service.generateVendorForms(rfqId, vendors, rfqData);

      expect(result).toHaveLength(0);
      expect(mockPrismaService.vendorRFQForm.create).not.toHaveBeenCalled();
    });
  });

  describe('validateTokenAndGetForm', () => {
    it('should return form if token is valid', async () => {
      const token = 'valid-token';
      const form = {
        id: 'form-1',
        secureToken: token,
        tokenExpiresAt: dayjs().add(7, 'days').toDate(),
        submissionDeadline: dayjs().add(14, 'days').toDate(),
        formStatus: 'PENDING',
        rfq: { items: [] },
      };

      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue(form);
      mockPrismaService.vendorRFQForm.update.mockResolvedValue(form);
      mockPrismaService.vendorFormAccessLog.create.mockResolvedValue({});

      const result = await service.validateTokenAndGetForm(token);

      expect(result).toEqual(form);
      expect(mockPrismaService.vendorFormAccessLog.create).toHaveBeenCalled();
    });

    it('should throw if token is invalid', async () => {
      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue(null);

      await expect(
        service.validateTokenAndGetForm('invalid-token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if token is expired', async () => {
      const token = 'expired-token';
      const form = {
        secureToken: token,
        tokenExpiresAt: dayjs().subtract(1, 'day').toDate(),
      };

      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue(form);

      await expect(service.validateTokenAndGetForm(token)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if submission deadline passed', async () => {
      const token = 'valid-token';
      const form = {
        secureToken: token,
        tokenExpiresAt: dayjs().add(7, 'days').toDate(),
        submissionDeadline: dayjs().subtract(1, 'day').toDate(),
      };

      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue(form);

      await expect(service.validateTokenAndGetForm(token)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('canVendorSubmit', () => {
    it('should return true if vendor can submit', async () => {
      const formId = 'form-1';
      const form = {
        id: formId,
        submissionDeadline: dayjs().add(7, 'days').toDate(),
        quotation: null,
      };

      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue(form);

      const canSubmit = await service.canVendorSubmit(formId);

      expect(canSubmit).toBe(true);
    });

    it('should return false if already submitted', async () => {
      const formId = 'form-1';
      const form = {
        id: formId,
        submissionDeadline: dayjs().add(7, 'days').toDate(),
        quotation: { id: 'quot-1' },
      };

      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue(form);

      const canSubmit = await service.canVendorSubmit(formId);

      expect(canSubmit).toBe(false);
    });

    it('should return false if deadline passed', async () => {
      const formId = 'form-1';
      const form = {
        id: formId,
        submissionDeadline: dayjs().subtract(1, 'day').toDate(),
        quotation: null,
      };

      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue(form);

      const canSubmit = await service.canVendorSubmit(formId);

      expect(canSubmit).toBe(false);
    });

    it('should throw if form not found', async () => {
      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue(null);

      await expect(service.canVendorSubmit('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getResponseSummary', () => {
    it('should return summary of vendor responses', async () => {
      const rfqId = 'rfq-1';
      const forms = [
        {
          vendorName: 'Vendor A',
          formStatus: 'SUBMITTED',
          quotation: { quotationStatus: 'SUBMITTED', grandTotalAmount: 50000 },
          formOpenedAt: new Date(),
          formSubmittedAt: new Date(),
        },
        {
          vendorName: 'Vendor B',
          formStatus: 'PENDING',
          quotation: null,
          formOpenedAt: null,
          formSubmittedAt: null,
        },
      ];

      mockPrismaService.vendorRFQForm.findMany.mockResolvedValue(forms);

      const summary = await service.getResponseSummary(rfqId);

      expect(summary.totalVendorsForms).toBe(2);
      expect(summary.submitted).toBe(1);
      expect(summary.pending).toBe(1);
      expect(summary.forms).toHaveLength(2);
    });
  });

  describe('logFormAccess', () => {
    it('should log form access', async () => {
      const formId = 'form-1';
      const actionType = 'FORM_OPENED';
      const ipAddress = '192.168.1.1';
      const userAgent = 'Mozilla/5.0';

      mockPrismaService.vendorFormAccessLog.create.mockResolvedValue({});

      await service.logFormAccess(formId, actionType, ipAddress, userAgent);

      expect(mockPrismaService.vendorFormAccessLog.create).toHaveBeenCalledWith(
        {
          data: {
            vendorFormId: formId,
            actionType,
            ipAddress,
            userAgent,
          },
        },
      );
    });
  });

  describe('updateFormStatus', () => {
    it('should update form status', async () => {
      const formId = 'form-1';
      const newStatus = 'SUBMITTED';
      const updatedForm = {
        id: formId,
        formStatus: newStatus,
        formSubmittedAt: new Date(),
      };

      mockPrismaService.vendorRFQForm.update.mockResolvedValue(updatedForm);

      const result = await service.updateFormStatus(formId, newStatus as any);

      expect(result.formStatus).toBe(newStatus);
      expect(mockPrismaService.vendorRFQForm.update).toHaveBeenCalled();
    });
  });

  describe('markFormAsExpired', () => {
    it('should mark form as expired', async () => {
      const formId = 'form-1';
      mockPrismaService.vendorRFQForm.update.mockResolvedValue({
        id: formId,
        formStatus: 'EXPIRED',
      });

      await service.markFormAsExpired(formId);

      expect(mockPrismaService.vendorRFQForm.update).toHaveBeenCalledWith({
        where: { id: formId },
        data: { formStatus: 'EXPIRED' },
      });
    });
  });
});

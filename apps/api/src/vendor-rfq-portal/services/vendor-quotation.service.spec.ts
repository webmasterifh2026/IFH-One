import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { VendorQuotationService } from './vendor-quotation.service';
import { PrismaService } from '../../common/prisma/prisma.service';

describe('VendorQuotationService', () => {
  let service: VendorQuotationService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    vendorQuotation: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    vendorRFQForm: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    vendorQuotationAttachment: {
      create: jest.fn(),
    },
    vendorFormAccessLog: {
      create: jest.fn(),
    },
    rFQ: {
      findUnique: jest.fn(),
    },
    rFQActivityLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorQuotationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VendorQuotationService>(VendorQuotationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitQuotation', () => {
    it('should submit quotation successfully', async () => {
      const vendorFormId = 'form-1';
      const rfqId = 'rfq-1';
      const dto = {
        vendorFormId,
        rfqId,
        authorizedPerson: 'John Doe',
        designation: 'CEO',
        lineItems: [
          {
            itemCode: 'SKU001',
            itemName: 'Product A',
            quantity: 10,
            unitOfMeasure: 'PCS',
            quotedRate: 1000,
            currency: 'INR',
            totalAmount: 10000,
          },
        ],
        paymentTerms: 'Net 30',
      };

      const vendorForm = {
        id: vendorFormId,
        submissionDeadline: new Date(Date.now() + 86400000),
        quotation: null,
      };

      mockPrismaService.vendorQuotation.count.mockResolvedValue(0);
      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue(vendorForm);
      mockPrismaService.vendorQuotation.create.mockResolvedValue({
        id: 'quot-1',
        quotationNumber: 'QT-2026-07-0001',
        vendorFormId,
        rfqId,
        quotationStatus: 'SUBMITTED',
        grandTotalAmount: 10000,
        lineItems: dto.lineItems,
        attachments: [],
      });

      const result = await service.submitQuotation(dto);

      expect(result.quotationStatus).toBe('SUBMITTED');
      expect(result.grandTotalAmount).toBe(10000);
      expect(mockPrismaService.vendorQuotation.create).toHaveBeenCalled();
      expect(mockPrismaService.vendorFormAccessLog.create).toHaveBeenCalled();
      expect(mockPrismaService.vendorRFQForm.update).toHaveBeenCalled();
      expect(mockPrismaService.rFQActivityLog.create).toHaveBeenCalled();
    });

    it('should throw if vendor form not found', async () => {
      const dto = {
        vendorFormId: 'non-existent',
        rfqId: 'rfq-1',
        authorizedPerson: 'John',
        designation: 'CEO',
        lineItems: [],
      };

      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue(null);

      await expect(service.submitQuotation(dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw if quotation already submitted', async () => {
      const vendorFormId = 'form-1';
      const dto = {
        vendorFormId,
        rfqId: 'rfq-1',
        authorizedPerson: 'John',
        designation: 'CEO',
        lineItems: [],
      };

      const vendorForm = {
        id: vendorFormId,
        quotation: { id: 'existing-quot' },
      };

      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue(vendorForm);

      await expect(service.submitQuotation(dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw if deadline passed', async () => {
      const vendorFormId = 'form-1';
      const dto = {
        vendorFormId,
        rfqId: 'rfq-1',
        authorizedPerson: 'John',
        designation: 'CEO',
        lineItems: [],
      };

      const vendorForm = {
        id: vendorFormId,
        submissionDeadline: new Date(Date.now() - 86400000), // Past
        quotation: null,
      };

      mockPrismaService.vendorRFQForm.findUnique.mockResolvedValue(vendorForm);

      await expect(service.submitQuotation(dto)).rejects.toThrow(Error);
    });
  });

  describe('getQuotationById', () => {
    it('should return quotation with details', async () => {
      const quotationId = 'quot-1';
      const quotation = {
        id: quotationId,
        quotationNumber: 'QT-001',
        quotationStatus: 'SUBMITTED',
        grandTotalAmount: 10000,
        lineItems: [{ id: 'item-1', itemName: 'Product A' }],
        attachments: [],
        negotiationRounds: [],
        vendorForm: { vendorName: 'Vendor A' },
      };

      mockPrismaService.vendorQuotation.findUnique.mockResolvedValue(quotation);

      const result = await service.getQuotationById(quotationId);

      expect(result.id).toBe(quotationId);
      expect(result.quotationNumber).toBe('QT-001');
      expect(result.lineItems).toHaveLength(1);
    });

    it('should throw if quotation not found', async () => {
      mockPrismaService.vendorQuotation.findUnique.mockResolvedValue(null);

      await expect(service.getQuotationById('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getQuotationsForRFQ', () => {
    it('should return all quotations for RFQ', async () => {
      const rfqId = 'rfq-1';
      const quotations = [
        {
          id: 'quot-1',
          quotationNumber: 'QT-001',
          quotationStatus: 'SUBMITTED',
          vendorForm: { vendorName: 'Vendor A' },
        },
        {
          id: 'quot-2',
          quotationNumber: 'QT-002',
          quotationStatus: 'UNDER_REVIEW',
          vendorForm: { vendorName: 'Vendor B' },
        },
      ];

      mockPrismaService.vendorQuotation.findMany.mockResolvedValue(quotations);

      const result = await service.getQuotationsForRFQ(rfqId);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.vendorQuotation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { rfqId } }),
      );
    });
  });

  describe('updateQuotationStatus', () => {
    it('should update quotation status', async () => {
      const quotationId = 'quot-1';
      const dto = { status: 'SHORTLISTED', remarks: 'Good pricing' };
      const quotation = {
        id: quotationId,
        rfqId: 'rfq-1',
        quotationStatus: 'SUBMITTED',
      };
      const updated = {
        id: quotationId,
        quotationStatus: 'SHORTLISTED',
        quotationRemarks: 'Good pricing',
      };

      mockPrismaService.vendorQuotation.findUnique.mockResolvedValue(quotation);
      mockPrismaService.vendorQuotation.update.mockResolvedValue(updated);

      const result = await service.updateQuotationStatus(quotationId, dto);

      expect(result.quotationStatus).toBe('SHORTLISTED');
      expect(result.quotationRemarks).toBe('Good pricing');
      expect(mockPrismaService.rFQActivityLog.create).toHaveBeenCalled();
    });

    it('should throw if quotation not found', async () => {
      mockPrismaService.vendorQuotation.findUnique.mockResolvedValue(null);

      await expect(
        service.updateQuotationStatus('non-existent', {
          status: 'SHORTLISTED',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadQuotationAttachment', () => {
    it('should upload attachment', async () => {
      const quotationId = 'quot-1';
      const quotation = { id: quotationId, vendorFormId: 'form-1' };
      const attachment = {
        id: 'att-1',
        fileName: 'quotation.pdf',
        fileType: 'application/pdf',
        fileUrl: 'https://drive.google.com/...',
      };

      mockPrismaService.vendorQuotation.findUnique.mockResolvedValue(quotation);
      mockPrismaService.vendorQuotationAttachment.create.mockResolvedValue(
        attachment,
      );

      const result = await service.uploadQuotationAttachment(
        quotationId,
        undefined,
        'quotation.pdf',
        'application/pdf',
        102400,
        'https://drive.google.com/...',
        'QUOTATION',
      );

      expect(result.fileName).toBe('quotation.pdf');
      expect(
        mockPrismaService.vendorQuotationAttachment.create,
      ).toHaveBeenCalled();
      expect(mockPrismaService.vendorFormAccessLog.create).toHaveBeenCalled();
    });

    it('should throw if quotation not found', async () => {
      mockPrismaService.vendorQuotation.findUnique.mockResolvedValue(null);

      await expect(
        service.uploadQuotationAttachment(
          'non-existent',
          undefined,
          'file.pdf',
          'application/pdf',
          1024,
          'url',
          'QUOTATION',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getQuotationComparison', () => {
    it('should return comparison data', async () => {
      const rfqId = 'rfq-1';
      const quotations = [
        {
          id: 'quot-1',
          quotationNumber: 'QT-001',
          submittedAt: new Date(),
          quotationStatus: 'SUBMITTED',
          grandTotalAmount: 50000,
          vendorForm: { vendorName: 'Vendor A', vendorCode: 'VA' },
          lineItems: [
            {
              quotedRate: 1000,
              discountPercentage: 10,
              gstPercentage: 18,
              totalAmount: 1098,
              brandOffered: 'Brand A',
              leadTimeDays: 7,
            },
          ],
        },
      ];
      const rfq = { rfqNumber: 'RFQ-001', items: [] };

      mockPrismaService.vendorQuotation.findMany.mockResolvedValue(quotations);
      mockPrismaService.rFQ.findUnique.mockResolvedValue(rfq);

      const result = await service.getQuotationComparison(rfqId);

      expect(result.rfqNumber).toBe('RFQ-001');
      expect(result.totalQuotations).toBe(1);
      expect(result.quotations).toHaveLength(1);
    });

    it('should throw if RFQ not found', async () => {
      mockPrismaService.vendorQuotation.findMany.mockResolvedValue([]);
      mockPrismaService.rFQ.findUnique.mockResolvedValue(null);

      await expect(
        service.getQuotationComparison('non-existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('verifyRoundTripIntegrity', () => {
    it('should verify data integrity', async () => {
      const quotationId = 'quot-1';
      const quotation = {
        id: quotationId,
        grandTotalAmount: 10000,
        lineItems: [{ quantity: 10, quotedRate: 1000, totalAmount: 10000 }],
        vendorForm: {},
        lineItems: [{ id: 'item-1', totalAmount: 10000 }],
        attachments: [],
        negotiationRounds: [],
      };

      mockPrismaService.vendorQuotation.findUnique.mockResolvedValue(quotation);

      const result = await service.verifyRoundTripIntegrity(quotationId);

      expect(result.isAccurate).toBe(true);
      expect(result.storedGrandTotal).toBe(10000);
      expect(result.calculatedGrandTotal).toBe(10000);
    });

    it('should detect accuracy issues', async () => {
      const quotationId = 'quot-1';
      const quotation = {
        id: quotationId,
        grandTotalAmount: 10000,
        lineItems: [
          { quantity: 10, quotedRate: 1000, totalAmount: 9900 }, // Mismatch
        ],
        vendorForm: {},
        lineItems: [{ id: 'item-1', totalAmount: 9900 }],
        attachments: [],
        negotiationRounds: [],
      };

      mockPrismaService.vendorQuotation.findUnique.mockResolvedValue(quotation);

      const result = await service.verifyRoundTripIntegrity(quotationId);

      expect(result.isAccurate).toBe(false);
    });
  });
});

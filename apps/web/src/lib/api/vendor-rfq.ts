/**
 * Vendor RFQ Portal API Client
 * Handles all vendor and procurement team operations for RFQ quotation workflow
 */

import { apiFetch } from './fetch';

// ─── Types ────────────────────────────────────────────────────────────────

export interface VendorFormData {
  id: string;
  rfqId: string;
  vendorCode: string;
  vendorName: string;
  vendorEmail: string;
  secureToken: string;
  formStatus: string;
  rfqNumber: string;
  submissionDeadline: string;
  expectedDeliveryDate: string;
  buyerName: string;
  generalRemarks?: string;
  formOpenedAt?: string;
  formSubmittedAt?: string;
}

export interface QuotationLineItem {
  id: string;
  itemCode?: string;
  itemName: string;
  quantity: number;
  unitOfMeasure: string;
  quotedRate: number;
  currency: string;
  discountPercentage?: number;
  gstPercentage?: number;
  freightCharges?: number;
  packingCharges?: number;
  totalAmount: number;
  brandOffered?: string;
  countryOfOrigin?: string;
  hsnCode?: string;
  leadTimeDays?: number;
  warranty?: string;
  remarks?: string;
}

export interface Quotation {
  id: string;
  quotationNumber: string;
  vendorFormId: string;
  rfqId: string;
  submittedAt: string;
  quotationStatus: string;
  paymentTerms?: string;
  deliveryBasis?: string;
  warranty?: string;
  grandTotalAmount: number;
  grandTotalCurrency: string;
  lineItems: QuotationLineItem[];
  attachments: QuotationAttachment[];
  vendorForm?: {
    vendorName: string;
    vendorCode: string;
    vendorEmail: string;
  };
}

export interface QuotationAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileUrl: string;
  documentType: string;
  fileSize: number;
}

export interface VendorFormWithQuotation extends VendorFormData {
  quotation?: Quotation;
  accessLogs?: AccessLog[];
}

export interface AccessLog {
  id: string;
  actionType: string;
  timestamp: string;
}

export interface RFQComparisonData {
  rfqNumber: string;
  totalQuotations: number;
  quotations: {
    quotationId: string;
    vendorName: string;
    vendorCode: string;
    quotationNumber: string;
    submittedAt: string;
    status: string;
    grandTotal: number;
    currency: string;
    paymentTerms?: string;
    deliveryBasis?: string;
    warranty?: string;
    leadTime?: number;
    lineItems: QuotationLineItem[];
  }[];
}

export interface NegotiationRound {
  id: string;
  quotationId: string;
  roundNumber: number;
  requestedAdjustments?: string;
  counterOfferAmount?: number;
  counterOfferTerms?: string;
  sentAt: string;
  vendorResponseStatus: string;
  vendorResponseAt?: string;
  vendorResponse?: string;
}

export interface NegotiationDashboard {
  rfqId: string;
  totalQuotations: number;
  underNegotiation: number;
  negotiationCompleted: number;
  shortlisted: number;
  selected: number;
  rejected: number;
  quotations: {
    quotationId: string;
    vendorName: string;
    quotedAmount: number;
    status: string;
    negotiationRounds: number;
    lastUpdated: string;
    remarks?: string;
  }[];
}

// ─── Vendor Portal API (Public, Token-based) ───────────────────────────────

/**
 * Get vendor form by secure token (public endpoint)
 */
export async function getVendorFormByToken(token: string): Promise<VendorFormWithQuotation> {
  return apiFetch(`/vendor-rfq-portal/form/${token}`);
}

/**
 * Submit vendor quotation (public endpoint)
 */
export async function submitVendorQuotation(
  vendorFormId: string,
  rfqId: string,
  data: {
    authorizedPerson: string;
    designation: string;
    digitalSignature?: string;
    lineItems: any[];
    paymentTerms?: string;
    deliveryBasis?: string;
    warranty?: string;
    grandTotalAmount?: number;
  },
): Promise<Quotation> {
  return apiFetch('/vendor-rfq-portal/quotations/submit', {
    method: 'POST',
    body: JSON.stringify({
      vendorFormId,
      rfqId,
      ...data,
    }),
  });
}

/**
 * Upload vendor quotation attachment (public endpoint)
 */
export async function uploadVendorAttachment(
  quotationId: string,
  file: File,
  documentType: string,
  lineItemId?: string,
): Promise<QuotationAttachment> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('documentType', documentType);
  if (lineItemId) formData.append('lineItemId', lineItemId);

  return apiFetch(`/vendor-rfq-portal/quotations/${quotationId}/attach`, {
    method: 'POST',
    body: formData,
    headers: {}, // Let browser set Content-Type with boundary
  });
}

// ─── Procurement Team API (Protected, Auth-required) ──────────────────────

/**
 * Generate vendor RFQ forms for an RFQ
 */
export async function generateVendorForms(
  rfqId: string,
  vendors: Array<{
    vendorId?: string;
    vendorCode: string;
    vendorName: string;
    vendorEmail: string;
    contactPerson?: string;
  }>,
): Promise<VendorFormData[]> {
  return apiFetch('/vendor-rfq-portal/forms/generate', {
    method: 'POST',
    body: JSON.stringify({ rfqId, vendors }),
  });
}

/**
 * Get all forms for an RFQ
 */
export async function getFormsForRFQ(rfqId: string): Promise<VendorFormWithQuotation[]> {
  return apiFetch(`/vendor-rfq-portal/forms/rfq/${rfqId}`);
}

/**
 * Get quotations for an RFQ
 */
export async function getQuotationsForRFQ(rfqId: string): Promise<Quotation[]> {
  return apiFetch(`/vendor-rfq-portal/quotations/rfq/${rfqId}`);
}

/**
 * Get quotation by ID
 */
export async function getQuotationById(quotationId: string): Promise<Quotation> {
  return apiFetch(`/vendor-rfq-portal/quotations/${quotationId}`);
}

/**
 * Update quotation status
 */
export async function updateQuotationStatus(
  quotationId: string,
  status: string,
  remarks?: string,
): Promise<Quotation> {
  return apiFetch(`/vendor-rfq-portal/quotations/${quotationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, remarks }),
  });
}

/**
 * Get quotation comparison data for RFQ
 */
export async function getQuotationComparison(rfqId: string): Promise<RFQComparisonData> {
  return apiFetch(`/vendor-rfq-portal/quotations/compare/${rfqId}`);
}

/**
 * Get negotiation dashboard data
 */
export async function getNegotiationDashboard(rfqId: string): Promise<NegotiationDashboard> {
  return apiFetch(`/vendor-rfq-portal/negotiation/dashboard/${rfqId}`);
}

/**
 * Get negotiation history for a quotation
 */
export async function getNegotiationHistory(quotationId: string): Promise<NegotiationRound[]> {
  return apiFetch(`/vendor-rfq-portal/negotiation/${quotationId}/history`);
}

/**
 * Send negotiation counter-offer
 */
export async function sendCounterOffer(
  quotationId: string,
  data: {
    requestedAdjustments?: string;
    counterOfferAmount?: number;
    counterOfferTerms?: string;
  },
): Promise<NegotiationRound> {
  return apiFetch('/vendor-rfq-portal/negotiation/send-round', {
    method: 'POST',
    body: JSON.stringify({ quotationId, ...data }),
  });
}

/**
 * Shortlist vendor
 */
export async function shortlistVendor(
  quotationId: string,
  remarks?: string,
): Promise<Quotation> {
  return apiFetch(`/vendor-rfq-portal/quotations/${quotationId}/shortlist`, {
    method: 'POST',
    body: JSON.stringify({ remarks }),
  });
}

/**
 * Select vendor (final selection)
 */
export async function selectVendor(
  quotationId: string,
  remarks?: string,
): Promise<Quotation> {
  return apiFetch(`/vendor-rfq-portal/quotations/${quotationId}/select`, {
    method: 'POST',
    body: JSON.stringify({ remarks }),
  });
}

/**
 * Reject vendor quotation
 */
export async function rejectVendor(
  quotationId: string,
  reason?: string,
): Promise<Quotation> {
  return apiFetch(`/vendor-rfq-portal/quotations/${quotationId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

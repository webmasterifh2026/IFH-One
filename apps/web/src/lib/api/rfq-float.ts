/**
 * RFQ Float API client
 * Handles all RFQ Float workflow operations
 */

import { apiFetch } from './fetch';

export interface RfqFloatItem {
  indentId: string;
  indentItemId: string;
  itemCode?: string;
  itemName: string;
  description?: string;
  itemRemarks?: string;
  make?: string;
  quantity: number;
  uom?: string;
  unitWeight?: number;
  totalWeight?: number;
  isAvailableInStore?: boolean;
  isSelected?: boolean;
}

export interface RfqFloatVendor {
  vendorId?: string;
  vendorCode?: string;
  vendorName: string;
  email?: string;
  phone?: string;
}

export interface CreateRfqFloatDto {
  rfqDate?: string;
  submissionDeadline?: string;
  expectedDeliveryDate?: string;
  filledById?: string;
  deliveryLocation?: string;
  remarks?: string;
  items: RfqFloatItem[];
  vendors: RfqFloatVendor[];
}

export interface QuickVendorDto {
  companyName: string;
  email?: string;
  phone?: string;
}

// ─── RFQ Float CRUD ──────────────────────────────────────────────────────

export async function createRfqFloat(dto: CreateRfqFloatDto) {
  return apiFetch('/api/rfq-float', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function getRfqFloats(params?: {
  skip?: number;
  take?: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  const query = new URLSearchParams();
  if (params?.skip) query.set('skip', String(params.skip));
  if (params?.take) query.set('take', String(params.take));
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.sortBy) query.set('sortBy', params.sortBy);
  if (params?.sortOrder) query.set('sortOrder', params.sortOrder);
  const qs = query.toString();
  return apiFetch(`/api/rfq-float${qs ? `?${qs}` : ''}`);
}

export async function getRfqFloat(id: string) {
  return apiFetch(`/api/rfq-float/${id}`);
}

export async function getRfqFloatByNumber(rfqNumber: string) {
  return apiFetch(`/api/rfq-float/by-number/${encodeURIComponent(rfqNumber)}`);
}

// ─── Quick Vendor ────────────────────────────────────────────────────────

export async function createQuickVendor(dto: QuickVendorDto) {
  return apiFetch('/api/rfq-float/quick-vendor', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

// ─── Send RFQ to Vendors ─────────────────────────────────────────────────

export async function sendRfqToVendors(rfqFloatId: string) {
  return apiFetch(`/api/rfq-float/${rfqFloatId}/send`, {
    method: 'POST',
  });
}

// ─── TCE Operations ──────────────────────────────────────────────────────

export async function getTCEByRfqFloat(rfqFloatId: string) {
  return apiFetch(`/api/rfq-float/${rfqFloatId}/tce`);
}

export async function getTCEComparison(rfqFloatId: string) {
  return apiFetch(`/api/rfq-float/${rfqFloatId}/tce/comparison`);
}

// ─── Negotiation Operations ───────────────────────────────────────────────

export async function startNegotiation(
  rfqFloatId: string,
  data: { tceId: string; remarks?: string },
) {
  return apiFetch(`/api/rfq-float/${rfqFloatId}/negotiations`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getNegotiations(rfqFloatId: string) {
  return apiFetch(`/api/rfq-float/${rfqFloatId}/negotiations`);
}

export async function updateNegotiation(
  negotiationId: string,
  data: {
    status?: string;
    remarks?: string;
    items?: Array<{
      tceItemId?: string;
      itemCode?: string;
      itemName: string;
      quantity?: number;
      uom?: string;
      originalRate?: number;
      negotiatedRate?: number;
      finalRate?: number;
      discountPercentage?: number;
      deliveryTerms?: string;
      paymentTerms?: string;
      remarks?: string;
    }>;
  },
) {
  return apiFetch(`/api/rfq-float/negotiations/${negotiationId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── Logs ─────────────────────────────────────────────────────────────────

export async function getActivityLogs(rfqFloatId: string) {
  return apiFetch(`/api/rfq-float/${rfqFloatId}/activity-logs`);
}

export async function getEmailLogs(rfqFloatId: string) {
  return apiFetch(`/api/rfq-float/${rfqFloatId}/email-logs`);
}
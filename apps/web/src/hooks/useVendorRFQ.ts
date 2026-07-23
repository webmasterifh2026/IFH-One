/**
 * React Query hooks for Vendor RFQ Portal
 * Provides queries and mutations for vendor quotation workflows
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as vendorRfqApi from '@/lib/api/vendor-rfq';

// ─── Query Keys ───────────────────────────────────────────────────────────

const vendorRfqKeys = {
  all: ['vendor-rfq'] as const,
  forms: () => [...vendorRfqKeys.all, 'forms'] as const,
  formsForRfq: (rfqId: string) => [...vendorRfqKeys.forms(), rfqId] as const,
  quotations: () => [...vendorRfqKeys.all, 'quotations'] as const,
  quotationsForRfq: (rfqId: string) => [...vendorRfqKeys.quotations(), rfqId] as const,
  quotationById: (id: string) => [...vendorRfqKeys.quotations(), id] as const,
  comparison: (rfqId: string) => [...vendorRfqKeys.all, 'comparison', rfqId] as const,
  negotiation: () => [...vendorRfqKeys.all, 'negotiation'] as const,
  negotiationDashboard: (rfqId: string) => [...vendorRfqKeys.negotiation(), 'dashboard', rfqId] as const,
  negotiationHistory: (quotationId: string) => [...vendorRfqKeys.negotiation(), 'history', quotationId] as const,
};

// ─── Vendor Portal Queries (Public, Token-based) ──────────────────────────

/**
 * Get vendor form by secure token
 */
export function useVendorForm(token: string, enabled = true) {
  return useQuery({
    queryKey: ['vendor-form', token],
    queryFn: () => vendorRfqApi.getVendorFormByToken(token),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });
}

// ─── Procurement Team Queries (Protected) ───────────────────────────────────

/**
 * Get all forms for an RFQ
 */
export function useFormsForRFQ(rfqId: string, enabled = true) {
  return useQuery({
    queryKey: vendorRfqKeys.formsForRfq(rfqId),
    queryFn: () => vendorRfqApi.getFormsForRFQ(rfqId),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get quotations for an RFQ
 */
export function useQuotationsForRFQ(rfqId: string, enabled = true) {
  return useQuery({
    queryKey: vendorRfqKeys.quotationsForRfq(rfqId),
    queryFn: () => vendorRfqApi.getQuotationsForRFQ(rfqId),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get quotation by ID
 */
export function useQuotation(quotationId: string, enabled = true) {
  return useQuery({
    queryKey: vendorRfqKeys.quotationById(quotationId),
    queryFn: () => vendorRfqApi.getQuotationById(quotationId),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get quotation comparison data
 */
export function useQuotationComparison(rfqId: string, enabled = true) {
  return useQuery({
    queryKey: vendorRfqKeys.comparison(rfqId),
    queryFn: () => vendorRfqApi.getQuotationComparison(rfqId),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get negotiation dashboard
 */
export function useNegotiationDashboard(rfqId: string, enabled = true) {
  return useQuery({
    queryKey: vendorRfqKeys.negotiationDashboard(rfqId),
    queryFn: () => vendorRfqApi.getNegotiationDashboard(rfqId),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Get negotiation history
 */
export function useNegotiationHistory(quotationId: string, enabled = true) {
  return useQuery({
    queryKey: vendorRfqKeys.negotiationHistory(quotationId),
    queryFn: () => vendorRfqApi.getNegotiationHistory(quotationId),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────

/**
 * Submit vendor quotation
 */
export function useSubmitVendorQuotation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vendorFormId,
      rfqId,
      data,
    }: {
      vendorFormId: string;
      rfqId: string;
      data: any;
    }) => vendorRfqApi.submitVendorQuotation(vendorFormId, rfqId, data),
    onSuccess: (quotation) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.quotationsForRfq(quotation.rfqId) });
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.formsForRfq(quotation.rfqId) });
    },
  });
}

/**
 * Upload quotation attachment
 */
export function useUploadVendorAttachment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quotationId,
      file,
      documentType,
      lineItemId,
    }: {
      quotationId: string;
      file: File;
      documentType: string;
      lineItemId?: string;
    }) => vendorRfqApi.uploadVendorAttachment(quotationId, file, documentType, lineItemId),
    onSuccess: (_, { quotationId }) => {
      // Invalidate quotation query
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.quotationById(quotationId) });
    },
  });
}

/**
 * Generate vendor forms for RFQ
 */
export function useGenerateVendorForms() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      rfqId,
      vendors,
    }: {
      rfqId: string;
      vendors: any[];
    }) => vendorRfqApi.generateVendorForms(rfqId, vendors),
    onSuccess: (_, { rfqId }) => {
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.formsForRfq(rfqId) });
    },
  });
}

/**
 * Update quotation status
 */
export function useUpdateQuotationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quotationId,
      status,
      remarks,
    }: {
      quotationId: string;
      status: string;
      remarks?: string;
    }) => vendorRfqApi.updateQuotationStatus(quotationId, status, remarks),
    onSuccess: (quotation) => {
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.quotationById(quotation.id) });
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.quotationsForRfq(quotation.rfqId) });
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.comparison(quotation.rfqId) });
    },
  });
}

/**
 * Send counter-offer
 */
export function useSendCounterOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quotationId,
      data,
    }: {
      quotationId: string;
      data: any;
    }) => vendorRfqApi.sendCounterOffer(quotationId, data),
    onSuccess: (round) => {
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.negotiationHistory(round.quotationId) });
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.negotiationDashboard((round as any).rfqId) });
    },
  });
}

/**
 * Shortlist vendor
 */
export function useShortlistVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quotationId,
      remarks,
    }: {
      quotationId: string;
      remarks?: string;
    }) => vendorRfqApi.shortlistVendor(quotationId, remarks),
    onSuccess: (quotation) => {
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.quotationById(quotation.id) });
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.quotationsForRfq(quotation.rfqId) });
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.comparison(quotation.rfqId) });
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.negotiationDashboard(quotation.rfqId) });
    },
  });
}

/**
 * Select vendor
 */
export function useSelectVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quotationId,
      remarks,
    }: {
      quotationId: string;
      remarks?: string;
    }) => vendorRfqApi.selectVendor(quotationId, remarks),
    onSuccess: (quotation) => {
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.quotationById(quotation.id) });
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.quotationsForRfq(quotation.rfqId) });
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.comparison(quotation.rfqId) });
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.negotiationDashboard(quotation.rfqId) });
    },
  });
}

/**
 * Reject vendor
 */
export function useRejectVendor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quotationId,
      reason,
    }: {
      quotationId: string;
      reason?: string;
    }) => vendorRfqApi.rejectVendor(quotationId, reason),
    onSuccess: (quotation) => {
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.quotationById(quotation.id) });
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.quotationsForRfq(quotation.rfqId) });
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.comparison(quotation.rfqId) });
      queryClient.invalidateQueries({ queryKey: vendorRfqKeys.negotiationDashboard(quotation.rfqId) });
    },
  });
}

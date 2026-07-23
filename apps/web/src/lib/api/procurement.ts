/**
 * IFH One — Procurement API Client
 * Production version — no mock data fallbacks.
 */

import { apiFetch } from './fetch';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProcurementStage {
  id: string;
  stageNumber: number;
  stageName: string;
  status: string;
  assignedToId?: string;
  assignedTo?: { id: string; fullName: string; employeeId: string } | null;
  startedAt?: string;
  completedAt?: string;
  dueDate?: string;
  remarks?: string;
  actionTaken?: string;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProcurementItem {
  id: string;
  itemCode?: string;
  bbuCode?: string;
  itemName: string;
  description?: string;
  category?: string; // From SKU
  subGroup?: string; // From SKU
  unit?: string;
  quantity: number;
  approvedRate?: number;
  receivedQty?: number;
  attachmentName?: string;
  attachmentUrl?: string;
  technicalSpec?: string;
  approvedMakes?: string;
  assignedToId?: string;
  toFrom?: string;
  assignedTo?: { id: string; fullName: string; employeeId: string } | null;
}

export interface ProcurementAttachment {
  id: string;
  stageNumber?: number;
  fileName: string;
  fileType: string;
  fileSize?: number;
  fileUrl: string;
  uploadedBy: { id: string; fullName: string };
  createdAt: string;
}

export interface ProcurementRemark {
  id: string;
  stageNumber?: number;
  comment: string;
  author: { id: string; fullName: string; employeeId: string };
  createdAt: string;
}

export interface ProcurementHistory {
  id: string;
  stageNumber?: number;
  action: string;
  description: string;
  performedBy: { id: string; fullName: string; employeeId: string };
  metadata?: string;
  createdAt: string;
}

export interface Procurement {
  id: string;
  referenceNo: string;
  title: string;
  description?: string;
  projectId?: string;
  departmentId?: string;
  requestedById: string;
  requestedBy: {
    id: string;
    fullName: string;
    employeeId: string;
    designation?: string;
  };
  assignedToId?: string;
  assignedTo?: { id: string; fullName: string; employeeId: string } | null;
  currentStage: number;
  status: string;
  priority: string;
  vendorId?: string;
  vendorName?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  stages: ProcurementStage[];
  items: ProcurementItem[];
  attachments: ProcurementAttachment[];
  remarks: ProcurementRemark[];
  history: ProcurementHistory[];
}

export interface ProcurementListItem extends Omit<
  Procurement,
  'attachments' | 'remarks' | 'history'
> {
  projectName?: string;
  application?: string;
  itemType?: string;
  requiredDate?: string;
  paintingSpec?: string;
  paintingSpecRemark?: string;
  packingRequirement?: string;
  certification?: string;
  manuals?: string;
  warrantyGuarantee?: string;
  ga?: string;
  _count?: { attachments: number; remarks: number };
}

export interface ProcurementListResponse {
  data: ProcurementListItem[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface StagePipelineItem {
  stage: number;
  name: string;
  count: number;
}

export interface SlaRecord {
  id: string;
  procurementId: string;
  stageNumber: number;
  stageName: string;
  stageEnteredAt: string;
  slaDurationHours: number;
  dueAt: string;
  completedAt?: string;
  elapsedHours: number;
  remainingHours: number;
  delayHours: number;
  slaStatus:
    | 'ON_TRACK'
    | 'APPROACHING_SLA'
    | 'SLA_BREACHED'
    | 'COMPLETED_ON_TIME'
    | 'COMPLETED_LATE';
  createdAt: string;
  updatedAt: string;
}

export interface SlaDashboardSummary {
  onTrack: number;
  approaching: number;
  breached: number;
  completedOnTime: number;
  completedLate: number;
  totalActive: number;
  avgDelayHoursOnBreached: number;
}

export interface EscalationSummary {
  l1: number;
  l2: number;
  l3: number;
  total: number;
}

export interface DashboardStats {
  totalIndents: number;
  inProgress: number;
  pending: number;
  onHold: number;
  rejected: number;
  completed: number;
  delayed: number;
  archived: number;
  stagePipeline: StagePipelineItem[];
  recentActivity: Array<{
    id: string;
    action: string;
    description: string;
    createdAt: string;
    procurement: { id: string; referenceNo: string; title: string };
    performedBy: { id: string; fullName: string };
  }>;
  sla?: {
    onTrack: number;
    approaching: number;
    breached: number;
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getProcurements(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  stage?: number;
}): Promise<ProcurementListResponse> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.search) qs.set('search', params.search);
  if (params?.status) qs.set('status', params.status);
  if (params?.stage !== undefined) qs.set('stage', String(params.stage));
  return await apiFetch(`/procurement?${qs.toString()}`);
}

export async function getProcurement(id: string): Promise<Procurement> {
  return await apiFetch(`/procurement/${id}`);
}

export async function createProcurement(data: {
  title: string;
  description?: string;
  projectId?: string;
  projectName?: string;
  application?: string;
  itemType?: string;
  departmentId?: string;
  priority?: string;
  requiredDate?: string;
  paintingSpec?: string;
  paintingSpecRemark?: string;
  packingRequirement?: string;
  certification?: string;
  manuals?: string;
  warrantyGuarantee?: string;
  ga?: string;
  requestorName?: string;
  submit?: boolean;
  items?: Array<{
    itemCode?: string;
    itemName: string;
    bbuCode?: string;
    description?: string;
    unit?: string;
    quantity: number;
    technicalSpec?: string | null;
    approvedMakes?: string | null;
    attachmentName?: string | null;
    attachmentUrl?: string | null;
    assignedToId?: string | null;
    toFrom?: string | null;
  }>;
}): Promise<Procurement> {
  return await apiFetch('/procurement', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function performStageAction(
  id: string,
  action: string,
  options?: {
    remarks?: string;
    assignedToId?: string;
    vendorId?: string;
    vendorName?: string;
    metadata?: Record<string, any>;
  }
): Promise<Procurement> {
  return await apiFetch(`/procurement/${id}/action`, {
    method: 'POST',
    body: JSON.stringify({ action, ...options }),
  });
}

export async function addRemark(
  id: string,
  comment: string,
  stageNumber?: number
): Promise<ProcurementRemark> {
  return await apiFetch(`/procurement/${id}/remarks`, {
    method: 'POST',
    body: JSON.stringify({ comment, stageNumber }),
  });
}

export async function getProcurementRemarks(
  id: string
): Promise<ProcurementRemark[]> {
  return await apiFetch(`/procurement/${id}/remarks`);
}

export async function getProcurementHistory(
  id: string
): Promise<ProcurementHistory[]> {
  return await apiFetch(`/procurement/${id}/history`);
}

export async function cancelProcurement(
  id: string,
  remarks: string
): Promise<Procurement> {
  return await apiFetch(`/procurement/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ remarks }),
  });
}

export async function getProcurementDashboardStats(): Promise<DashboardStats> {
  return await apiFetch('/procurement/dashboard-stats');
}

// ─── Report Data Functions ────────────────────────────────────────────────────

export interface ReportRecord {
  id: string;
  referenceNo: string;
  title: string;
  projectName?: string;
  projectId?: string;
  currentStage: number;
  status: string;
  priority: string;
  vendorName?: string;
  createdAt: string;
  requestedBy: { fullName: string };
  assignedTo?: { fullName: string } | null;
}

/** Fetch report records from live API. Returns empty array on failure. */
export async function fetchReportRecords(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  stage?: number;
}): Promise<{
  data: ReportRecord[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  try {
    return await apiFetch(
      `/reports/indents?${new URLSearchParams(
        Object.entries({
          ...(params?.page ? { page: String(params.page) } : {}),
          ...(params?.limit ? { limit: String(params.limit) } : {}),
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.stage !== undefined
            ? { stage: String(params.stage) }
            : {}),
        })
      ).toString()}`
    );
  } catch {
    return { data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } };
  }
}

/** Fetch all records for report pages from the live API (paginated to get full dataset). */
export async function getAllRecordsForReports(): Promise<ReportRecord[]> {
  try {
    const PAGE_SIZE = 200;
    // Fetch first page to get total count
    const firstPage = await apiFetch(`/procurement?limit=${PAGE_SIZE}&page=1`);
    const firstData =
      firstPage?.data ||
      firstPage?.records ||
      (Array.isArray(firstPage) ? firstPage : []);
    const total = firstPage?.meta?.total ?? firstData.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    const mapRecord = (r: any): ReportRecord => ({
      id: r.id,
      referenceNo: r.referenceNo,
      title: r.title,
      projectName: r.projectName,
      projectId: r.projectId,
      currentStage: r.currentStage ?? 0,
      status: r.status ?? 'SUBMITTED',
      priority: r.priority ?? 'NORMAL',
      vendorName: r.vendorName,
      createdAt: r.createdAt,
      requestedBy: {
        fullName: r.requestedBy?.name || r.requestedBy?.fullName || 'Unknown',
      },
      assignedTo: r.assignedTo ? { fullName: r.assignedTo.fullName } : null,
    });

    const allRecords: ReportRecord[] = firstData.map(mapRecord);

    // Fetch remaining pages in parallel (up to 10 pages = 2000 records)
    if (totalPages > 1) {
      const remainingPages = Array.from(
        { length: Math.min(totalPages - 1, 9) },
        (_, i) => i + 2
      );
      const pageResults = await Promise.all(
        remainingPages.map((page) =>
          apiFetch(`/procurement?limit=${PAGE_SIZE}&page=${page}`)
            .then((resp: any) =>
              (
                resp?.data ||
                resp?.records ||
                (Array.isArray(resp) ? resp : [])
              ).map(mapRecord)
            )
            .catch(() => [] as ReportRecord[])
        )
      );
      pageResults.forEach((pageData) => allRecords.push(...pageData));
    }

    return allRecords;
  } catch (error) {
    // Log error but don't throw - reports can work with empty data
    console.warn('Failed to load report records:', error);
    return [];
  }
}

// ─── Bulk Stage Update ────────────────────────────────────────────────────

export interface BulkStageActionRequest {
  procurementIds: string[];
  action: string;
  remarks?: string;
  effectiveDate?: string;
  notifyUsers?: boolean;
}

export interface BulkEligibleRecord {
  id: string;
  referenceNo: string;
  title: string;
  currentStage: number;
  currentStageName: string;
  nextStageNum: number;
}

export interface BulkBlockedRecord {
  id: string;
  referenceNo?: string;
  reason: string;
}

export interface BulkPreviewResponse {
  totalSelected: number;
  totalEligible: number;
  totalBlocked: number;
  eligibleRecords: BulkEligibleRecord[];
  blockedRecords: BulkBlockedRecord[];
}

export interface BulkExecuteResponse {
  totalSelected: number;
  totalEligible: number;
  totalUpdated: number;
  totalSkipped: number;
  totalFailed: number;
  durationMs: number;
  updatedRecords: { id: string; referenceNo: string }[];
  skippedRecords: BulkBlockedRecord[];
  failedRecords: BulkBlockedRecord[];
}

export async function previewBulkStageAction(
  payload: BulkStageActionRequest
): Promise<BulkPreviewResponse> {
  return await apiFetch('/procurement/bulk-action/preview', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function executeBulkStageAction(
  payload: BulkStageActionRequest
): Promise<BulkExecuteResponse> {
  return await apiFetch('/procurement/bulk-action', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function performBulkStageAction(
  procurementIds: string[],
  action: 'APPROVE' | 'REJECT' | 'HOLD' | 'MOVE_NEXT',
  options?: { remarks?: string; notifyUsers?: boolean; dryRun?: boolean }
) {
  return apiFetch('/procurement/bulk-action', {
    method: 'POST',
    body: JSON.stringify({ procurementIds, action, ...options }),
  });
}

export async function performBulkMultiStageAction(
  updates: Array<{
    procurementId: string;
    action: string;
    remarks?: string;
    assignedToId?: string;
    metadata?: any;
  }>,
  options?: { notifyUsers?: boolean }
) {
  return apiFetch('/procurement/bulk-action/multi', {
    method: 'POST',
    body: JSON.stringify({ updates, ...options }),
  });
}

/** Fetch Stage KPI metrics from the live database. */
export async function getStageKPIs(stageNumber: number): Promise<{
  totalProcessed: number;
  totalApproved: number;
  totalRejected: number;
  averageDelayHours: number;
  approvalRate: number;
  rejectionRate: number;
}> {
  return await apiFetch(`/procurement/stage-kpis/${stageNumber}`);
}

// ─── SLA API Functions ────────────────────────────────────────────────────────

/** Fetch SLA dashboard summary (all active records). */
export async function getSlaDashboardSummary(): Promise<SlaDashboardSummary> {
  return await apiFetch('/procurement/sla-summary');
}

/** Fetch all SLA records for a specific procurement indent. */
export async function getSlaRecords(
  procurementId: string
): Promise<SlaRecord[]> {
  return await apiFetch(`/procurement/${procurementId}/sla`);
}

/** Fetch escalation summary for the control tower. */
export async function getEscalationSummary(): Promise<EscalationSummary> {
  return await apiFetch('/procurement/escalation-summary');
}

/** Delete a procurement (drafts only). */
export async function deleteProcurement(id: string): Promise<void> {
  return await apiFetch(`/procurement/${id}`, { method: 'DELETE' });
}

/** Duplicate a procurement draft. */
export async function duplicateProcurement(id: string): Promise<Procurement> {
  return await apiFetch(`/procurement/${id}/duplicate`, { method: 'POST' });
}

/** Assign a stage to a user. */
export async function assignStage(
  procurementId: string,
  stageNumber: number,
  assignedToId: string
): Promise<Procurement> {
  return await apiFetch(`/procurement/${procurementId}/assign/${stageNumber}`, {
    method: 'POST',
    body: JSON.stringify({ assignedToId }),
  });
}

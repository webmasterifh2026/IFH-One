import { apiFetch, buildApiUrl } from './fetch';

export interface POSearchItem {
  id: string;
  itemCode?: string | null;
  itemName: string;
  unit?: string | null;
  orderedQty: number;
  receivedQty: number;
  remainingQty: number;
  status: 'PENDING' | 'FULLY_RECEIVED';
}

export interface POSearchResult {
  procurementId: string;
  referenceNo: string;
  title: string;
  projectName?: string | null;
  vendorName?: string | null;
  status: string;
  currentStage: number;
  fullyReceived: boolean;
  items: POSearchItem[];
}

export interface UploadedFileRef {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  fileType: string;
}

export interface GateEntryItem {
  id: string;
  gateEntryId: string;
  procurementItemId: string;
  declaredQty: string | number;
  receivedQty: string | number | null;
  qualityStatus:
    'PENDING' | 'ACCEPTED' | 'REJECTED' | 'ACCEPTED_WITH_DEVIATION';
  rejectionReason?: string | null;
  actualSizeReceived?: string | null;
  inspectionRemarks?: string | null;
  allocatedLocation?: string | null;
  status: string;
  procurementItem: {
    id: string;
    itemName: string;
    itemCode?: string | null;
    unit?: string | null;
    quantity: string | number;
  };
}

export interface GateEntry {
  id: string;
  entryNumber: string;
  procurementId: string;
  vehicleNumber: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  vendorName?: string | null;
  status:
    | 'GATE_ENTRY'
    | 'QUANTITY_VERIFIED'
    | 'QUALITY_VERIFIED'
    | 'ALLOCATED'
    | 'GRN_GENERATED'
    | 'CANCELLED';
  createdAt: string;
  items: GateEntryItem[];
  procurement: {
    id: string;
    referenceNo: string;
    title: string;
    projectName?: string | null;
    vendorName?: string | null;
  };
  grn?: { id: string; grnNumber: string } | null;
}

export async function searchPO(query: string): Promise<POSearchResult> {
  return apiFetch(`/gate-entry/search-po?q=${encodeURIComponent(query)}`);
}

export async function uploadGateEntryFiles(
  files: File[]
): Promise<UploadedFileRef[]> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('ifh_token') : null;
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));

  const res = await fetch(buildApiUrl('/gate-entry/upload'), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.message || 'File upload failed');
  }
  return json?.data ?? json;
}

export async function createGateEntry(payload: {
  procurementId: string;
  vehicleNumber: string;
  items: { procurementItemId: string; declaredQty: number }[];
  invoicePhotoUrls: UploadedFileRef[];
  materialPhotoUrls: UploadedFileRef[];
}): Promise<GateEntry> {
  return apiFetch('/gate-entry', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getGateEntry(id: string): Promise<GateEntry> {
  return apiFetch(`/gate-entry/${id}`);
}

export async function listGateEntries(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{
  data: GateEntry[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set('status', params.status);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch(`/gate-entry${suffix}`);
}

export async function submitQuantityCheck(
  gateEntryId: string,
  payload: {
    invoiceNumber: string;
    invoiceDate: string;
    vendorId?: string;
    vendorName: string;
    items: { gateEntryItemId: string; receivedQty: number }[];
  }
): Promise<GateEntry> {
  return apiFetch(`/gate-entry/${gateEntryId}/quantity-check`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitQualityCheck(
  gateEntryId: string,
  payload: {
    items: {
      gateEntryItemId: string;
      qualityStatus: 'ACCEPTED' | 'REJECTED' | 'ACCEPTED_WITH_DEVIATION';
      rejectionReason?: string;
      actualSizeReceived?: string;
      inspectionRemarks?: string;
    }[];
  }
): Promise<GateEntry> {
  return apiFetch(`/gate-entry/${gateEntryId}/quality-check`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function submitAllocation(
  gateEntryId: string,
  payload: { items: { gateEntryItemId: string; allocatedLocation?: string }[] }
): Promise<GateEntry> {
  return apiFetch(`/gate-entry/${gateEntryId}/allocation`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export interface GateEntryDashboard {
  pendingGateEntries: number;
  pendingQuantityChecks: number;
  pendingQuality: number;
  pendingGRN: number;
  pendingInventoryPosting: number;
  partialReceipts: number;
  overdueReceipts: number;
  rejectedMaterials: number;
  todaysReceipts: number;
  grnGeneratedToday: number;
  vendorWiseReceipts: {
    vendorName: string;
    grnCount: number;
    totalAcceptedQty: number;
  }[];
  projectWiseReceipts: { projectName: string; count: number }[];
}

export async function getGateEntryDashboard(): Promise<GateEntryDashboard> {
  return apiFetch('/gate-entry/dashboard');
}

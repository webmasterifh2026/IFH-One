import { apiFetch } from './fetch';

export interface SubmitInspectionItem {
  procurementItemId: string;
  status: 'APPROVED' | 'REJECTED';
  remarks?: string;
}

export async function submitInspection(
  procurementId: string,
  level: 1 | 2 | 3,
  items: SubmitInspectionItem[]
) {
  return apiFetch(`/inspections/${procurementId}/level${level}`, {
    method: 'POST',
    body: JSON.stringify({ items }),
  });
}

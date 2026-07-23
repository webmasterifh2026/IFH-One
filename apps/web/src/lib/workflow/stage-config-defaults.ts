import type { StageKpiDef, StageField } from './stage-config-types';

export const DEFAULT_KPIS: StageKpiDef[] = [
  { key: 'totalProcessed', label: 'Total Processed', description: 'Records entered stage' },
  { key: 'totalApproved', label: 'Total Approved', description: 'Approved or completed' },
  { key: 'totalRejected', label: 'Total Rejected', description: 'Rejected at this stage' },
  { key: 'averageDelayHours', label: 'Average Delay', description: 'Business delay average' },
  { key: 'approvalRate', label: 'Approval Rate', description: 'Approved vs processed' },
  { key: 'rejectionRate', label: 'Rejection Rate', description: 'Rejected vs processed' },
];

export const DEFAULT_SUMMARY_FIELDS: StageField[] = [];

export const REMARKS_FIELD: StageField = {
  key: 'remarks',
  label: 'Remarks',
  type: 'textarea',
  required: true,
  bulkEditable: true,
  scope: 'stage',
};

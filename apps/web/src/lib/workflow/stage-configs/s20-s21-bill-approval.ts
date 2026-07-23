import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

function billApproval(
  level: 1 | 2,
  stageNumber: number,
  slug: string
): StageConfig {
  return {
    stageNumber,
    slug,
    name: `Bill Approval L${level}`,
    shortName: `Bill Approval ${level}`,
    description: `Level ${level} approval of the vendor bill.`,

    fields: [{ ...REMARKS_FIELD, label: 'Approval Remarks' }],
    itemFields: [],

    actions: [
      {
        action: 'APPROVE',
        label: 'Approve',
        intent: 'positive',
        minRemarksLength: 0,
      },
      {
        action: 'HOLD',
        label: 'Hold',
        intent: 'warning',
        minRemarksLength: 20,
      },
      {
        action: 'REJECT',
        label: 'Reject',
        intent: 'negative',
        minRemarksLength: 20,
      },
    ],

    validationRules: [
      {
        key: 'remarksProvided',
        label: 'Approval Remarks Provided',
        check: (ctx) => (ctx.fieldValues.remarks || '').trim().length > 0,
      },
    ],

    summaryFields: [
      'requestedBy',
      'createdDate',
      'pendingSince',
      'project',
      'vendor',
      'itemsCount',
    ],
    kpis: DEFAULT_KPIS,
  };
}

export const billApprovalL1Config: StageConfig = billApproval(
  1,
  20,
  'bill-approval-l1'
);
export const billApprovalL2Config: StageConfig = billApproval(
  2,
  21,
  'bill-approval-l2'
);

import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

function poApproval(
  level: 1 | 2,
  stageNumber: number,
  slug: string
): StageConfig {
  return {
    stageNumber,
    slug,
    name: `PO Approval L${level}`,
    shortName: `PO Approval ${level}`,
    description: `Level ${level} approval of the Purchase Order.`,

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

export const poApprovalL1Config: StageConfig = poApproval(
  1,
  7,
  'po-approval-l1'
);
export const poApprovalL2Config: StageConfig = poApproval(
  2,
  8,
  'po-approval-l2'
);

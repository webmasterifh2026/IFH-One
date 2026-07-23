import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const vendorAcceptanceConfig: StageConfig = {
  stageNumber: 9,
  slug: 'vendor-acceptance',
  name: 'Vendor Acceptance',
  shortName: 'Vendor Accept',
  description: 'Vendor acknowledges and accepts the Purchase Order.',

  fields: [REMARKS_FIELD],
  itemFields: [],

  actions: [
    {
      action: 'APPROVE',
      label: 'Accept',
      intent: 'positive',
      minRemarksLength: 0,
    },
    { action: 'HOLD', label: 'Hold', intent: 'warning', minRemarksLength: 20 },
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
      label: 'Remarks Provided',
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

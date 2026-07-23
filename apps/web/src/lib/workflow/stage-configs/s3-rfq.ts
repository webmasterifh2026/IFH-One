import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const rfqConfig: StageConfig = {
  stageNumber: 3,
  slug: 'rfq',
  name: 'RFQ Float',
  shortName: 'RFQ',
  description: 'Float Request for Quotation to shortlisted vendors.',

  fields: [
    {
      key: 'rfqStatus', label: 'RFQ Status', type: 'select', required: true, bulkEditable: true,
      options: [
        { value: 'NOT_FLOATED', label: 'Not Floated' },
        { value: 'FLOATED', label: 'Floated' },
      ],
    },
    { key: 'plannedDate', label: 'Planned Date', type: 'date', bulkEditable: true },
    { key: 'actualDate', label: 'Actual Date', type: 'date', bulkEditable: true },
    REMARKS_FIELD,
  ],

  itemFields: [],

  actions: [
    { action: 'APPROVE', label: 'Approve', intent: 'positive', requiresValidFields: true, minRemarksLength: 0 },
    { action: 'HOLD', label: 'Hold', intent: 'warning', minRemarksLength: 20 },
    { action: 'REJECT', label: 'Reject', intent: 'negative', minRemarksLength: 20 },
  ],

  validationRules: [
    { key: 'rfqFloated', label: 'RFQ must be Floated before approving', check: (ctx) => ctx.fieldValues.rfqStatus === 'FLOATED' },
    { key: 'remarksProvided', label: 'Remarks Provided', check: (ctx) => (ctx.fieldValues.remarks || '').trim().length > 0 },
  ],

  summaryFields: ['requestedBy', 'createdDate', 'pendingSince', 'project', 'itemsCount'],
  kpis: DEFAULT_KPIS,
};

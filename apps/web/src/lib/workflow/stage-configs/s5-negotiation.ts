import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const negotiationConfig: StageConfig = {
  stageNumber: 5,
  slug: 'negotiation',
  name: 'Negotiation & Decision',
  shortName: 'Negotiation',
  description: 'Final negotiation with vendor and decision on vendor selection.',

  fields: [REMARKS_FIELD],

  itemFields: [
    { key: 'vendor', label: 'Vendor', type: 'text', scope: 'item', bulkEditable: true },
    { key: 'quotedPrice', label: 'Quoted Price', type: 'number', scope: 'item', currency: true },
    { key: 'negotiatedPrice', label: 'Negotiated Price', type: 'number', scope: 'item', currency: true, bulkEditable: true },
    { key: 'finalApprovedPrice', label: 'Final Approved Price', type: 'number', scope: 'item', currency: true, bulkEditable: true },
    {
      key: 'currency', label: 'Currency', type: 'select', scope: 'item', bulkEditable: true,
      options: [{ value: 'INR', label: 'INR' }, { value: 'USD', label: 'USD' }, { value: 'EUR', label: 'EUR' }, { value: 'GBP', label: 'GBP' }],
    },
    { key: 'discountPct', label: 'Discount %', type: 'number', scope: 'item' },
    { key: 'negotiationRemarks', label: 'Negotiation Remarks', type: 'text', scope: 'item', bulkEditable: true },
  ],

  actions: [
    { action: 'APPROVE', label: 'Approve', intent: 'positive', requiresValidFields: true },
    { action: 'HOLD', label: 'Hold', intent: 'warning', minRemarksLength: 20 },
    { action: 'REJECT', label: 'Reject', intent: 'negative', minRemarksLength: 20 },
  ],

  validationRules: [
    {
      key: 'allItemsCompleted',
      label: 'All Items Completed (Vendor, Prices, Remarks)',
      check: (ctx) => Object.values(ctx.itemFieldValues).every((v: any) => v.vendor && v.finalApprovedPrice && v.negotiationRemarks),
    },
    { key: 'remarksProvided', label: 'Remarks Provided', check: (ctx) => (ctx.fieldValues.remarks || '').trim().length > 0 },
  ],

  summaryFields: ['requestedBy', 'createdDate', 'pendingSince', 'project', 'vendor', 'itemsCount'],
  kpis: DEFAULT_KPIS,
};

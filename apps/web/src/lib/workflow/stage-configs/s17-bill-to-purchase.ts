import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const billToPurchaseConfig: StageConfig = {
  stageNumber: 17,
  slug: 'bill-to-purchase',
  name: 'Bill To Purchase',
  shortName: 'Bill → Purchase',
  description: 'Bill sent back to Purchase for verification against PO.',

  fields: [
    {
      key: 'vendorMatch', label: 'Vendor Match', type: 'select', required: true, bulkEditable: true,
      options: [{ value: 'true', label: 'Matched' }, { value: 'false', label: 'Mismatch' }],
    },
    {
      key: 'poMatch', label: 'PO Match', type: 'select', required: true, bulkEditable: true,
      options: [{ value: 'true', label: 'Matched' }, { value: 'false', label: 'Mismatch' }],
    },
    {
      key: 'qtyMatch', label: 'Quantity Match', type: 'select', required: true, bulkEditable: true,
      options: [{ value: 'true', label: 'Matched' }, { value: 'false', label: 'Mismatch' }],
    },
    {
      key: 'rateMatch', label: 'Rate Match', type: 'select', required: true, bulkEditable: true,
      options: [{ value: 'true', label: 'Matched' }, { value: 'false', label: 'Mismatch' }],
    },
    {
      key: 'taxMatch', label: 'Tax Match', type: 'select', required: true, bulkEditable: true,
      options: [{ value: 'true', label: 'Matched' }, { value: 'false', label: 'Mismatch' }],
    },
    { key: 'purchaseRemarks', label: 'Purchase Verification Remarks', type: 'textarea', required: true },
    REMARKS_FIELD,
  ],
  itemFields: [],

  actions: [
    { action: 'APPROVE', label: 'Approve', intent: 'positive', requiresValidFields: true },
    { action: 'HOLD', label: 'Hold', intent: 'warning', minRemarksLength: 20 },
    { action: 'REJECT', label: 'Reject', intent: 'negative', minRemarksLength: 20 },
  ],

  validationRules: [
    { key: 'poInvoiceMatch', label: 'PO vs Invoice Match Verified', check: (ctx) => ctx.fieldValues.poMatch === 'true' },
    { key: 'qtyMatchVerified', label: 'Quantity Match Verified', check: (ctx) => ctx.fieldValues.qtyMatch === 'true' },
    { key: 'rateMatchVerified', label: 'Rate Match Verified', check: (ctx) => ctx.fieldValues.rateMatch === 'true' },
    { key: 'taxMatchVerified', label: 'Tax Match Verified', check: (ctx) => ctx.fieldValues.taxMatch === 'true' },
    { key: 'vendorMatchVerified', label: 'Vendor Match Verified', check: (ctx) => ctx.fieldValues.vendorMatch === 'true' },
    { key: 'purchaseRemarksProvided', label: 'Purchase Remarks Provided', check: (ctx) => (ctx.fieldValues.purchaseRemarks || '').trim().length > 0 },
    { key: 'remarksProvided', label: 'Remarks Provided', check: (ctx) => (ctx.fieldValues.remarks || '').trim().length > 0 },
  ],

  summaryFields: ['requestedBy', 'createdDate', 'pendingSince', 'project', 'vendor', 'itemsCount'],
  kpis: DEFAULT_KPIS,
};

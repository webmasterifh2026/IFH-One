import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const billCreationConfig: StageConfig = {
  stageNumber: 18,
  slug: 'bill-creation',
  name: 'Bill Creation + GRN',
  shortName: 'Bill + GRN',
  description: 'Create and record the final bill with GRN reconciliation in the system.',

  fields: [
    { key: 'vendor', label: 'Vendor', type: 'text', readOnly: true },
    { key: 'billNumber', label: 'Bill Number', type: 'text', readOnly: true },
    { key: 'poNumber', label: 'PO Number', type: 'text', readOnly: true },
    { key: 'grnNumber', label: 'GRN Number', type: 'text', readOnly: true },
    { key: 'invoiceAmount', label: 'Invoice Amount', type: 'number', currency: true, readOnly: true },
    { key: 'taxAmount', label: 'Tax Amount', type: 'number', currency: true, readOnly: true },
    { key: 'finalPayable', label: 'Final Payable', type: 'number', currency: true, readOnly: true },
    { key: 'dueDate', label: 'Due Date', type: 'date', required: true, bulkEditable: true },
    REMARKS_FIELD,
  ],
  itemFields: [],

  actions: [
    { action: 'APPROVE', label: 'Approve', intent: 'positive', requiresValidFields: true },
    { action: 'HOLD', label: 'Hold', intent: 'warning', minRemarksLength: 20 },
    { action: 'REJECT', label: 'Reject', intent: 'negative', minRemarksLength: 20 },
  ],

  validationRules: [
    { key: 'vendorProvided', label: 'Vendor Provided', check: (ctx) => !!ctx.fieldValues.vendor },
    { key: 'billNumberProvided', label: 'Bill Number Provided', check: (ctx) => !!ctx.fieldValues.billNumber },
    { key: 'poNumberProvided', label: 'PO Number Provided', check: (ctx) => !!ctx.fieldValues.poNumber },
    { key: 'grnNumberProvided', label: 'GRN Number Provided', check: (ctx) => !!ctx.fieldValues.grnNumber },
    { key: 'invoiceAmountProvided', label: 'Invoice Amount Provided', check: (ctx) => !!ctx.fieldValues.invoiceAmount },
    { key: 'dueDateProvided', label: 'Due Date Provided', check: (ctx) => !!ctx.fieldValues.dueDate },
    { key: 'billRemarksProvided', label: 'Bill Remarks Provided', check: (ctx) => (ctx.fieldValues.remarks || '').trim().length > 0 },
  ],

  summaryFields: ['requestedBy', 'createdDate', 'pendingSince', 'project', 'vendor', 'itemsCount'],
  kpis: DEFAULT_KPIS,
};

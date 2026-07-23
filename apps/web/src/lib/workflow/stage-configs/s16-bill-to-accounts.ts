import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const billToAccountsConfig: StageConfig = {
  stageNumber: 16,
  slug: 'bill-to-accounts',
  name: 'Bill To Accounts',
  shortName: 'Bill → Accounts',
  description: 'Vendor bill forwarded to Accounts department.',

  fields: [
    { key: 'vendorName', label: 'Vendor Name', type: 'text', required: true, bulkEditable: true },
    { key: 'billNumber', label: 'Vendor Bill Number', type: 'text', required: true, bulkEditable: true },
    { key: 'billDate', label: 'Bill Date', type: 'date', required: true, bulkEditable: true },
    { key: 'poNumber', label: 'PO Number', type: 'text', required: true },
    { key: 'grnNumber', label: 'GRN Number', type: 'text', required: true },
    { key: 'attachmentRef', label: 'Invoice Attachment Ref', type: 'text' },
    { key: 'invoiceAmount', label: 'Invoice Amount', type: 'number', currency: true, required: true, bulkEditable: true },
    { key: 'taxAmount', label: 'Tax Amount', type: 'number', currency: true, bulkEditable: true },
    { key: 'totalAmount', label: 'Total Amount', type: 'number', currency: true, readOnly: true },
    REMARKS_FIELD,
  ],
  itemFields: [],

  actions: [
    { action: 'SUBMIT', label: 'Forward to Accounts', intent: 'positive', requiresValidFields: true },
    { action: 'HOLD', label: 'Hold', intent: 'warning', minRemarksLength: 20 },
    { action: 'REJECT', label: 'Reject', intent: 'negative', minRemarksLength: 20 },
  ],

  validationRules: [
    { key: 'grnCompleted', label: 'Material Receipt (GRN) Completed', check: (ctx) => (ctx.procurement.currentStage ?? 0) >= 11 },
    { key: 'inspectionCompleted', label: 'Inspection Completed', check: (ctx) => (ctx.procurement.currentStage ?? 0) >= 14 },
    { key: 'vendorNameProvided', label: 'Vendor Name Provided', check: (ctx) => !!ctx.fieldValues.vendorName },
    { key: 'billNumberProvided', label: 'Vendor Bill Number Provided', check: (ctx) => !!ctx.fieldValues.billNumber },
    { key: 'billDateProvided', label: 'Bill Date Provided', check: (ctx) => !!ctx.fieldValues.billDate },
    { key: 'poNumberProvided', label: 'PO Number Provided', check: (ctx) => !!ctx.fieldValues.poNumber },
    { key: 'grnNumberProvided', label: 'GRN Number Provided', check: (ctx) => !!ctx.fieldValues.grnNumber },
    { key: 'invoiceAmountProvided', label: 'Invoice Amount Provided', check: (ctx) => !!ctx.fieldValues.invoiceAmount },
    { key: 'accountsRemarksProvided', label: 'Accounts Remarks Provided', check: (ctx) => (ctx.fieldValues.remarks || '').trim().length > 0 },
  ],

  summaryFields: ['requestedBy', 'createdDate', 'pendingSince', 'project', 'vendor', 'itemsCount'],
  kpis: DEFAULT_KPIS,
};

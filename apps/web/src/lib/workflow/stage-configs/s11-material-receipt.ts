import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const materialReceiptConfig: StageConfig = {
  stageNumber: 11,
  slug: 'material-receipt',
  name: 'Material Receipt',
  shortName: 'Receipt',
  description: 'Record material receipt at site / warehouse (GRN).',

  fields: [REMARKS_FIELD],

  itemFields: [
    { key: 'vendorName', label: 'Vendor Name', type: 'text', scope: 'item' },
    { key: 'poNumber', label: 'PO Number', type: 'text', scope: 'item' },
    { key: 'receivedQty', label: 'Received Qty', type: 'number', scope: 'item', required: true, bulkEditable: true },
    { key: 'receiptDate', label: 'Receipt Date', type: 'date', scope: 'item', bulkEditable: true },
    { key: 'gateEntryNo', label: 'Gate Entry No', type: 'text', scope: 'item', bulkEditable: true },
    { key: 'grnNumber', label: 'GRN Number', type: 'text', scope: 'item', required: true, bulkEditable: true },
    { key: 'batchLotNo', label: 'Batch/Lot No', type: 'text', scope: 'item' },
    { key: 'placeOfReceiving', label: 'Place of Receiving', type: 'text', scope: 'item', bulkEditable: true },
    { key: 'receiverName', label: 'Receiver Name', type: 'text', scope: 'item', bulkEditable: true },
    { key: 'receiptRemarks', label: 'Receipt Remarks', type: 'text', scope: 'item', bulkEditable: true },
  ],

  actions: [
    { action: 'SUBMIT', label: 'Confirm Receipt', intent: 'positive', requiresValidFields: true },
    { action: 'HOLD', label: 'Hold', intent: 'warning', minRemarksLength: 20 },
  ],

  validationRules: [
    {
      key: 'receiptDetailsCompleted',
      label: 'All Items Have Receipt Details Completed',
      check: (ctx) => Object.values(ctx.itemFieldValues).every((v: any) => v.grnNumber && v.receivedQty),
    },
    {
      key: 'fullyReceived',
      label: 'All Items Fully Received',
      check: (ctx) => Object.values(ctx.itemFieldValues).every((v: any) => Number(v.receivedQty) > 0),
    },
    { key: 'remarksProvided', label: 'Remarks Provided', check: (ctx) => (ctx.fieldValues.remarks || '').trim().length > 0 },
  ],

  summaryFields: ['requestedBy', 'createdDate', 'pendingSince', 'project', 'vendor', 'itemsCount'],
  kpis: DEFAULT_KPIS,
};

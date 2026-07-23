import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const poCreationConfig: StageConfig = {
  stageNumber: 6,
  slug: 'purchase-orders',
  name: 'Purchase Order Creation',
  shortName: 'PO Creation',
  description: 'Draft and submit the Purchase Order to the selected vendor.',

  fields: [
    {
      key: 'poNumber',
      label: 'PO Number',
      type: 'text',
      required: true,
      bulkEditable: true,
    },
    {
      key: 'vendorConfirmation',
      label: 'Vendor Confirmation Reference',
      type: 'text',
      required: true,
    },
    { key: 'poDate', label: 'PO Date', type: 'date', bulkEditable: true },
    { key: 'supplier', label: 'Supplier', type: 'text', bulkEditable: true },
    REMARKS_FIELD,
  ],

  itemFields: [
    {
      key: 'poRate',
      label: 'PO Rate',
      type: 'number',
      scope: 'item',
      currency: true,
    },
    {
      key: 'deliveryTerms',
      label: 'Delivery Terms',
      type: 'text',
      scope: 'item',
    },
    {
      key: 'paymentTerms',
      label: 'Payment Terms',
      type: 'text',
      scope: 'item',
    },
    { key: 'taxDetails', label: 'Tax Details', type: 'text', scope: 'item' },
    {
      key: 'verified',
      label: 'Verified',
      type: 'checkbox',
      scope: 'item',
      bulkEditable: true,
    },
  ],

  actions: [
    {
      action: 'SUBMIT',
      label: 'Create PO & Submit',
      intent: 'positive',
      requiresValidFields: true,
    },
  ],

  validationRules: [
    {
      key: 'poNumberProvided',
      label: 'PO Number Provided',
      check: (ctx) => !!ctx.fieldValues.poNumber,
    },
    {
      key: 'vendorConfirmationProvided',
      label: 'Vendor Confirmation Reference Provided',
      check: (ctx) => !!ctx.fieldValues.vendorConfirmation,
    },
    {
      key: 'allItemsVerified',
      label: 'All Items Verified',
      check: (ctx) =>
        Object.values(ctx.itemFieldValues).every(
          (v: any) => v.verified === true || v.verified === 'true'
        ),
    },
    {
      key: 'remarksProvided',
      label: 'PO Remarks Provided',
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

import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const storeCheckConfig: StageConfig = {
  stageNumber: 2,
  slug: 'store-check',
  name: 'Store Availability Check',
  shortName: 'Store Check',
  description:
    'Verify inventory availability and determine material source before floating an RFQ.',

  fields: [REMARKS_FIELD],

  itemFields: [
    {
      key: 'currentStockQty',
      label: 'Current Stock',
      type: 'number',
      scope: 'item',
    },
    {
      key: 'availableQty',
      label: 'Available Qty',
      type: 'number',
      scope: 'item',
      bulkEditable: true,
    },
    {
      key: 'shortQty',
      label: 'Short Qty',
      type: 'number',
      scope: 'item',
      readOnly: true,
    },
    {
      key: 'decision',
      label: 'Stock Status',
      type: 'select',
      scope: 'item',
      bulkEditable: true,
      options: [
        { value: 'FULLY_AVAILABLE', label: 'Fully Available' },
        { value: 'PARTIALLY_AVAILABLE', label: 'Partially Available' },
        { value: 'NOT_AVAILABLE', label: 'Not Available' },
      ],
    },
    {
      key: 'source',
      label: 'Material Source',
      type: 'select',
      scope: 'item',
      bulkEditable: true,
      options: [
        { value: 'ISSUE_FROM_STOCK', label: 'Issue From Stock' },
        { value: 'PROCURE_BALANCE', label: 'Procure Balance' },
        { value: 'PROCURE_FULL', label: 'Procure Full' },
      ],
    },
    {
      key: 'itemRemarks',
      label: 'Item Remarks',
      type: 'text',
      scope: 'item',
      bulkEditable: true,
    },
  ],

  actions: [
    {
      action: 'AVAILABLE',
      label: 'Mark Available',
      intent: 'positive',
      minRemarksLength: 0,
    },
    {
      action: 'NOT_AVAILABLE',
      label: 'Not Available — Proceed to RFQ',
      intent: 'neutral',
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
      key: 'stockVerified',
      label: 'Stock Verified',
      check: (ctx) =>
        Object.keys(ctx.itemFieldValues).length > 0 &&
        Object.values(ctx.itemFieldValues).every((v: any) => v.decision),
    },
    {
      key: 'warehouseConfirmed',
      label: 'Warehouse Confirmed',
      check: (ctx) =>
        Object.values(ctx.itemFieldValues).every(
          (v: any) =>
            v.currentStockQty !== undefined && v.currentStockQty !== ''
        ),
    },
    {
      key: 'availableQtySet',
      label: 'Available Quantity Provided',
      check: (ctx) =>
        Object.values(ctx.itemFieldValues).every(
          (v: any) => v.availableQty !== undefined && v.availableQty !== ''
        ),
    },
    {
      key: 'materialCondition',
      label: 'Material Source Determined',
      check: (ctx) =>
        Object.values(ctx.itemFieldValues).every((v: any) => !!v.source),
    },
  ],

  summaryFields: [
    'requestedBy',
    'createdDate',
    'pendingSince',
    'project',
    'itemsCount',
  ],
  kpis: DEFAULT_KPIS,
};

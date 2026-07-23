import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const technoCommercialConfig: StageConfig = {
  stageNumber: 4,
  slug: 'techno-commercial-evaluation',
  name: 'Receive Techno Commercial Offer',
  shortName: 'TCO',
  description:
    'Receive techno-commercial offers from suppliers and send technical offer to Engineering/Project department for comparison sheet review.',

  fields: [
    {
      key: 'vendor',
      label: 'Selected Vendor',
      type: 'text',
      required: true,
      bulkEditable: true,
    },
    {
      key: 'quotation',
      label: 'Vendor Quotation Ref',
      type: 'text',
      required: true,
    },
    {
      key: 'itemRate',
      label: 'Item Rate',
      type: 'number',
      currency: true,
      required: true,
    },
    { key: 'comparisonSheet', label: 'Comparison Sheet Ref', type: 'text' },
    {
      key: 'deliveryTerms',
      label: 'Delivery Terms',
      type: 'text',
      required: true,
    },
    {
      key: 'paymentTerms',
      label: 'Payment Terms',
      type: 'text',
      required: true,
    },
    {
      key: 'techRemarks',
      label: 'Technical Remarks',
      type: 'textarea',
      required: true,
    },
    {
      key: 'commRemarks',
      label: 'Commercial Remarks',
      type: 'textarea',
      required: true,
    },
    REMARKS_FIELD,
  ],

  itemFields: [
    {
      key: 'techApproved',
      label: 'Technical Approval',
      type: 'select',
      scope: 'item',
      bulkEditable: true,
      options: [
        { value: 'true', label: 'Approved' },
        { value: 'false', label: 'Pending' },
      ],
    },
    {
      key: 'commApproved',
      label: 'Commercial Approval',
      type: 'select',
      scope: 'item',
      bulkEditable: true,
      options: [
        { value: 'true', label: 'Approved' },
        { value: 'false', label: 'Pending' },
      ],
    },
  ],

  actions: [
    {
      action: 'APPROVE',
      label: 'Approve',
      intent: 'positive',
      requiresValidFields: true,
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
      key: 'vendorSelected',
      label: 'Selected Vendor Provided',
      check: (ctx) => !!ctx.fieldValues.vendor,
    },
    {
      key: 'quotationProvided',
      label: 'Vendor Quotation Provided',
      check: (ctx) => !!ctx.fieldValues.quotation,
    },
    {
      key: 'rateProvided',
      label: 'Item Rate Provided',
      check: (ctx) => !!ctx.fieldValues.itemRate,
    },
    {
      key: 'deliveryTermsProvided',
      label: 'Delivery Terms Provided',
      check: (ctx) => !!ctx.fieldValues.deliveryTerms,
    },
    {
      key: 'paymentTermsProvided',
      label: 'Payment Terms Provided',
      check: (ctx) => !!ctx.fieldValues.paymentTerms,
    },
    {
      key: 'allTechApproved',
      label: 'All Items Technically Approved',
      check: (ctx) =>
        Object.values(ctx.itemFieldValues).every(
          (v: any) => v.techApproved === 'true'
        ),
    },
    {
      key: 'allCommApproved',
      label: 'All Items Commercially Approved',
      check: (ctx) =>
        Object.values(ctx.itemFieldValues).every(
          (v: any) => v.commApproved === 'true'
        ),
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

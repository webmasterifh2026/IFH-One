import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const vendorFollowUpConfig: StageConfig = {
  stageNumber: 10,
  slug: 'vendor-follow-up',
  name: 'Follow-up for Delivery',
  shortName: 'Follow-Up',
  description:
    'Track and follow up with vendor on delivery schedule and commitments.',

  fields: [
    {
      key: 'vendorAgreedDate',
      label: 'Vendor Agreed Date',
      type: 'date',
      required: true,
      bulkEditable: true,
    },
    {
      key: 'expectedDeliveryDate',
      label: 'Expected Delivery Date',
      type: 'date',
      required: true,
      bulkEditable: true,
    },
    {
      key: 'vendorName',
      label: 'Vendor Name',
      type: 'text',
      bulkEditable: true,
    },
    {
      key: 'crmRemarks',
      label: 'CRM Remarks',
      type: 'textarea',
      required: true,
    },
  ],
  itemFields: [],

  actions: [
    {
      action: 'SUBMIT',
      label: 'Submit',
      intent: 'positive',
      requiresValidFields: true,
    },
  ],

  validationRules: [
    {
      key: 'vendorAgreedDate',
      label: 'Vendor Agreed Date Provided',
      check: (ctx) => !!ctx.fieldValues.vendorAgreedDate,
    },
    {
      key: 'expectedDeliveryDate',
      label: 'Expected Delivery Date Provided',
      check: (ctx) => !!ctx.fieldValues.expectedDeliveryDate,
    },
    {
      key: 'crmRemarksProvided',
      label: 'CRM Remarks Provided',
      check: (ctx) => (ctx.fieldValues.crmRemarks || '').trim().length > 0,
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

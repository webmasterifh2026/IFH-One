import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const indentVerificationConfig: StageConfig = {
  stageNumber: 1,
  slug: 'indent-verification',
  name: 'Indent Verification',
  shortName: 'Verification',
  description: 'Verification of the indent by the authorised verifier.',

  fields: [{ ...REMARKS_FIELD, placeholder: 'Enter overall verification remarks (minimum 20 characters for rejection/hold)...' }],

  itemFields: [
    {
      key: 'assignedToId', label: 'Responsible', type: 'text', scope: 'item', bulkEditable: true,
    },
    {
      key: 'holdCancelled', label: 'Hold / Cancelled', type: 'select', scope: 'item', bulkEditable: true,
      options: [
        { value: 'HOLD', label: 'Hold' },
        { value: 'CANCELLED', label: 'Cancelled' },
      ],
    },
    { key: 'remarks', label: 'Item Remarks', type: 'text', scope: 'item', bulkEditable: true },
  ],

  actions: [
    { action: 'APPROVE', label: 'Approve', intent: 'positive', requiresValidFields: true },
    { action: 'HOLD', label: 'Clarification / Hold', intent: 'neutral', minRemarksLength: 20 },
    { action: 'REJECT', label: 'Reject', intent: 'negative', minRemarksLength: 20 },
  ],

  validationRules: [
    { key: 'projectInfoComplete', label: 'Project Info Provided', check: (ctx) => !!(ctx.procurement.projectId || ctx.procurement.projectName) },
    {
      key: 'itemInfoComplete', label: 'Item Information Valid',
      check: (ctx) => ctx.procurement.items.length > 0 && ctx.procurement.items.every((i: any) => i.itemName && i.quantity > 0),
    },
    { key: 'techSpecsAvailable', label: 'Technical Specs Checked', check: (ctx) => ctx.procurement.items.some((i: any) => i.technicalSpec) },
    { key: 'requiredDateValid', label: 'Required Date Identified', check: (ctx) => !!ctx.procurement.requiredDate },
    { key: 'approvedMakesDefined', label: 'Approved Makes Listed', check: (ctx) => ctx.procurement.items.some((i: any) => i.approvedMakes) },
    {
      key: 'attachmentsAvailable', label: 'Attachments Validated',
      check: (ctx) => ctx.procurement.attachments.length > 0 || ctx.procurement.items.some((i: any) => i.attachmentUrl),
    },
    { key: 'documentationReqsComplete', label: 'Documentation Complete', check: () => true },
  ],

  summaryFields: ['requestedBy', 'createdDate', 'pendingSince', 'project', 'department', 'itemsCount'],
  kpis: DEFAULT_KPIS,
};

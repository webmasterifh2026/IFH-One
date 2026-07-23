import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

export const debitNoteConfig: StageConfig = {
  stageNumber: 15,
  slug: 'debit-note',
  name: 'Debit Note Preparation',
  shortName: 'Debit Note',
  description: 'Prepare debit note after all three inspections failed. Submitting closes the workflow as REJECTED — billing stages do NOT execute.',

  fields: [
    {
      key: 'debitNoteStatus', label: 'Debit Note Status', type: 'select', required: true, bulkEditable: true,
      options: [
        { value: 'RAISED', label: 'Raised' },
        { value: 'PENDING', label: 'Pending' },
        { value: 'SETTLED', label: 'Settled' },
      ],
    },
    REMARKS_FIELD,
  ],
  itemFields: [],

  actions: [
    { action: 'SUBMIT', label: 'Submit', intent: 'positive', requiresValidFields: true },
  ],

  validationRules: [
    { key: 'debitNoteStatusProvided', label: 'Debit Note Status Provided', check: (ctx) => !!ctx.fieldValues.debitNoteStatus },
    { key: 'remarksProvided', label: 'Remarks Provided', check: (ctx) => (ctx.fieldValues.remarks || '').trim().length > 0 },
  ],

  summaryFields: ['requestedBy', 'createdDate', 'pendingSince', 'project', 'vendor', 'itemsCount'],
  kpis: DEFAULT_KPIS,
};

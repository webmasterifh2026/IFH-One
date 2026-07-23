import type { StageConfig } from '../stage-config-types';
import { DEFAULT_KPIS, REMARKS_FIELD } from '../stage-config-defaults';

function inspectionStage(stageNumber: number, slug: string, name: string, shortName: string, description: string): StageConfig {
  return {
    stageNumber,
    slug,
    name,
    shortName,
    description,

    fields: [
      { key: 'inspector', label: 'Inspector', type: 'text', required: true, bulkEditable: true },
      REMARKS_FIELD,
    ],
    itemFields: [],

    actions: [
      { action: 'PASS', label: 'Pass', intent: 'positive', requiresValidFields: true },
      { action: 'FAIL', label: 'Fail', intent: 'negative', requiresValidFields: true },
      { action: 'HOLD', label: 'Hold', intent: 'warning', minRemarksLength: 20 },
    ],

    validationRules: [
      { key: 'inspectorProvided', label: 'Inspector Provided', check: (ctx) => !!ctx.fieldValues.inspector },
      { key: 'remarksProvided', label: 'Remarks Provided', check: (ctx) => (ctx.fieldValues.remarks || '').trim().length > 0 },
    ],

    summaryFields: ['requestedBy', 'createdDate', 'pendingSince', 'project', 'vendor', 'itemsCount'],
    kpis: DEFAULT_KPIS,
  };
}

export const materialInspectionConfig: StageConfig = inspectionStage(12, 'material-inspection',  'Inspection 1', 'Inspection 1', 'First quality inspection. PASS → Bill To Accounts. FAIL → Inspection 2.');
export const secondaryInspectionConfig: StageConfig = inspectionStage(13, 'secondary-inspection', 'Inspection 2', 'Inspection 2', 'Second quality inspection. PASS → Bill To Accounts. FAIL → Inspection 3.');
export const finalInspectionConfig: StageConfig    = inspectionStage(14, 'final-inspection',      'Inspection 3', 'Inspection 3', 'Third quality inspection. PASS → Bill To Accounts. FAIL → Debit Note (workflow closes as rejected).');

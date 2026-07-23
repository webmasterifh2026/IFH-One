/**
 * IFH One — Generic Workflow Stage Configuration
 *
 * Every actionable procurement stage (2–22) is described by one StageConfig
 * object instead of a bespoke page/component. The generic StageWorkspace,
 * ItemsTable, DecisionPanel and BulkStageUpdateModal all read from this
 * config, so a stage's unique business rules live in one small data file
 * while layout/interaction/audit/validation stay identical across stages.
 *
 * Field values are persisted in ProcurementStage.metadata (JSON) via the
 * existing stageAction()/bulkStageAction() metadata pipe — there are no
 * dedicated typed columns for PO/GRN/Invoice/Tally/Payment data today.
 */

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'textarea' | 'checkbox';

export interface StageFieldOption {
  value: string;
  label: string;
}

export interface StageField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: StageFieldOption[];
  placeholder?: string;
  /** Read-only fields are displayed but not editable (e.g. values locked from a prior stage). */
  readOnly?: boolean;
  /** Applies to number fields — render with a ₹ prefix. */
  currency?: boolean;
  /** Shown in the bulk-update modal in addition to / instead of the per-record decision panel. */
  bulkEditable?: boolean;
  /** Per-item field (rendered as a column in the Items tab) rather than a stage-level field. */
  scope?: 'stage' | 'item';
}

export interface StageActionDef {
  /** Backend action string passed to resolveStageTransition(), e.g. APPROVE, PASS, SUBMIT. */
  action: string;
  label: string;
  /** Visual intent drives button color in DecisionPanel. */
  intent: 'positive' | 'negative' | 'warning' | 'neutral';
  /** All required fields (stage + item scope) must be filled before this action is enabled. */
  requiresValidFields?: boolean;
  /** Minimum remarks length required to submit this action (0 = not required). */
  minRemarksLength?: number;
}

export interface ValidationRule {
  key: string;
  label: string;
  /** Evaluates against the current procurement + field values to decide pass/fail. */
  check: (ctx: StageValidationContext) => boolean;
}

export interface StageValidationContext {
  procurement: any;
  fieldValues: Record<string, any>;
  itemFieldValues: Record<string, Record<string, any>>;
}

export interface ItemColumnDef {
  key: string;
  label: string;
  /** Source: read from the ProcurementItem record directly (e.g. itemName, quantity). */
  source?: 'item';
  /** Editable item-scoped stage field (persisted per item inside stage metadata). */
  field?: StageField;
}

export interface StageKpiDef {
  key: 'totalProcessed' | 'totalApproved' | 'totalRejected' | 'averageDelayHours' | 'approvalRate' | 'rejectionRate';
  label: string;
  description: string;
}

export interface StageConfig {
  /** Real backend stage number (2–22). */
  stageNumber: number;
  /** Route slug, e.g. "store-check". */
  slug: string;
  name: string;
  shortName: string;
  description: string;

  /** Stage-level fields shown in the decision panel / overview. */
  fields: StageField[];
  /** Per-item fields shown as extra columns in the Items tab. */
  itemFields: StageField[];

  actions: StageActionDef[];
  validationRules: ValidationRule[];

  /** Summary/KPI header fields to pull from the procurement record (dot-path or computed key). */
  summaryFields: Array<'requestedBy' | 'createdDate' | 'pendingSince' | 'project' | 'department' | 'vendor' | 'itemsCount' | 'priority'>;

  kpis: StageKpiDef[];

  /** Fields eligible for bulk editing in the Bulk Stage Update modal. Defaults to fields with bulkEditable:true. */
  bulkFieldKeys?: string[];
}

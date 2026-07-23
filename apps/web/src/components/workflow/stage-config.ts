export type FieldType = 'text' | 'date' | 'select';

export interface StageField {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface StageActionOption {
  /** Real backend action string accepted by resolveStageTransition() for this stage. */
  action: string;
  label: string;
}

export interface StageConfig {
  /** Real backend stage number (matches ProcurementStage.stageNumber / resolveStageTransition case). */
  stage: number;
  title: string;
  fields: StageField[];
  /**
   * Actions the user can pick from for this stage — these are the ONLY
   * values resolveStageTransition() will accept as `action` at this stage.
   * Always includes HOLD (cross-stage universal action); REJECT/CLARIFICATION
   * are added only where the stage actually supports them.
   */
  actions: StageActionOption[];
  requiresAssignedTo?: boolean;
  /** Fixed Responsible Person options for the Bulk Update table (overrides the dynamic user list). */
  responsiblePersonOptions?: { label: string; value: string }[];
  /** Fixed To/From location options for the Bulk Update table (overrides free text). */
  toFromOptions?: { label: string; value: string }[];
  /**
   * Store Check (S2) uses a specialised Bulk Update table: Required Qty
   * (read-only, from the indent), Available Stock Qty (store user input),
   * and Required Qty to Procure (auto-calculated, read-only). When true,
   * requiresAssignedTo/Resp./To-From columns are skipped in favour of this
   * quantity-reconciliation layout.
   */
  storeCheckQuantityReconciliation?: boolean;
}

// ─── Indent Verification (S1) Bulk Update dropdown datasets ────────────────
// Centralized here per business requirement — only these values are valid.
export const INDENT_VERIFICATION_RESPONSIBLE_PERSONS = [
  { label: 'MOHAMMAD AZAD', value: 'MOHAMMAD AZAD' },
  { label: 'Md. Aftab Moin', value: 'Md. Aftab Moin' },
  { label: 'Neetu Singh', value: 'Neetu Singh' },
  { label: 'Neha Mishra', value: 'Neha Mishra' },
  { label: 'Vanshika Mathur', value: 'Vanshika Mathur' },
];

export const INDENT_VERIFICATION_HOLD_CANCELLED_OPTIONS = [
  { label: 'Hold', value: 'HOLD' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Hold from Client Side', value: 'HOLD_CLIENT_SIDE' },
  { label: 'Emergencies', value: 'EMERGENCIES' },
];

export const INDENT_VERIFICATION_TO_FROM_OPTIONS = [
  { label: 'To Shamli', value: 'TO_SHAMLI' },
  { label: 'From Shamli', value: 'FROM_SHAMLI' },
  { label: 'From Germany', value: 'FROM_GERMANY' },
  { label: 'At Site', value: 'AT_SITE' },
  { label: 'Noida', value: 'NOIDA' },
];

// Universal actions accepted at (almost) every stage by resolveStageTransition.
const HOLD_ACTION: StageActionOption = { action: 'HOLD', label: 'Hold' };
const REJECT_ACTION: StageActionOption = { action: 'REJECT', label: 'Reject' };
const CLARIFICATION_ACTION: StageActionOption = {
  action: 'CLARIFICATION',
  label: 'Request Clarification',
};

export const STAGE_CONFIGS: StageConfig[] = [
  {
    stage: 1,
    title: 'Indent Verification',
    fields: [
      {
        id: 'holdCancelled',
        label: 'Hold / Cancelled',
        type: 'select',
        options: INDENT_VERIFICATION_HOLD_CANCELLED_OPTIONS,
      },
    ],
    actions: [
      { action: 'APPROVE', label: 'Approve' },
      REJECT_ACTION,
      HOLD_ACTION,
      CLARIFICATION_ACTION,
    ],
    responsiblePersonOptions: INDENT_VERIFICATION_RESPONSIBLE_PERSONS,
    toFromOptions: INDENT_VERIFICATION_TO_FROM_OPTIONS,
  },
  {
    stage: 2,
    title: 'Check Store Availability',
    requiresAssignedTo: false,
    fields: [],
    actions: [
      { action: 'AVAILABLE', label: 'Available (Fulfilled from Stock)' },
      { action: 'NOT_AVAILABLE', label: 'Not Available (Proceed to RFQ)' },
      REJECT_ACTION,
      HOLD_ACTION,
    ],
    storeCheckQuantityReconciliation: true,
  },
  {
    stage: 3,
    title: 'Float RFQ',
    requiresAssignedTo: false,
    fields: [],
    actions: [
      { action: 'APPROVE', label: 'RFQ Floated — Approve' },
      REJECT_ACTION,
      HOLD_ACTION,
      CLARIFICATION_ACTION,
    ],
  },
  {
    stage: 4,
    title: 'Received Techno Commercial Offer',
    requiresAssignedTo: false,
    fields: [],
    actions: [
      { action: 'APPROVE', label: 'Offer Evaluated — Approve' },
      REJECT_ACTION,
      HOLD_ACTION,
      CLARIFICATION_ACTION,
    ],
  },
  {
    stage: 5,
    title: 'Negotiation & Decision',
    requiresAssignedTo: false,
    fields: [],
    actions: [
      { action: 'APPROVE', label: 'Negotiation Completed — Approve' },
      REJECT_ACTION,
      HOLD_ACTION,
    ],
  },
  {
    stage: 6,
    title: 'Purchase Order Creation',
    requiresAssignedTo: false,
    fields: [
      { id: 'poNumber', label: 'PO Number', type: 'text', required: true },
    ],
    actions: [{ action: 'SUBMIT', label: 'Create PO — Submit' }, HOLD_ACTION],
  },
  {
    stage: 7,
    title: 'PO Approval L1',
    fields: [],
    actions: [
      { action: 'APPROVE', label: 'Approve' },
      REJECT_ACTION,
      HOLD_ACTION,
    ],
  },
  {
    stage: 8,
    title: 'PO Approval L2',
    fields: [],
    actions: [
      { action: 'APPROVE', label: 'Approve' },
      REJECT_ACTION,
      HOLD_ACTION,
    ],
  },
  {
    stage: 9,
    title: 'Vendor Acceptance',
    fields: [
      {
        id: 'acceptanceDate',
        label: 'Acceptance Date',
        type: 'date',
        required: true,
      },
      {
        id: 'vendorConfirmation',
        label: 'Vendor Confirmation',
        type: 'text',
        required: true,
      },
    ],
    actions: [
      { action: 'APPROVE', label: 'Vendor Accepted — Approve' },
      REJECT_ACTION,
      HOLD_ACTION,
    ],
  },
  {
    stage: 10,
    title: 'Vendor Follow-up',
    fields: [
      {
        id: 'followUpDate',
        label: 'Follow-up Date',
        type: 'date',
        required: true,
      },
      { id: 'expectedDelivery', label: 'Expected Delivery', type: 'date' },
      { id: 'vendorResponse', label: 'Vendor Response', type: 'text' },
    ],
    actions: [
      { action: 'SUBMIT', label: 'Follow-up Completed — Submit' },
      HOLD_ACTION,
    ],
  },
  {
    stage: 11,
    title: 'Material Receipt',
    fields: [
      { id: 'grnNumber', label: 'GRN Number', type: 'text', required: true },
      {
        id: 'receivedQuantity',
        label: 'Received Quantity',
        type: 'text',
        required: true,
      },
      {
        id: 'receivedDate',
        label: 'Received Date',
        type: 'date',
        required: true,
      },
      { id: 'warehouse', label: 'Warehouse', type: 'text', required: true },
    ],
    actions: [
      { action: 'SUBMIT', label: 'Material Received — Submit' },
      HOLD_ACTION,
    ],
  },
  {
    stage: 12,
    title: 'Material Inspection (1)',
    fields: [
      { id: 'inspector', label: 'Inspector', type: 'text', required: true },
    ],
    actions: [
      { action: 'PASS', label: 'Pass' },
      { action: 'FAIL', label: 'Fail' },
      HOLD_ACTION,
    ],
  },
  {
    stage: 13,
    title: 'Second Inspection',
    fields: [
      { id: 'inspector', label: 'Inspector', type: 'text', required: true },
    ],
    actions: [
      { action: 'PASS', label: 'Pass' },
      { action: 'FAIL', label: 'Fail' },
      HOLD_ACTION,
    ],
  },
  {
    stage: 14,
    title: 'Third Inspection',
    fields: [
      { id: 'inspector', label: 'Inspector', type: 'text', required: true },
    ],
    actions: [
      { action: 'PASS', label: 'Pass' },
      { action: 'FAIL', label: 'Fail' },
      HOLD_ACTION,
    ],
  },
  {
    stage: 15,
    title: 'Debit Note Preparation',
    fields: [
      {
        id: 'debitNoteNumber',
        label: 'Debit Note Number',
        type: 'text',
        required: true,
      },
    ],
    actions: [
      { action: 'SUBMIT', label: 'Debit Note Raised — Close Workflow' },
    ],
  },
  {
    stage: 16,
    title: 'Bill To Accounts',
    fields: [
      {
        id: 'dispatchDate',
        label: 'Dispatch Date',
        type: 'date',
        required: true,
      },
    ],
    actions: [
      { action: 'SUBMIT', label: 'Forward to Accounts — Submit' },
      HOLD_ACTION,
    ],
  },
  {
    stage: 17,
    title: 'Bill To Purchase',
    fields: [
      {
        id: 'receivedDate',
        label: 'Received Date',
        type: 'date',
        required: true,
      },
    ],
    actions: [
      { action: 'APPROVE', label: 'Verified by Purchase — Approve' },
      REJECT_ACTION,
      HOLD_ACTION,
    ],
  },
  {
    stage: 18,
    title: 'Bill Creation + GRN',
    fields: [
      { id: 'billNumber', label: 'Bill Number', type: 'text', required: true },
      { id: 'billDate', label: 'Bill Date', type: 'date', required: true },
      {
        id: 'grnVerification',
        label: 'GRN Verification',
        type: 'text',
        required: true,
      },
      { id: 'checklist', label: 'Checklist', type: 'text' },
    ],
    actions: [
      { action: 'APPROVE', label: 'Bill Created — Approve' },
      REJECT_ACTION,
      HOLD_ACTION,
    ],
  },
  {
    stage: 19,
    title: 'Book Purchase in Tally',
    fields: [
      {
        id: 'voucherNumber',
        label: 'Voucher Number',
        type: 'text',
        required: true,
      },
      {
        id: 'tallyReference',
        label: 'Tally Reference',
        type: 'text',
        required: true,
      },
      {
        id: 'postingDate',
        label: 'Posting Date',
        type: 'date',
        required: true,
      },
    ],
    actions: [
      { action: 'APPROVE', label: 'Tally Entry Completed — Approve' },
      REJECT_ACTION,
      HOLD_ACTION,
    ],
  },
  {
    stage: 20,
    title: 'Bill Approval L1',
    fields: [],
    actions: [
      { action: 'APPROVE', label: 'Approve' },
      REJECT_ACTION,
      HOLD_ACTION,
    ],
  },
  {
    stage: 21,
    title: 'Bill Approval L2',
    fields: [],
    actions: [
      { action: 'APPROVE', label: 'Approve' },
      REJECT_ACTION,
      HOLD_ACTION,
    ],
  },
  {
    stage: 22,
    title: 'Payment / Advice',
    fields: [
      {
        id: 'paymentDate',
        label: 'Payment Date',
        type: 'date',
        required: true,
      },
      {
        id: 'paymentMode',
        label: 'Payment Mode',
        type: 'text',
        required: true,
      },
      { id: 'adviceNumber', label: 'Advice Number', type: 'text' },
      {
        id: 'transactionReference',
        label: 'Transaction Reference',
        type: 'text',
        required: true,
      },
    ],
    actions: [
      { action: 'APPROVE', label: 'Payment Issued — Complete Workflow' },
      REJECT_ACTION,
      HOLD_ACTION,
    ],
  },
];

export const getStageConfig = (stageNum: number): StageConfig | undefined => {
  return STAGE_CONFIGS.find((s) => s.stage === stageNum);
};

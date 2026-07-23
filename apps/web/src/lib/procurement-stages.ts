/**
 * IFH One — Procurement Stage Definitions
 * 24 stages (0–23) of the Purchase FMS workflow.
 * Numbers are fixed — they correspond to DB stageNumber values.
 */

export interface StageDefinition {
  number: number;
  name: string;
  shortName: string;
  group:
    'requisition' | 'sourcing' | 'order' | 'receipt' | 'finance' | 'complete';
  groupLabel: string;
  actions: StageAction[];
  description: string;
}

export type StageAction =
  | 'SUBMIT'
  | 'APPROVE'
  | 'REJECT'
  | 'HOLD'
  | 'MOVE_NEXT'
  | 'RESUME'
  | 'AVAILABLE'
  | 'NOT_AVAILABLE'
  | 'CANCEL'
  | 'PASS'
  | 'FAIL';

export const PROCUREMENT_STAGES: StageDefinition[] = [
  {
    number: 0,
    name: 'Indent Creation',
    shortName: 'Indent',
    group: 'requisition',
    groupLabel: 'Requisition',
    actions: ['SUBMIT'],
    description:
      'Create the purchase indent with item details and project information.',
  },
  {
    number: 1,
    name: 'Indent Verification',
    shortName: 'Verification',
    group: 'requisition',
    groupLabel: 'Requisition',
    actions: ['APPROVE', 'REJECT', 'HOLD'],
    description: 'Verification of the indent by the authorised verifier.',
  },
  {
    number: 2,
    name: 'Store Availability Check',
    shortName: 'Store Check',
    group: 'sourcing',
    groupLabel: 'Sourcing',
    // AVAILABLE closes the workflow; NOT_AVAILABLE moves to Float RFQ
    actions: ['AVAILABLE', 'NOT_AVAILABLE', 'HOLD', 'REJECT'],
    description:
      'Check if items are available in store inventory. If available, workflow closes. If not, proceed to Float RFQ.',
  },
  {
    number: 3,
    name: 'Float RFQ',
    shortName: 'RFQ',
    group: 'sourcing',
    groupLabel: 'Sourcing',
    actions: ['APPROVE', 'HOLD', 'REJECT'],
    description: 'Float Request for Quotation to shortlisted vendors.',
  },
  {
    number: 4,
    name: 'Receive Techno Commercial Offer',
    shortName: 'TCO',
    group: 'sourcing',
    groupLabel: 'Sourcing',
    actions: ['APPROVE', 'HOLD', 'REJECT'],
    description:
      'Receive and evaluate techno-commercial offers from suppliers. Send technical offer to Engineering for comparison sheet.',
  },
  {
    number: 5,
    name: 'Negotiation & Decision',
    shortName: 'Negotiation',
    group: 'sourcing',
    groupLabel: 'Sourcing',
    actions: ['APPROVE', 'HOLD', 'REJECT'],
    description:
      'Final commercial negotiation with shortlisted vendor and selection decision.',
  },
  {
    number: 6,
    name: 'Purchase Order Creation',
    shortName: 'PO Creation',
    group: 'order',
    groupLabel: 'Purchase Order',
    actions: ['SUBMIT'],
    description: 'Draft and submit the Purchase Order to the selected vendor.',
  },
  {
    number: 7,
    name: 'PO Approval L1',
    shortName: 'PO Approval 1',
    group: 'order',
    groupLabel: 'Purchase Order',
    actions: ['APPROVE', 'REJECT', 'HOLD'],
    description: 'First level approval of the Purchase Order.',
  },
  {
    number: 8,
    name: 'PO Approval L2',
    shortName: 'PO Approval 2',
    group: 'order',
    groupLabel: 'Purchase Order',
    actions: ['APPROVE', 'REJECT', 'HOLD'],
    description: 'Second level approval of the Purchase Order.',
  },
  {
    number: 9,
    name: 'Vendor Acceptance',
    shortName: 'Vendor Accept',
    group: 'order',
    groupLabel: 'Purchase Order',
    actions: ['APPROVE', 'HOLD', 'REJECT'],
    description: 'Vendor acknowledges and accepts the Purchase Order.',
  },
  {
    number: 10,
    name: 'Follow-up for Delivery',
    shortName: 'Follow-Up',
    group: 'order',
    groupLabel: 'Purchase Order',
    actions: ['SUBMIT'],
    description:
      'Track and follow up with vendor on delivery schedule and commitments.',
  },
  {
    number: 11,
    name: 'Material Receipt',
    shortName: 'Receipt',
    group: 'receipt',
    groupLabel: 'Receipt',
    actions: ['SUBMIT'],
    description: 'Record material receipt at site / warehouse (GRN).',
  },
  {
    number: 12,
    name: 'Inspection 1',
    shortName: 'Inspection 1',
    group: 'receipt',
    groupLabel: 'Receipt',
    // PASS → Bill To Accounts (16); FAIL → Inspection 2 (13)
    actions: ['PASS', 'FAIL', 'HOLD'],
    description:
      'First quality inspection of received materials. PASS moves to billing; FAIL escalates to Inspection 2.',
  },
  {
    number: 13,
    name: 'Inspection 2',
    shortName: 'Inspection 2',
    group: 'receipt',
    groupLabel: 'Receipt',
    // PASS → Bill To Accounts (16); FAIL → Inspection 3 (14)
    actions: ['PASS', 'FAIL', 'HOLD'],
    description:
      'Second quality inspection. PASS moves to billing; FAIL escalates to Inspection 3.',
  },
  {
    number: 14,
    name: 'Inspection 3',
    shortName: 'Inspection 3',
    group: 'receipt',
    groupLabel: 'Receipt',
    // PASS → Bill To Accounts (16); FAIL → Debit Note (15) and workflow closes REJECTED
    actions: ['PASS', 'FAIL', 'HOLD'],
    description:
      'Final quality inspection. PASS moves to billing; FAIL moves to Debit Note and closes workflow as rejected.',
  },
  {
    number: 15,
    name: 'Debit Note Preparation',
    shortName: 'Debit Note',
    group: 'finance',
    groupLabel: 'Finance',
    // SUBMIT closes workflow as REJECTED — do NOT proceed to billing
    actions: ['SUBMIT'],
    description:
      'Prepare debit note after all inspections failed. Closes workflow as rejected — billing stages do NOT execute.',
  },
  {
    number: 16,
    name: 'Bill To Accounts',
    shortName: 'Bill → Accounts',
    group: 'finance',
    groupLabel: 'Finance',
    actions: ['SUBMIT'],
    description: 'Vendor bill forwarded to Accounts department.',
  },
  {
    number: 17,
    name: 'Bill To Purchase',
    shortName: 'Bill → Purchase',
    group: 'finance',
    groupLabel: 'Finance',
    actions: ['APPROVE', 'HOLD', 'REJECT'],
    description: 'Bill sent back to Purchase department for verification.',
  },
  {
    number: 18,
    name: 'Bill Creation + GRN',
    shortName: 'Bill + GRN',
    group: 'finance',
    groupLabel: 'Finance',
    actions: ['APPROVE', 'HOLD', 'REJECT'],
    description: 'Create and record the final bill with GRN in the system.',
  },
  {
    number: 19,
    name: 'Book Purchase in Tally',
    shortName: 'Tally Entry',
    group: 'finance',
    groupLabel: 'Finance',
    actions: ['APPROVE', 'HOLD', 'REJECT'],
    description: 'Post the purchase bill entry in the Tally accounting system.',
  },
  {
    number: 20,
    name: 'Bill Approval L1',
    shortName: 'Bill Approval 1',
    group: 'finance',
    groupLabel: 'Finance',
    actions: ['APPROVE', 'REJECT', 'HOLD'],
    description: 'First level approval of the vendor bill.',
  },
  {
    number: 21,
    name: 'Bill Approval L2',
    shortName: 'Bill Approval 2',
    group: 'finance',
    groupLabel: 'Finance',
    actions: ['APPROVE', 'REJECT', 'HOLD'],
    description: 'Second level approval of the vendor bill.',
  },
  {
    number: 22,
    name: 'Payment / Advice',
    shortName: 'Payment',
    group: 'finance',
    groupLabel: 'Finance',
    // APPROVE is used by the stage workspace DecisionPanel
    actions: ['APPROVE', 'HOLD', 'REJECT'],
    description:
      'Issue payment advice to vendor and close the procurement lifecycle.',
  },
  {
    number: 23,
    name: 'Completed',
    shortName: 'Completed',
    group: 'complete',
    groupLabel: 'Complete',
    actions: [],
    description: 'Workflow completed. All stages have been processed.',
  },
];

export function getStageDefinition(
  stageNumber: number
): StageDefinition | undefined {
  return PROCUREMENT_STAGES.find((s) => s.number === stageNumber);
}

export function getStageGroups() {
  const groups: Record<string, StageDefinition[]> = {};
  for (const stage of PROCUREMENT_STAGES) {
    if (!groups[stage.group]) groups[stage.group] = [];
    groups[stage.group].push(stage);
  }
  return groups;
}

export function getStageStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
    case 'APPROVED':
      return 'text-emerald-700 bg-emerald-50 ring-emerald-600/20';
    case 'IN_PROGRESS':
      return 'text-blue-700 bg-blue-50 ring-blue-600/20';
    case 'PENDING':
      return 'text-gray-500 bg-gray-100 ring-gray-400/20';
    case 'REJECTED':
      return 'text-red-700 bg-red-50 ring-red-600/20';
    case 'ON_HOLD':
      return 'text-yellow-700 bg-yellow-50 ring-yellow-600/20';
    case 'SKIPPED':
      return 'text-slate-500 bg-slate-100 ring-slate-400/20';
    default:
      return 'text-gray-500 bg-gray-100 ring-gray-400/20';
  }
}

export function getProcurementStatusColor(status: string): string {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
      return 'text-emerald-700 bg-emerald-50 ring-emerald-600/20';
    case 'IN_PROGRESS':
      return 'text-blue-700 bg-blue-50 ring-blue-600/20';
    case 'DRAFT':
      return 'text-gray-600 bg-gray-100 ring-gray-400/20';
    case 'REJECTED':
      return 'text-red-700 bg-red-50 ring-red-600/20';
    case 'ON_HOLD':
      return 'text-yellow-700 bg-yellow-50 ring-yellow-600/20';
    case 'CANCELLED':
      return 'text-slate-600 bg-slate-100 ring-slate-400/20';
    default:
      return 'text-gray-600 bg-gray-100 ring-gray-400/20';
  }
}

const MONTH_ABBR = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Standard app-wide date format: "dd MMM yyyy" (e.g. "10 Jul 2026"). */
export function formatDate(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()}`;
}

/** Standard app-wide timestamp format: "dd MMM yyyy HH:mm:ss" (e.g. "10 Jul 2026 14:35:42"). */
export function formatDateTime(dateString: string): string {
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';
  return `${pad2(d.getDate())} ${MONTH_ABBR[d.getMonth()]} ${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function getProgressPercentage(
  currentStage: number,
  status: string
): number {
  if (status === 'COMPLETED') return 100;
  if (status === 'CANCELLED' || status === 'REJECTED')
    return Math.round((currentStage / 23) * 100);
  return Math.round((currentStage / 23) * 100);
}

/**
 * IFH Business TAT Engine
 * Working hours: Mon–Fri + 2nd, 4th, 5th Saturday of each month
 * Business hours: 09:00–18:00 IST (9h/day)
 */

// ─── Stage TAT Config ─────────────────────────────────────────────────────────

export interface StageTATConfig {
  stage: number;
  name: string;
  tatHours: number;
  responsible: string[];
}

// "AO Assigned User" stages (RFQ Float, TCE, Negotiation, PO Creation) have no
// fixed responsible list — the actual doer is whoever was assigned during
// Indent Verification, carried forward server-side. `responsible: []` there
// is intentional, not missing data; the frontend must look up the record's
// actual assignedTo for those stages rather than a static name.
export const STAGE_TAT: Record<number, StageTATConfig> = {
  1:  { stage: 1,  name: 'Indent Verification',          tatHours: 6,  responsible: ['Pramod Kumar'] },
  2:  { stage: 2,  name: 'Store Availability',            tatHours: 4,  responsible: ['Shiv Dayal Sharma', 'Pankaj Kumar'] },
  3:  { stage: 3,  name: 'RFQ Float',                     tatHours: 6,  responsible: [] },
  4:  { stage: 4,  name: 'Techno Commercial Evaluation',  tatHours: 24, responsible: [] },
  5:  { stage: 5,  name: 'Negotiation',                   tatHours: 12, responsible: [] },
  6:  { stage: 6,  name: 'PO Creation',                   tatHours: 4,  responsible: [] },
  7:  { stage: 7,  name: 'PO Approval L1',                tatHours: 6,  responsible: ['Pramod Kumar'] },
  8:  { stage: 8,  name: 'PO Approval L2',                tatHours: 6,  responsible: ['Ankur Gupta'] },
  9:  { stage: 9,  name: 'Vendor Acceptance',             tatHours: 20, responsible: ['Neetu Singh'] },
  10: { stage: 10, name: 'Vendor Follow Up',              tatHours: 12, responsible: ['Priyanka Pal'] },
  11: { stage: 11, name: 'Material Receipt',              tatHours: 24, responsible: ['Shiv Dayal Sharma', 'Shivam Namdev', 'Anushka Kamboj'] },
  12: { stage: 12, name: 'Material Inspection',           tatHours: 4,  responsible: ['Saurabh', 'Shivam Namdev', 'Anushka Kamboj'] },
  13: { stage: 13, name: 'Second Inspection',             tatHours: 8,  responsible: ['Saurabh', 'Shivam Namdev', 'Anushka Kamboj'] },
  14: { stage: 14, name: 'Third Inspection',              tatHours: 8,  responsible: ['Saurabh', 'Shivam Namdev', 'Anushka Kamboj'] },
  15: { stage: 15, name: 'Debit Note',                    tatHours: 10, responsible: ['Atul Tyagi'] },
  16: { stage: 16, name: 'Bill To Accounts',              tatHours: 6,  responsible: ['Pankaj Kumar', 'Anushka Kamboj'] },
  17: { stage: 17, name: 'Bill To Purchase',              tatHours: 8,  responsible: ['Pankaj Kumar', 'Atul Tyagi', 'Anushka Kamboj'] },
  18: { stage: 18, name: 'Bill Creation',                 tatHours: 8,  responsible: ['Pankaj Kumar', 'Atul Tyagi', 'Anushka Kamboj'] },
  19: { stage: 19, name: 'Tally Entry',                   tatHours: 10, responsible: ['Atul Tyagi'] },
  20: { stage: 20, name: 'Bill Approval L1',              tatHours: 6,  responsible: ['Pramod Kumar'] },
  21: { stage: 21, name: 'Bill Approval L2',              tatHours: 6,  responsible: ['Neetu Singh'] },
  22: { stage: 22, name: 'Payment Advice',                tatHours: 4,  responsible: ['Neha Mishra', 'Vanshika Mathur', 'Md. Aftab Moin', 'MOHAMMAD AZAD'] },
};

// ─── Working Calendar ─────────────────────────────────────────────────────────

const BIZ_START_H = 9;   // 09:00
const BIZ_END_H   = 18;  // 18:00
const BIZ_HRS_PER_DAY = BIZ_END_H - BIZ_START_H; // 9

/** Returns which Saturdays are working in a given month/year.
 *  Rule: 2nd, 4th, and 5th Saturdays work; 1st and 3rd do not. */
function workingSaturdaysInMonth(year: number, month: number): Set<number> {
  const working = new Set<number>();
  let satCount = 0;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month, d).getDay();
    if (dow === 6) {
      satCount++;
      if (satCount === 2 || satCount === 4 || satCount === 5) {
        working.add(d);
      }
    }
  }
  return working;
}

function isWorkingDay(date: Date): boolean {
  const dow = date.getDay();
  if (dow === 0) return false; // Sunday
  if (dow >= 1 && dow <= 5) return true; // Mon–Fri
  // Saturday
  const workingSats = workingSaturdaysInMonth(date.getFullYear(), date.getMonth());
  return workingSats.has(date.getDate());
}

/**
 * Count business hours between two timestamps.
 */
export function businessHoursBetween(start: Date, end: Date): number {
  if (end <= start) return 0;
  let total = 0;
  const cur = new Date(start);

  // Advance to business hours if outside
  if (!isWorkingDay(cur) || cur.getHours() >= BIZ_END_H) {
    cur.setDate(cur.getDate() + 1);
    cur.setHours(BIZ_START_H, 0, 0, 0);
    while (!isWorkingDay(cur)) cur.setDate(cur.getDate() + 1);
  } else if (cur.getHours() < BIZ_START_H) {
    cur.setHours(BIZ_START_H, 0, 0, 0);
  }

  while (cur < end) {
    if (!isWorkingDay(cur)) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(BIZ_START_H, 0, 0, 0);
      continue;
    }
    const dayEnd = new Date(cur);
    dayEnd.setHours(BIZ_END_H, 0, 0, 0);
    const segEnd = end < dayEnd ? end : dayEnd;
    const segStart = cur.getHours() < BIZ_START_H
      ? new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), BIZ_START_H)
      : cur;
    if (segEnd > segStart) {
      total += (segEnd.getTime() - segStart.getTime()) / 3600000;
    }
    // Move to next day
    cur.setDate(cur.getDate() + 1);
    cur.setHours(BIZ_START_H, 0, 0, 0);
  }
  return Math.max(0, total);
}

/**
 * Add business hours to a start date.
 * Returns the resulting Date (skips nights, weekends, non-working Saturdays).
 */
export function addBusinessHours(start: Date, hours: number): Date {
  const result = new Date(start);
  let remaining = hours;

  // Clamp to business hours start
  if (!isWorkingDay(result)) {
    result.setDate(result.getDate() + 1);
    result.setHours(BIZ_START_H, 0, 0, 0);
    while (!isWorkingDay(result)) result.setDate(result.getDate() + 1);
  } else if (result.getHours() < BIZ_START_H) {
    result.setHours(BIZ_START_H, 0, 0, 0);
  } else if (result.getHours() >= BIZ_END_H) {
    result.setDate(result.getDate() + 1);
    result.setHours(BIZ_START_H, 0, 0, 0);
    while (!isWorkingDay(result)) result.setDate(result.getDate() + 1);
  }

  while (remaining > 0) {
    const availToday = BIZ_END_H - result.getHours() - result.getMinutes() / 60;
    if (remaining <= availToday) {
      result.setTime(result.getTime() + remaining * 3600000);
      remaining = 0;
    } else {
      remaining -= availToday;
      result.setDate(result.getDate() + 1);
      result.setHours(BIZ_START_H, 0, 0, 0);
      while (!isWorkingDay(result)) result.setDate(result.getDate() + 1);
    }
  }
  return result;
}

// ─── SLA Result ───────────────────────────────────────────────────────────────

export interface SLAResult {
  stageNumber: number;
  tatHours: number;
  responsible: string[];
  assignedAt: Date;
  deadline: Date;
  bizHoursConsumed: number;
  bizHoursRemaining: number;
  delayHours: number;       // positive = over TAT, negative = ahead
  delayDays: number;        // display value
  pctConsumed: number;      // 0–100+
  status: 'on_time' | 'at_risk' | 'delayed';
}

/**
 * Compute SLA for a stage.
 * @param stageNumber  Current stage (1–22)
 * @param assignedAt   When the stage was entered (or record.createdAt for mock)
 * @param completedAt  If stage is done, when it was completed; else null (= now)
 */
export function computeSLA(
  stageNumber: number,
  assignedAt: Date,
  completedAt: Date | null,
): SLAResult {
  const cfg = STAGE_TAT[stageNumber];
  const tatHours = cfg?.tatHours ?? 8;
  const responsible = cfg?.responsible ?? [];
  const deadline = addBusinessHours(assignedAt, tatHours);
  const evalAt = completedAt ?? new Date();
  const bizConsumed = businessHoursBetween(assignedAt, evalAt);
  const delayHours = bizConsumed - tatHours;
  const pct = tatHours > 0 ? (bizConsumed / tatHours) * 100 : 0;

  let status: SLAResult['status'] = 'on_time';
  if (delayHours > 0) status = 'delayed';
  else if (pct >= 80) status = 'at_risk';

  return {
    stageNumber,
    tatHours,
    responsible,
    assignedAt,
    deadline,
    bizHoursConsumed: bizConsumed,
    bizHoursRemaining: Math.max(0, tatHours - bizConsumed),
    delayHours,
    delayDays: delayHours / BIZ_HRS_PER_DAY,
    pctConsumed: pct,
    status,
  };
}

/** Format business hours for display. */
export function fmtBizHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < BIZ_HRS_PER_DAY) return `${hours.toFixed(1)}h`;
  return `${(hours / BIZ_HRS_PER_DAY).toFixed(1)}d`;
}

/** SLA status pill config. */
export function slaStatusConfig(status: SLAResult['status']) {
  if (status === 'on_time') return { label: 'On Time', color: '#059669', bg: '#D1FAE5', dot: '#059669' };
  if (status === 'at_risk') return { label: 'At Risk', color: '#D97706', bg: '#FEF3C7', dot: '#D97706' };
  return { label: 'Delayed', color: '#DC2626', bg: '#FEE2E2', dot: '#DC2626' };
}

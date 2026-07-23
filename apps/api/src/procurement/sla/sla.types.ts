// ─────────────────────────────────────────────────────────────────────────────
// SLA Engine Types — IFH One v2.5.0
// ─────────────────────────────────────────────────────────────────────────────

export type SlaStatus =
  | 'ON_TRACK'
  | 'APPROACHING_SLA'
  | 'SLA_BREACHED'
  | 'COMPLETED_ON_TIME'
  | 'COMPLETED_LATE';

export type ReminderType =
  | 'PERCENT_50'
  | 'PERCENT_75'
  | 'PERCENT_90'
  | 'SLA_EXPIRED'
  | 'POST_EXPIRY_24H';

export type DelayCategory =
  'SLA_BREACH' | 'HOLD' | 'CLARIFICATION' | 'REASSIGNMENT' | 'OTHER';

export type EscalationLevel = 1 | 2 | 3;

export type NotificationCategory =
  | 'NEW_TASK'
  | 'PENDING_TASK'
  | 'SLA_WARNING'
  | 'ESCALATION'
  | 'APPROVAL'
  | 'REJECTION'
  | 'HOLD'
  | 'CLARIFICATION'
  | 'SYSTEM';

/**
 * Computed SLA snapshot for a stage — returned by SlaEngineService.computeSlaSnapshot()
 */
export interface SlaSnapshot {
  stageEnteredAt: Date;
  slaDurationHours: number;
  dueAt: Date;
  completedAt: Date | null;
  elapsedHours: number;
  remainingHours: number;
  delayHours: number;
  slaStatus: SlaStatus;
  percentConsumed: number;
  isCompleted: boolean;
}

/**
 * SLA color indicator used by frontend
 */
export type SlaColor = 'green' | 'yellow' | 'orange' | 'red' | 'gray';

export function getSlaColor(
  status: SlaStatus,
  percentConsumed: number,
): SlaColor {
  if (status === 'COMPLETED_ON_TIME') return 'gray';
  if (status === 'COMPLETED_LATE') return 'gray';
  if (status === 'SLA_BREACHED') return 'red';
  if (percentConsumed >= 90) return 'orange';
  if (percentConsumed >= 75) return 'yellow';
  return 'green';
}

export function getSlaStatusLabel(status: SlaStatus): string {
  switch (status) {
    case 'ON_TRACK':
      return 'On Track';
    case 'APPROACHING_SLA':
      return 'Approaching SLA';
    case 'SLA_BREACHED':
      return 'SLA Breached';
    case 'COMPLETED_ON_TIME':
      return 'Completed Within SLA';
    case 'COMPLETED_LATE':
      return 'Completed After SLA';
  }
}

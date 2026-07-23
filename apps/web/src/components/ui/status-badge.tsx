import { ReactNode } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Archive,
  MinusCircle,
} from 'lucide-react';

export type StatusType =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'DRAFT'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'APPROVED'
  | 'REJECTED'
  | 'ON_HOLD'
  | 'ARCHIVED';

interface StatusBadgeProps {
  status: StatusType | string;
  icon?: boolean;
}

const STATUS_MAP: Record<
  string,
  { bg: string; color: string; icon: ReactNode; label: string }
> = {
  ACTIVE: {
    bg: 'rgba(22,163,74,0.1)',
    color: '#16A34A',
    icon: <CheckCircle2 style={{ width: 10, height: 10 }} />,
    label: 'Active',
  },
  APPROVED: {
    bg: 'rgba(22,163,74,0.1)',
    color: '#16A34A',
    icon: <CheckCircle2 style={{ width: 10, height: 10 }} />,
    label: 'Approved',
  },
  COMPLETED: {
    bg: 'rgba(5,150,105,0.1)',
    color: '#059669',
    icon: <CheckCircle2 style={{ width: 10, height: 10 }} />,
    label: 'Completed',
  },
  INACTIVE: {
    bg: 'rgba(220,38,38,0.1)',
    color: '#DC2626',
    icon: <XCircle style={{ width: 10, height: 10 }} />,
    label: 'Inactive',
  },
  REJECTED: {
    bg: 'rgba(220,38,38,0.1)',
    color: '#DC2626',
    icon: <XCircle style={{ width: 10, height: 10 }} />,
    label: 'Rejected',
  },
  PENDING: {
    bg: 'rgba(234,88,12,0.1)',
    color: '#EA580C',
    icon: <Clock style={{ width: 10, height: 10 }} />,
    label: 'Pending',
  },
  ON_HOLD: {
    bg: 'rgba(217,119,6,0.12)',
    color: '#D97706',
    icon: <AlertCircle style={{ width: 10, height: 10 }} />,
    label: 'On Hold',
  },
  IN_PROGRESS: {
    bg: 'rgba(37,99,235,0.1)',
    color: '#2563EB',
    icon: <Clock style={{ width: 10, height: 10 }} />,
    label: 'In Progress',
  },
  DRAFT: {
    bg: 'rgba(107,114,128,0.1)',
    color: '#6B7280',
    icon: <MinusCircle style={{ width: 10, height: 10 }} />,
    label: 'Draft',
  },
  ARCHIVED: {
    bg: 'rgba(100,116,139,0.1)',
    color: '#64748B',
    icon: <Archive style={{ width: 10, height: 10 }} />,
    label: 'Archived',
  },
};

export function StatusBadge({ status, icon = true }: StatusBadgeProps) {
  const key = status.toUpperCase().replace(/\s+/g, '_');
  const def = STATUS_MAP[key] ?? {
    bg: 'rgba(107,114,128,0.1)',
    color: '#6B7280',
    icon: <MinusCircle style={{ width: 10, height: 10 }} />,
    label: status
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase()),
  };

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '2px 8px',
        borderRadius: 99,
        background: def.bg,
        color: def.color,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        whiteSpace: 'nowrap',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {icon && def.icon}
      {def.label}
    </span>
  );
}

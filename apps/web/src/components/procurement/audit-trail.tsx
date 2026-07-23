'use client';

import { Activity, CheckCircle2, XCircle, AlertCircle, ChevronRight, MessageSquare, UserPlus, Ban } from 'lucide-react';
import type { ProcurementHistory } from '@/lib/api/procurement';
import { formatDateTime, getStageDefinition } from '@/lib/procurement-stages';

interface AuditTrailProps {
  history: ProcurementHistory[];
}

function ActionIcon({ action }: { action: string }) {
  switch (action.toUpperCase()) {
    case 'APPROVED': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
    case 'REJECTED': return <XCircle className="w-3.5 h-3.5 text-red-500" />;
    case 'HELD':
    case 'ON_HOLD': return <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />;
    case 'SUBMITTED':
    case 'SUBMIT': return <ChevronRight className="w-3.5 h-3.5 text-blue-500" />;
    case 'CREATED': return <Activity className="w-3.5 h-3.5 text-[#0F7B45]" />;
    case 'REMARK_ADDED': return <MessageSquare className="w-3.5 h-3.5 text-gray-400" />;
    case 'ASSIGNED': return <UserPlus className="w-3.5 h-3.5 text-purple-500" />;
    case 'CANCELLED': return <Ban className="w-3.5 h-3.5 text-slate-500" />;
    case 'MOVE_NEXT':
    case 'MOVED': return <ChevronRight className="w-3.5 h-3.5 text-blue-500" />;
    default: return <Activity className="w-3.5 h-3.5 text-gray-400" />;
  }
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    CREATED: 'Created',
    SUBMITTED: 'Submitted',
    SUBMIT: 'Submitted',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    HELD: 'Put on Hold',
    HOLD: 'Put on Hold',
    MOVE_NEXT: 'Moved to Next Stage',
    MOVED: 'Moved',
    REMARK_ADDED: 'Remark Added',
    ASSIGNED: 'Assigned',
    CANCELLED: 'Cancelled',
    COMPLETED: 'Completed',
    RESUMED: 'Resumed',
    RESUME: 'Resumed',
  };
  return map[action.toUpperCase()] || action;
}

export function AuditTrail({ history }: AuditTrailProps) {
  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-[13px] text-gray-400">
        No audit history yet.
      </div>
    );
  }

  // Sort newest first for display
  const sorted = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />

      <div className="space-y-4">
        {sorted.map((entry, idx) => {
          const stageDef = entry.stageNumber !== null && entry.stageNumber !== undefined
            ? getStageDefinition(entry.stageNumber)
            : undefined;

          return (
            <div key={entry.id} className="flex gap-4 relative">
              {/* Icon bubble */}
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center z-10 mt-0.5 shadow-sm">
                <ActionIcon action={entry.action} />
              </div>

              {/* Content */}
              <div className="flex-1 pb-4 border-b border-gray-50 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[13px] font-semibold text-gray-900">
                      {entry.performedBy.fullName}
                    </span>
                    <span className="text-[13px] text-gray-500 mx-1.5">·</span>
                    <span className="text-[13px] text-gray-600">{actionLabel(entry.action)}</span>
                    {stageDef && (
                      <>
                        <span className="text-[13px] text-gray-400 mx-1.5">at</span>
                        <span className="text-[12px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md">
                          Stage {entry.stageNumber}: {stageDef.shortName}
                        </span>
                      </>
                    )}
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0 font-medium">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>
                <p className="text-[12px] text-gray-500 mt-0.5 leading-relaxed">{entry.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

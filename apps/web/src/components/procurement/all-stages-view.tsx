'use client';

import {
  Check,
  Clock,
  AlertCircle,
  XCircle,
  Minus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import {
  PROCUREMENT_STAGES,
  getStageDefinition,
  formatDateTime,
} from '@/lib/procurement-stages';
import type { ProcurementStage } from '@/lib/api/procurement';
import { StatusBadge } from '@/components/ui/status-badge';

interface AllStagesViewProps {
  stages: ProcurementStage[];
  currentStage: number;
}

function StageStatusIcon({ status }: { status: string }) {
  switch (status.toUpperCase()) {
    case 'COMPLETED':
    case 'APPROVED':
      return (
        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
          <Check className="w-3 h-3 text-white" />
        </div>
      );
    case 'IN_PROGRESS':
      return (
        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-blue-200">
          <Clock className="w-3 h-3 text-white" />
        </div>
      );
    case 'REJECTED':
      return (
        <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
          <XCircle className="w-3 h-3 text-white" />
        </div>
      );
    case 'ON_HOLD':
      return (
        <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
          <AlertCircle className="w-3 h-3 text-white" />
        </div>
      );
    default:
      return (
        <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
          <Minus className="w-2.5 h-2.5 text-gray-300" />
        </div>
      );
  }
}

const GROUP_ORDER = [
  'requisition',
  'sourcing',
  'order',
  'receipt',
  'finance',
  'complete',
] as const;
const GROUP_LABELS: Record<string, string> = {
  requisition: 'Requisition',
  sourcing: 'Sourcing & RFQ',
  order: 'Purchase Order',
  receipt: 'Receipt & Inspection',
  finance: 'Finance & Billing',
  complete: 'Complete',
};

export function AllStagesView({ stages, currentStage }: AllStagesViewProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set([
      'requisition',
      'sourcing',
      'order',
      'receipt',
      'finance',
      'complete',
    ])
  );
  const stageMap = new Map(stages.map((s) => [s.stageNumber, s]));

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {GROUP_ORDER.map((group) => {
        const groupStageDefs = PROCUREMENT_STAGES.filter(
          (s) => s.group === group
        );
        const isExpanded = expandedGroups.has(group);
        const completedCount = groupStageDefs.filter((s) => {
          const st = stageMap.get(s.number);
          return (
            st && ['COMPLETED', 'APPROVED'].includes(st.status.toUpperCase())
          );
        }).length;

        return (
          <div
            key={group}
            className="border border-gray-200 rounded-xl overflow-hidden"
          >
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/80 hover:bg-gray-100/60 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
                <span className="text-[13px] font-semibold text-gray-900">
                  {GROUP_LABELS[group]}
                </span>
                <span className="text-[11px] font-medium text-gray-400">
                  {groupStageDefs.length} stages
                </span>
              </div>
              <span className="text-[12px] font-semibold text-emerald-600">
                {completedCount}/{groupStageDefs.length} complete
              </span>
            </button>

            {/* Stages */}
            {isExpanded && (
              <div className="divide-y divide-gray-100">
                {groupStageDefs.map((stageDef) => {
                  const stageData = stageMap.get(stageDef.number);
                  const stageStatus = stageData?.status || 'PENDING';
                  const isCurrent = stageDef.number === currentStage;

                  return (
                    <div
                      key={stageDef.number}
                      className={`flex items-center gap-4 px-4 py-3 transition-colors ${isCurrent ? 'bg-blue-50/60' : 'hover:bg-gray-50/40'}`}
                    >
                      {/* Stage number */}
                      <span className="text-[11px] font-bold text-gray-300 w-6 text-center flex-shrink-0">
                        {stageDef.number}
                      </span>

                      {/* Status icon */}
                      <StageStatusIcon status={stageStatus} />

                      {/* Stage info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-[13px] font-semibold truncate ${isCurrent ? 'text-blue-700' : 'text-gray-900'}`}
                          >
                            {stageDef.name}
                            {isCurrent && (
                              <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-md">
                                Current
                              </span>
                            )}
                          </p>
                        </div>
                        {stageData?.assignedTo && (
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Assigned: {stageData.assignedTo.fullName}
                          </p>
                        )}
                        {stageData?.completedAt && (
                          <p className="text-[11px] text-gray-400">
                            Completed: {formatDateTime(stageData.completedAt)}
                          </p>
                        )}
                        {stageData?.remarks && (
                          <div className="mt-1.5 p-2 bg-gray-50 rounded-md border border-gray-100">
                            <p className="text-[11px] text-gray-600 italic">
                              "{stageData.remarks}"
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Status badge */}
                      <div className="flex-shrink-0">
                        <StatusBadge status={stageStatus} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

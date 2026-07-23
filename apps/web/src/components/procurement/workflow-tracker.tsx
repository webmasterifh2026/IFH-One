'use client';

import { PROCUREMENT_STAGES, getStageGroups } from '@/lib/procurement-stages';
import type { ProcurementStage } from '@/lib/api/procurement';
import { Check, Clock, AlertCircle, XCircle, Minus } from 'lucide-react';

interface WorkflowTrackerProps {
  currentStage: number;
  stages: ProcurementStage[];
  status: string;
  compact?: boolean;
}

function StageIcon({ stageStatus }: { stageStatus: string }) {
  switch (stageStatus.toUpperCase()) {
    case 'COMPLETED':
    case 'APPROVED':
      return <Check className="w-3 h-3" />;
    case 'IN_PROGRESS':
      return <Clock className="w-3 h-3" />;
    case 'REJECTED':
      return <XCircle className="w-3 h-3" />;
    case 'ON_HOLD':
      return <AlertCircle className="w-3 h-3" />;
    default:
      return <Minus className="w-2.5 h-2.5" />;
  }
}

function getStageCircleStyle(stageStatus: string) {
  switch (stageStatus.toUpperCase()) {
    case 'COMPLETED':
    case 'APPROVED':
      return 'bg-emerald-500 text-white border-emerald-500';
    case 'IN_PROGRESS':
      return 'bg-blue-500 text-white border-blue-500 ring-2 ring-blue-200';
    case 'REJECTED':
      return 'bg-red-500 text-white border-red-500';
    case 'ON_HOLD':
      return 'bg-yellow-400 text-white border-yellow-400';
    default:
      return 'bg-white text-gray-300 border-gray-200';
  }
}

function getLineStyle(stageStatus: string) {
  switch (stageStatus.toUpperCase()) {
    case 'COMPLETED':
    case 'APPROVED':
      return 'bg-emerald-400';
    case 'IN_PROGRESS':
      return 'bg-gradient-to-r from-emerald-400 to-blue-400';
    default:
      return 'bg-gray-200';
  }
}

const GROUP_ORDER = ['requisition', 'sourcing', 'order', 'receipt', 'finance', 'complete'];
const GROUP_LABELS: Record<string, string> = {
  requisition: 'Requisition',
  sourcing: 'Sourcing',
  order: 'Purchase Order',
  receipt: 'Receipt & Inspection',
  finance: 'Finance',
  complete: 'Complete',
};

export function WorkflowTracker({ currentStage, stages, status, compact = false }: WorkflowTrackerProps) {
  const stageMap = new Map(stages.map((s) => [s.stageNumber, s]));
  const groups = getStageGroups();

  if (compact) {
    // Compact: just show group bubbles
    return (
      <div className="flex items-center gap-0 overflow-x-auto pb-1">
        {GROUP_ORDER.map((group, gi) => {
          const groupStages = groups[group] || [];
          const groupStageDefs = PROCUREMENT_STAGES.filter((s) => s.group === group);
          const allCompleted = groupStageDefs.every((s) => {
            const st = stageMap.get(s.number);
            return st && ['COMPLETED', 'APPROVED'].includes(st.status.toUpperCase());
          });
          const anyInProgress = groupStageDefs.some((s) => {
            const st = stageMap.get(s.number);
            return st && st.status.toUpperCase() === 'IN_PROGRESS';
          });
          const anyRejected = groupStageDefs.some((s) => {
            const st = stageMap.get(s.number);
            return st && st.status.toUpperCase() === 'REJECTED';
          });
          const anyHeld = groupStageDefs.some((s) => {
            const st = stageMap.get(s.number);
            return st && st.status.toUpperCase() === 'ON_HOLD';
          });

          let circleStyle = 'bg-white border-gray-200 text-gray-300';
          if (anyRejected) circleStyle = 'bg-red-500 border-red-500 text-white';
          else if (anyHeld) circleStyle = 'bg-yellow-400 border-yellow-400 text-white';
          else if (anyInProgress) circleStyle = 'bg-blue-500 border-blue-500 text-white ring-2 ring-blue-200';
          else if (allCompleted) circleStyle = 'bg-emerald-500 border-emerald-500 text-white';

          return (
            <div key={group} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${circleStyle}`}>
                  {anyRejected ? <XCircle className="w-3.5 h-3.5" /> : anyHeld ? <AlertCircle className="w-3.5 h-3.5" /> : anyInProgress ? <Clock className="w-3.5 h-3.5" /> : allCompleted ? <Check className="w-3.5 h-3.5" /> : <Minus className="w-3 h-3" />}
                </div>
                <span className="text-[9px] font-semibold text-gray-400 mt-1 uppercase tracking-wide whitespace-nowrap">{GROUP_LABELS[group]}</span>
              </div>
              {gi < GROUP_ORDER.length - 1 && (
                <div className={`h-0.5 w-8 mx-0.5 mb-4 ${allCompleted ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Full: show all stages grouped
  return (
    <div className="space-y-6">
      {GROUP_ORDER.map((group) => {
        const groupStageDefs = PROCUREMENT_STAGES.filter((s) => s.group === group);

        return (
          <div key={group}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-gray-400 mb-3">
              {GROUP_LABELS[group]}
            </p>
            <div className="flex items-start gap-0 flex-wrap">
              {groupStageDefs.map((stageDef, idx) => {
                const stageData = stageMap.get(stageDef.number);
                const stageStatus = stageData?.status || 'PENDING';
                const isCurrent = stageDef.number === currentStage;

                return (
                  <div key={stageDef.number} className="flex items-center">
                    {/* Stage bubble */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-300 ${getStageCircleStyle(stageStatus)}`}
                        title={`Stage ${stageDef.number}: ${stageDef.name}`}
                      >
                        <StageIcon stageStatus={stageStatus} />
                      </div>
                      <div className="mt-1.5 text-center max-w-[64px]">
                        <p className={`text-[9.5px] font-semibold leading-tight ${isCurrent ? 'text-blue-600' : 'text-gray-500'}`}>
                          {stageDef.shortName}
                        </p>
                        {isCurrent && (
                          <span className="inline-block w-1 h-1 rounded-full bg-blue-500 mt-0.5" />
                        )}
                      </div>
                    </div>
                    {/* Connector line */}
                    {idx < groupStageDefs.length - 1 && (
                      <div className={`h-0.5 w-6 mb-6 ${getLineStyle(stageStatus)}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

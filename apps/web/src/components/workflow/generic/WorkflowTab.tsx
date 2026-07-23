'use client';

import { CheckCircle2, XCircle, PauseCircle } from 'lucide-react';
import type { ProcurementHistory } from '@/lib/api/procurement';
import { PROCUREMENT_STAGES, formatDateTime } from '@/lib/procurement-stages';

interface WorkflowTabProps {
  history: ProcurementHistory[];
  currentStage: number;
  status: string;
}

export function WorkflowTab({
  history,
  currentStage,
  status,
}: WorkflowTabProps) {
  return (
    <div className="h-full overflow-auto p-8 max-w-4xl mx-auto">
      <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-[16px] font-bold text-gray-900 mb-6">
          Workflow Timeline
        </h2>
        <div className="relative">
          <div className="absolute top-2 left-[15px] bottom-2 w-0.5 bg-gray-200" />
          <div className="space-y-4">
            {PROCUREMENT_STAGES.map((item) => {
              const isDone = currentStage > item.number;
              const isActive =
                currentStage === item.number &&
                !['REJECTED', 'ON_HOLD'].includes(status);
              const isRejected =
                status === 'REJECTED' && currentStage === item.number;
              const isHeld =
                status === 'ON_HOLD' && currentStage === item.number;

              return (
                <div
                  key={item.number}
                  className="relative flex items-start gap-4 z-10"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                      isRejected
                        ? 'bg-red-50 border-red-400'
                        : isHeld
                          ? 'bg-yellow-50 border-yellow-400'
                          : isDone
                            ? 'bg-emerald-500 border-emerald-500'
                            : isActive
                              ? 'bg-[#0F7B45] border-[#0F7B45]'
                              : 'bg-white border-gray-200'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    ) : isRejected ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : isHeld ? (
                      <PauseCircle className="w-4 h-4 text-yellow-500" />
                    ) : isActive ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-white" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-gray-200" />
                    )}
                  </div>
                  <div className="pt-1.5">
                    <p
                      className={`text-[12px] font-bold ${
                        isDone
                          ? 'text-emerald-700'
                          : isActive
                            ? 'text-[#0F7B45]'
                            : isRejected
                              ? 'text-red-600'
                              : isHeld
                                ? 'text-yellow-600'
                                : 'text-gray-400'
                      }`}
                    >
                      {item.name}
                    </p>
                    <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                      Stage {item.number}
                      {isActive ? ' — Current' : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {history.length > 0 && (
          <div className="mt-8 pt-4 border-t border-gray-200">
            <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-4">
              Recent Audit Log
            </h4>
            <div className="space-y-3">
              {history
                .slice(-3)
                .reverse()
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-gray-50 p-3 rounded-lg border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-bold text-gray-700">
                        {entry.action}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {formatDateTime(entry.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600">
                      {entry.description}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      by {entry.performedBy?.fullName}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

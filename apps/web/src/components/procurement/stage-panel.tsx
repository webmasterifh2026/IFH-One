'use client';

import { useState } from 'react';
import {
  CheckCircle2, XCircle, AlertCircle, Clock, ChevronRight,
  MessageSquare, Paperclip, User, Calendar, Activity
} from 'lucide-react';
import { EnterpriseCard, EnterpriseCardHeader } from '@/components/ui/enterprise-card';
import { StatusBadge } from '@/components/ui/status-badge';
import type { Procurement, ProcurementStage } from '@/lib/api/procurement';
import { getStageDefinition, formatDateTime } from '@/lib/procurement-stages';
import { performStageAction, addRemark } from '@/lib/api/procurement';
import { DynamicStageRenderer } from '../procurement-execution/DynamicStageRenderer';

interface StagePanelProps {
  procurement: Procurement;
  onUpdate: (updated: Procurement) => void;
}

export function StagePanel({ procurement, onUpdate }: StagePanelProps) {
  const [remarksText, setRemarksText] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const currentStageData = procurement.stages.find(
    (s) => s.stageNumber === procurement.currentStage,
  );
  const stageDef = getStageDefinition(procurement.currentStage);

  const isTerminal = ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(
    procurement.status.toUpperCase(),
  );

  const handleAction = async (action: string, metadata?: Record<string, unknown>) => {
    setError('');
    setActionLoading(action);
    try {
      const updated = await performStageAction(procurement.id, action, {
        remarks: remarksText || undefined,
        metadata,
      });
      setRemarksText('');
      onUpdate(updated);
    } catch (err: any) {
      setError(err.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAddRemark = async () => {
    if (!remarksText.trim()) return;
    setLoading(true);
    setError('');
    try {
      await addRemark(procurement.id, remarksText, procurement.currentStage);
      setRemarksText('');
      // Refresh
      const updated = await import('@/lib/api/procurement').then((m) =>
        m.getProcurement(procurement.id),
      );
      onUpdate(updated);
    } catch (err: any) {
      setError(err.message || 'Failed to add remark');
    } finally {
      setLoading(false);
    }
  };

  const currentStageRemarks = procurement.remarks.filter(
    (r) => r.stageNumber === procurement.currentStage,
  );

  return (
    <div className="space-y-4">
      {/* ── Current Stage Card ─────────────────────────────────────────── */}
      <EnterpriseCard>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Stage {procurement.currentStage} of 23
              </span>
              {currentStageData && (
                <StatusBadge status={currentStageData.status} />
              )}
            </div>
            <h3 className="text-[17px] font-semibold text-gray-900 tracking-tight">
              {stageDef?.name || 'Unknown Stage'}
            </h3>
            <p className="text-[13px] text-gray-500 mt-1">{stageDef?.description}</p>
          </div>
        </div>

        {/* Stage Metadata */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {currentStageData?.assignedTo && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <User className="w-3.5 h-3.5 text-gray-400" />
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Assigned To</p>
                <p className="text-[13px] font-medium text-gray-900">{currentStageData.assignedTo.fullName}</p>
              </div>
            </div>
          )}
          {currentStageData?.startedAt && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Started</p>
                <p className="text-[13px] font-medium text-gray-900">{formatDateTime(currentStageData.startedAt)}</p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200/60 px-4 py-3 text-[13px] text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* Actions or Dynamic Forms */}
        {!isTerminal && stageDef && (
          <div className="mt-4">
            {procurement.currentStage >= 3 ? (
              <DynamicStageRenderer
                procurement={procurement}
                onUpdate={onUpdate}
                actionLoading={actionLoading}
                onAction={handleAction}
                remarksText={remarksText}
                setRemarksText={setRemarksText}
              />
            ) : (
              <div className="space-y-3">
                {/* Remarks textarea */}
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Remarks (optional)
                  </label>
                  <textarea
                    value={remarksText}
                    onChange={(e) => setRemarksText(e.target.value)}
                    placeholder="Add remarks for this action..."
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/30 focus:border-[#0F7B45] resize-none"
                  />
                </div>
                {/* Action buttons */}
                <div className="flex flex-wrap gap-2">
                  {stageDef.actions.includes('SUBMIT') && (
                    <button
                      onClick={() => {
                        let metadata: Record<string, unknown> | undefined;
                        if (procurement.currentStage === 3) metadata = { rfqNumber: 'RFQ-' + Date.now() };
                        else if (procurement.currentStage === 6) metadata = { poNumber: 'PO-' + Date.now() };
                        else if (procurement.currentStage === 11) metadata = { grnNumber: 'GRN-' + Date.now() };
                        handleAction('SUBMIT', metadata);
                      }}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0F7B45] text-white text-[13px] font-semibold hover:bg-[#0A5C34] transition-colors disabled:opacity-50 shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                      {actionLoading === 'SUBMIT' ? 'Processing...' : 'Submit & Advance'}
                    </button>
                  )}
                  {stageDef.actions.includes('APPROVE') && (
                    <button
                      onClick={() => handleAction('APPROVE')}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {actionLoading === 'APPROVE' ? 'Processing...' : 'Approve'}
                    </button>
                  )}
                  {stageDef.actions.includes('REJECT') && (
                    <button
                      onClick={() => handleAction('REJECT')}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white border border-red-200 text-red-600 text-[13px] font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      {actionLoading === 'REJECT' ? 'Processing...' : 'Reject'}
                    </button>
                  )}
                  {stageDef.actions.includes('HOLD') && (
                    <button
                      onClick={() => handleAction('HOLD')}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white border border-yellow-200 text-yellow-600 text-[13px] font-semibold hover:bg-yellow-50 transition-colors disabled:opacity-50"
                    >
                      <AlertCircle className="w-4 h-4" />
                      {actionLoading === 'HOLD' ? 'Processing...' : 'Put on Hold'}
                    </button>
                  )}
                  {stageDef.actions.includes('AVAILABLE') && (
                    <button
                      onClick={() => handleAction('AVAILABLE')}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {actionLoading === 'AVAILABLE' ? 'Processing...' : 'Available in Store'}
                    </button>
                  )}
                  {stageDef.actions.includes('NOT_AVAILABLE') && (
                    <button
                      onClick={() => handleAction('NOT_AVAILABLE')}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-orange-500 text-white text-[13px] font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 shadow-sm"
                    >
                      <ChevronRight className="w-4 h-4" />
                      {actionLoading === 'NOT_AVAILABLE' ? 'Processing...' : 'Not Available — Float RFQ'}
                    </button>
                  )}
                  {stageDef.actions.includes('CANCEL') && (
                    <button
                      onClick={() => handleAction('CANCEL')}
                      disabled={!!actionLoading}
                      className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-white border border-red-200 text-red-600 text-[13px] font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-4 h-4" />
                      {actionLoading === 'CANCEL' ? 'Processing...' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {isTerminal && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 border border-gray-200">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-[13px] font-medium text-gray-600">
              This workflow is {procurement.status.toLowerCase()}. No further actions available.
            </span>
          </div>
        )}
      </EnterpriseCard>

      {/* ── Stage Remarks ──────────────────────────────────────────────── */}
      {currentStageRemarks.length > 0 && (
        <EnterpriseCard>
          <EnterpriseCardHeader
            title={`Stage Remarks (${currentStageRemarks.length})`}
            action={<MessageSquare className="w-4 h-4 text-gray-400" />}
          />
          <div className="space-y-3">
            {currentStageRemarks.map((remark) => (
              <div key={remark.id} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-[#0F7B45]/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[11px] font-bold text-[#0F7B45]">
                    {remark.author.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[12px] font-semibold text-gray-900">{remark.author.fullName}</span>
                    <span className="text-[11px] text-gray-400">{formatDateTime(remark.createdAt)}</span>
                  </div>
                  <p className="text-[13px] text-gray-700 leading-relaxed">{remark.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </EnterpriseCard>
      )}
    </div>
  );
}

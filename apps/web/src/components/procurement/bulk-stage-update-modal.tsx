'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, AlertTriangle, CheckCircle2, XCircle, Loader2, ShieldAlert } from 'lucide-react';
import { EnterpriseCard } from '@/components/ui/enterprise-card';
import { getStageDefinition } from '@/lib/procurement-stages';
import {
  previewBulkStageAction,
  executeBulkStageAction,
  type BulkPreviewResponse,
  type BulkExecuteResponse,
} from '@/lib/api/procurement';

type Step = 'configure' | 'preview' | 'processing' | 'summary';

interface BulkStageUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedIds: string[];
  onComplete?: () => void;
}

const ACTION_OPTIONS = [
  { value: 'APPROVE', label: 'Approve' },
  { value: 'REJECT', label: 'Reject' },
  { value: 'HOLD', label: 'Put On Hold' },
  { value: 'RESUME', label: 'Resume' },
  { value: 'SUBMIT', label: 'Submit / Move Next' },
  { value: 'AVAILABLE', label: 'Mark Available (Store Check)' },
  { value: 'NOT_AVAILABLE', label: 'Mark Not Available (Store Check)' },
  { value: 'PASS', label: 'Pass Inspection' },
  { value: 'FAIL', label: 'Fail Inspection' },
];

export function BulkStageUpdateModal({
  isOpen,
  onClose,
  selectedIds,
  onComplete,
}: BulkStageUpdateModalProps) {
  const [step, setStep] = useState<Step>('configure');
  const [action, setAction] = useState('APPROVE');
  const [remarks, setRemarks] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [notifyUsers, setNotifyUsers] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const [preview, setPreview] = useState<BulkPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');

  const [result, setResult] = useState<BulkExecuteResponse | null>(null);
  const [executeError, setExecuteError] = useState('');
  const [progressPct, setProgressPct] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setStep('configure');
      setAction('APPROVE');
      setRemarks('');
      setEffectiveDate('');
      setNotifyUsers(false);
      setConfirmed(false);
      setPreview(null);
      setPreviewError('');
      setResult(null);
      setExecuteError('');
      setProgressPct(0);
    }
  }, [isOpen]);

  const stageBreakdown = useMemo(() => {
    if (!preview) return [];
    const map = new Map<number, { stageNumber: number; name: string; count: number }>();
    for (const r of preview.eligibleRecords) {
      const existing = map.get(r.currentStage);
      if (existing) existing.count += 1;
      else map.set(r.currentStage, { stageNumber: r.currentStage, name: r.currentStageName, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => a.stageNumber - b.stageNumber);
  }, [preview]);

  if (!isOpen) return null;

  const handleGetPreview = async () => {
    setPreviewLoading(true);
    setPreviewError('');
    try {
      const res = await previewBulkStageAction({
        procurementIds: selectedIds,
        action,
        remarks: remarks || undefined,
        effectiveDate: effectiveDate || undefined,
        notifyUsers,
      });
      setPreview(res);
      setStep('preview');
    } catch (err: any) {
      setPreviewError(err?.message || 'Failed to build preview. Please try again.');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleExecute = async () => {
    setStep('processing');
    setExecuteError('');
    const tick = setInterval(() => {
      setProgressPct((p) => (p < 90 ? p + Math.random() * 12 : p));
    }, 200);
    try {
      const res = await executeBulkStageAction({
        procurementIds: selectedIds,
        action,
        remarks: remarks || undefined,
        effectiveDate: effectiveDate || undefined,
        notifyUsers,
      });
      clearInterval(tick);
      setProgressPct(100);
      setResult(res);
      setTimeout(() => setStep('summary'), 300);
      onComplete?.();
    } catch (err: any) {
      clearInterval(tick);
      setExecuteError(err?.message || 'Bulk update failed. Please try again.');
      setStep('preview');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <EnterpriseCard className="relative">
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Change Workflow Stage</h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedIds.length} {selectedIds.length === 1 ? 'Record' : 'Records'} Selected
              </p>
            </div>
            {step !== 'processing' && (
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {step === 'configure' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Action
                </label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45]"
                >
                  {ACTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-[12px] text-gray-400 mt-1.5">
                  Applied only to selected records whose current stage legally permits this action. Others will be skipped with a reason shown in the preview.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Effective Date (Optional)
                </label>
                <input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full h-11 px-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Remarks
                </label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add remarks for this bulk update (applied to every updated record)..."
                  className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45] resize-none"
                />
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={notifyUsers}
                  onChange={(e) => setNotifyUsers(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-[#0F7B45] focus:ring-[#0F7B45]/30"
                />
                <span className="text-[13px] font-medium text-gray-700">
                  Notify assigned users of this change
                </span>
              </label>

              {previewError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-[13px] text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {previewError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={onClose}
                  className="h-10 px-4 rounded-xl text-[13px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGetPreview}
                  disabled={previewLoading}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0F7B45] text-white text-[13px] font-semibold hover:bg-[#0A5C34] transition-colors disabled:opacity-60"
                >
                  {previewLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Preview Changes
                </button>
              </div>
            </div>
          )}

          {step === 'preview' && preview && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                  <p className="text-2xl font-bold text-gray-900">{preview.totalSelected}</p>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-1">Selected</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-2xl font-bold text-emerald-700">{preview.totalEligible}</p>
                  <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mt-1">Eligible</p>
                </div>
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-center">
                  <p className="text-2xl font-bold text-red-700">{preview.totalBlocked}</p>
                  <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wide mt-1">Blocked</p>
                </div>
              </div>

              {stageBreakdown.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Current Stage Summary
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {stageBreakdown.map((s) => (
                      <span
                        key={s.stageNumber}
                        className="inline-flex items-center h-7 px-3 rounded-lg bg-blue-50 text-blue-700 text-[12px] font-semibold"
                      >
                        Stage {s.stageNumber} · {s.name} ({s.count})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {preview.blockedRecords.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Blocked Records ({preview.blockedRecords.length})
                  </p>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100">
                    {preview.blockedRecords.map((b) => (
                      <div key={b.id} className="flex items-center justify-between px-3 py-2 text-[12px]">
                        <span className="font-mono font-semibold text-gray-700">{b.referenceNo || b.id}</span>
                        <span className="text-red-500 flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" /> {b.reason}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {preview.totalEligible === 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-yellow-50 border border-yellow-100 text-[13px] text-yellow-700">
                  <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  No selected records are eligible for this action. Adjust your selection or choose a different action.
                </div>
              )}

              {executeError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-[13px] text-red-700">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {executeError}
                </div>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  disabled={preview.totalEligible === 0}
                  className="w-4 h-4 rounded border-gray-300 text-[#0F7B45] focus:ring-[#0F7B45]/30"
                />
                <span className="text-[13px] font-medium text-gray-700">
                  I confirm I want to apply <span className="font-bold">{action}</span> to {preview.totalEligible} eligible {preview.totalEligible === 1 ? 'record' : 'records'}.
                </span>
              </label>

              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setStep('configure')}
                  className="h-10 px-4 rounded-xl text-[13px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleExecute}
                  disabled={!confirmed || preview.totalEligible === 0}
                  className="inline-flex items-center gap-2 h-10 px-5 rounded-xl bg-[#0F7B45] text-white text-[13px] font-semibold hover:bg-[#0A5C34] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Apply to {preview.totalEligible} {preview.totalEligible === 1 ? 'Record' : 'Records'}
                </button>
              </div>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-10 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-[#0F7B45] animate-spin" />
              <p className="text-[14px] font-semibold text-gray-700">Updating Records...</p>
              <div className="w-full max-w-sm h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#0F7B45] transition-all duration-200"
                  style={{ width: `${Math.min(progressPct, 100)}%` }}
                />
              </div>
              <p className="text-[12px] text-gray-400">{Math.round(Math.min(progressPct, 100))}%</p>
            </div>
          )}

          {step === 'summary' && result && (
            <div className="space-y-5">
              <div className="flex flex-col items-center text-center gap-2 py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <p className="text-[15px] font-bold text-gray-900">Bulk Update Complete</p>
                <p className="text-[12px] text-gray-400">
                  Processed in {(result.durationMs / 1000).toFixed(1)}s
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-center">
                  <p className="text-xl font-bold text-gray-900">{result.totalSelected}</p>
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-1">Total Selected</p>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
                  <p className="text-xl font-bold text-emerald-700">{result.totalUpdated}</p>
                  <p className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wide mt-1">Updated</p>
                </div>
                <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100 text-center">
                  <p className="text-xl font-bold text-yellow-700">{result.totalSkipped}</p>
                  <p className="text-[11px] font-semibold text-yellow-600 uppercase tracking-wide mt-1">Skipped</p>
                </div>
                <div className="p-4 rounded-xl bg-red-50 border border-red-100 text-center">
                  <p className="text-xl font-bold text-red-700">{result.totalFailed}</p>
                  <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wide mt-1">Failed</p>
                </div>
              </div>

              {(result.skippedRecords.length > 0 || result.failedRecords.length > 0) && (
                <details className="rounded-xl border border-gray-200">
                  <summary className="px-4 py-3 text-[13px] font-semibold text-gray-700 cursor-pointer select-none">
                    View Details
                  </summary>
                  <div className="max-h-48 overflow-y-auto divide-y divide-gray-100 border-t border-gray-100">
                    {result.failedRecords.map((f) => (
                      <div key={f.id} className="flex items-center justify-between px-4 py-2 text-[12px]">
                        <span className="font-mono font-semibold text-gray-700">{f.referenceNo || f.id}</span>
                        <span className="text-red-500">{f.reason}</span>
                      </div>
                    ))}
                    {result.skippedRecords.map((s) => (
                      <div key={s.id} className="flex items-center justify-between px-4 py-2 text-[12px]">
                        <span className="font-mono font-semibold text-gray-700">{s.referenceNo || s.id}</span>
                        <span className="text-yellow-600">{s.reason}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              <div className="flex items-center justify-end pt-2">
                <button
                  onClick={onClose}
                  className="h-10 px-5 rounded-xl bg-[#0F7B45] text-white text-[13px] font-semibold hover:bg-[#0A5C34] transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </EnterpriseCard>
      </div>
    </div>
  );
}

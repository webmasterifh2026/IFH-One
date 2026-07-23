'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { ChevronLeft, AlertCircle, ShieldCheck } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { DecisionPanel } from './DecisionPanel';
import { ValidationChecklist } from './ValidationChecklist';
import { OverviewTab } from './OverviewTab';
import { DocumentsTab } from './DocumentsTab';
import { WorkflowTab } from './WorkflowTab';
import { AuditLogsTab } from './AuditLogsTab';
import { useStageFieldValues } from '@/lib/workflow/use-stage-fields';
import type { StageConfig } from '@/lib/workflow/stage-config-types';
import { getProcurement, type Procurement } from '@/lib/api/procurement';
import { formatDateTime } from '@/lib/procurement-stages';

const TABS = ['Indent Details', 'Documents', 'Workflow', 'History', 'Audit Logs'];

function pendingHours(procurement: Procurement, stageNumber: number): number {
  const stage = procurement.stages?.find((s) => s.stageNumber === stageNumber);
  const start = stage?.startedAt || procurement.createdAt;
  return Math.floor((Date.now() - new Date(start).getTime()) / (1000 * 60 * 60));
}

interface IndentDetailsViewProps {
  id: string;
  config: StageConfig;
  backHref: string;
}

/**
 * Read-only indent detail view (v2.8.4). Reachable via Action → View from
 * every stage queue (S0–S23). All updates now happen exclusively through
 * Bulk Update on the stage queue page — this component performs GET-only
 * data loading and renders no editable controls, form state, or write API
 * calls of any kind.
 */
export function StageWorkspace({ id, config, backHref }: IndentDetailsViewProps) {
  const [procurement, setProcurement] = useState<Procurement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('Indent Details');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProcurement(id);
      setProcurement(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load procurement details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading || !procurement) {
    if (error) {
      return (
        <div className="p-8 max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 p-6 bg-red-50 border border-red-200 rounded-2xl">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-[14px] font-semibold text-red-800">{error}</p>
              <Link href={backHref} className="text-[13px] text-red-600 hover:underline mt-1 block">← Back to queue</Link>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-[#0F7B45] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[13px] font-semibold text-gray-500">Loading Indent Details...</p>
        </div>
      </div>
    );
  }

  return (
    <IndentDetailsViewBody
      procurement={procurement}
      config={config}
      backHref={backHref}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      drawerOpen={drawerOpen}
      setDrawerOpen={setDrawerOpen}
    />
  );
}

function IndentDetailsViewBody({
  procurement, config, backHref, activeTab, setActiveTab, drawerOpen, setDrawerOpen,
}: {
  procurement: Procurement;
  config: StageConfig;
  backHref: string;
  activeTab: string;
  setActiveTab: (t: string) => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
}) {
  const { fieldValues, itemFieldValues, validationResults } = useStageFieldValues(procurement, config);

  const p = procurement;
  const pending = pendingHours(p, config.stageNumber);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100 font-sans">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-2.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <Link href={backHref} className="flex items-center justify-center w-8 h-8 rounded text-gray-500 hover:bg-gray-100 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-[16px] font-bold text-gray-900 tracking-tight">{p.referenceNo}</h1>
            <StatusBadge status={p.status} />
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-gray-500 rounded">{p.priority}</span>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-[#0F7B45]/10 text-[#0F7B45] rounded">
              Stage {config.stageNumber} · {config.shortName}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex items-center gap-2 px-3 py-1.5 text-[12px] font-bold rounded-md border transition-colors ${
              validationResults.every((r) => r.passed) ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Validation: {validationResults.filter((r) => r.passed).length}/{validationResults.length} Passed
          </button>
        </div>
      </header>

      {/* Summary Strip */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex flex-wrap gap-x-12 gap-y-4">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Created By</p>
            <p className="text-[13px] font-semibold text-gray-800">{p.requestedBy?.fullName || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Created Date</p>
            <p className="text-[13px] font-semibold text-gray-800">{formatDateTime(p.createdAt)}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Pending Since</p>
            <p className="text-[13px] font-semibold text-gray-800">{pending}h</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Project</p>
            <p className="text-[13px] font-semibold text-gray-800">{(p as any).projectName || p.projectId || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Vendor</p>
            <p className="text-[13px] font-semibold text-gray-800">{p.vendorName || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Total Items</p>
            <p className="text-[13px] font-semibold text-gray-800">{p.items.length}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 pt-2 flex gap-6">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2.5 text-[13px] font-bold transition-all border-b-2 ${
              activeTab === tab ? 'border-[#0F7B45] text-[#0F7B45]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto bg-gray-50">
        {activeTab === 'Indent Details' && <OverviewTab procurement={p} />}
        {activeTab === 'Documents' && <DocumentsTab attachments={p.attachments} />}
        {activeTab === 'Workflow' && <WorkflowTab history={p.history} currentStage={p.currentStage} status={p.status} />}
        {activeTab === 'History' && (
          <div className="p-8 max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
              <h2 className="text-[16px] font-bold text-gray-900 mb-6">Indent History</h2>
              {p.history.length === 0 ? (
                <p className="text-[13px] text-gray-400">No history recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {[...p.history].reverse().map((entry) => (
                    <div key={entry.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[12px] font-bold text-gray-800">{entry.action}</span>
                        <span className="text-[11px] text-gray-400">{formatDateTime(entry.createdAt)}</span>
                      </div>
                      <p className="text-[12px] text-gray-600">{entry.description}</p>
                      <p className="text-[11px] text-gray-400 mt-1">by {entry.performedBy?.fullName}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {activeTab === 'Audit Logs' && <AuditLogsTab history={p.history} />}
      </div>

      {/* Read-Only Stage Summary */}
      <DecisionPanel fields={config.fields} fieldValues={fieldValues} status={p.status} />

      {/* Validation Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setDrawerOpen(false)} />
          <div className="relative w-[400px] h-full bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-in slide-in-from-right">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                Stage Validation
              </h2>
              <button onClick={() => setDrawerOpen(false)} className="text-gray-400 hover:text-gray-600 font-bold p-1">&times;</button>
            </div>
            <div className="flex-1 p-6 overflow-y-auto">
              <ValidationChecklist results={validationResults} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

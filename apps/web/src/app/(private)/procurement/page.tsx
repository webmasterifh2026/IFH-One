'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  Filter,
  FileText,
  ChevronRight,
  ChevronLeft,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EnterpriseCard } from '@/components/ui/enterprise-card';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { WorkflowTracker } from '@/components/procurement/workflow-tracker';
import { BulkActionToolbar } from '@/components/procurement/bulk-action-toolbar';
import { BulkStageUpdateModal } from '@/components/procurement/bulk-stage-update-modal';
import {
  getProcurements,
  type ProcurementListItem,
} from '@/lib/api/procurement';
import {
  getProcurementStatusColor,
  formatDate,
  getStageDefinition,
} from '@/lib/procurement-stages';
import { hasRole } from '@/lib/auth';
import { useInvalidate } from '@/hooks/useQueries';

const BULK_UPDATE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'DOER'];

const STATUS_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'DRAFT' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'On Hold', value: 'ON_HOLD' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-gray-500 bg-gray-100',
  NORMAL: 'text-blue-600 bg-blue-50',
  HIGH: 'text-orange-600 bg-orange-50',
  URGENT: 'text-red-600 bg-red-50',
};

export default function ProcurementPage() {
  const [records, setRecords] = useState<ProcurementListItem[]>([]);
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedRecordsCache, setSelectedRecordsCache] = useState<
    Map<string, ProcurementListItem>
  >(new Map());
  const [selectAllFiltered, setSelectAllFiltered] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [canBulkUpdate, setCanBulkUpdate] = useState(false);
  const { invalidateAll } = useInvalidate();

  useEffect(() => {
    setCanBulkUpdate(BULK_UPDATE_ROLES.some((r) => hasRole(r)));
  }, []);

  const fetchData = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const result = await getProcurements({
          page,
          search,
          status: statusFilter || undefined,
        });
        setRecords(result.data);
        setMeta(result.meta);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  // Clear selection whenever the filtered set changes underneath it
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectedRecordsCache(new Map());
    setSelectAllFiltered(false);
  }, [search, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const pageIds = useMemo(() => records.map((r) => r.id), [records]);
  const allOnPageSelected =
    pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));

  const toggleRecord = (record: ProcurementListItem) => {
    setSelectAllFiltered(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(record.id)) next.delete(record.id);
      else next.add(record.id);
      return next;
    });
    setSelectedRecordsCache((prev) => {
      const next = new Map(prev);
      if (next.has(record.id)) next.delete(record.id);
      else next.set(record.id, record);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelectAllFiltered(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
    setSelectedRecordsCache((prev) => {
      const next = new Map(prev);
      if (allOnPageSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        records.forEach((r) => next.set(r.id, r));
      }
      return next;
    });
  };

  const handleSelectAllFiltered = async () => {
    try {
      const result = await getProcurements({
        page: 1,
        limit: Math.max(meta.total, 1),
        search,
        status: statusFilter || undefined,
      });
      setSelectedIds(new Set(result.data.map((r) => r.id)));
      setSelectedRecordsCache(new Map(result.data.map((r) => [r.id, r])));
      setSelectAllFiltered(true);
    } catch (err) {
      console.error(err);
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
    setSelectedRecordsCache(new Map());
    setSelectAllFiltered(false);
  };

  const handleExportSelected = () => {
    const selected = Array.from(selectedRecordsCache.values());
    const header = [
      'Reference No',
      'Title',
      'Current Stage',
      'Status',
      'Priority',
      'Created',
    ];
    const csvLines = [
      header.join(','),
      ...selected.map((r) =>
        [
          r.referenceNo,
          `"${r.title.replace(/"/g, '""')}"`,
          r.currentStage,
          r.status,
          r.priority,
          r.createdAt,
        ].join(',')
      ),
    ];
    const blob = new Blob([csvLines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `procurement-selected-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkComplete = () => {
    clearSelection();
    fetchData(meta.page);
    invalidateAll();
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      <PageHeader
        title="Procurement"
        description="Manage the complete Purchase FMS lifecycle — from Indent to Payment Advice."
        actions={
          <Link
            href="/indents/new"
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F7B45] text-white hover:bg-[#0A5C34] transition-colors h-11 px-5 text-[14px] font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Indent
          </Link>
        }
      />

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <EnterpriseCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative w-full sm:max-w-md flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by reference, title, vendor..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45] transition-all"
              />
            </div>
            <button
              type="submit"
              className="h-11 px-4 rounded-xl bg-[#0F7B45]/8 border border-[#0F7B45]/20 text-[#0F7B45] text-[13px] font-semibold hover:bg-[#0F7B45]/12 transition-colors"
            >
              Search
            </button>
          </form>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`h-8 px-3 rounded-lg text-[12px] font-semibold transition-colors ${
                  statusFilter === f.value
                    ? 'bg-[#0F7B45] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </EnterpriseCard>

      {/* ── Stats Row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Indents',
            value: meta.total,
            icon: FileText,
            color: 'text-[#0F7B45] bg-[#0F7B45]/8',
          },
          {
            label: 'In Progress',
            value: records.filter((r) => r.status === 'IN_PROGRESS').length,
            icon: Clock,
            color: 'text-blue-600 bg-blue-50',
          },
          {
            label: 'Completed',
            value: records.filter((r) => r.status === 'COMPLETED').length,
            icon: CheckCircle2,
            color: 'text-emerald-600 bg-emerald-50',
          },
          {
            label: 'On Hold',
            value: records.filter((r) => r.status === 'ON_HOLD').length,
            icon: AlertCircle,
            color: 'text-yellow-600 bg-yellow-50',
          },
        ].map((stat) => (
          <EnterpriseCard
            key={stat.label}
            className="flex items-center gap-3 py-4"
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.color}`}
            >
              <stat.icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[22px] font-bold text-gray-900 leading-none">
                {loading ? '—' : stat.value}
              </p>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mt-0.5">
                {stat.label}
              </p>
            </div>
          </EnterpriseCard>
        ))}
      </div>

      {/* ── Select-all-filtered banner ──────────────────────────────────── */}
      {canBulkUpdate &&
        allOnPageSelected &&
        !selectAllFiltered &&
        meta.total > pageIds.length && (
          <div className="-mt-2 flex items-center justify-center">
            <div className="text-[12.5px] text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 flex items-center gap-2">
              All {pageIds.length} records on this page are selected.
              <button
                onClick={handleSelectAllFiltered}
                className="font-semibold underline hover:no-underline"
              >
                Select all {meta.total} filtered records
              </button>
            </div>
          </div>
        )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <EnterpriseCard noPadding className="overflow-x-auto">
        <table className="w-full text-left border-collapse ifh-table ifh-table">
          <thead>
            <tr>
              {canBulkUpdate && (
                <th className="px-4 py-4 bg-gray-50/80 border-b border-gray-200 w-10">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectPage}
                    aria-label="Select all records on this page"
                    className="w-4 h-4 rounded border-gray-300 text-[#0F7B45] focus:ring-[#0F7B45]/30"
                  />
                </th>
              )}
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                Reference
              </th>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                Title
              </th>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                Current Stage
              </th>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-[12px] font-semibold text-gray-500 uppercase tracking-wider text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td
                  colSpan={canBulkUpdate ? 9 : 8}
                  className="px-6 py-16 text-center text-[14px] text-gray-400"
                >
                  Loading procurement records...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={canBulkUpdate ? 9 : 8}>
                  <EmptyState
                    icon={Package}
                    headline="No procurement records found"
                    description="Create a new indent to start the Purchase FMS workflow."
                    action={
                      <Link
                        href="/indents/new"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#0F7B45] text-white hover:bg-[#0A5C34] h-10 px-5 text-[13px] font-semibold"
                      >
                        <Plus className="w-4 h-4" /> New Indent
                      </Link>
                    }
                  />
                </td>
              </tr>
            ) : (
              records.map((record) => {
                const stageDef = getStageDefinition(record.currentStage);
                const progressPct = Math.round(
                  (record.currentStage / 23) * 100
                );
                const priorityClass =
                  PRIORITY_COLORS[record.priority] || PRIORITY_COLORS.NORMAL;
                const isSelected = selectedIds.has(record.id);

                return (
                  <tr
                    key={record.id}
                    className={`group hover:bg-gray-50/50 transition-colors ${isSelected ? 'bg-[#0F7B45]/5' : ''}`}
                  >
                    {canBulkUpdate && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRecord(record)}
                          aria-label={`Select ${record.referenceNo}`}
                          className="w-4 h-4 rounded border-gray-300 text-[#0F7B45] focus:ring-[#0F7B45]/30"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <span className="text-[13px] font-mono font-semibold text-[#0F7B45]">
                        {record.referenceNo}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-[200px]">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">
                        {record.title}
                      </p>
                      {record.requestedBy && (
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          by {record.requestedBy.fullName}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-[12px] font-semibold text-gray-700">
                          Stage {record.currentStage}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5 max-w-[140px] truncate">
                          {stageDef?.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              record.status === 'COMPLETED'
                                ? 'bg-emerald-500'
                                : record.status === 'REJECTED'
                                  ? 'bg-red-400'
                                  : record.status === 'ON_HOLD'
                                    ? 'bg-yellow-400'
                                    : 'bg-blue-500'
                            }`}
                            style={{
                              width: `${record.status === 'COMPLETED' ? 100 : progressPct}%`,
                            }}
                          />
                        </div>
                        <span className="text-[11px] font-semibold text-gray-500 w-8 text-right">
                          {record.status === 'COMPLETED' ? '100' : progressPct}%
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center h-6 px-2.5 rounded-lg text-[11px] font-bold uppercase tracking-wide ${priorityClass}`}
                      >
                        {record.priority}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[12px] text-gray-500">
                        {formatDate(record.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/procurement/${record.id}`}
                        className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-[#0F7B45]/8 text-[#0F7B45] text-[12px] font-semibold hover:bg-[#0F7B45]/15 transition-colors"
                      >
                        Open <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <span className="text-[13px] text-gray-500 font-medium">
              Showing {records.length} of {meta.total} records
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={meta.page <= 1}
                onClick={() => fetchData(meta.page - 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>
              <span className="text-[13px] text-gray-500 font-medium px-2">
                Page {meta.page} of {meta.totalPages}
              </span>
              <button
                disabled={meta.page >= meta.totalPages}
                onClick={() => fetchData(meta.page + 1)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-[13px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </EnterpriseCard>

      {canBulkUpdate && (
        <>
          <BulkActionToolbar
            selectedCount={selectedIds.size}
            onChangeStage={() => setBulkModalOpen(true)}
            onExport={selectedIds.size > 0 ? handleExportSelected : undefined}
            onClear={clearSelection}
          />
          <BulkStageUpdateModal
            isOpen={bulkModalOpen}
            onClose={() => setBulkModalOpen(false)}
            selectedIds={Array.from(selectedIds)}
            onComplete={handleBulkComplete}
          />
        </>
      )}
    </div>
  );
}

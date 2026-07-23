'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { StatusBadge } from '@/components/ui/status-badge';
import { DataTable, Column } from '@/components/procurement/data-table';
import { FilterBar } from '@/components/procurement/filter-bar';
import { KPIStats } from '@/components/procurement/kpi-stats';
import { DetailsModal } from '@/components/procurement/details-modal';
import { getProcurements, type ProcurementListItem } from '@/lib/api/procurement';
import { EmptyState } from '@/components/ui/empty-state';
import { Send, Plus } from 'lucide-react';

export default function RFQPage() {
  const router = useRouter();
  const [records, setRecords] = useState<ProcurementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<ProcurementListItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});

  useEffect(() => {
    getProcurements({ stage: 2, status: 'IN_PROGRESS' })
      .then(res => setRecords(res.data))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    const pending = records.filter((r) => r.status === 'SUBMITTED' || r.status === 'IN_PROGRESS').length;
    const completed = records.filter((r) => r.status === 'COMPLETED').length;
    return { pending, completed, responded: 0, avgTime: 0 };
  }, [records]);

  const filtered = useMemo(() => {
    let results = records;
    if (filters.status) {
      results = results.filter((r) => r.status === filters.status);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      results = results.filter(
        (r) => r.referenceNo.toLowerCase().includes(q) ||
          r.title.toLowerCase().includes(q)
      );
    }
    return results;
  }, [records, filters, searchTerm]);

  const uniqueStatuses = ['SUBMITTED', 'IN_PROGRESS', 'COMPLETED'];

  const filterOptions = [
    {
      label: 'Status',
      key: 'status',
      values: uniqueStatuses.map((s) => ({ label: s.replace(/_/g, ' '), value: s })),
    },
  ];

  const columns: Column[] = [
    { key: 'referenceNo', label: 'Ref No.', sortable: true, width: 'w-24' },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'status', label: 'Status', sortable: true, render: (v) => <StatusBadge status={v} /> },
    { key: 'priority', label: 'Priority', sortable: true },
    { key: 'createdAt', label: 'Created', sortable: true, render: (v) => <span>{new Date(v).toLocaleDateString('en-IN')}</span> },
  ];

  return (
    <div className="page-content">
      <PageHeader
        title="RFQ Float"
        description="Stage 3 - Request for Quotation from vendors"
      />

      <KPIStats
        pending={kpis.pending}
        completed={kpis.completed}
        delayed={kpis.responded}
        averageTime={kpis.avgTime}
      />

      <div className="mb-4">
        <button
          onClick={() => router.push('/rfq-float')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New RFQ Float
        </button>
      </div>

      <FilterBar
        onSearch={setSearchTerm}
        onFilterChange={setFilters}
        filterOptions={filterOptions}
        searchPlaceholder="Search indents..."
      />

      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Send} headline="No Indents Found" description="Indents will appear here once they reach the RFQ Float stage." />
      ) : (
        <DataTable columns={columns} data={filtered} onRowClick={(r) => { setSelectedRecord(r); setIsDetailsOpen(true); }} pageSize={10} />
      )}

      <DetailsModal
        record={selectedRecord}
        isOpen={isDetailsOpen}
        onClose={() => { setIsDetailsOpen(false); setSelectedRecord(null); }}
      />
    </div>
  );
}
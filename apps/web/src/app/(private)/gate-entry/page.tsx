'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { listGateEntries, type GateEntry } from '@/lib/api/gate-entry';

const STATUS_LABELS: Record<string, string> = {
  GATE_ENTRY: 'Awaiting Quantity Check',
  QUANTITY_VERIFIED: 'Awaiting Quality Check',
  QUALITY_VERIFIED: 'Awaiting Allocation',
  ALLOCATED: 'Allocated',
  GRN_GENERATED: 'GRN Generated',
  CANCELLED: 'Cancelled',
};

const STATUS_COLORS: Record<string, string> = {
  GATE_ENTRY: '#D97706',
  QUANTITY_VERIFIED: '#2563EB',
  QUALITY_VERIFIED: '#7C3AED',
  ALLOCATED: '#0891B2',
  GRN_GENERATED: '#059669',
  CANCELLED: '#6B7280',
};

export default function GateEntryQueuePage() {
  const [entries, setEntries] = useState<GateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    setLoading(true);
    listGateEntries({ status: statusFilter || undefined, limit: 50 })
      .then((r) => setEntries(r.data))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  return (
    <div className="page-content">
      <PageHeader
        title="Gate Entry Queue"
        description="Material Receipt & Gate Entry System — all in-progress deliveries"
        actions={
          <Link
            href="/gate-entry/new"
            style={{ padding: '10px 18px', background: 'var(--primary)', color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}
          >
            + New Gate Entry
          </Link>
        }
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['', 'GATE_ENTRY', 'QUANTITY_VERIFIED', 'QUALITY_VERIFIED', 'ALLOCATED', 'GRN_GENERATED'].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: statusFilter === s ? '1px solid var(--primary)' : '1px solid var(--border)',
              background: statusFilter === s ? 'var(--primary)' : 'var(--card)',
              color: statusFilter === s ? '#fff' : 'var(--text-secondary)',
            }}
          >
            {s ? STATUS_LABELS[s] : 'All'}
          </button>
        ))}
      </div>

      <div className="ifh-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="ifh-table">
            <thead>
              <tr>
                <th>Entry No.</th>
                <th>PO Reference</th>
                <th>Vehicle</th>
                <th>Vendor</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
              )}
              {!loading && entries.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No gate entries found</td></tr>
              )}
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/gate-entry/${e.id}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                      {e.entryNumber}
                    </Link>
                  </td>
                  <td>{e.procurement.referenceNo}</td>
                  <td>{e.vehicleNumber}</td>
                  <td>{e.vendorName || '—'}</td>
                  <td>
                    <span style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLORS[e.status] }}>
                      {STATUS_LABELS[e.status] || e.status}
                    </span>
                  </td>
                  <td>{new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/page-header';
import {
  getGateEntryDashboard,
  type GateEntryDashboard,
} from '@/lib/api/gate-entry';

function Tile({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color?: string;
}) {
  return (
    <div className="ifh-card" style={{ padding: 16 }}>
      <div
        style={{
          fontSize: 26,
          fontWeight: 700,
          color: color || 'var(--text-primary)',
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--text-muted)',
          fontWeight: 600,
          marginTop: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </div>
    </div>
  );
}

export default function GateEntryDashboardPage() {
  const [data, setData] = useState<GateEntryDashboard | null>(null);

  useEffect(() => {
    getGateEntryDashboard().then(setData);
  }, []);

  if (!data) {
    return (
      <div
        className="page-content"
        style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}
      >
        Loading…
      </div>
    );
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Gate Entry Dashboard"
        description="Material Receipt pipeline overview"
      />

      <div className="kpi-grid-8" style={{ marginBottom: 24 }}>
        <Tile
          label="Pending Gate Entries"
          value={data.pendingGateEntries}
          color="#D97706"
        />
        <Tile
          label="Pending Quantity Checks"
          value={data.pendingQuantityChecks}
          color="#2563EB"
        />
        <Tile label="Pending QC" value={data.pendingQuality} color="#7C3AED" />
        <Tile label="Pending GRN" value={data.pendingGRN} color="#0891B2" />
        <Tile
          label="Pending Inventory Posting"
          value={data.pendingInventoryPosting}
          color="#EA580C"
        />
        <Tile
          label="Partial Receipts"
          value={data.partialReceipts}
          color="#B45309"
        />
        <Tile
          label="Overdue Receipts"
          value={data.overdueReceipts}
          color="#DC2626"
        />
        <Tile
          label="Rejected Materials"
          value={data.rejectedMaterials}
          color="#DC2626"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="ifh-card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            Vendor-wise Receipts
          </h3>
          <table className="ifh-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th style={{ textAlign: 'right' }}>GRNs</th>
                <th style={{ textAlign: 'right' }}>Accepted Qty</th>
              </tr>
            </thead>
            <tbody>
              {data.vendorWiseReceipts.map((v) => (
                <tr key={v.vendorName}>
                  <td>{v.vendorName}</td>
                  <td style={{ textAlign: 'right' }}>{v.grnCount}</td>
                  <td style={{ textAlign: 'right' }}>{v.totalAcceptedQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="ifh-card" style={{ padding: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
            Project-wise Receipts (Today)
          </h3>
          <table className="ifh-table">
            <thead>
              <tr>
                <th>Project</th>
                <th style={{ textAlign: 'right' }}>Gate Entries</th>
              </tr>
            </thead>
            <tbody>
              {data.projectWiseReceipts.map((p) => (
                <tr key={p.projectName}>
                  <td>{p.projectName}</td>
                  <td style={{ textAlign: 'right' }}>{p.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

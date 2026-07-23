'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import {
  getGateEntry,
  submitQuantityCheck,
  type GateEntry,
} from '@/lib/api/gate-entry';
import { STORAGE_LOCATIONS } from '@/lib/gate-entry-locations';

export default function GateEntryDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [entry, setEntry] = useState<GateEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getGateEntry(id)
      .then(setEntry)
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading)
    return (
      <div
        className="page-content"
        style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}
      >
        Loading…
      </div>
    );
  if (!entry)
    return (
      <div
        className="page-content"
        style={{ padding: 40, textAlign: 'center' }}
      >
        Gate entry not found.
      </div>
    );

  return (
    <div className="page-content">
      <PageHeader
        title={`Gate Entry ${entry.entryNumber}`}
        description={`PO ${entry.procurement.referenceNo} — ${entry.procurement.title}`}
      />

      <div
        className="ifh-card"
        style={{
          padding: 16,
          marginBottom: 20,
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          fontSize: 13,
        }}
      >
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Vehicle</span>
          <div style={{ fontWeight: 600 }}>{entry.vehicleNumber}</div>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Project</span>
          <div style={{ fontWeight: 600 }}>
            {entry.procurement.projectName || '—'}
          </div>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Vendor</span>
          <div style={{ fontWeight: 600 }}>{entry.vendorName || '—'}</div>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Status</span>
          <div style={{ fontWeight: 600 }}>
            {entry.status.replace(/_/g, ' ')}
          </div>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: '12px 16px',
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            borderRadius: 8,
            marginBottom: 20,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      {entry.status === 'GATE_ENTRY' && (
        <QuantityCheckForm
          entry={entry}
          onError={setError}
          onSubmitting={setSubmitting}
          submitting={submitting}
          onDone={load}
        />
      )}
      {(entry.status === 'QUANTITY_VERIFIED' ||
        entry.status === 'ALLOCATED' ||
        entry.status === 'GRN_GENERATED') && (
        <div className="ifh-card" style={{ padding: 24, textAlign: 'center' }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: '#059669',
              marginBottom: 8,
            }}
          >
            GRN Generated{entry.grn ? `: ${entry.grn.grnNumber}` : ''}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
            This gate entry has been fully processed. Accepted material has
            moved to inventory.
          </p>
        </div>
      )}
    </div>
  );
}

interface StepProps {
  entry: GateEntry;
  onError: (e: string | null) => void;
  onSubmitting: (b: boolean) => void;
  submitting: boolean;
  onDone: () => void;
}

// ─── Step 2: Quantity Verification ──────────────────────────────────────────
function QuantityCheckForm({
  entry,
  onError,
  onSubmitting,
  submitting,
  onDone,
}: StepProps) {
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [vendorName, setVendorName] = useState(
    entry.procurement.vendorName || ''
  );
  const [qty, setQty] = useState<Record<string, string>>(
    Object.fromEntries(entry.items.map((i) => [i.id, String(i.declaredQty)]))
  );

  async function handleSubmit() {
    onError(null);
    if (!invoiceNumber.trim() || !invoiceDate || !vendorName.trim()) {
      onError('Invoice number, invoice date, and vendor are mandatory.');
      return;
    }
    onSubmitting(true);
    try {
      await submitQuantityCheck(entry.id, {
        invoiceNumber: invoiceNumber.trim(),
        invoiceDate,
        vendorName: vendorName.trim(),
        items: entry.items.map((i) => ({
          gateEntryItemId: i.id,
          receivedQty: Number(qty[i.id] || 0),
        })),
      });
      onDone();
    } catch (err: any) {
      onError(err.message || 'Quantity check submission failed');
    } finally {
      onSubmitting(false);
    }
  }

  return (
    <div className="ifh-card" style={{ padding: 20 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
        Step 2: Quantity & Invoice Verification
      </h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 16,
          marginBottom: 20,
        }}
      >
        <div>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Invoice Number *
          </label>
          <input
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Invoice Date *
          </label>
          <input
            type="date"
            value={invoiceDate}
            onChange={(e) => setInvoiceDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--text-muted)',
              display: 'block',
              marginBottom: 6,
            }}
          >
            Vendor *
          </label>
          <input
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid var(--border)',
              borderRadius: 8,
            }}
          />
        </div>
      </div>

      <table className="ifh-table" style={{ marginBottom: 20 }}>
        <thead>
          <tr>
            <th>Item</th>
            <th style={{ textAlign: 'right' }}>Declared Qty (at gate)</th>
            <th style={{ textAlign: 'right' }}>Received Qty *</th>
          </tr>
        </thead>
        <tbody>
          {entry.items.map((i) => (
            <tr key={i.id}>
              <td>{i.procurementItem.itemName}</td>
              <td style={{ textAlign: 'right' }}>{i.declaredQty}</td>
              <td style={{ textAlign: 'right' }}>
                <input
                  type="number"
                  min={0}
                  step="0.001"
                  value={qty[i.id]}
                  onChange={(e) =>
                    setQty((prev) => ({ ...prev, [i.id]: e.target.value }))
                  }
                  style={{
                    width: 110,
                    padding: '6px 8px',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    textAlign: 'right',
                  }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: '100%',
          padding: 12,
          background: '#2563EB',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        {submitting ? 'Submitting…' : 'Submit Quantity Check'}
      </button>
    </div>
  );
}

// ─── Step 3: Quality Inspection ─────────────────────────────────────────────

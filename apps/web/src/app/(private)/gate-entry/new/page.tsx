'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import {
  searchPO,
  uploadGateEntryFiles,
  createGateEntry,
  type POSearchResult,
  type UploadedFileRef,
} from '@/lib/api/gate-entry';

export default function NewGateEntryPage() {
  const router = useRouter();
  const [poQuery, setPoQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [poResult, setPoResult] = useState<POSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [vehicleNumber, setVehicleNumber] = useState('');
  const [selectedQty, setSelectedQty] = useState<Record<string, string>>({});
  const [invoiceFiles, setInvoiceFiles] = useState<File[]>([]);
  const [materialFiles, setMaterialFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSearch() {
    if (!poQuery.trim()) return;
    setSearching(true);
    setError(null);
    setPoResult(null);
    try {
      const result = await searchPO(poQuery.trim());
      setPoResult(result);
      const initialQty: Record<string, string> = {};
      result.items.forEach((i) => { initialQty[i.id] = ''; });
      setSelectedQty(initialQty);
    } catch (err: any) {
      setError(err.message || 'PO not found');
    } finally {
      setSearching(false);
    }
  }

  async function handleSubmit() {
    if (!poResult) return;
    setError(null);

    const items = Object.entries(selectedQty)
      .filter(([, qty]) => qty && Number(qty) > 0)
      .map(([procurementItemId, qty]) => ({ procurementItemId, declaredQty: Number(qty) }));

    if (!vehicleNumber.trim()) { setError('Vehicle number is mandatory.'); return; }
    if (items.length === 0) { setError('Select at least one item with a declared quantity.'); return; }
    if (invoiceFiles.length === 0) { setError('Invoice photo(s) are mandatory.'); return; }
    if (materialFiles.length === 0) { setError('Material photo(s) are mandatory.'); return; }

    setSubmitting(true);
    try {
      const [invoicePhotoUrls, materialPhotoUrls] = await Promise.all([
        uploadGateEntryFiles(invoiceFiles),
        uploadGateEntryFiles(materialFiles),
      ]);

      const entry = await createGateEntry({
        procurementId: poResult.procurementId,
        vehicleNumber: vehicleNumber.trim(),
        items,
        invoicePhotoUrls,
        materialPhotoUrls,
      });

      router.push(`/gate-entry/${entry.id}`);
    } catch (err: any) {
      setError(err.message || 'Gate entry submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Gate Entry"
        description="Step 1 — Search PO and log incoming material at the gate"
      />

      <div className="ifh-card" style={{ padding: 20, marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
          PO / Indent Reference Number
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            value={poQuery}
            onChange={(e) => setPoQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="e.g. IND-2026-0123"
            style={{ flex: 1, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }}
          />
          <button
            onClick={handleSearch}
            disabled={searching}
            style={{ padding: '10px 20px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
          >
            {searching ? 'Searching…' : 'Fetch Details'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: 8, marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      )}

      {poResult && (
        <div className="ifh-card" style={{ padding: 20, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20, fontSize: 13 }}>
            <div><span style={{ color: 'var(--text-muted)' }}>PO Reference</span><div style={{ fontWeight: 600 }}>{poResult.referenceNo}</div></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Project</span><div style={{ fontWeight: 600 }}>{poResult.projectName || '—'}</div></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Vendor</span><div style={{ fontWeight: 600 }}>{poResult.vendorName || '—'}</div></div>
            <div><span style={{ color: 'var(--text-muted)' }}>Status</span><div style={{ fontWeight: 600 }}>{poResult.status}</div></div>
          </div>

          {poResult.fullyReceived ? (
            <div style={{ padding: 16, background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, color: '#166534', fontSize: 13 }}>
              This PO has been fully received. No further gate entries are needed.
            </div>
          ) : (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                Select Items Received on This Vehicle
              </h3>
              <div style={{ overflowX: 'auto', marginBottom: 20 }}>
                <table className="ifh-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th style={{ textAlign: 'right' }}>Ordered</th>
                      <th style={{ textAlign: 'right' }}>Received</th>
                      <th style={{ textAlign: 'right' }}>Remaining</th>
                      <th style={{ textAlign: 'right' }}>Declared Qty (This Entry)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poResult.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.itemName} {item.itemCode ? <span style={{ color: 'var(--text-muted)' }}>({item.itemCode})</span> : null}</td>
                        <td style={{ textAlign: 'right' }}>{item.orderedQty}</td>
                        <td style={{ textAlign: 'right' }}>{item.receivedQty}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary)' }}>{item.remainingQty}</td>
                        <td style={{ textAlign: 'right' }}>
                          <input
                            type="number"
                            min={0}
                            max={item.remainingQty}
                            step="0.001"
                            value={selectedQty[item.id] || ''}
                            onChange={(e) => setSelectedQty((prev) => ({ ...prev, [item.id]: e.target.value }))}
                            style={{ width: 110, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 6, textAlign: 'right' }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                    Vehicle Number <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    placeholder="e.g. RJ14AB1234"
                    style={{ width: '100%', maxWidth: 300, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14 }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                      Invoice Photo(s) <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={(e) => setInvoiceFiles(Array.from(e.target.files || []))}
                    />
                    {invoiceFiles.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{invoiceFiles.length} file(s) selected</div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                      Material Photo(s) <span style={{ color: '#DC2626' }}>*</span>
                    </label>
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf"
                      onChange={(e) => setMaterialFiles(Array.from(e.target.files || []))}
                    />
                    {materialFiles.length > 0 && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{materialFiles.length} file(s) selected</div>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                style={{ width: '100%', padding: '12px', background: '#059669', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                {submitting ? 'Submitting…' : 'Submit Gate Entry'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import type { Procurement, ProcurementStage } from '@/lib/api/procurement';
import { submitInspection } from '@/lib/api/inspections';

interface Props {
  procurement: Procurement;
  onUpdate: (updated: Procurement) => void;
  actionLoading: string | null;
  onAction: (action: string, metadata?: any) => Promise<void>;
  remarksText: string;
  setRemarksText: (val: string) => void;
}

// ─── Shared input style ──────────────────────────────────────────────────────
const inp = 'w-full px-3 py-2 rounded-lg border text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45]';
const sel = inp + ' cursor-pointer';
const lbl = 'block text-[11px] font-semibold uppercase tracking-wide mb-1';

// ─── Validation helpers ──────────────────────────────────────────────────────
function validateFields(rules: Array<{ label: string; valid: boolean }>): { ok: boolean; items: Array<{ label: string; valid: boolean }> } {
  return { ok: rules.every(r => r.valid), items: rules };
}

function ValidationSummary({ items }: { items: Array<{ label: string; valid: boolean }> }) {
  const failed = items.filter(i => !i.valid);
  if (failed.length === 0) return null;
  return (
    <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA' }}>
      {failed.map(f => (
        <div key={f.label} style={{ fontSize: 11, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
          <span>🔴</span> {f.label} is required
        </div>
      ))}
    </div>
  );
}

// ─── FMS Timing Row — shown on every stage ───────────────────────────────────
function FMSTiming() {
  const [planned, setPlanned] = useState('');
  const [actual, setActual] = useState('');
  const delay = (() => {
    if (!planned || !actual) return '—';
    const p = new Date(planned).getTime();
    const a = new Date(actual).getTime();
    const d = Math.round((a - p) / 86400000);
    if (isNaN(d)) return '—';
    return d === 0 ? '0 days' : d > 0 ? `+${d} days` : `${d} days`;
  })();
  const delayColor = delay === '—' ? 'var(--text-muted)' : delay.startsWith('+') ? '#DC2626' : delay === '0 days' ? '#059669' : '#059669';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, padding: '12px 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
      <div>
        <label style={{ ...labelStyle }}>Planned Date</label>
        <input type="date" value={planned} onChange={e => setPlanned(e.target.value)} className={inp} style={{ borderColor: 'var(--border)' }} />
      </div>
      <div>
        <label style={{ ...labelStyle }}>Actual Date</label>
        <input type="date" value={actual} onChange={e => setActual(e.target.value)} className={inp} style={{ borderColor: 'var(--border)' }} />
      </div>
      <div>
        <label style={{ ...labelStyle }}>Time Delay</label>
        <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: delayColor, background: 'var(--surface2)', height: 37, display: 'flex', alignItems: 'center' }}>
          {delay}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 4 };

// ─── Responsible Person + Status row ────────────────────────────────────────
function ResponsibleRow({ statusOptions }: { statusOptions?: string[] }) {
  const opts = statusOptions || ['Pending', 'In Progress', 'Completed', 'On Hold'];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
      <div>
        <label style={labelStyle}>Responsible Person</label>
        <select className={sel} style={{ borderColor: 'var(--border)' }}>
          <option value="">Select person</option>
          <option>Rajesh Kumar</option>
          <option>Priya Sharma</option>
          <option>Amit Patel</option>
          <option>Sneha Desai</option>
          <option>Vikram Singh</option>
          <option>Ananya Gupta</option>
        </select>
      </div>
      <div>
        <label style={labelStyle}>Status</label>
        <select className={sel} style={{ borderColor: 'var(--border)' }}>
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      </div>
    </div>
  );
}

// ─── Remarks textarea ────────────────────────────────────────────────────────
function RemarksField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={labelStyle}>Remarks</label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Enter remarks..."
        rows={3}
        className="w-full px-4 py-3 rounded-xl border text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45] resize-none"
        style={{ borderColor: 'var(--border)', background: 'var(--card)' }}
      />
    </div>
  );
}

// ─── Action buttons ──────────────────────────────────────────────────────────
function ActionRow({ actions }: { actions: { label: string; action: string; color: string; disabled?: boolean; loading: string | null; onClick: () => void }[] }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
      {actions.map(a => (
        <button
          key={a.action}
          onClick={a.onClick}
          disabled={!!a.loading || a.disabled}
          style={{
            height: 38, padding: '0 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            background: a.color, color: '#fff', border: 'none',
            cursor: (a.loading || a.disabled) ? 'not-allowed' : 'pointer',
            opacity: (a.loading || a.disabled) ? 0.4 : 1,
          }}
        >
          {a.loading === a.action ? 'Processing...' : a.label}
        </button>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════

export function DynamicStageRenderer({ procurement, onUpdate, actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const stage = procurement.currentStage;
  const p = { procurement, onUpdate, actionLoading, onAction, remarksText, setRemarksText };

  switch (stage) {
    case 1:  return <StageIndentVerification {...p} />;
    case 2:  return <StageStoreAvailability {...p} />;
    case 3:  return <StageRFQFloat {...p} />;
    case 4:  return <StageTechnoCommercial {...p} />;
    case 5:  return <StageNegotiation {...p} />;
    case 6:  return <StagePOCreation {...p} />;
    case 7:
    case 8:  return <StagePOApproval {...p} />;
    case 9:  return <StageVendorAcceptance {...p} />;
    case 10: return <StageVendorFollowUp {...p} />;
    case 11: return <StageMaterialReceipt {...p} />;
    case 12: return <StageInspection level={1} {...p} />;
    case 13: return <StageInspection level={2} {...p} />;
    case 14: return <StageInspection level={3} {...p} />;
    case 15: return <StageDebitNote {...p} />;
    case 16: return <StageBillToAccounts {...p} />;
    case 17: return <StageBillToPurchase {...p} />;
    case 18: return <StageBillCreation {...p} />;
    case 19: return <StageTallyEntry {...p} />;
    case 20:
    case 21: return <StageBillApproval {...p} />;
    case 22: return <StagePaymentAdvice {...p} />;
    default: return <GenericStageView {...p} />;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 1 — INDENT VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════
function StageIndentVerification({ actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const [s1Planned, setS1Planned] = useState('');
  const [s1Actual, setS1Actual] = useState('');
  const s1Delay = (() => {
    if (!s1Planned || !s1Actual) return '—';
    const d = Math.round((new Date(s1Actual).getTime() - new Date(s1Planned).getTime()) / 86400000);
    if (isNaN(d)) return '—';
    return d === 0 ? '0 days' : d > 0 ? `+${d} days` : `${d} days`;
  })();
  const fields = { plannedDate: s1Planned, actualDate: s1Actual, responsible: 'Pramod Kumar', remarks: remarksText };

  const remarksOk = remarksText.trim().length >= 3;
  const validation = validateFields([
    { label: 'Remarks', valid: remarksOk },
    { label: 'Planned Date', valid: s1Planned.trim().length > 0 },
  ]);

  return (
    <div className="space-y-1">
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Responsible Person</label>
        <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--surface2)' }}>Pramod Kumar</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Planned Date</label>
          <input type="date" value={s1Planned} onChange={e => setS1Planned(e.target.value)} className={inp} style={{ borderColor: 'var(--border)' }} />
        </div>
        <div>
          <label style={labelStyle}>Actual Date</label>
          <input type="date" value={s1Actual} onChange={e => setS1Actual(e.target.value)} className={inp} style={{ borderColor: 'var(--border)' }} />
        </div>
        <div>
          <label style={labelStyle}>Time Delay</label>
          <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: s1Delay.startsWith('+') ? '#DC2626' : '#059669', background: 'var(--surface2)', height: 37, display: 'flex', alignItems: 'center' }}>{s1Delay}</div>
        </div>
      </div>
      <RemarksField value={remarksText} onChange={setRemarksText} />
      <ValidationSummary items={validation.items} />
      <ActionRow actions={[
        { label: 'Approve', action: 'APPROVE', color: '#059669', loading: actionLoading, disabled: !validation.ok, onClick: () => onAction('APPROVE', fields) },
        { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
        { label: 'Reject', action: 'REJECT', color: '#DC2626', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('REJECT', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 2 — STORE AVAILABILITY CHECK
// ═══════════════════════════════════════════════════════════════════════════════
function StageStoreAvailability({ procurement, actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const reqQty = procurement.items?.[0]?.quantity ?? 0;
  const [s2CurrentQty, setS2CurrentQty] = useState(0);
  const shortQty = Math.max(0, reqQty - s2CurrentQty);
  const fields = { requiredQty: reqQty, currentQty: s2CurrentQty, shortQty, remarks: remarksText };

  const remarksOk = remarksText.trim().length >= 3;

  return (
    <div className="space-y-1">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Required Qty</label>
          <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', background: 'var(--surface2)', height: 37, display: 'flex', alignItems: 'center' }}>{reqQty}</div>
        </div>
        <div>
          <label style={labelStyle}>Current Qty</label>
          <input type="number" value={s2CurrentQty} onChange={e => setS2CurrentQty(Number(e.target.value))} className={inp} style={{ borderColor: 'var(--border)' }} />
        </div>
        <div>
          <label style={labelStyle}>Short Qty (Auto)</label>
          <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: shortQty > 0 ? '#DC2626' : '#059669', background: 'var(--surface2)', height: 37, display: 'flex', alignItems: 'center' }}>{shortQty}</div>
        </div>
      </div>
      <RemarksField value={remarksText} onChange={setRemarksText} />
      {!remarksOk && (
        <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div style={{ fontSize: 11, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>🔴</span> Remarks is required
          </div>
        </div>
      )}
      <ActionRow actions={[
        { label: 'Stock Available', action: 'AVAILABLE', color: '#059669', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('AVAILABLE', fields) },
        { label: 'Float RFQ', action: 'NOT_AVAILABLE', color: '#0F7B45', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('NOT_AVAILABLE', fields) },
        { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 3 — RFQ FLOAT
// ═══════════════════════════════════════════════════════════════════════════════
function StageRFQFloat({ actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const [s3RfqStatus, setS3RfqStatus] = useState('Not Floated');
  const [s3Planned, setS3Planned] = useState('');
  const [s3Actual, setS3Actual] = useState('');
  const s3Delay = (() => {
    if (!s3Planned || !s3Actual) return '—';
    const d = Math.round((new Date(s3Actual).getTime() - new Date(s3Planned).getTime()) / 86400000);
    if (isNaN(d)) return '—';
    return d === 0 ? '0 days' : d > 0 ? `+${d} days` : `${d} days`;
  })();
  const fields = { rfqStatus: s3RfqStatus, plannedDate: s3Planned, actualDate: s3Actual, remarks: remarksText };

  const remarksOk = remarksText.trim().length >= 3;
  const rfqFloated = s3RfqStatus === 'Floated';
  const validation = validateFields([
    { label: 'RFQ must be Floated before approving', valid: rfqFloated },
    { label: 'Remarks', valid: remarksOk },
  ]);

  return (
    <div className="space-y-1">
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>RFQ Status</label>
        <select value={s3RfqStatus} onChange={e => setS3RfqStatus(e.target.value)} className={sel} style={{ borderColor: rfqFloated ? '#059669' : 'var(--border)' }}>
          <option value="Not Floated">Not Floated</option>
          <option value="Floated">Floated</option>
        </select>
        {!rfqFloated && (
          <p style={{ fontSize: 11, color: '#D97706', marginTop: 4 }}>Set status to Floated after completing RFQ details to enable approval.</p>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Planned Date</label>
          <input type="date" value={s3Planned} onChange={e => setS3Planned(e.target.value)} className={inp} style={{ borderColor: 'var(--border)' }} />
        </div>
        <div>
          <label style={labelStyle}>Actual Date</label>
          <input type="date" value={s3Actual} onChange={e => setS3Actual(e.target.value)} className={inp} style={{ borderColor: 'var(--border)' }} />
        </div>
        <div>
          <label style={labelStyle}>Delay</label>
          <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: s3Delay.startsWith('+') ? '#DC2626' : '#059669', background: 'var(--surface2)', height: 37, display: 'flex', alignItems: 'center' }}>{s3Delay}</div>
        </div>
      </div>
      <RemarksField value={remarksText} onChange={setRemarksText} />
      <ValidationSummary items={validation.items} />
      <ActionRow actions={[
        { label: 'Approve → TCE', action: 'APPROVE', color: '#059669', loading: actionLoading, disabled: !validation.ok, onClick: () => onAction('APPROVE', fields) },
        { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
        { label: 'Reject', action: 'REJECT', color: '#DC2626', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('REJECT', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 4 — TECHNO COMMERCIAL EVALUATION
// ═══════════════════════════════════════════════════════════════════════════════
function StageTechnoCommercial({ procurement, actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const [s4Vendor, setS4Vendor] = useState('');
  const [s4Quotation, setS4Quotation] = useState('');
  const [s4ItemRate, setS4ItemRate] = useState('');
  const [s4DeliveryTerms, setS4DeliveryTerms] = useState('');
  const [s4PaymentTerms, setS4PaymentTerms] = useState('');
  const [s4CompSheet, setS4CompSheet] = useState('');
  const [s4TechRemarks, setS4TechRemarks] = useState('');
  const [s4CommRemarks, setS4CommRemarks] = useState('');
  // Per-item tech/commercial approval: { [itemId]: { tech: bool, comm: bool } }
  const itemIds = procurement.items.map(i => i.id);
  const [s4ItemApprovals, setS4ItemApprovals] = useState<Record<string, { tech: boolean; comm: boolean }>>(
    () => Object.fromEntries(itemIds.map(id => [id, { tech: false, comm: false }]))
  );

  const setItemApproval = (id: string, field: 'tech' | 'comm', val: boolean) =>
    setS4ItemApprovals(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));

  const allItemsApproved = itemIds.length > 0 && itemIds.every(id => s4ItemApprovals[id]?.tech && s4ItemApprovals[id]?.comm);
  const remarksOk = remarksText.trim().length >= 3;

  const validation = validateFields([
    { label: 'Selected Vendor', valid: s4Vendor.trim().length >= 1 },
    { label: 'Vendor Quotation', valid: s4Quotation.trim().length >= 1 },
    { label: 'Item Rate', valid: parseFloat(s4ItemRate) > 0 },
    { label: 'Delivery Terms', valid: s4DeliveryTerms.trim().length >= 1 },
    { label: 'Payment Terms', valid: s4PaymentTerms.trim().length >= 1 },
    { label: 'Technical Remarks', valid: s4TechRemarks.trim().length >= 3 },
    { label: 'Commercial Remarks', valid: s4CommRemarks.trim().length >= 3 },
    { label: 'All items technically approved', valid: allItemsApproved },
    { label: 'All items commercially approved', valid: allItemsApproved },
    { label: 'Remarks', valid: remarksOk },
  ]);

  const fields = {
    vendor: s4Vendor, quotation: s4Quotation, itemRate: s4ItemRate,
    deliveryTerms: s4DeliveryTerms, paymentTerms: s4PaymentTerms,
    comparisonSheet: s4CompSheet, techRemarks: s4TechRemarks, commRemarks: s4CommRemarks,
    itemApprovals: s4ItemApprovals, remarks: remarksText,
  };

  const fld: React.CSSProperties = { marginBottom: 12 };
  const chip = (approved: boolean, onClick: () => void) => (
    <button type="button" onClick={onClick} style={{
      height: 26, padding: '0 10px', borderRadius: 5, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
      background: approved ? '#ECFDF5' : '#FEF2F2', color: approved ? '#059669' : '#DC2626',
    }}>
      {approved ? '🟢 Approved' : '🔴 Pending Review'}
    </button>
  );

  return (
    <div>
      {/* Vendor & Commercial */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, ...fld }}>
        <div>
          <label style={labelStyle}>Selected Vendor *</label>
          <input value={s4Vendor} onChange={e => setS4Vendor(e.target.value)} placeholder="Vendor name" className={inp} style={{ borderColor: s4Vendor ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>Vendor Quotation *</label>
          <input value={s4Quotation} onChange={e => setS4Quotation(e.target.value)} placeholder="Quote ref / number" className={inp} style={{ borderColor: s4Quotation ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>Item Rate (₹) *</label>
          <input type="number" min="0" step="any" value={s4ItemRate} onChange={e => setS4ItemRate(e.target.value)} placeholder="0.00" className={inp} style={{ borderColor: parseFloat(s4ItemRate) > 0 ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>Comparison Sheet</label>
          <input value={s4CompSheet} onChange={e => setS4CompSheet(e.target.value)} placeholder="Ref / link" className={inp} style={{ borderColor: 'var(--border)' }} />
        </div>
        <div>
          <label style={labelStyle}>Delivery Terms *</label>
          <input value={s4DeliveryTerms} onChange={e => setS4DeliveryTerms(e.target.value)} placeholder="e.g. 45 days Ex-Works" className={inp} style={{ borderColor: s4DeliveryTerms ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>Payment Terms *</label>
          <input value={s4PaymentTerms} onChange={e => setS4PaymentTerms(e.target.value)} placeholder="e.g. 30 days credit" className={inp} style={{ borderColor: s4PaymentTerms ? 'var(--border)' : '#FCA5A5' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, ...fld }}>
        <div>
          <label style={labelStyle}>Technical Remarks *</label>
          <textarea value={s4TechRemarks} onChange={e => setS4TechRemarks(e.target.value)} rows={2} placeholder="Technical evaluation summary..." className={inp} style={{ borderColor: s4TechRemarks.length >= 3 ? 'var(--border)' : '#FCA5A5', resize: 'none' }} />
        </div>
        <div>
          <label style={labelStyle}>Commercial Remarks *</label>
          <textarea value={s4CommRemarks} onChange={e => setS4CommRemarks(e.target.value)} rows={2} placeholder="Commercial evaluation summary..." className={inp} style={{ borderColor: s4CommRemarks.length >= 3 ? 'var(--border)' : '#FCA5A5', resize: 'none' }} />
        </div>
      </div>

      {/* Per-item approval grid */}
      {procurement.items.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ ...labelStyle, marginBottom: 8 }}>Item-Level Review *</label>
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <table className="ifh-table" >
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Item', 'Spec / Makes', 'Technical', 'Commercial'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {procurement.items.map((item, idx) => {
                  const appr = s4ItemApprovals[item.id] || { tech: false, comm: false };
                  return (
                    <tr key={item.id} style={{ borderBottom: idx < procurement.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.itemName}
                        {(item as any).itemCode && <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block' }}>{(item as any).itemCode}</span>}
                      </td>
                      <td style={{ padding: '8px 10px', color: 'var(--text-muted)', fontSize: 11, maxWidth: 200 }}>
                        {(item as any).technicalSpec || '—'}
                        {(item as any).approvedMakes && <span style={{ display: 'block', color: '#0F7B45' }}>{(item as any).approvedMakes}</span>}
                      </td>
                      <td style={{ padding: '8px 10px' }}>{chip(appr.tech, () => setItemApproval(item.id, 'tech', !appr.tech))}</td>
                      <td style={{ padding: '8px 10px' }}>{chip(appr.comm, () => setItemApproval(item.id, 'comm', !appr.comm))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!allItemsApproved && (
            <p style={{ fontSize: 11, color: '#DC2626', marginTop: 5 }}>All items must be marked 🟢 Approved (both Technical and Commercial) before approving.</p>
          )}
        </div>
      )}

      <RemarksField value={remarksText} onChange={setRemarksText} />
      <ValidationSummary items={validation.items} />
      <ActionRow actions={[
        { label: 'Approve → Negotiation', action: 'APPROVE', color: '#059669', loading: actionLoading, disabled: !validation.ok, onClick: () => onAction('APPROVE', fields) },
        { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
        { label: 'Reject', action: 'REJECT', color: '#DC2626', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('REJECT', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 5 — NEGOTIATION & DECISION
// ═══════════════════════════════════════════════════════════════════════════════
interface NegotiationItemRow {
  vendor: string;
  quotedPrice: string;
  negotiatedPrice: string;
  finalApprovedPrice: string;
  currency: string;
  discount: string;
  negotiationRemarks: string;
}

function itemNegComplete(r: NegotiationItemRow): boolean {
  return (
    r.vendor.trim().length >= 1 &&
    parseFloat(r.negotiatedPrice) > 0 &&
    parseFloat(r.finalApprovedPrice) > 0 &&
    r.negotiationRemarks.trim().length >= 3
  );
}

function StageNegotiation({ procurement, actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const initRows = (): Record<string, NegotiationItemRow> =>
    Object.fromEntries(procurement.items.map(i => [i.id, {
      vendor: '', quotedPrice: '', negotiatedPrice: '', finalApprovedPrice: '',
      currency: 'INR', discount: '', negotiationRemarks: '',
    }]));
  const [rows, setRows] = useState<Record<string, NegotiationItemRow>>(initRows);

  const setField = (id: string, field: keyof NegotiationItemRow, val: string) =>
    setRows(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));

  const allComplete = procurement.items.length > 0 && procurement.items.every(i => itemNegComplete(rows[i.id] || {} as NegotiationItemRow));
  const remarksOk = remarksText.trim().length >= 3;
  const validation = validateFields([
    { label: 'All items must be completed (vendor, prices, remarks)', valid: allComplete },
    { label: 'Remarks', valid: remarksOk },
  ]);

  const fields = {
    remarks: remarksText,
    itemNegotiations: procurement.items.map(i => ({ itemId: i.id, itemName: i.itemName, ...rows[i.id] })),
  };

  const numInp = inp + ' text-right';
  const th: React.CSSProperties = { padding: '7px 10px', textAlign: 'left' as const, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' as const };
  const td: React.CSSProperties = { padding: '6px 6px', verticalAlign: 'top' };

  return (
    <div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'auto', marginBottom: 14 }}>
        <table className="ifh-table" >
          <thead>
            <tr style={{ background: 'var(--surface2)' }}>
              {['Item', 'Vendor *', 'Quoted Price', 'Negotiated Price *', 'Final Approved Price *', 'Currency', 'Discount %', 'Neg. Remarks *', 'Status'].map(h => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {procurement.items.map((item, idx) => {
              const row = rows[item.id] || {} as NegotiationItemRow;
              const complete = itemNegComplete(row);
              return (
                <tr key={item.id} style={{ borderBottom: idx < procurement.items.length - 1 ? '1px solid var(--border)' : 'none', background: complete ? '#F0FDF4' : undefined }}>
                  <td style={{ ...td, fontWeight: 600, minWidth: 120, color: 'var(--text-primary)' }}>
                    {item.itemName}
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>Qty: {item.quantity} {item.unit || ''}</span>
                  </td>
                  <td style={{ ...td, minWidth: 120 }}>
                    <input value={row.vendor} onChange={e => setField(item.id, 'vendor', e.target.value)} placeholder="Vendor" className={inp} style={{ borderColor: row.vendor ? 'var(--border)' : '#FCA5A5', fontSize: 11 }} />
                  </td>
                  <td style={{ ...td, minWidth: 90 }}>
                    <input type="number" min="0" step="any" value={row.quotedPrice} onChange={e => setField(item.id, 'quotedPrice', e.target.value)} placeholder="0.00" className={numInp} style={{ borderColor: 'var(--border)', fontSize: 11 }} />
                  </td>
                  <td style={{ ...td, minWidth: 100 }}>
                    <input type="number" min="0" step="any" value={row.negotiatedPrice} onChange={e => setField(item.id, 'negotiatedPrice', e.target.value)} placeholder="0.00" className={numInp} style={{ borderColor: parseFloat(row.negotiatedPrice) > 0 ? 'var(--border)' : '#FCA5A5', fontSize: 11 }} />
                  </td>
                  <td style={{ ...td, minWidth: 110 }}>
                    <input type="number" min="0" step="any" value={row.finalApprovedPrice} onChange={e => setField(item.id, 'finalApprovedPrice', e.target.value)} placeholder="0.00" className={numInp} style={{ borderColor: parseFloat(row.finalApprovedPrice) > 0 ? 'var(--border)' : '#FCA5A5', fontSize: 11 }} />
                  </td>
                  <td style={{ ...td, minWidth: 80 }}>
                    <select value={row.currency} onChange={e => setField(item.id, 'currency', e.target.value)} className={sel} style={{ fontSize: 11, borderColor: 'var(--border)' }}>
                      <option>INR</option><option>USD</option><option>EUR</option><option>GBP</option>
                    </select>
                  </td>
                  <td style={{ ...td, minWidth: 70 }}>
                    <input type="number" min="0" max="100" step="any" value={row.discount} onChange={e => setField(item.id, 'discount', e.target.value)} placeholder="0" className={numInp} style={{ borderColor: 'var(--border)', fontSize: 11 }} />
                  </td>
                  <td style={{ ...td, minWidth: 150 }}>
                    <input value={row.negotiationRemarks} onChange={e => setField(item.id, 'negotiationRemarks', e.target.value)} placeholder="Negotiation remarks..." className={inp} style={{ borderColor: row.negotiationRemarks.trim().length >= 3 ? 'var(--border)' : '#FCA5A5', fontSize: 11 }} />
                  </td>
                  <td style={{ ...td, minWidth: 90, textAlign: 'center' as const }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: complete ? '#059669' : '#DC2626' }}>
                      {complete ? '🟢 Complete' : '🔴 Incomplete'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!allComplete && (
        <p style={{ fontSize: 11, color: '#DC2626', marginBottom: 10 }}>All items must be marked 🟢 Complete before approving. Each item needs vendor, negotiated price, final approved price, and negotiation remarks.</p>
      )}
      <RemarksField value={remarksText} onChange={setRemarksText} />
      <ValidationSummary items={validation.items} />
      <ActionRow actions={[
        { label: 'Approve → PO Creation', action: 'APPROVE', color: '#059669', loading: actionLoading, disabled: !validation.ok, onClick: () => onAction('APPROVE', fields) },
        { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
        { label: 'Reject', action: 'REJECT', color: '#DC2626', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('REJECT', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 6 — PO CREATION (Final commercial verification checkpoint)
// ═══════════════════════════════════════════════════════════════════════════════
interface POItemVerification {
  vendorVerified: boolean;
  qtyVerified: boolean;
  specVerified: boolean;
  rateVerified: boolean;
  termsVerified: boolean;
  deliveryTerms: string;
  paymentTerms: string;
  taxDetails: string;
  poRate: string;
  vendorConfirmation: string;
}

function itemPOVerified(v: POItemVerification): boolean {
  return v.vendorVerified && v.qtyVerified && v.specVerified && v.rateVerified && v.termsVerified &&
    v.poRate.trim().length >= 1 && v.deliveryTerms.trim().length >= 1 && v.paymentTerms.trim().length >= 1;
}

function StagePOCreation({ procurement, actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const [s6PoNumber, setS6PoNumber] = useState('');
  const [vendorConfirmation, setVendorConfirmation] = useState('');

  // Pull negotiated item prices from stage 5 metadata (source of truth)
  const negStage = procurement.stages.find(s => s.stageNumber === 5);
  const negMeta: Array<{ itemId: string; itemName: string; vendor: string; finalApprovedPrice: string; negotiatedPrice: string; currency: string; discount: string; negotiationRemarks: string }> =
    (() => { try { return negStage?.metadata ? (JSON.parse(negStage.metadata)?.itemNegotiations || []) : []; } catch { return []; } })();
  const negByItem = Object.fromEntries(negMeta.map(n => [n.itemId, n]));

  const initVerifications = (): Record<string, POItemVerification> =>
    Object.fromEntries(procurement.items.map(i => {
      const neg = negByItem[i.id];
      return [i.id, {
        vendorVerified: false, qtyVerified: false, specVerified: false, rateVerified: false, termsVerified: false,
        deliveryTerms: '', paymentTerms: '', taxDetails: '',
        poRate: neg?.finalApprovedPrice || '',
        vendorConfirmation: '',
      }];
    }));
  const [verifications, setVerifications] = useState<Record<string, POItemVerification>>(initVerifications);

  const setVer = (id: string, field: keyof POItemVerification, val: boolean | string) =>
    setVerifications(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));

  const allVerified = procurement.items.length > 0 && procurement.items.every(i => itemPOVerified(verifications[i.id] || {} as POItemVerification));
  const remarksOk = remarksText.trim().length >= 3;
  const vcOk = vendorConfirmation.trim().length >= 3;

  const validation = validateFields([
    { label: 'PO Number', valid: s6PoNumber.trim().length >= 1 },
    { label: 'Vendor Confirmation Reference', valid: vcOk },
    { label: 'All items verified 🟢', valid: allVerified },
    { label: 'PO Remarks', valid: remarksOk },
  ]);

  const fields = {
    poNumber: s6PoNumber,
    vendorConfirmation,
    remarks: remarksText,
    poItems: procurement.items.map(i => {
      const neg = negByItem[i.id];
      const ver = verifications[i.id];
      return {
        itemId: i.id, itemName: i.itemName, quantity: i.quantity, unit: i.unit,
        vendor: neg?.vendor || '', negotiatedRate: neg?.finalApprovedPrice || '',
        poRate: ver?.poRate || neg?.finalApprovedPrice || '',
        currency: neg?.currency || 'INR', discount: neg?.discount || '',
        deliveryTerms: ver?.deliveryTerms || '', paymentTerms: ver?.paymentTerms || '',
        taxDetails: ver?.taxDetails || '',
        technicalSpec: (i as any).technicalSpec || '', approvedMakes: (i as any).approvedMakes || '',
      };
    }),
    snapshot: { createdAt: new Date().toISOString(), lockedRates: true, lockedQty: true },
  };

  const th: React.CSSProperties = { padding: '7px 8px', textAlign: 'left' as const, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' as const };
  const tdc: React.CSSProperties = { padding: '6px 8px', fontSize: 11, verticalAlign: 'top' };
  const chk = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, userSelect: 'none' as const }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 14, height: 14, accentColor: '#059669' }} />
      <span style={{ color: checked ? '#059669' : '#DC2626', fontWeight: 600 }}>{label}</span>
    </label>
  );

  return (
    <div>
      {/* Header fields */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        <div>
          <label style={labelStyle}>PO Number *</label>
          <input value={s6PoNumber} onChange={e => setS6PoNumber(e.target.value)} placeholder="e.g. PO-2026-0089" className={inp} style={{ borderColor: s6PoNumber ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>Vendor Confirmation Reference *</label>
          <input value={vendorConfirmation} onChange={e => setVendorConfirmation(e.target.value)} placeholder="Email ref / quote acceptance ref" className={inp} style={{ borderColor: vcOk ? 'var(--border)' : '#FCA5A5' }} />
        </div>
      </div>

      {/* Per-item verification table */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ ...labelStyle, marginBottom: 8 }}>Item-wise PO Verification (Final Commercial Checkpoint)</label>
        {negMeta.length === 0 && (
          <div style={{ padding: '10px 14px', borderRadius: 7, background: '#FEF3C7', border: '1px solid #FDE68A', fontSize: 11, color: '#92400E', marginBottom: 8 }}>
            ⚠️ Negotiation stage data not found. Complete and approve stage 5 first.
          </div>
        )}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'auto' }}>
          <table className="ifh-table" >
            <thead>
              <tr style={{ background: 'var(--surface2)' }}>
                {['Item / Spec', 'Vendor', 'Qty / UOM', 'Neg. Rate', 'PO Rate *', 'Delivery Terms *', 'Payment Terms *', 'Tax Details', 'Verifications', 'Status'].map(h => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {procurement.items.map((item, idx) => {
                const neg = negByItem[item.id];
                const ver = verifications[item.id] || {} as POItemVerification;
                const verified = itemPOVerified(ver);
                const negRate = parseFloat(neg?.finalApprovedPrice || '0');
                const poRate = parseFloat(ver.poRate || '0');
                const total = poRate * item.quantity;
                return (
                  <tr key={item.id} style={{ borderBottom: idx < procurement.items.length - 1 ? '1px solid var(--border)' : 'none', background: verified ? '#F0FDF4' : undefined }}>
                    <td style={{ ...tdc, minWidth: 140, fontWeight: 600 }}>
                      {item.itemName}
                      {(item as any).technicalSpec && <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>{(item as any).technicalSpec}</span>}
                      {(item as any).approvedMakes && <span style={{ display: 'block', fontSize: 10, color: '#0F7B45', fontWeight: 400 }}>Makes: {(item as any).approvedMakes}</span>}
                    </td>
                    <td style={{ ...tdc, minWidth: 100 }}>{neg?.vendor || <span style={{ color: '#DC2626' }}>—</span>}</td>
                    <td style={{ ...tdc, minWidth: 80 }}>{item.quantity} {item.unit || ''}</td>
                    <td style={{ ...tdc, minWidth: 90, fontWeight: 700, color: negRate > 0 ? '#059669' : '#DC2626' }}>
                      {negRate > 0 ? `${neg?.currency || 'INR'} ${negRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—'}
                    </td>
                    <td style={{ ...tdc, minWidth: 100 }}>
                      <input type="number" min="0" step="any" value={ver.poRate} onChange={e => setVer(item.id, 'poRate', e.target.value)} placeholder="0.00" className={inp} style={{ fontSize: 11, borderColor: parseFloat(ver.poRate) > 0 ? 'var(--border)' : '#FCA5A5' }} />
                      {poRate > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginTop: 2 }}>Total: {(neg?.currency || 'INR')} {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>}
                    </td>
                    <td style={{ ...tdc, minWidth: 130 }}>
                      <input value={ver.deliveryTerms} onChange={e => setVer(item.id, 'deliveryTerms', e.target.value)} placeholder="e.g. 45 days Ex-Works" className={inp} style={{ fontSize: 11, borderColor: ver.deliveryTerms ? 'var(--border)' : '#FCA5A5' }} />
                    </td>
                    <td style={{ ...tdc, minWidth: 130 }}>
                      <input value={ver.paymentTerms} onChange={e => setVer(item.id, 'paymentTerms', e.target.value)} placeholder="e.g. 30 days credit" className={inp} style={{ fontSize: 11, borderColor: ver.paymentTerms ? 'var(--border)' : '#FCA5A5' }} />
                    </td>
                    <td style={{ ...tdc, minWidth: 110 }}>
                      <input value={ver.taxDetails} onChange={e => setVer(item.id, 'taxDetails', e.target.value)} placeholder="GST 18% / nil" className={inp} style={{ fontSize: 11, borderColor: 'var(--border)' }} />
                    </td>
                    <td style={{ ...tdc, minWidth: 160 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {chk('Vendor ✓', ver.vendorVerified, v => setVer(item.id, 'vendorVerified', v))}
                        {chk('Qty ✓', ver.qtyVerified, v => setVer(item.id, 'qtyVerified', v))}
                        {chk('Spec ✓', ver.specVerified, v => setVer(item.id, 'specVerified', v))}
                        {chk('Rate ✓', ver.rateVerified, v => setVer(item.id, 'rateVerified', v))}
                        {chk('Terms ✓', ver.termsVerified, v => setVer(item.id, 'termsVerified', v))}
                      </div>
                    </td>
                    <td style={{ ...tdc, minWidth: 90, textAlign: 'center' as const }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: verified ? '#059669' : '#DC2626' }}>
                        {verified ? '🟢 Verified' : '🔴 Pending'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!allVerified && (
          <p style={{ fontSize: 11, color: '#DC2626', marginTop: 6 }}>All items must be 🟢 Verified — tick all 5 checkboxes and fill PO Rate, Delivery Terms, Payment Terms for each item.</p>
        )}
      </div>

      <RemarksField value={remarksText} onChange={setRemarksText} />
      <ValidationSummary items={validation.items} />
      <ActionRow actions={[
        { label: 'Create PO → PO Approval L1', action: 'SUBMIT', color: '#0F7B45', loading: actionLoading, disabled: !validation.ok, onClick: () => onAction('SUBMIT', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 7 & 8 — PO APPROVALS (Full procurement journey review)
// ═══════════════════════════════════════════════════════════════════════════════
function POReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 10 }}>
      <button type="button" onClick={() => setOpen(o => !o)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 14px', background: 'var(--surface2)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {title} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '12px 14px', fontSize: 12 }}>{children}</div>}
    </div>
  );
}

function KV({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}: </span>
      <span style={{ fontSize: 12, color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: value ? 'normal' : 'italic' }}>{value || '—'}</span>
    </div>
  );
}

function StagePOApproval({ procurement, actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const level = procurement.currentStage === 7 ? 'L1' : 'L2';
  const responsible = procurement.currentStage === 7 ? 'Pramod Kumar' : 'Ankur Gupta';
  const remarksOk = remarksText.trim().length >= 3;

  // Parse stage metadata helpers
  const parseMeta = (stageNum: number) => {
    try {
      const s = procurement.stages.find(st => st.stageNumber === stageNum);
      return s?.metadata ? JSON.parse(s.metadata) : null;
    } catch { return null; }
  };

  const meta1 = parseMeta(1);  // Indent verification
  const meta2 = parseMeta(2);  // Store check
  const meta3 = parseMeta(3);  // RFQ Float
  const meta4 = parseMeta(4);  // TCO
  const meta5 = parseMeta(5);  // Negotiation
  const meta6 = parseMeta(6);  // PO Creation

  const stage = (n: number) => procurement.stages.find(s => s.stageNumber === n);
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const tat = (s?: ProcurementStage | null) => {
    if (!s?.startedAt) return '—';
    const end = s.completedAt ? new Date(s.completedAt) : new Date();
    const days = Math.round((end.getTime() - new Date(s.startedAt).getTime()) / 86400000);
    return `${days} day${days === 1 ? '' : 's'}`;
  };

  const negItems: Array<{ itemId: string; itemName: string; vendor: string; quotedPrice: string; negotiatedPrice: string; finalApprovedPrice: string; currency: string; discount: string; negotiationRemarks: string }> = meta5?.itemNegotiations || [];
  const poItems: Array<{ itemId: string; itemName: string; quantity: number; unit: string; vendor: string; poRate: string; currency: string; deliveryTerms: string; paymentTerms: string; taxDetails: string; technicalSpec: string; approvedMakes: string }> = meta6?.poItems || [];
  const totalPOValue = poItems.reduce((sum, i) => sum + (parseFloat(i.poRate || '0') * (i.quantity || 0)), 0);
  const poCurrency = poItems[0]?.currency || 'INR';

  
  

  const fields = { level, responsible, remarks: remarksText };

  return (
    <div>
      {/* Approver badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: level === 'L1' ? '#EFF6FF' : '#F0FDF4', border: `1px solid ${level === 'L1' ? '#BFDBFE' : '#A7F3D0'}` }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: level === 'L1' ? '#3B82F6' : '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>{level}</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>PO Approval — {level === 'L1' ? 'Level 1' : 'Level 2'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Approver: {responsible}</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-muted)' }}>Ref: <strong>{procurement.referenceNo}</strong></div>
      </div>

      {/* ── 1. Indent Details ── */}
      <POReviewSection title="1. Indent Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
          <KV label="Indent No" value={procurement.referenceNo} />
          <KV label="Title" value={procurement.title} />
          <KV label="Requestor" value={procurement.requestedBy?.fullName} />
          <KV label="Priority" value={procurement.priority} />
          <KV label="Status" value={procurement.status} />
          <KV label="Created" value={fmtDate(procurement.createdAt)} />
        </div>
        {procurement.items.length > 0 && (
          <table className="ifh-table" >
            <thead><tr style={{ background: 'var(--surface2)' }}>
              {['Item', 'Qty', 'UOM', 'Tech Spec', 'Approved Makes'].map(h => <th key={h} >{h}</th>)}
            </tr></thead>
            <tbody>{procurement.items.map(i => (
              <tr key={i.id}>
                <td >{i.itemName}{i.itemCode ? <span style={{ color: 'var(--text-muted)', fontSize: 10, display: 'block' }}>{i.itemCode}</span> : null}</td>
                <td >{i.quantity}</td>
                <td >{i.unit || '—'}</td>
                <td >{(i as any).technicalSpec || '—'}</td>
                <td >{(i as any).approvedMakes || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {meta1?.checklist && (
          <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'var(--surface2)', fontSize: 11 }}>
            <strong>Verification Checklist:</strong> {Object.entries(meta1.checklist).filter(([, v]) => v).map(([k]) => k.replace(/([A-Z])/g, ' $1').trim()).join(' • ') || '—'}
          </div>
        )}
        {stage(1)?.remarks && <KV label="Verification Remarks" value={stage(1)?.remarks} />}
      </POReviewSection>

      {/* ── 2. Store Check ── */}
      <POReviewSection title="2. Store Check">
        {meta2?.itemChecks?.length > 0 ? (
          <table className="ifh-table" >
            <thead><tr style={{ background: 'var(--surface2)' }}>
              {['Item', 'Required', 'Available', 'Short Qty', 'Decision', 'Updated Spec', 'Approved Makes'].map(h => <th key={h} >{h}</th>)}
            </tr></thead>
            <tbody>{meta2.itemChecks.map((c: any) => (
              <tr key={c.itemId}>
                <td >{c.itemName}</td>
                <td >{c.requiredQty} {c.unit}</td>
                <td >{c.availableQty}</td>
                <td >{c.shortQty}</td>
                <td >{c.decision?.replace(/_/g, ' ')}</td>
                <td >{c.technicalSpec || '—'}</td>
                <td >{c.approvedMakes || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No store check data recorded.</span>}
        <KV label="Summary Decision" value={meta2?.summaryDecision?.replace(/_/g, ' ')} />
        {stage(2)?.remarks && <KV label="Store Remarks" value={stage(2)?.remarks} />}
      </POReviewSection>

      {/* ── 3. RFQ ── */}
      <POReviewSection title="3. RFQ Float">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
          <KV label="RFQ Status" value={meta3?.rfqStatus} />
          <KV label="Planned Date" value={meta3?.plannedDate} />
          <KV label="Actual Date" value={meta3?.actualDate} />
        </div>
        {stage(3)?.remarks && <KV label="RFQ Remarks" value={stage(3)?.remarks} />}
      </POReviewSection>

      {/* ── 4. Techno Commercial Evaluation ── */}
      <POReviewSection title="4. Techno-Commercial Evaluation">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <KV label="Selected Vendor" value={meta4?.vendor} />
          <KV label="Vendor Quotation" value={meta4?.quotation} />
          <KV label="Item Rate" value={meta4?.itemRate} />
          <KV label="Comparison Sheet" value={meta4?.comparisonSheet} />
          <KV label="Delivery Terms" value={meta4?.deliveryTerms} />
          <KV label="Payment Terms" value={meta4?.paymentTerms} />
        </div>
        {meta4?.techRemarks && <KV label="Technical Remarks" value={meta4.techRemarks} />}
        {meta4?.commRemarks && <KV label="Commercial Remarks" value={meta4.commRemarks} />}
        {meta4?.itemApprovals && (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Item Approvals:</div>
            {procurement.items.map(i => {
              const a = meta4.itemApprovals?.[i.id];
              return (
                <div key={i.id} style={{ fontSize: 11, marginBottom: 2 }}>
                  {i.itemName}: Tech {a?.tech ? '🟢' : '🔴'} · Comm {a?.comm ? '🟢' : '🔴'}
                </div>
              );
            })}
          </div>
        )}
        {stage(4)?.remarks && <KV label="TCO Remarks" value={stage(4)?.remarks} />}
      </POReviewSection>

      {/* ── 5. Negotiation ── */}
      <POReviewSection title="5. Negotiation & Decision">
        {negItems.length > 0 ? (
          <table className="ifh-table" >
            <thead><tr style={{ background: 'var(--surface2)' }}>
              {['Item', 'Vendor', 'Quoted Price', 'Negotiated Price', 'Final Approved Price', 'Currency', 'Discount %', 'Remarks'].map(h => <th key={h} >{h}</th>)}
            </tr></thead>
            <tbody>{negItems.map(n => (
              <tr key={n.itemId}>
                <td >{n.itemName}</td>
                <td >{n.vendor}</td>
                <td >{n.quotedPrice || '—'}</td>
                <td >{n.negotiatedPrice}</td>
                <td >{n.finalApprovedPrice}</td>
                <td >{n.currency}</td>
                <td >{n.discount || '0'}</td>
                <td >{n.negotiationRemarks}</td>
              </tr>
            ))}</tbody>
          </table>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No negotiation data recorded.</span>}
        {stage(5)?.remarks && <KV label="Negotiation Remarks" value={stage(5)?.remarks} />}
      </POReviewSection>

      {/* ── 6. PO Creation ── */}
      <POReviewSection title="6. PO Creation Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
          <KV label="PO Number" value={meta6?.poNumber} />
          <KV label="Vendor Confirmation" value={meta6?.vendorConfirmation} />
          <KV label="Total PO Value" value={totalPOValue > 0 ? `${poCurrency} ${totalPOValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : undefined} />
        </div>
        {poItems.length > 0 && (
          <table className="ifh-table" >
            <thead><tr style={{ background: 'var(--surface2)' }}>
              {['Item', 'Vendor', 'Qty', 'UOM', 'PO Rate', 'Total', 'Delivery', 'Payment', 'Tax'].map(h => <th key={h} >{h}</th>)}
            </tr></thead>
            <tbody>{poItems.map(i => {
              const total = parseFloat(i.poRate || '0') * (i.quantity || 0);
              return (
                <tr key={i.itemId}>
                  <td >{i.itemName}</td>
                  <td >{i.vendor}</td>
                  <td >{i.quantity}</td>
                  <td >{i.unit}</td>
                  <td >{i.currency} {parseFloat(i.poRate || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td >{i.currency} {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td >{i.deliveryTerms || '—'}</td>
                  <td >{i.paymentTerms || '—'}</td>
                  <td >{i.taxDetails || '—'}</td>
                </tr>
              );
            })}</tbody>
          </table>
        )}
        {stage(6)?.remarks && <KV label="PO Remarks" value={stage(6)?.remarks} />}
      </POReviewSection>

      {/* ── Workflow Timeline ── */}
      <POReviewSection title="Workflow Timeline & TAT">
        <table className="ifh-table" >
          <thead><tr style={{ background: 'var(--surface2)' }}>
            {['Stage', 'Status', 'Started', 'Completed', 'TAT', 'Action Taken'].map(h => <th key={h} >{h}</th>)}
          </tr></thead>
          <tbody>
            {procurement.stages
              .filter(s => s.stageNumber <= procurement.currentStage)
              .map(s => (
                <tr key={s.id}>
                  <td ><strong>{s.stageNumber}.</strong> {s.stageName}</td>
                  <td ><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 4, background: s.status === 'COMPLETED' ? '#D1FAE5' : s.status === 'IN_PROGRESS' ? '#DBEAFE' : '#F3F4F6', color: s.status === 'COMPLETED' ? '#065F46' : s.status === 'IN_PROGRESS' ? '#1E40AF' : '#374151', fontWeight: 600 }}>{s.status}</span></td>
                  <td >{fmtDate(s.startedAt)}</td>
                  <td >{fmtDate(s.completedAt)}</td>
                  <td >{tat(s)}</td>
                  <td >{s.actionTaken || '—'}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </POReviewSection>

      {/* ── Attachments ── */}
      {procurement.attachments?.length > 0 && (
        <POReviewSection title="Attachments">
          {procurement.attachments.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 11 }}>
              <span style={{ color: '#0F7B45' }}>📎</span>
              <a href={a.fileUrl} target="_blank" rel="noreferrer" style={{ color: '#1D4ED8', textDecoration: 'underline' }}>{a.fileName}</a>
              <span style={{ color: 'var(--text-muted)' }}>— {a.uploadedBy?.fullName} · {fmtDate(a.createdAt)}</span>
            </div>
          ))}
        </POReviewSection>
      )}

      {/* ── Approval Action ── */}
      <div style={{ padding: '14px', border: '2px solid var(--border)', borderRadius: 8, background: 'var(--surface2)', marginTop: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>Approval Decision — {level === 'L1' ? 'Level 1' : 'Level 2'}</div>
        <RemarksField value={remarksText} onChange={setRemarksText} />
        {!remarksOk && (
          <div style={{ marginTop: 6, padding: '7px 10px', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 11, color: '#DC2626' }}>
            🔴 Approval Remarks are mandatory before approving, holding, or rejecting.
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <ActionRow actions={[
            { label: `Approve (${level}) →`, action: 'APPROVE', color: '#059669', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('APPROVE', fields) },
            { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
            { label: 'Reject', action: 'REJECT', color: '#DC2626', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('REJECT', fields) },
          ]} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 9 — VENDOR ACCEPTANCE
// ═══════════════════════════════════════════════════════════════════════════════
function StageVendorAcceptance({ actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const fields = { responsible: 'Neetu Singh', remarks: remarksText };

  const remarksOk = remarksText.trim().length >= 3;

  return (
    <div className="space-y-1">
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Responsible Person</label>
        <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--surface2)' }}>Neetu Singh</div>
      </div>
      <RemarksField value={remarksText} onChange={setRemarksText} />
      {!remarksOk && (
        <div style={{ marginBottom: 10, padding: '8px 12px', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA' }}>
          <div style={{ fontSize: 11, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span>🔴</span> Remarks is required
          </div>
        </div>
      )}
      <ActionRow actions={[
        { label: 'Accept', action: 'APPROVE', color: '#059669', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('APPROVE', fields) },
        { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
        { label: 'Reject', action: 'REJECT', color: '#DC2626', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('REJECT', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 10 — VENDOR FOLLOW UP
// ═══════════════════════════════════════════════════════════════════════════════
function StageVendorFollowUp({ actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const [s10VendorAgreed, setS10VendorAgreed] = useState('');
  const [s10ExpectedDelivery, setS10ExpectedDelivery] = useState('');
  const [s10VendorName, setS10VendorName] = useState('');
  const fields = { vendorAgreedDate: s10VendorAgreed, expectedDeliveryDate: s10ExpectedDelivery, vendorName: s10VendorName, crmRemarks: remarksText };

  const validation = validateFields([
    { label: 'Vendor Agreed Date', valid: s10VendorAgreed.trim().length > 0 },
    { label: 'Expected Delivery Date', valid: s10ExpectedDelivery.trim().length > 0 },
    { label: 'CRM Remarks', valid: remarksText.trim().length >= 3 },
  ]);

  return (
    <div className="space-y-1">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Vendor Agreed Date</label>
          <input type="date" value={s10VendorAgreed} onChange={e => setS10VendorAgreed(e.target.value)} className={inp} style={{ borderColor: 'var(--border)' }} />
        </div>
        <div>
          <label style={labelStyle}>Expected Delivery Date</label>
          <input type="date" value={s10ExpectedDelivery} onChange={e => setS10ExpectedDelivery(e.target.value)} className={inp} style={{ borderColor: 'var(--border)' }} />
        </div>
        <div>
          <label style={labelStyle}>Vendor Name</label>
          <input type="text" value={s10VendorName} onChange={e => setS10VendorName(e.target.value)} placeholder="Vendor name" className={inp} style={{ borderColor: 'var(--border)' }} />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>CRM Remarks</label>
        <textarea value={remarksText} onChange={e => setRemarksText(e.target.value)} placeholder="Follow-up notes, vendor commitments..." rows={3} className="w-full px-4 py-3 rounded-xl border text-[13px] resize-none focus:outline-none" style={{ borderColor: 'var(--border)', background: 'var(--card)', color: 'var(--text-primary)' }} />
      </div>
      <ValidationSummary items={validation.items} />
      <ActionRow actions={[
        { label: 'Submit Follow Up', action: 'SUBMIT', color: '#0F7B45', loading: actionLoading, disabled: !validation.ok, onClick: () => onAction('SUBMIT', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 11 — MATERIAL RECEIPT (GRN — item-wise)
// ═══════════════════════════════════════════════════════════════════════════════
interface GRNItemRow {
  receivedQty: string;
  receiptDate: string;
  gateEntryNo: string;
  grnNo: string;
  batchLotNo: string;
  placeOfReceiving: string;
  receiverName: string;
  itemRemarks: string;
  vendorName: string;
  poNumber: string;
}

function grnItemStatus(orderedQty: number, receivedQty: number): 'NOT_RECEIVED' | 'PARTIALLY_RECEIVED' | 'FULLY_RECEIVED' {
  if (receivedQty <= 0) return 'NOT_RECEIVED';
  if (receivedQty < orderedQty) return 'PARTIALLY_RECEIVED';
  return 'FULLY_RECEIVED';
}

function grnItemValid(row: GRNItemRow): boolean {
  return (
    parseFloat(row.receivedQty) > 0 &&
    row.receiptDate.trim().length > 0 &&
    row.gateEntryNo.trim().length >= 1 &&
    row.receiverName.trim().length >= 1 &&
    row.itemRemarks.trim().length >= 3
  );
}

function StageMaterialReceipt({ procurement, actionLoading, onAction, remarksText, setRemarksText }: Props) {
  // Pull PO details from stage 6 metadata
  const parseMeta = (n: number) => { try { const s = procurement.stages.find(st => st.stageNumber === n); return s?.metadata ? JSON.parse(s.metadata) : null; } catch { return null; } };
  const meta6 = parseMeta(6);
  const poItems: Array<{ itemId: string; vendor: string; poRate: string; currency: string }> = meta6?.poItems || [];
  const poByItem = Object.fromEntries(poItems.map(p => [p.itemId, p]));
  const poNumber = meta6?.poNumber || '';

  const initRows = (): Record<string, GRNItemRow> =>
    Object.fromEntries(procurement.items.map(i => {
      const po = poByItem[i.id];
      return [i.id, { receivedQty: '', receiptDate: '', gateEntryNo: '', grnNo: '', batchLotNo: '', placeOfReceiving: '', receiverName: '', itemRemarks: '', vendorName: po?.vendor || '', poNumber }];
    }));
  const [rows, setRows] = useState<Record<string, GRNItemRow>>(initRows);

  const setField = (id: string, field: keyof GRNItemRow, val: string) =>
    setRows(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));

  const allFullyReceived = procurement.items.length > 0 && procurement.items.every(i => {
    const r = rows[i.id];
    return grnItemStatus(i.quantity, parseFloat(r?.receivedQty || '0')) === 'FULLY_RECEIVED';
  });
  const allValidated = procurement.items.length > 0 && procurement.items.every(i => grnItemValid(rows[i.id] || {} as GRNItemRow));
  const remarksOk = remarksText.trim().length >= 3;

  const validation = validateFields([
    { label: 'All items have receipt details completed', valid: allValidated },
    { label: 'All items fully received', valid: allFullyReceived },
    { label: 'Remarks', valid: remarksOk },
  ]);

  const receiptItems = procurement.items.map(i => {
    const r = rows[i.id] || {} as GRNItemRow;
    const receivedQty = parseFloat(r.receivedQty || '0');
    const pendingQty = Math.max(0, i.quantity - receivedQty);
    const po = poByItem[i.id];
    const deliveryDate = r.receiptDate;
    const poStage = procurement.stages.find(s => s.stageNumber === 9); // vendor acceptance
    const expectedDate = (parseMeta(10) as any)?.expectedDeliveryDate || '';
    let deliveryDelayDays: number | null = null;
    if (expectedDate && deliveryDate) {
      deliveryDelayDays = Math.round((new Date(deliveryDate).getTime() - new Date(expectedDate).getTime()) / 86400000);
    }
    return { itemId: i.id, itemName: i.itemName, orderedQty: i.quantity, unit: i.unit, receivedQty, pendingQty, status: grnItemStatus(i.quantity, receivedQty), vendor: r.vendorName, poNumber: r.poNumber, receiptDate: r.receiptDate, gateEntryNo: r.gateEntryNo, grnNo: r.grnNo, batchLotNo: r.batchLotNo, placeOfReceiving: r.placeOfReceiving, receiverName: r.receiverName, itemRemarks: r.itemRemarks, poRate: po?.poRate, currency: po?.currency, deliveryDelayDays };
  });

  const fields = { remarks: remarksText, receiptItems, grnCreatedAt: new Date().toISOString() };

  const th: React.CSSProperties = { padding: '7px 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', textAlign: 'left', whiteSpace: 'nowrap' };
  const tdc: React.CSSProperties = { padding: '5px 6px', fontSize: 11, verticalAlign: 'top' };

  const statusBadge = (s: ReturnType<typeof grnItemStatus>) => {
    const map = { FULLY_RECEIVED: { icon: '🟢', label: 'Fully Received', color: '#059669' }, PARTIALLY_RECEIVED: { icon: '🟡', label: 'Partially Received', color: '#D97706' }, NOT_RECEIVED: { icon: '🔴', label: 'Not Received', color: '#DC2626' } };
    const m = map[s];
    return <span style={{ fontSize: 11, fontWeight: 700, color: m.color, whiteSpace: 'nowrap' }}>{m.icon} {m.label}</span>;
  };

  return (
    <div>
      {/* Summary table */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ ...labelStyle, marginBottom: 8 }}>Item-wise Receipt Summary</label>
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
          <table className="ifh-table" >
            <thead><tr style={{ background: 'var(--surface2)' }}>
              {['Item', 'Ordered Qty', 'Received Qty', 'Pending Qty', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}
            </tr></thead>
            <tbody>{procurement.items.map((item, idx) => {
              const r = rows[item.id] || {} as GRNItemRow;
              const recv = parseFloat(r.receivedQty || '0');
              const pend = Math.max(0, item.quantity - recv);
              const st = grnItemStatus(item.quantity, recv);
              return (
                <tr key={item.id} style={{ borderBottom: idx < procurement.items.length - 1 ? '1px solid var(--border)' : 'none', background: st === 'FULLY_RECEIVED' ? '#F0FDF4' : st === 'PARTIALLY_RECEIVED' ? '#FFFBEB' : undefined }}>
                  <td style={{ ...tdc, fontWeight: 600 }}>{item.itemName}<span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)' }}>{item.unit}</span></td>
                  <td style={{ ...tdc, textAlign: 'right' as const }}>{item.quantity}</td>
                  <td style={{ ...tdc, textAlign: 'right' as const, color: recv > 0 ? '#059669' : '#DC2626', fontWeight: 700 }}>{recv || '—'}</td>
                  <td style={{ ...tdc, textAlign: 'right' as const, color: pend > 0 ? '#D97706' : '#059669', fontWeight: 700 }}>{pend}</td>
                  <td style={tdc}>{statusBadge(st)}</td>
                </tr>
              );
            })}</tbody>
          </table>
        </div>

        {/* Per-item detailed receipt form */}
        {procurement.items.map((item, idx) => {
          const r = rows[item.id] || {} as GRNItemRow;
          const recv = parseFloat(r.receivedQty || '0');
          const pend = Math.max(0, item.quantity - recv);
          const st = grnItemStatus(item.quantity, recv);
          const valid = grnItemValid(r);
          return (
            <div key={item.id} style={{ border: `1px solid ${valid ? '#A7F3D0' : 'var(--border)'}`, borderRadius: 8, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: st === 'FULLY_RECEIVED' ? '#F0FDF4' : st === 'PARTIALLY_RECEIVED' ? '#FFFBEB' : 'var(--surface2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontWeight: 700, fontSize: 12 }}>{item.itemName} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 11 }}>— Ordered: {item.quantity} {item.unit}</span></div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11 }}>
                  {statusBadge(st)}
                  <span style={{ color: valid ? '#059669' : '#DC2626', fontWeight: 600 }}>{valid ? '✅ Details Complete' : '⚠️ Incomplete'}</span>
                </div>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={labelStyle}>Vendor Name</label>
                    <input value={r.vendorName} onChange={e => setField(item.id, 'vendorName', e.target.value)} placeholder="Vendor" className={inp} style={{ fontSize: 11, borderColor: 'var(--border)' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>PO Number</label>
                    <input value={r.poNumber} onChange={e => setField(item.id, 'poNumber', e.target.value)} placeholder="PO-2026-XXXX" className={inp} style={{ fontSize: 11, borderColor: 'var(--border)' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Received Qty *</label>
                    <input type="number" min="0" step="any" value={r.receivedQty} onChange={e => setField(item.id, 'receivedQty', e.target.value)} placeholder={`Max: ${item.quantity}`} className={inp} style={{ fontSize: 11, borderColor: parseFloat(r.receivedQty) > 0 ? 'var(--border)' : '#FCA5A5' }} />
                    {pend > 0 && recv > 0 && <span style={{ fontSize: 10, color: '#D97706', display: 'block', marginTop: 2 }}>Pending: {pend} {item.unit}</span>}
                  </div>
                  <div>
                    <label style={labelStyle}>Receipt Date *</label>
                    <input type="date" value={r.receiptDate} onChange={e => setField(item.id, 'receiptDate', e.target.value)} className={inp} style={{ fontSize: 11, borderColor: r.receiptDate ? 'var(--border)' : '#FCA5A5' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Gate Entry No *</label>
                    <input value={r.gateEntryNo} onChange={e => setField(item.id, 'gateEntryNo', e.target.value)} placeholder="GE-XXXX" className={inp} style={{ fontSize: 11, borderColor: r.gateEntryNo ? 'var(--border)' : '#FCA5A5' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>GRN Number</label>
                    <input value={r.grnNo} onChange={e => setField(item.id, 'grnNo', e.target.value)} placeholder="GRN-XXXX" className={inp} style={{ fontSize: 11, borderColor: 'var(--border)' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Batch / Lot No</label>
                    <input value={r.batchLotNo} onChange={e => setField(item.id, 'batchLotNo', e.target.value)} placeholder="Optional" className={inp} style={{ fontSize: 11, borderColor: 'var(--border)' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Place of Receiving</label>
                    <input value={r.placeOfReceiving} onChange={e => setField(item.id, 'placeOfReceiving', e.target.value)} placeholder="Site / warehouse" className={inp} style={{ fontSize: 11, borderColor: 'var(--border)' }} />
                  </div>
                  <div>
                    <label style={labelStyle}>Receiver Name *</label>
                    <input value={r.receiverName} onChange={e => setField(item.id, 'receiverName', e.target.value)} placeholder="Name of receiver" className={inp} style={{ fontSize: 11, borderColor: r.receiverName ? 'var(--border)' : '#FCA5A5' }} />
                  </div>
                  <div style={{ gridColumn: 'span 3' }}>
                    <label style={labelStyle}>Receipt Remarks *</label>
                    <input value={r.itemRemarks} onChange={e => setField(item.id, 'itemRemarks', e.target.value)} placeholder="Condition, observations, discrepancies..." className={inp} style={{ fontSize: 11, borderColor: r.itemRemarks.trim().length >= 3 ? 'var(--border)' : '#FCA5A5' }} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!allFullyReceived && (
        <div style={{ padding: '9px 12px', borderRadius: 7, background: '#FFFBEB', border: '1px solid #FDE68A', fontSize: 11, color: '#92400E', marginBottom: 10 }}>
          ⚠️ Partial receipts are recorded. All items must be 🟢 Fully Received before moving to Material Inspection. Partially received items remain open for follow-up.
        </div>
      )}

      <RemarksField value={remarksText} onChange={setRemarksText} />
      <ValidationSummary items={validation.items} />
      <ActionRow actions={[
        { label: 'Confirm Receipt → Inspection', action: 'SUBMIT', color: '#059669', loading: actionLoading, disabled: !validation.ok, onClick: () => onAction('SUBMIT', fields) },
        { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 12, 13, 14 — INSPECTION
// ═══════════════════════════════════════════════════════════════════════════════
function StageInspection({ level, procurement, onUpdate }: Props & { level: 1 | 2 | 3 }) {
  const [itemsStatus, setItemsStatus] = useState<Record<string, { status: 'APPROVED' | 'REJECTED'; remarks: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pendingItems = procurement.items.filter((i: any) => i.finalInspectionResult !== 'APPROVED' && !i.debitNoteGenerated && Number(i.quantity) > 0);

  const handleStatusChange = (itemId: string, status: 'APPROVED' | 'REJECTED') => {
    setItemsStatus(prev => ({ ...prev, [itemId]: { ...prev[itemId], status } }));
  };

  const handleRemarksChange = (itemId: string, remarks: string) => {
    setItemsStatus(prev => ({ ...prev, [itemId]: { ...prev[itemId], remarks } }));
  };

  const handleSubmit = async () => {
    if (pendingItems.length !== Object.keys(itemsStatus).length) {
      setError('Please select Approved or Rejected for all items.');
      return;
    }
    
    for (const itemId of Object.keys(itemsStatus)) {
      if (itemsStatus[itemId].status === 'REJECTED' && (!itemsStatus[itemId].remarks || itemsStatus[itemId].remarks.trim().length === 0)) {
        setError('Remarks are mandatory for rejected items.');
        return;
      }
    }

    setLoading(true);
    setError('');
    try {
      const payload = Object.keys(itemsStatus).map(id => ({
        procurementItemId: id,
        status: itemsStatus[id].status,
        remarks: itemsStatus[id].remarks,
      }));
      await submitInspection(procurement.id, level, payload);
      const { getProcurement } = await import('@/lib/api/procurement');
      const updated = await getProcurement(procurement.id);
      onUpdate(updated);
    } catch (err: any) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  if (pendingItems.length === 0) return <div className="text-sm text-gray-500">No items pending inspection.</div>;

  return (
    <div className="space-y-4">
      {error && <div className="text-red-600 text-sm p-2 bg-red-50 rounded border border-red-200">{error}</div>}
      <div className="space-y-3">
        {pendingItems.map((item: any) => (
          <div key={item.id} className="border p-3 rounded-lg bg-white shadow-sm">
            <div className="font-semibold text-sm mb-2 text-gray-800">{item.itemName} (Qty: {item.quantity})</div>
            <div className="flex gap-4 mb-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name={`status-${item.id}`} checked={itemsStatus[item.id]?.status === 'APPROVED'} onChange={() => handleStatusChange(item.id, 'APPROVED')} className="accent-[#0F7B45]" />
                Approve
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="radio" name={`status-${item.id}`} checked={itemsStatus[item.id]?.status === 'REJECTED'} onChange={() => handleStatusChange(item.id, 'REJECTED')} className="accent-[#DC2626]" />
                Reject
              </label>
            </div>
            <input
              type="text"
              placeholder="Remarks (required if rejected)"
              className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0F7B45]/20 focus:border-[#0F7B45]"
              value={itemsStatus[item.id]?.remarks || ''}
              onChange={(e) => handleRemarksChange(item.id, e.target.value)}
            />
          </div>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full px-4 py-2.5 bg-[#0F7B45] hover:bg-[#0c6237] text-white rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Inspection'}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 15 — DEBIT NOTE PREPARATION
// ═══════════════════════════════════════════════════════════════════════════════
function StageDebitNote({ actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const [s15DebitStatus, setS15DebitStatus] = useState('Raised');
  const fields = { debitNoteStatus: s15DebitStatus, responsible: 'Atul Tyagi', remarks: remarksText };

  const validation = validateFields([
    { label: 'Debit Note Status', valid: s15DebitStatus.trim().length > 0 },
    { label: 'Remarks', valid: remarksText.trim().length >= 3 },
  ]);

  return (
    <div className="space-y-1">
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Debit Note Status</label>
        <select value={s15DebitStatus} onChange={e => setS15DebitStatus(e.target.value)} className={sel} style={{ borderColor: 'var(--border)' }}>
          <option>Raised</option>
          <option>Pending</option>
          <option>Settled</option>
        </select>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Responsible Person</label>
        <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--surface2)' }}>Atul Tyagi</div>
      </div>
      <RemarksField value={remarksText} onChange={setRemarksText} />
      <ValidationSummary items={validation.items} />
      <ActionRow actions={[
        { label: 'Submit', action: 'SUBMIT', color: '#0F7B45', loading: actionLoading, disabled: !validation.ok, onClick: () => onAction('SUBMIT', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 16 — BILL TO ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════
function StageBillToAccounts({ procurement, actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const parseMeta = (n: number) => { try { const s = procurement.stages.find(st => st.stageNumber === n); return s?.metadata ? JSON.parse(s.metadata) : null; } catch { return null; } };
  const meta6 = parseMeta(6);
  const meta11 = parseMeta(11);

  // Pre-fill from upstream
  const grnItems: Array<{ itemId: string; grnNo: string; vendorName: string; poNumber: string; receivedQty: number }> = meta11?.receiptItems || [];
  const firstGrn = grnItems[0];

  const [s16Vendor, setS16Vendor] = useState(firstGrn?.vendorName || meta6?.poItems?.[0]?.vendor || '');
  const [s16BillNo, setS16BillNo] = useState('');
  const [s16BillDate, setS16BillDate] = useState('');
  const [s16PoNo, setS16PoNo] = useState(meta6?.poNumber || '');
  const [s16GrnNo, setS16GrnNo] = useState(firstGrn?.grnNo || '');
  const [s16InvoiceAmt, setS16InvoiceAmt] = useState('');
  const [s16TaxAmt, setS16TaxAmt] = useState('');
  const [s16AttachRef, setS16AttachRef] = useState('');

  const invoiceAmt = parseFloat(s16InvoiceAmt) || 0;
  const taxAmt = parseFloat(s16TaxAmt) || 0;
  const totalAmt = invoiceAmt + taxAmt;
  const remarksOk = remarksText.trim().length >= 3;

  // Prerequisite checks from prior stages
  const grnCompleted = grnItems.length > 0;
  const inspectionCompleted = !!procurement.stages.find(s => s.stageNumber >= 12 && s.stageNumber <= 14 && s.status === 'COMPLETED');

  const validation = validateFields([
    { label: 'Material Receipt (GRN) completed', valid: grnCompleted },
    { label: 'Inspection completed', valid: inspectionCompleted },
    { label: 'Vendor Name', valid: s16Vendor.trim().length >= 1 },
    { label: 'Vendor Bill Number', valid: s16BillNo.trim().length >= 1 },
    { label: 'Bill Date', valid: s16BillDate.trim().length >= 1 },
    { label: 'PO Number', valid: s16PoNo.trim().length >= 1 },
    { label: 'GRN Number', valid: s16GrnNo.trim().length >= 1 },
    { label: 'Invoice Amount', valid: invoiceAmt > 0 },
    { label: 'Accounts Remarks', valid: remarksOk },
  ]);

  const fields = { vendorName: s16Vendor, billNumber: s16BillNo, billDate: s16BillDate, poNumber: s16PoNo, grnNumber: s16GrnNo, invoiceAmount: s16InvoiceAmt, taxAmount: s16TaxAmt, totalAmount: totalAmt.toFixed(2), attachmentRef: s16AttachRef, remarks: remarksText };

  return (
    <div>
      {(!grnCompleted || !inspectionCompleted) && (
        <div style={{ padding: '10px 14px', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 11, color: '#DC2626', marginBottom: 12 }}>
          🔴 Prerequisites not met: {!grnCompleted ? 'Material Receipt (GRN) must be completed. ' : ''}{!inspectionCompleted ? 'Material Inspection must be completed.' : ''}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Vendor Name *</label>
          <input value={s16Vendor} onChange={e => setS16Vendor(e.target.value)} placeholder="Vendor name" className={inp} style={{ borderColor: s16Vendor ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>Vendor Bill Number *</label>
          <input value={s16BillNo} onChange={e => setS16BillNo(e.target.value)} placeholder="e.g. VB-2026-001" className={inp} style={{ borderColor: s16BillNo ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>Bill Date *</label>
          <input type="date" value={s16BillDate} onChange={e => setS16BillDate(e.target.value)} className={inp} style={{ borderColor: s16BillDate ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>PO Number *</label>
          <input value={s16PoNo} onChange={e => setS16PoNo(e.target.value)} placeholder="PO-XXXX" className={inp} style={{ borderColor: s16PoNo ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>GRN Number *</label>
          <input value={s16GrnNo} onChange={e => setS16GrnNo(e.target.value)} placeholder="GRN-XXXX" className={inp} style={{ borderColor: s16GrnNo ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>Invoice Attachment Ref</label>
          <input value={s16AttachRef} onChange={e => setS16AttachRef(e.target.value)} placeholder="File name / doc ref" className={inp} style={{ borderColor: 'var(--border)' }} />
        </div>
        <div>
          <label style={labelStyle}>Invoice Amount (₹) *</label>
          <input type="number" min="0" step="any" value={s16InvoiceAmt} onChange={e => setS16InvoiceAmt(e.target.value)} placeholder="0.00" className={inp} style={{ borderColor: invoiceAmt > 0 ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>Tax Amount (₹)</label>
          <input type="number" min="0" step="any" value={s16TaxAmt} onChange={e => setS16TaxAmt(e.target.value)} placeholder="0.00" className={inp} style={{ borderColor: 'var(--border)' }} />
        </div>
        <div>
          <label style={labelStyle}>Total Amount (₹)</label>
          <div style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 13, fontWeight: 700, color: '#059669', background: 'var(--surface2)', height: 37, display: 'flex', alignItems: 'center' }}>
            ₹ {totalAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>
      <RemarksField value={remarksText} onChange={setRemarksText} />
      <ValidationSummary items={validation.items} />
      <ActionRow actions={[
        { label: 'Submit to Accounts →', action: 'SUBMIT', color: '#0F7B45', loading: actionLoading, disabled: !validation.ok, onClick: () => onAction('SUBMIT', fields) },
        { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
        { label: 'Reject', action: 'REJECT', color: '#DC2626', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('REJECT', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 17 — BILL TO PURCHASE (Commercial verification)
// ═══════════════════════════════════════════════════════════════════════════════
function StageBillToPurchase({ procurement, actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const parseMeta = (n: number) => { try { const s = procurement.stages.find(st => st.stageNumber === n); return s?.metadata ? JSON.parse(s.metadata) : null; } catch { return null; } };
  const meta6 = parseMeta(6);   // PO data
  const meta11 = parseMeta(11); // GRN data
  const meta16 = parseMeta(16); // Bill to accounts data

  // Compute match checks
  const poVendor = meta6?.poItems?.[0]?.vendor || '';
  const billVendor = meta16?.vendorName || '';
  const poNumber = meta6?.poNumber || '';
  const billPoNumber = meta16?.poNumber || '';

  const poTotalQty = (procurement.items || []).reduce((s: number, i: any) => s + (i.quantity || 0), 0);
  const grnTotalQty = ((meta11?.receiptItems || []) as Array<{ receivedQty: number }>).reduce((s, r) => s + (r.receivedQty || 0), 0);

  const poTotalValue = (meta6?.poItems || []).reduce((s: number, i: any) => s + (parseFloat(i.poRate || '0') * (i.quantity || 0)), 0);
  const invoiceAmt = parseFloat(meta16?.invoiceAmount || '0');
  const taxAmt = parseFloat(meta16?.taxAmount || '0');
  const invoiceTotal = invoiceAmt + taxAmt;

  const [checks, setChecks] = useState({
    poMatch: false, qtyMatch: false, rateMatch: false, taxMatch: false, vendorMatch: false,
  });
  const [purchaseRemarks, setPurchaseRemarks] = useState('');
  const setCheck = (k: keyof typeof checks) => setChecks(prev => ({ ...prev, [k]: !prev[k] }));

  const allChecked = Object.values(checks).every(Boolean);
  const remarksOk = remarksText.trim().length >= 3;
  const purchaseRemarksOk = purchaseRemarks.trim().length >= 3;

  const validation = validateFields([
    { label: 'PO vs Invoice Match verified', valid: checks.poMatch },
    { label: 'Quantity Match verified', valid: checks.qtyMatch },
    { label: 'Rate Match verified', valid: checks.rateMatch },
    { label: 'Tax Match verified', valid: checks.taxMatch },
    { label: 'Vendor Match verified', valid: checks.vendorMatch },
    { label: 'Purchase Remarks', valid: purchaseRemarksOk },
    { label: 'Remarks', valid: remarksOk },
  ]);

  const mkRow = (label: string, left: string | number, right: string | number, key: keyof typeof checks) => {
    const match = String(left).trim().toLowerCase() === String(right).trim().toLowerCase() || (typeof left === 'number' && typeof right === 'number' && Math.abs(left - right) < 0.01);
    return (
      <tr key={key} style={{ borderBottom: '1px solid var(--border)' }}>
        <td style={{ padding: '8px 10px', fontSize: 12, fontWeight: 600 }}>{label}</td>
        <td style={{ padding: '8px 10px', fontSize: 12 }}>{left || '—'}</td>
        <td style={{ padding: '8px 10px', fontSize: 12 }}>{right || '—'}</td>
        <td style={{ padding: '8px 10px', fontSize: 12, textAlign: 'center' as const }}><span style={{ fontSize: 13 }}>{match ? '🟢' : '🔴'}</span></td>
        <td style={{ padding: '8px 10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 11, userSelect: 'none' as const }}>
            <input type="checkbox" checked={checks[key]} onChange={() => setCheck(key)} style={{ width: 14, height: 14, accentColor: '#059669' }} />
            <span style={{ fontWeight: 600, color: checks[key] ? '#059669' : '#6B7280' }}>Verified</span>
          </label>
        </td>
      </tr>
    );
  };

  

  const fields = { checks, purchaseRemarks, responsible: 'Pankaj Kumar', remarks: remarksText };

  return (
    <div>
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
        <table className="ifh-table" >
          <thead><tr style={{ background: 'var(--surface2)' }}>
            {['Check', 'PO / GRN Value', 'Invoice Value', 'Auto Match', 'Verified'].map(h => <th key={h} >{h}</th>)}
          </tr></thead>
          <tbody>
            {mkRow('Vendor Match', poVendor, billVendor, 'vendorMatch')}
            {mkRow('PO Number', poNumber, billPoNumber, 'poMatch')}
            {mkRow('Ordered Qty', poTotalQty, grnTotalQty, 'qtyMatch')}
            {mkRow('PO Value (₹)', `₹${poTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, `₹${invoiceAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'rateMatch')}
            {mkRow('Total with Tax (₹)', `₹${(poTotalValue).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, `₹${invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 'taxMatch')}
          </tbody>
        </table>
      </div>
      {!allChecked && <p style={{ fontSize: 11, color: '#DC2626', marginBottom: 10 }}>All commercial parameters must be 🟢 verified before approval.</p>}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>Purchase Verification Remarks *</label>
        <textarea value={purchaseRemarks} onChange={e => setPurchaseRemarks(e.target.value)} rows={2} placeholder="Purchase team verification summary..." className={inp} style={{ borderColor: purchaseRemarksOk ? 'var(--border)' : '#FCA5A5', resize: 'none' }} />
      </div>
      <RemarksField value={remarksText} onChange={setRemarksText} />
      <ValidationSummary items={validation.items} />
      <ActionRow actions={[
        { label: 'Approve → Bill Creation', action: 'APPROVE', color: '#059669', loading: actionLoading, disabled: !validation.ok, onClick: () => onAction('APPROVE', fields) },
        { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
        { label: 'Reject', action: 'REJECT', color: '#DC2626', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('REJECT', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 18 — BILL CREATION (Final payable bill — locked after creation)
// ═══════════════════════════════════════════════════════════════════════════════
function StageBillCreation({ procurement, actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const parseMeta = (n: number) => { try { const s = procurement.stages.find(st => st.stageNumber === n); return s?.metadata ? JSON.parse(s.metadata) : null; } catch { return null; } };
  const meta16 = parseMeta(16);
  const meta6 = parseMeta(6);

  // Pre-fill from upstream (locked values)
  const [s18Vendor] = useState(meta16?.vendorName || '');
  const [s18BillNo] = useState(meta16?.billNumber || '');
  const [s18PoNo] = useState(meta16?.poNumber || meta6?.poNumber || '');
  const [s18GrnNo] = useState(meta16?.grnNumber || '');
  const [s18InvoiceAmt] = useState(meta16?.invoiceAmount || '');
  const [s18TaxAmt] = useState(meta16?.taxAmount || '');
  const [s18DueDate, setS18DueDate] = useState('');

  const invoiceAmt = parseFloat(s18InvoiceAmt) || 0;
  const taxAmt = parseFloat(s18TaxAmt) || 0;
  const finalPayable = invoiceAmt + taxAmt;
  const remarksOk = remarksText.trim().length >= 3;

  const validation = validateFields([
    { label: 'Vendor', valid: s18Vendor.trim().length >= 1 },
    { label: 'Bill Number', valid: s18BillNo.trim().length >= 1 },
    { label: 'PO Number', valid: s18PoNo.trim().length >= 1 },
    { label: 'GRN Number', valid: s18GrnNo.trim().length >= 1 },
    { label: 'Invoice Amount', valid: invoiceAmt > 0 },
    { label: 'Due Date', valid: s18DueDate.trim().length >= 1 },
    { label: 'Bill Remarks', valid: remarksOk },
  ]);

  const ro: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, background: 'var(--surface2)', color: 'var(--text-primary)', height: 37, display: 'flex', alignItems: 'center' };
  const fields = { vendor: s18Vendor, billNumber: s18BillNo, poNumber: s18PoNo, grnNumber: s18GrnNo, invoiceAmount: s18InvoiceAmt, taxAmount: s18TaxAmt, finalPayable: finalPayable.toFixed(2), dueDate: s18DueDate, remarks: remarksText, lockedAt: new Date().toISOString() };

  return (
    <div>
      <div style={{ padding: '9px 12px', borderRadius: 7, background: '#EFF6FF', border: '1px solid #BFDBFE', fontSize: 11, color: '#1E40AF', marginBottom: 12 }}>
        🔒 Commercial values are locked from upstream stages. Only Due Date and Remarks can be entered.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div><label style={labelStyle}>Vendor</label><div style={ro}>{s18Vendor || '—'}</div></div>
        <div><label style={labelStyle}>Bill Number</label><div style={ro}>{s18BillNo || '—'}</div></div>
        <div><label style={labelStyle}>PO Number</label><div style={ro}>{s18PoNo || '—'}</div></div>
        <div><label style={labelStyle}>GRN Number</label><div style={ro}>{s18GrnNo || '—'}</div></div>
        <div><label style={labelStyle}>Invoice Amount (₹)</label><div style={{ ...ro, fontWeight: 700 }}>₹ {invoiceAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
        <div><label style={labelStyle}>Tax Amount (₹)</label><div style={ro}>₹ {taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div></div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={labelStyle}>Final Payable Amount (₹)</label>
          <div style={{ ...ro, fontSize: 16, fontWeight: 800, color: '#059669', height: 42 }}>₹ {finalPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div>
          <label style={labelStyle}>Due Date *</label>
          <input type="date" value={s18DueDate} onChange={e => setS18DueDate(e.target.value)} className={inp} style={{ borderColor: s18DueDate ? 'var(--border)' : '#FCA5A5' }} />
        </div>
      </div>
      <RemarksField value={remarksText} onChange={setRemarksText} />
      <ValidationSummary items={validation.items} />
      <ActionRow actions={[
        { label: 'Create Bill → Tally Entry', action: 'APPROVE', color: '#059669', loading: actionLoading, disabled: !validation.ok, onClick: () => onAction('APPROVE', fields) },
        { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
        { label: 'Reject', action: 'REJECT', color: '#DC2626', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('REJECT', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 19 — TALLY ENTRY
// ═══════════════════════════════════════════════════════════════════════════════
function StageTallyEntry({ procurement, actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const parseMeta = (n: number) => { try { const s = procurement.stages.find(st => st.stageNumber === n); return s?.metadata ? JSON.parse(s.metadata) : null; } catch { return null; } };
  const meta18 = parseMeta(18);

  const [s19VoucherNo, setS19VoucherNo] = useState('');
  const [s19EntryDate, setS19EntryDate] = useState('');
  const [s19LedgerName, setS19LedgerName] = useState('');
  const [s19VendorLedger, setS19VendorLedger] = useState('');
  const [s19PurchaseLedger, setS19PurchaseLedger] = useState('');
  const [s19GstLedger, setS19GstLedger] = useState('');

  const billAmount = parseFloat(meta18?.invoiceAmount || '0');
  const taxAmount = parseFloat(meta18?.taxAmount || '0');
  const netAmount = billAmount + taxAmount;
  const billCreated = !!meta18?.billNumber;
  const remarksOk = remarksText.trim().length >= 3;

  const validation = validateFields([
    { label: 'Bill Created (stage 18)', valid: billCreated },
    { label: 'Tally Voucher Number', valid: s19VoucherNo.trim().length >= 1 },
    { label: 'Tally Entry Date', valid: s19EntryDate.trim().length >= 1 },
    { label: 'Ledger Name', valid: s19LedgerName.trim().length >= 1 },
    { label: 'Vendor Ledger', valid: s19VendorLedger.trim().length >= 1 },
    { label: 'Purchase Ledger', valid: s19PurchaseLedger.trim().length >= 1 },
    { label: 'Entry Remarks', valid: remarksOk },
  ]);

  const ro: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, background: 'var(--surface2)', color: 'var(--text-primary)', height: 37, display: 'flex', alignItems: 'center' };
  const fields = { voucherNo: s19VoucherNo, entryDate: s19EntryDate, ledgerName: s19LedgerName, vendorLedger: s19VendorLedger, purchaseLedger: s19PurchaseLedger, gstLedger: s19GstLedger, responsible: 'Atul Tyagi', remarks: remarksText };

  return (
    <div>
      {/* Bill summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Vendor', value: meta18?.vendor || '—' },
          { label: 'Bill Amount', value: `₹ ${billAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
          { label: 'Tax Amount', value: `₹ ${taxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
          { label: 'Net Payable', value: `₹ ${netAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
        ].map(({ label, value }) => (
          <div key={label} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: label === 'Net Payable' ? '#059669' : 'var(--text-primary)' }}>{value}</div>
          </div>
        ))}
      </div>
      {!billCreated && (
        <div style={{ padding: '9px 12px', borderRadius: 7, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 11, color: '#DC2626', marginBottom: 12 }}>
          🔴 Bill Creation (stage 18) must be completed before making Tally entry.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div>
          <label style={labelStyle}>Tally Voucher Number *</label>
          <input value={s19VoucherNo} onChange={e => setS19VoucherNo(e.target.value)} placeholder="e.g. PV-2026-001" className={inp} style={{ borderColor: s19VoucherNo ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>Tally Entry Date *</label>
          <input type="date" value={s19EntryDate} onChange={e => setS19EntryDate(e.target.value)} className={inp} style={{ borderColor: s19EntryDate ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>Ledger Name *</label>
          <input value={s19LedgerName} onChange={e => setS19LedgerName(e.target.value)} placeholder="e.g. Purchase A/c" className={inp} style={{ borderColor: s19LedgerName ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>Vendor Ledger *</label>
          <input value={s19VendorLedger} onChange={e => setS19VendorLedger(e.target.value)} placeholder="Vendor ledger name" className={inp} style={{ borderColor: s19VendorLedger ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>Purchase Ledger *</label>
          <input value={s19PurchaseLedger} onChange={e => setS19PurchaseLedger(e.target.value)} placeholder="Purchase ledger name" className={inp} style={{ borderColor: s19PurchaseLedger ? 'var(--border)' : '#FCA5A5' }} />
        </div>
        <div>
          <label style={labelStyle}>GST Ledger</label>
          <input value={s19GstLedger} onChange={e => setS19GstLedger(e.target.value)} placeholder="GST input ledger" className={inp} style={{ borderColor: 'var(--border)' }} />
        </div>
      </div>
      <RemarksField value={remarksText} onChange={setRemarksText} />
      <ValidationSummary items={validation.items} />
      <ActionRow actions={[
        { label: 'Approve → Bill Approval L1', action: 'APPROVE', color: '#059669', loading: actionLoading, disabled: !validation.ok, onClick: () => onAction('APPROVE', fields) },
        { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
        { label: 'Reject', action: 'REJECT', color: '#DC2626', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('REJECT', fields) },
      ]} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 20 & 21 — BILL APPROVALS (Full financial review — read-only journey)
// ═══════════════════════════════════════════════════════════════════════════════
function StageBillApproval({ procurement, actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const level = procurement.currentStage === 20 ? 'L1' : 'L2';
  const responsible = procurement.currentStage === 20 ? 'Pramod Kumar' : 'Neetu Singh';
  const remarksOk = remarksText.trim().length >= 3;

  const parseMeta = (n: number) => { try { const s = procurement.stages.find(st => st.stageNumber === n); return s?.metadata ? JSON.parse(s.metadata) : null; } catch { return null; } };
  const stage = (n: number) => procurement.stages.find(s => s.stageNumber === n);
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const tat = (s?: ProcurementStage | null) => { if (!s?.startedAt) return '—'; const end = s.completedAt ? new Date(s.completedAt) : new Date(); const days = Math.round((end.getTime() - new Date(s.startedAt).getTime()) / 86400000); return `${days}d`; };

  const meta2  = parseMeta(2);
  const meta3  = parseMeta(3);
  const meta4  = parseMeta(4);
  const meta5  = parseMeta(5);
  const meta6  = parseMeta(6);
  const meta11 = parseMeta(11);
  const meta12 = parseMeta(12);
  const meta13 = parseMeta(13);
  const meta14 = parseMeta(14);
  const meta15 = parseMeta(15);
  const meta16 = parseMeta(16);
  const meta18 = parseMeta(18);
  const meta19 = parseMeta(19);

  const negItems: any[] = meta5?.itemNegotiations || [];
  const poItems: any[] = meta6?.poItems || [];
  const receiptItems: any[] = meta11?.receiptItems || [];
  const totalPO = poItems.reduce((s, i) => s + parseFloat(i.poRate || '0') * (i.quantity || 0), 0);
  const billAmt = parseFloat(meta16?.invoiceAmount || meta18?.invoiceAmount || '0');
  const taxAmt = parseFloat(meta16?.taxAmount || meta18?.taxAmount || '0');
  const netPayable = billAmt + taxAmt;
  const poCurr = poItems[0]?.currency || 'INR';

  
  

  const fields = { level, responsible, remarks: remarksText };

  return (
    <div>
      {/* Approver badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: level === 'L1' ? '#EFF6FF' : '#F5F3FF', border: `1px solid ${level === 'L1' ? '#BFDBFE' : '#DDD6FE'}` }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: level === 'L1' ? '#3B82F6' : '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>{level}</div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700 }}>Bill Approval — {level === 'L1' ? 'Level 1' : 'Level 2'}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Approver: {responsible} · Ref: {procurement.referenceNo}</div>
        </div>
        <div style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 6, background: netPayable > 0 ? '#F0FDF4' : 'var(--surface2)', border: '1px solid var(--border)', fontSize: 12, fontWeight: 800, color: '#059669' }}>
          Net Payable: {poCurr} {netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>

      {/* 1. Indent */}
      <POReviewSection title="1. Indent Details">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
          <KV label="Indent No" value={procurement.referenceNo} />
          <KV label="Title" value={procurement.title} />
          <KV label="Requestor" value={procurement.requestedBy?.fullName} />
          <KV label="Priority" value={procurement.priority} />
          <KV label="Created" value={fmtDate(procurement.createdAt)} />
        </div>
        {procurement.items.length > 0 && (
          <table className="ifh-table" >
            <thead><tr style={{ background: 'var(--surface2)' }}>{['Item', 'Qty', 'UOM', 'Tech Spec', 'Approved Makes'].map(h => <th key={h} >{h}</th>)}</tr></thead>
            <tbody>{procurement.items.map(i => (
              <tr key={i.id}>
                <td >{i.itemName}</td><td >{i.quantity}</td><td >{i.unit || '—'}</td>
                <td >{(i as any).technicalSpec || '—'}</td><td >{(i as any).approvedMakes || '—'}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
        {stage(1)?.remarks && <KV label="Verification Remarks" value={stage(1)?.remarks} />}
      </POReviewSection>

      {/* 2. Store Check */}
      <POReviewSection title="2. Store Check">
        {meta2?.itemChecks?.length > 0 ? (
          <table className="ifh-table" >
            <thead><tr style={{ background: 'var(--surface2)' }}>{['Item', 'Required', 'Available', 'Short Qty', 'Decision'].map(h => <th key={h} >{h}</th>)}</tr></thead>
            <tbody>{meta2.itemChecks.map((c: any) => (
              <tr key={c.itemId}><td >{c.itemName}</td><td >{c.requiredQty} {c.unit}</td><td >{c.availableQty}</td>
                <td >{c.shortQty}</td><td >{c.decision?.replace(/_/g, ' ')}</td></tr>
            ))}</tbody>
          </table>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No store check data.</span>}
        {stage(2)?.remarks && <KV label="Store Remarks" value={stage(2)?.remarks} />}
      </POReviewSection>

      {/* 3. RFQ */}
      <POReviewSection title="3. RFQ Float">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
          <KV label="RFQ Status" value={meta3?.rfqStatus} />
          <KV label="Planned Date" value={meta3?.plannedDate} />
          <KV label="Actual Date" value={meta3?.actualDate} />
        </div>
        {stage(3)?.remarks && <KV label="RFQ Remarks" value={stage(3)?.remarks} />}
      </POReviewSection>

      {/* 4. TCO */}
      <POReviewSection title="4. Techno-Commercial Evaluation">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <KV label="Selected Vendor" value={meta4?.vendor} />
          <KV label="Vendor Quotation" value={meta4?.quotation} />
          <KV label="Delivery Terms" value={meta4?.deliveryTerms} />
          <KV label="Payment Terms" value={meta4?.paymentTerms} />
        </div>
        {meta4?.techRemarks && <KV label="Technical Remarks" value={meta4.techRemarks} />}
        {meta4?.commRemarks && <KV label="Commercial Remarks" value={meta4.commRemarks} />}
        {stage(4)?.remarks && <KV label="TCO Remarks" value={stage(4)?.remarks} />}
      </POReviewSection>

      {/* 5. Negotiation */}
      <POReviewSection title="5. Negotiation & Decision">
        {negItems.length > 0 ? (
          <table className="ifh-table" >
            <thead><tr style={{ background: 'var(--surface2)' }}>{['Item', 'Vendor', 'Quoted', 'Negotiated', 'Final Approved', 'Currency', 'Remarks'].map(h => <th key={h} >{h}</th>)}</tr></thead>
            <tbody>{negItems.map((n: any) => (
              <tr key={n.itemId}><td >{n.itemName}</td><td >{n.vendor}</td>
                <td >{n.quotedPrice || '—'}</td>
                <td >{n.negotiatedPrice}</td>
                <td >{n.finalApprovedPrice}</td>
                <td >{n.currency}</td><td >{n.negotiationRemarks}</td></tr>
            ))}</tbody>
          </table>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No negotiation data.</span>}
        {stage(5)?.remarks && <KV label="Negotiation Remarks" value={stage(5)?.remarks} />}
      </POReviewSection>

      {/* 6. PO */}
      <POReviewSection title="6. Purchase Order">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px', marginBottom: 8 }}>
          <KV label="PO Number" value={meta6?.poNumber} />
          <KV label="Vendor Confirmation" value={meta6?.vendorConfirmation} />
          <KV label="Total PO Value" value={totalPO > 0 ? `${poCurr} ${totalPO.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : undefined} />
        </div>
        {poItems.length > 0 && (
          <table className="ifh-table" >
            <thead><tr style={{ background: 'var(--surface2)' }}>{['Item', 'Vendor', 'Qty', 'PO Rate', 'Total', 'Delivery', 'Payment', 'Tax'].map(h => <th key={h} >{h}</th>)}</tr></thead>
            <tbody>{poItems.map((i: any) => {
              const tot = parseFloat(i.poRate || '0') * (i.quantity || 0);
              return (<tr key={i.itemId}><td >{i.itemName}</td><td >{i.vendor}</td><td >{i.quantity}</td>
                <td >{i.currency} {parseFloat(i.poRate || '0').toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td >{i.currency} {tot.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td >{i.deliveryTerms || '—'}</td><td >{i.paymentTerms || '—'}</td><td >{i.taxDetails || '—'}</td></tr>);
            })}</tbody>
          </table>
        )}
        {stage(6)?.remarks && <KV label="PO Remarks" value={stage(6)?.remarks} />}
      </POReviewSection>

      {/* 7. Material Receipt */}
      <POReviewSection title="7. Material Receipt (GRN)">
        {receiptItems.length > 0 ? (
          <table className="ifh-table" >
            <thead><tr style={{ background: 'var(--surface2)' }}>{['Item', 'Ordered', 'Received', 'Pending', 'GRN No', 'Gate Entry', 'Date', 'Status'].map(h => <th key={h} >{h}</th>)}</tr></thead>
            <tbody>{receiptItems.map((r: any) => (
              <tr key={r.itemId}><td >{r.itemName}</td>
                <td >{r.orderedQty} {r.unit}</td>
                <td >{r.receivedQty}</td>
                <td >{r.pendingQty}</td>
                <td >{r.grnNo || '—'}</td><td >{r.gateEntryNo || '—'}</td>
                <td >{r.receiptDate ? fmtDate(r.receiptDate) : '—'}</td>
                <td ><span style={{ fontSize: 10, fontWeight: 700, color: r.status === 'FULLY_RECEIVED' ? '#059669' : r.status === 'PARTIALLY_RECEIVED' ? '#D97706' : '#DC2626' }}>{r.status?.replace(/_/g, ' ')}</span></td></tr>
            ))}</tbody>
          </table>
        ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>No receipt data.</span>}
        {stage(11)?.remarks && <KV label="Receipt Remarks" value={stage(11)?.remarks} />}
      </POReviewSection>

      {/* 8. Inspection */}
      <POReviewSection title="8. Material Inspection">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <KV label="QC-1 Result" value={meta12 ? (meta12.allPassed ? 'PASSED' : 'FAILED') : undefined} />
          <KV label="QC-1 Remarks" value={stage(12)?.remarks} />
          <KV label="QC-2 Result" value={meta13 ? (meta13.qcStatus || stage(13)?.actionTaken) : undefined} />
          <KV label="QC-2 Remarks" value={stage(13)?.remarks} />
          <KV label="Final QC Result" value={meta14 ? (meta14.finalQcStatus || stage(14)?.actionTaken) : undefined} />
          <KV label="Final QC Remarks" value={stage(14)?.remarks} />
        </div>
        {meta15 && (
          <div style={{ marginTop: 8 }}>
            <KV label="Debit Note" value={meta15?.debitNoteNo} />
            <KV label="Debit Note Amount" value={meta15?.amount} />
          </div>
        )}
      </POReviewSection>

      {/* 9. Financial Stages */}
      <POReviewSection title="9. Financial Stages">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px', marginBottom: 10 }}>
          <KV label="Vendor Invoice No" value={meta16?.billNumber} />
          <KV label="Bill Date" value={meta16?.billDate ? fmtDate(meta16.billDate) : undefined} />
          <KV label="Invoice Amount" value={billAmt > 0 ? `₹ ${billAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : undefined} />
          <KV label="Tax Amount" value={taxAmt > 0 ? `₹ ${taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : undefined} />
          <KV label="Final Payable" value={netPayable > 0 ? `₹ ${netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : undefined} />
          <KV label="Due Date" value={meta18?.dueDate ? fmtDate(meta18.dueDate) : undefined} />
        </div>
        {stage(17)?.remarks && <KV label="Purchase Verification Remarks" value={stage(17)?.remarks} />}
        {stage(18)?.remarks && <KV label="Bill Creation Remarks" value={stage(18)?.remarks} />}
        {meta19 && (
          <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 6, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 6 }}>Tally Entry Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0 24px' }}>
              <KV label="Voucher No" value={meta19.voucherNo} />
              <KV label="Entry Date" value={meta19.entryDate ? fmtDate(meta19.entryDate) : undefined} />
              <KV label="Ledger" value={meta19.ledgerName} />
              <KV label="Vendor Ledger" value={meta19.vendorLedger} />
              <KV label="Purchase Ledger" value={meta19.purchaseLedger} />
              <KV label="GST Ledger" value={meta19.gstLedger} />
            </div>
          </div>
        )}
      </POReviewSection>

      {/* 10. Workflow Timeline */}
      <POReviewSection title="10. Workflow Timeline & Audit Trail">
        <table className="ifh-table" >
          <thead><tr style={{ background: 'var(--surface2)' }}>{['Stage', 'Status', 'Started', 'Completed', 'TAT', 'Action', 'Remarks'].map(h => <th key={h} >{h}</th>)}</tr></thead>
          <tbody>{procurement.stages.filter(s => s.stageNumber <= procurement.currentStage).map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td ><strong>{s.stageNumber}.</strong> {s.stageName}</td>
              <td ><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: s.status === 'COMPLETED' ? '#D1FAE5' : s.status === 'IN_PROGRESS' ? '#DBEAFE' : '#F3F4F6', color: s.status === 'COMPLETED' ? '#065F46' : s.status === 'IN_PROGRESS' ? '#1E40AF' : '#374151', fontWeight: 600 }}>{s.status}</span></td>
              <td >{fmtDate(s.startedAt)}</td>
              <td >{fmtDate(s.completedAt)}</td>
              <td >{tat(s)}</td>
              <td >{s.actionTaken || '—'}</td>
              <td >{s.remarks || '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </POReviewSection>

      {/* Attachments */}
      {procurement.attachments?.length > 0 && (
        <POReviewSection title="Attachments">
          {procurement.attachments.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 11 }}>
              <span style={{ color: '#0F7B45' }}>📎</span>
              <a href={a.fileUrl} target="_blank" rel="noreferrer" style={{ color: '#1D4ED8', textDecoration: 'underline' }}>{a.fileName}</a>
              <span style={{ color: 'var(--text-muted)' }}>— {a.uploadedBy?.fullName} · {fmtDate(a.createdAt)}</span>
            </div>
          ))}
        </POReviewSection>
      )}

      {/* Approval action box */}
      <div style={{ padding: '14px', border: '2px solid var(--border)', borderRadius: 8, background: 'var(--surface2)', marginTop: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 10 }}>
          Financial Approval Decision — {level === 'L1' ? 'Level 1' : 'Level 2'} · Net Payable: <span style={{ color: '#059669' }}>{poCurr} {netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
        </div>
        <RemarksField value={remarksText} onChange={setRemarksText} />
        {!remarksOk && (
          <div style={{ marginTop: 6, padding: '7px 10px', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 11, color: '#DC2626' }}>
            🔴 Approval Remarks are mandatory before any action.
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <ActionRow actions={[
            { label: level === 'L1' ? 'Approve → Bill Approval L2' : 'Approve → Payment Advice', action: 'APPROVE', color: '#059669', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('APPROVE', fields) },
            { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
            { label: 'Reject', action: 'REJECT', color: '#DC2626', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('REJECT', fields) },
          ]} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE 22 — PAYMENT ADVICE (Final financial release checkpoint)
// ═══════════════════════════════════════════════════════════════════════════════
function StagePaymentAdvice({ procurement, actionLoading, onAction, remarksText, setRemarksText }: Props) {
  const parseMeta = (n: number) => { try { const s = procurement.stages.find(st => st.stageNumber === n); return s?.metadata ? JSON.parse(s.metadata) : null; } catch { return null; } };
  const stageObj = (n: number) => procurement.stages.find(s => s.stageNumber === n);
  const fmtDate = (d?: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  const tat = (s?: ProcurementStage | null) => { if (!s?.startedAt) return '—'; const end = s.completedAt ? new Date(s.completedAt) : new Date(); const days = Math.round((end.getTime() - new Date(s.startedAt).getTime()) / 86400000); return `${days}d`; };

  const meta6  = parseMeta(6);
  const meta11 = parseMeta(11);
  const meta15 = parseMeta(15);
  const meta16 = parseMeta(16);
  const meta18 = parseMeta(18);
  const meta19 = parseMeta(19);
  const meta5  = parseMeta(5);

  const poItems: any[] = meta6?.poItems || [];
  const receiptItems: any[] = meta11?.receiptItems || [];
  const negItems: any[] = meta5?.itemNegotiations || [];
  const totalPO = poItems.reduce((s, i) => s + parseFloat(i.poRate || '0') * (i.quantity || 0), 0);
  const billAmt = parseFloat(meta18?.invoiceAmount || meta16?.invoiceAmount || '0');
  const taxAmt  = parseFloat(meta18?.taxAmount || meta16?.taxAmount || '0');
  const poCurr  = poItems[0]?.currency || 'INR';

  // Prerequisite checks
  const prereqs = {
    poApproved:        !!stageObj(7)?.completedAt || !!stageObj(8)?.completedAt,
    materialReceived:  !!stageObj(11)?.completedAt,
    inspectionDone:    !!stageObj(12)?.completedAt,
    billCreated:       !!meta18?.billNumber,
    tallyDone:         !!meta19?.voucherNo,
    billL1Approved:    !!stageObj(20)?.completedAt,
    billL2Approved:    !!stageObj(21)?.completedAt,
    vendorAvailable:   !!(meta6?.poItems?.[0]?.vendor || meta16?.vendorName),
  };
  const prereqLabels: Record<keyof typeof prereqs, string> = {
    poApproved: 'PO Approved', materialReceived: 'Material Received', inspectionDone: 'Inspection Completed',
    billCreated: 'Bill Created', tallyDone: 'Tally Entry Completed', billL1Approved: 'Bill Approval L1 Approved',
    billL2Approved: 'Bill Approval L2 Approved', vendorAvailable: 'Vendor Details Available',
  };
  const allPrereqs = Object.values(prereqs).every(Boolean);

  // Payment advice form
  const [adviceNo, setAdviceNo]         = useState('');
  const [payDate, setPayDate]           = useState('');
  const [vendorName, setVendorName]     = useState(meta6?.poItems?.[0]?.vendor || meta16?.vendorName || '');
  const [bankDetails, setBankDetails]   = useState('');
  const [invoiceNo, setInvoiceNo]       = useState(meta16?.billNumber || '');
  const [poNo, setPoNo]                 = useState(meta6?.poNumber || '');
  const [billNo, setBillNo]             = useState(meta18?.billNumber || meta16?.billNumber || '');
  const [tallyVoucher, setTallyVoucher] = useState(meta19?.voucherNo || '');
  const [payableAmt, setPayableAmt]     = useState(String(billAmt + taxAmt || ''));
  const [tdsAmt, setTdsAmt]             = useState('');
  const [gstAmt, setGstAmt]             = useState(String(taxAmt || ''));
  const [payMode, setPayMode]           = useState('NEFT');

  const payable   = parseFloat(payableAmt) || 0;
  const tds       = parseFloat(tdsAmt) || 0;
  const gst       = parseFloat(gstAmt) || 0;
  const netPayment = payable - tds;
  const remarksOk = remarksText.trim().length >= 3;

  const validation = validateFields([
    ...Object.entries(prereqs).map(([k, v]) => ({ label: prereqLabels[k as keyof typeof prereqs], valid: v })),
    { label: 'Payment Advice Number', valid: adviceNo.trim().length >= 1 },
    { label: 'Payment Date', valid: payDate.trim().length >= 1 },
    { label: 'Vendor Name', valid: vendorName.trim().length >= 1 },
    { label: 'Vendor Bank Details', valid: bankDetails.trim().length >= 3 },
    { label: 'Invoice Number', valid: invoiceNo.trim().length >= 1 },
    { label: 'PO Number', valid: poNo.trim().length >= 1 },
    { label: 'Tally Voucher Number', valid: tallyVoucher.trim().length >= 1 },
    { label: 'Payable Amount', valid: payable > 0 },
    { label: 'Payment Remarks', valid: remarksOk },
  ]);

  const fields = {
    adviceNo, payDate, vendorName, bankDetails, invoiceNo, poNo, billNo, tallyVoucher,
    payableAmount: payableAmt, tdsAmount: tdsAmt, gstAmount: gstAmt, netPayment: netPayment.toFixed(2),
    payMode, remarks: remarksText, currency: poCurr,
    workflowStatus: 'COMPLETED', paymentStatus: 'RELEASED',
    generatedAt: new Date().toISOString(),
  };

  const ro: React.CSSProperties = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', fontSize: 12, background: 'var(--surface2)', color: 'var(--text-primary)', height: 37, display: 'flex', alignItems: 'center' };
  
  

  return (
    <div>
      {/* Header badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, padding: '12px 16px', borderRadius: 8, background: 'linear-gradient(135deg,#F0FDF4,#ECFDF5)', border: '2px solid #A7F3D0' }}>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18 }}>₹</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#065F46' }}>Payment Advice — Final Release</div>
          <div style={{ fontSize: 11, color: '#047857' }}>Ref: {procurement.referenceNo} · Vendor: {vendorName || '—'}</div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'right' as const }}>
          <div style={{ fontSize: 10, color: '#6B7280', textTransform: 'uppercase', fontWeight: 700 }}>Net Payment</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#059669' }}>{poCurr} {netPayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Prerequisite check panel */}
      <div style={{ border: '1px solid var(--border)', borderRadius: 8, marginBottom: 14, overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', background: allPrereqs ? '#F0FDF4' : '#FEF2F2', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: allPrereqs ? '#065F46' : '#DC2626' }}>
          {allPrereqs ? '✅ All Prerequisites Verified' : '🔴 Prerequisites Check'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0 }}>
          {Object.entries(prereqs).map(([k, v]) => (
            <div key={k} style={{ padding: '8px 12px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 13 }}>{v ? '🟢' : '🔴'}</span>
              <span style={{ fontSize: 11, color: v ? '#059669' : '#DC2626', fontWeight: 600 }}>{prereqLabels[k as keyof typeof prereqs]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Complete journey summary — collapsible sections */}
      <POReviewSection title="Procurement Journey Summary">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', marginBottom: 10 }}>
          <KV label="Indent No" value={procurement.referenceNo} />
          <KV label="Requestor" value={procurement.requestedBy?.fullName} />
          <KV label="PO Number" value={meta6?.poNumber} />
          <KV label="Vendor" value={meta6?.poItems?.[0]?.vendor || meta16?.vendorName} />
          <KV label="Total PO Value" value={totalPO > 0 ? `${poCurr} ${totalPO.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : undefined} />
          <KV label="Invoice Amount" value={billAmt > 0 ? `₹ ${billAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : undefined} />
          <KV label="Tax Amount" value={taxAmt > 0 ? `₹ ${taxAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : undefined} />
          <KV label="Bill Number" value={meta18?.billNumber || meta16?.billNumber} />
          <KV label="Tally Voucher" value={meta19?.voucherNo} />
          <KV label="Due Date" value={meta18?.dueDate ? fmtDate(meta18.dueDate) : undefined} />
          <KV label="Debit Note" value={meta15?.debitNoteNo} />
          <KV label="Debit Note Amt" value={meta15?.amount} />
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Bill Approval Remarks</div>
        <KV label="L1 Remarks" value={stageObj(20)?.remarks} />
        <KV label="L2 Remarks" value={stageObj(21)?.remarks} />

        {receiptItems.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', margin: '10px 0 4px' }}>Material Receipt</div>
            <table className="ifh-table" >
              <thead><tr style={{ background: 'var(--surface2)' }}>{['Item', 'Ordered', 'Received', 'Pending', 'GRN', 'Gate Entry'].map(h => <th key={h} >{h}</th>)}</tr></thead>
              <tbody>{receiptItems.map((r: any) => (
                <tr key={r.itemId}><td >{r.itemName}</td><td >{r.orderedQty}</td>
                  <td >{r.receivedQty}</td>
                  <td >{r.pendingQty}</td>
                  <td >{r.grnNo || '—'}</td><td >{r.gateEntryNo || '—'}</td></tr>
              ))}</tbody>
            </table>
          </>
        )}
      </POReviewSection>

      {/* Workflow timeline */}
      <POReviewSection title="Workflow Timeline">
        <table className="ifh-table" >
          <thead><tr style={{ background: 'var(--surface2)' }}>{['Stage', 'Status', 'Completed', 'TAT', 'Remarks'].map(h => <th key={h} >{h}</th>)}</tr></thead>
          <tbody>{procurement.stages.filter(s => s.stageNumber <= procurement.currentStage).map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td ><strong>{s.stageNumber}.</strong> {s.stageName}</td>
              <td ><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: s.status === 'COMPLETED' ? '#D1FAE5' : s.status === 'IN_PROGRESS' ? '#DBEAFE' : '#F3F4F6', color: s.status === 'COMPLETED' ? '#065F46' : s.status === 'IN_PROGRESS' ? '#1E40AF' : '#374151', fontWeight: 600 }}>{s.status}</span></td>
              <td >{fmtDate(s.completedAt)}</td>
              <td >{tat(s)}</td>
              <td >{s.remarks || '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </POReviewSection>

      {/* Payment Advice Form */}
      <div style={{ border: '2px solid #A7F3D0', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '9px 14px', background: '#F0FDF4', borderBottom: '1px solid #A7F3D0', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#065F46' }}>
          Payment Advice Details — Final Entry
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Payment Advice Number *</label>
              <input value={adviceNo} onChange={e => setAdviceNo(e.target.value)} placeholder="PA-2026-XXXX" className={inp} style={{ borderColor: adviceNo ? 'var(--border)' : '#FCA5A5' }} />
            </div>
            <div>
              <label style={labelStyle}>Payment Date *</label>
              <input type="date" value={payDate} onChange={e => setPayDate(e.target.value)} className={inp} style={{ borderColor: payDate ? 'var(--border)' : '#FCA5A5' }} />
            </div>
            <div>
              <label style={labelStyle}>Payment Mode</label>
              <select value={payMode} onChange={e => setPayMode(e.target.value)} className={sel} style={{ borderColor: 'var(--border)' }}>
                <option>NEFT</option><option>RTGS</option><option>IMPS</option><option>Cheque</option><option>DD</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Vendor Name *</label>
              <input value={vendorName} onChange={e => setVendorName(e.target.value)} placeholder="Vendor name" className={inp} style={{ borderColor: vendorName ? 'var(--border)' : '#FCA5A5' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Vendor Bank Details *</label>
              <input value={bankDetails} onChange={e => setBankDetails(e.target.value)} placeholder="Account No / IFSC / Bank Name" className={inp} style={{ borderColor: bankDetails.trim().length >= 3 ? 'var(--border)' : '#FCA5A5' }} />
            </div>
            <div>
              <label style={labelStyle}>Invoice Number *</label>
              <input value={invoiceNo} onChange={e => setInvoiceNo(e.target.value)} placeholder="VB-XXXX" className={inp} style={{ borderColor: invoiceNo ? 'var(--border)' : '#FCA5A5' }} />
            </div>
            <div>
              <label style={labelStyle}>PO Number *</label>
              <input value={poNo} onChange={e => setPoNo(e.target.value)} placeholder="PO-XXXX" className={inp} style={{ borderColor: poNo ? 'var(--border)' : '#FCA5A5' }} />
            </div>
            <div>
              <label style={labelStyle}>Bill Number</label>
              <input value={billNo} onChange={e => setBillNo(e.target.value)} placeholder="BILL-XXXX" className={inp} style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label style={labelStyle}>Tally Voucher Number *</label>
              <input value={tallyVoucher} onChange={e => setTallyVoucher(e.target.value)} placeholder="PV-XXXX" className={inp} style={{ borderColor: tallyVoucher ? 'var(--border)' : '#FCA5A5' }} />
            </div>
            <div>
              <label style={labelStyle}>Payable Amount ({poCurr}) *</label>
              <input type="number" min="0" step="any" value={payableAmt} onChange={e => setPayableAmt(e.target.value)} placeholder="0.00" className={inp} style={{ borderColor: payable > 0 ? 'var(--border)' : '#FCA5A5' }} />
            </div>
            <div>
              <label style={labelStyle}>TDS Amount ({poCurr})</label>
              <input type="number" min="0" step="any" value={tdsAmt} onChange={e => setTdsAmt(e.target.value)} placeholder="0.00" className={inp} style={{ borderColor: 'var(--border)' }} />
            </div>
            <div>
              <label style={labelStyle}>GST Amount ({poCurr})</label>
              <input type="number" min="0" step="any" value={gstAmt} onChange={e => setGstAmt(e.target.value)} placeholder="0.00" className={inp} style={{ borderColor: 'var(--border)' }} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={labelStyle}>Net Payment Amount ({poCurr})</label>
              <div style={{ ...ro, fontSize: 16, fontWeight: 800, color: '#059669', height: 42, border: '2px solid #A7F3D0', background: '#F0FDF4' }}>
                {poCurr} {netPayment.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attachments */}
      {procurement.attachments?.length > 0 && (
        <POReviewSection title="Attachments">
          {procurement.attachments.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, fontSize: 11 }}>
              <span style={{ color: '#0F7B45' }}>📎</span>
              <a href={a.fileUrl} target="_blank" rel="noreferrer" style={{ color: '#1D4ED8', textDecoration: 'underline' }}>{a.fileName}</a>
              <span style={{ color: 'var(--text-muted)' }}>— {a.uploadedBy?.fullName} · {fmtDate(a.createdAt)}</span>
            </div>
          ))}
        </POReviewSection>
      )}

      {/* Final action */}
      <div style={{ padding: '14px', border: '2px solid #059669', borderRadius: 8, background: '#F0FDF4', marginTop: 4 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#065F46', marginBottom: 10 }}>
          🟢 Final Payment Release — Workflow will be marked COMPLETED and archived after approval
        </div>
        <RemarksField value={remarksText} onChange={setRemarksText} />
        {!remarksOk && (
          <div style={{ marginTop: 6, padding: '7px 10px', borderRadius: 6, background: '#FEF2F2', border: '1px solid #FECACA', fontSize: 11, color: '#DC2626' }}>
            🔴 Payment Remarks are mandatory before releasing payment.
          </div>
        )}
        <div style={{ marginTop: 10 }}>
          <ValidationSummary items={validation.items} />
          <ActionRow actions={[
            { label: '✓ Approve Payment → Release & Archive', action: 'APPROVE', color: '#059669', loading: actionLoading, disabled: !validation.ok, onClick: () => onAction('APPROVE', fields) },
            { label: 'Hold Payment', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('HOLD', fields) },
            { label: 'Reject Payment', action: 'REJECT', color: '#DC2626', loading: actionLoading, disabled: !remarksOk, onClick: () => onAction('REJECT', fields) },
          ]} />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENERIC STAGE — fallback for stage 0 and any others
// ═══════════════════════════════════════════════════════════════════════════════
function GenericStageView({ actionLoading, onAction, remarksText, setRemarksText }: Props) {
  return (
    <div className="space-y-1">
      <ResponsibleRow />
      <RemarksField value={remarksText} onChange={setRemarksText} />
      <FMSTiming />
      <ActionRow actions={[
        { label: 'Submit & Move Forward', action: 'SUBMIT', color: '#059669', loading: actionLoading, disabled: !remarksText, onClick: () => onAction('SUBMIT') },
        { label: 'Approve & Move Forward', action: 'APPROVE', color: '#0F7B45', loading: actionLoading, disabled: !remarksText, onClick: () => onAction('APPROVE') },
        { label: 'Hold', action: 'HOLD', color: '#D97706', loading: actionLoading, disabled: !remarksText, onClick: () => onAction('HOLD') },
      ]} />
    </div>
  );
}

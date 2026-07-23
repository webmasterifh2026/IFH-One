'use client';

import { useState, useEffect, use } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';

function buildApiUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const apiPath = normalizedPath.startsWith('/api/')
    ? normalizedPath
    : `/api${normalizedPath}`;
  return base ? `${base}${apiPath}` : apiPath;
}

interface RfqItem {
  id: string;
  itemCode?: string;
  itemName: string;
  quantity?: number;
  uom?: string;
  make?: string;
  description?: string;
  itemRemarks?: string;
  unitWeight?: number;
  totalWeight?: number;
}

interface QuotationItem {
  rfqFloatItemId: string;
  itemCode?: string;
  itemName: string;
  quantity?: number;
  uom?: string;
  unitRate: number;
  discountPercentage: number;
  discountAmount: number;
  gstPercentage: number;
  gstAmount: number;
  delivery: string;
  itemRemarks: string;
  totalAmount: number;
  unitWeight?: number;
  totalWeight?: number;
}

export default function RfqFloatVendorPortalPage({
  params,
}: {
  params: Promise<{ rfqNumber: string; vendorId: string }>;
}) {
  const { rfqNumber, vendorId } = use(params);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rfqData, setRfqData] = useState<any>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    termsAndConditions: '',
    deliveryBasis: 'Ex-Works',
    paymentTerms: '30 days net',
    warranty: '12 months',
    quotationMode: 'FIRM',
    remarks: '',
  });

  const [items, setItems] = useState<QuotationItem[]>([]);

  const [expandedSections, setExpandedSections] = useState({
    rfqDetails: true,
    items: true,
    commercial: true,
    declaration: true,
  });

  const toggleSection = (s: keyof typeof expandedSections) =>
    setExpandedSections((p) => ({ ...p, [s]: !p[s] }));

  useEffect(() => {
    loadForm();
  }, [rfqNumber, vendorId]);

  async function loadForm() {
    setLoading(true);
    try {
      const res = await fetch(
        buildApiUrl(`/rfq-float/vendor-portal/${rfqNumber}/${vendorId}`),
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error ${res.status}`);
      }
      const data = await res.json();
      setRfqData(data);
      setAlreadySubmitted(data.alreadySubmitted);

      // Initialize line items
      const lineItems: QuotationItem[] = (data.rfqFloat?.items || []).map(
        (item: RfqItem) => ({
          rfqFloatItemId: item.id,
          itemCode: item.itemCode || '',
          itemName: item.itemName,
          quantity: Number(item.quantity) || 1,
          uom: item.uom || '',
          unitRate: 0,
          discountPercentage: 0,
          discountAmount: 0,
          gstPercentage: 18,
          gstAmount: 0,
          delivery: '',
          itemRemarks: '',
          totalAmount: 0,
        }),
      );
      setItems(lineItems);
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('not found') || msg.includes('404')) {
        setError('Invalid vendor access link or RFQ not found.');
      } else {
        setError(msg || 'Failed to load RFQ');
      }
    } finally {
      setLoading(false);
    }
  }

  function recalcItem(item: QuotationItem): QuotationItem {
    const base = item.unitRate * (item.quantity || 1);
    const discAmt = base * (item.discountPercentage / 100);
    const afterDisc = base - discAmt;
    const gstAmt = afterDisc * (item.gstPercentage / 100);
    const total = afterDisc + gstAmt;
    return {
      ...item,
      discountAmount: Math.round(discAmt * 100) / 100,
      gstAmount: Math.round(gstAmt * 100) / 100,
      totalAmount: Math.round(total * 100) / 100,
    };
  }

  function updateItem(idx: number, field: keyof QuotationItem, value: any) {
    setItems((prev) => {
      const next = [...prev];
      next[idx] = recalcItem({ ...next[idx], [field]: Number(value) || value });
      return next;
    });
  }

  const grandTotal = items.reduce((s, i) => s + (i.totalAmount || 0), 0);

  async function handleSubmit() {
    if (items.some((i) => i.unitRate <= 0)) {
      alert('Please enter unit rate for all items.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        buildApiUrl(`/rfq-float/vendor-portal/${rfqNumber}/${vendorId}/submit`),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...formData, items }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Error ${res.status}`);
      }
      setSuccess(true);
    } catch (err: any) {
      alert(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center">
          <div className="animate-spin h-14 w-14 rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto mb-5" />
          <p className="text-gray-600 font-semibold text-lg">Loading RFQ Form…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Unable to Load RFQ</h2>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Quotation Submitted!</h2>
          <p className="text-gray-600 mb-4">
            Your quotation for <strong>{rfqNumber}</strong> has been received successfully.
          </p>
          <p className="text-sm text-gray-500">Grand Total: <strong className="text-emerald-600">₹{grandTotal.toLocaleString('en-IN')}</strong></p>
          <p className="text-xs text-gray-400 mt-4">You can close this window.</p>
        </div>
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center">
          <CheckCircle2 className="w-14 h-14 text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Already Submitted</h2>
          <p className="text-gray-600 text-sm">
            Your quotation for <strong>{rfqNumber}</strong> has already been submitted. You can close this window.
          </p>
        </div>
      </div>
    );
  }

  const rfq = rfqData?.rfqFloat;
  const vendor = rfqData?.vendor;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-6 text-white shadow-xl">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-1">Request for Quotation</h1>
              <p className="text-blue-200 text-lg font-mono">{rfq?.rfqNumber}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-blue-200">Vendor</p>
              <p className="font-semibold text-base">{vendor?.vendorName}</p>
              <p className="text-blue-200 text-xs mt-1">{vendor?.vendorCode}</p>
            </div>
          </div>
        </div>

        {/* RFQ Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('rfqDetails')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-base font-semibold text-gray-900">RFQ Details</h2>
            {expandedSections.rfqDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.rfqDetails && (
            <div className="px-6 py-4 border-t border-gray-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'RFQ Date', value: rfq?.rfqDate ? new Date(rfq.rfqDate).toLocaleDateString('en-IN') : '—' },
                  { label: 'Submission Deadline', value: rfq?.submissionDeadline ? new Date(rfq.submissionDeadline).toLocaleDateString('en-IN') : '—' },
                  { label: 'Expected Delivery', value: rfq?.expectedDeliveryDate ? new Date(rfq.expectedDeliveryDate).toLocaleDateString('en-IN') : '—' },
                  { label: 'Delivery Location', value: rfq?.deliveryLocation || '—' },
                ].map((f) => (
                  <div key={f.label}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{f.label}</p>
                    <p className="text-sm text-gray-800 mt-1">{f.value}</p>
                  </div>
                ))}
              </div>
              {rfq?.remarks && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 uppercase mb-1">RFQ Remarks</p>
                  <p className="text-sm text-amber-800">{rfq.remarks}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Items Quotation Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('items')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-base font-semibold text-gray-900">Quotation Items ({items.length})</h2>
            {expandedSections.items ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.items && (
            <div className="border-t border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                    <th className="px-3 py-3 text-left w-8">#</th>
                    <th className="px-3 py-3 text-left">Item</th>
                    <th className="px-3 py-3 text-right">Qty</th>
                    <th className="px-3 py-3 text-left">UOM</th>
                    <th className="px-3 py-3 text-right">Weight</th>
                    <th className="px-3 py-3 text-right">Unit Rate (₹) *</th>
                    <th className="px-3 py-3 text-right">Disc %</th>
                    <th className="px-3 py-3 text-right">GST %</th>
                    <th className="px-3 py-3 text-right">Total (₹)</th>
                    <th className="px-3 py-3 text-left">Delivery</th>
                    <th className="px-3 py-3 text-left">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-t border-gray-100 hover:bg-blue-50/30">
                      <td className="px-3 py-3 text-gray-500 text-xs">{idx + 1}</td>
                      <td className="px-3 py-3">
                        <p className="font-medium text-gray-800">{item.itemName}</p>
                        {item.itemCode && <p className="text-xs text-gray-400">{item.itemCode}</p>}
                        {item.itemRemarks && <p className="text-xs text-amber-600 mt-1">Note: {item.itemRemarks}</p>}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-700">{item.quantity}</td>
                      <td className="px-3 py-3 text-gray-600">{item.uom || '—'}</td>
                      <td className="px-3 py-3 text-right text-gray-500 text-xs">
                        {item.unitWeight ? (
                          <>
                            <div>{item.unitWeight} / unit</div>
                            <div className="font-semibold mt-0.5">Total: {item.totalWeight}</div>
                          </>
                        ) : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={item.unitRate || ''}
                          onChange={(e) => updateItem(idx, 'unitRate', e.target.value)}
                          placeholder="0.00"
                          className="w-28 text-right px-2 py-1 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={item.discountPercentage || ''}
                          onChange={(e) => updateItem(idx, 'discountPercentage', e.target.value)}
                          placeholder="0"
                          className="w-16 text-right px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step={0.1}
                          value={item.gstPercentage}
                          onChange={(e) => updateItem(idx, 'gstPercentage', e.target.value)}
                          className="w-16 text-right px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-emerald-700">
                        {item.totalAmount > 0 ? `₹${item.totalAmount.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.delivery}
                          onChange={(e) => updateItem(idx, 'delivery', e.target.value)}
                          placeholder="e.g. 4 weeks"
                          className="w-24 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.itemRemarks}
                          onChange={(e) => updateItem(idx, 'itemRemarks', e.target.value)}
                          placeholder="Optional"
                          className="w-32 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                        />
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-300 bg-emerald-50">
                    <td colSpan={7} className="px-3 py-3 text-right font-semibold text-gray-700">Grand Total</td>
                    <td className="px-3 py-3 text-right font-bold text-emerald-700 text-base">
                      ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Commercial Terms */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('commercial')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <h2 className="text-base font-semibold text-gray-900">Commercial Terms</h2>
            {expandedSections.commercial ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expandedSections.commercial && (
            <div className="px-6 py-4 border-t border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Delivery Basis', key: 'deliveryBasis', placeholder: 'e.g. Ex-Works, FOR, CIF' },
                  { label: 'Payment Terms', key: 'paymentTerms', placeholder: 'e.g. 30 days net' },
                  { label: 'Warranty', key: 'warranty', placeholder: 'e.g. 12 months' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">{f.label}</label>
                    <input
                      type="text"
                      value={(formData as any)[f.key]}
                      onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5">Terms & Conditions / Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData((p) => ({ ...p, remarks: e.target.value }))}
                  rows={3}
                  placeholder="Any special terms, conditions, or additional information..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">Grand Total: <span className="text-emerald-600">₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
              <p className="text-xs text-gray-500 mt-1">{items.length} item(s) · {rfq?.rfqNumber}</p>
            </div>
            <button
              onClick={handleSubmit}
              disabled={submitting || grandTotal === 0}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              {submitting ? 'Submitting…' : 'Submit Quotation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

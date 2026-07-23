'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/ui/page-header';
import { Send, ArrowLeft, FileText, TrendingUp, MessageSquare, Activity, Mail, Check, X } from 'lucide-react';
import * as rfqFloatApi from '@/lib/api/rfq-float';

type TabType = 'overview' | 'tce' | 'negotiation' | 'activity' | 'email';

export default function RfqFloatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [rfqFloat, setRfqFloat] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState('');

  useEffect(() => {
    loadRfqFloat();
  }, [id]);

  async function loadRfqFloat() {
    try {
      const data = await rfqFloatApi.getRfqFloat(id);
      setRfqFloat(data);
    } catch (err) {
      console.error('Failed to load RFQ Float:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendToVendors() {
    setSending(true);
    try {
      await rfqFloatApi.sendRfqToVendors(id);
      setSendSuccess('RFQ sent to vendors successfully!');
      loadRfqFloat();
    } catch (err: any) {
      console.error('Failed to send:', err);
    } finally {
      setSending(false);
    }
  }

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'overview', label: 'Overview', icon: FileText },
    { key: 'tce', label: 'TCE', icon: TrendingUp },
    { key: 'negotiation', label: 'Negotiation', icon: MessageSquare },
    { key: 'activity', label: 'Activity Log', icon: Activity },
    { key: 'email', label: 'Email Log', icon: Mail },
  ];

  if (loading) {
    return (
      <div className="page-content">
        <div className="text-center py-12 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!rfqFloat) {
    return (
      <div className="page-content">
        <div className="text-center py-12 text-red-500">RFQ Float not found</div>
      </div>
    );
  }

  return (
    <div className="page-content max-w-6xl mx-auto">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.push('/rfq-float')} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <PageHeader
          title={`RFQ ${rfqFloat.rfqNumber}`}
          description={`Status: ${rfqFloat.status} · ${rfqFloat.vendors?.length || 0} vendors · ${rfqFloat.items?.length || 0} items`}
        />
        <div className="flex gap-2 ml-auto">
          {rfqFloat.status === 'FLOATED' && (
            <button
              onClick={handleSendToVendors}
              disabled={sending}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
            >
              <Send className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send to Vendors'}
            </button>
          )}
        </div>
      </div>

      {sendSuccess && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-sm text-emerald-700">
          <Check className="w-4 h-4" /> {sendSuccess}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab rfqFloat={rfqFloat} />}
      {activeTab === 'tce' && <TCETab rfqFloatId={id} />}
      {activeTab === 'negotiation' && <NegotiationTab rfqFloatId={id} />}
      {activeTab === 'activity' && <ActivityTab rfqFloatId={id} />}
      {activeTab === 'email' && <EmailTab rfqFloatId={id} />}
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────
function OverviewTab({ rfqFloat }: { rfqFloat: any }) {
  return (
    <div className="space-y-6">
      {/* RFQ Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">RFQ Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">RFQ Number</p>
            <p className="text-sm font-medium text-gray-900 mt-1">{rfqFloat.rfqNumber}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">RFQ Date</p>
            <p className="text-sm text-gray-700 mt-1">{new Date(rfqFloat.rfqDate).toLocaleDateString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Submission Deadline</p>
            <p className="text-sm text-gray-700 mt-1">{rfqFloat.submissionDeadline ? new Date(rfqFloat.submissionDeadline).toLocaleDateString('en-IN') : '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Expected Delivery Date</p>
            <p className="text-sm text-gray-700 mt-1">{rfqFloat.expectedDeliveryDate ? new Date(rfqFloat.expectedDeliveryDate).toLocaleDateString('en-IN') : '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase">Filled By</p>
            <p className="text-sm text-gray-700 mt-1">{rfqFloat.filledBy?.fullName || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Delivery Location</p>
            <p className="text-sm text-gray-700 mt-1">{rfqFloat.deliveryLocation || '—'}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-semibold text-gray-500 uppercase">Status</p>
            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-semibold ${
              rfqFloat.status === 'FLOATED' ? 'bg-blue-100 text-blue-700' :
              rfqFloat.status === 'SENT' ? 'bg-emerald-100 text-emerald-700' :
              'bg-gray-100 text-gray-700'
            }`}>{rfqFloat.status}</span>
          </div>
        </div>
        {rfqFloat.remarks && (
          <div className="mt-4">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">RFQ Remarks</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{rfqFloat.remarks}</p>
          </div>
        )}
      </div>

      {/* Products */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Products ({rfqFloat.items?.length || 0})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Item Code</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Description</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Make</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">UOM</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Unit Wt.</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Total Wt.</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rfqFloat.items?.map((item: any) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-mono text-xs text-gray-500">{item.itemCode || '—'}</td>
                  <td className="px-3 py-2 text-gray-700">{item.itemName}</td>
                  <td className="px-3 py-2 text-gray-600">{item.make || '—'}</td>
                  <td className="px-3 py-2 text-right font-medium">{Number(item.quantity).toLocaleString()}</td>
                  <td className="px-3 py-2 text-gray-600">{item.uom || '—'}</td>
                  <td className="px-3 py-2 text-right">{item.unitWeight ? Number(item.unitWeight).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2 text-right">{item.totalWeight ? Number(item.totalWeight).toLocaleString() : '—'}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{item.itemRemarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Vendors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vendors ({rfqFloat.vendors?.length || 0})</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rfqFloat.vendors?.map((v: any) => (
            <div key={v.id} className="border border-gray-200 rounded-lg p-3">
              <p className="font-medium text-gray-900">{v.vendorName}</p>
              <p className="text-xs text-gray-500 mt-1">{v.vendorCode || '—'}</p>
              {v.email && <p className="text-xs text-gray-500">{v.email}</p>}
              {v.phone && <p className="text-xs text-gray-500">{v.phone}</p>}
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-xs font-medium ${
                v.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                v.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>{v.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── TCE Tab ──────────────────────────────────────────────────────────────
function TCETab({ rfqFloatId }: { rfqFloatId: string }) {
  const [comparison, setComparison] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadComparison = async () => {
    try {
      const data = await rfqFloatApi.getTCEComparison(rfqFloatId);
      setComparison(data);
    } catch (err) {
      console.error('Failed to load TCE comparison:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComparison();
  }, [rfqFloatId]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading TCE data...</div>;
  if (!comparison || comparison.vendors?.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-700 mb-1">No Quotations Yet</h3>
        <p className="text-sm text-gray-500">Vendor responses will appear here once submitted.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quotation Comparison</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs font-semibold text-blue-600 uppercase">Vendors Responded</p>
            <p className="text-2xl font-bold text-blue-700">{comparison.vendors?.length || 0}</p>
          </div>
          {comparison.highlights?.lowestGrandTotal && (
            <div className="bg-emerald-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-emerald-600 uppercase">Lowest Total</p>
              <p className="text-lg font-bold text-emerald-700">{comparison.highlights.lowestGrandTotal.vendor}</p>
              <p className="text-sm text-emerald-600">₹{Number(comparison.highlights.lowestGrandTotal.total).toLocaleString('en-IN')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
              {comparison.vendors?.map((v: any) => (
                <th key={v.tceId} className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase border-l">
                  {v.vendorName}
                  <span className="block text-[10px] font-normal text-gray-400">₹{v.grandTotal ? Number(v.grandTotal).toLocaleString('en-IN') : '—'}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.products?.map((product: any) => (
              <tr key={product.productId} className="border-t border-gray-100">
                <td className="px-3 py-3 font-medium text-gray-700">
                  {product.itemName}
                  <span className="block text-xs text-gray-500">{product.itemCode} · Qty: {Number(product.quantity).toLocaleString()} {product.uom}</span>
                  {product.totalWeight && (
                    <span className="block text-xs text-gray-500 mt-1">Wt: {product.totalWeight} ({product.unitWeight}/unit)</span>
                  )}
                  {product.itemRemarks && (
                    <span className="block text-xs text-amber-600 mt-1">Note: {product.itemRemarks}</span>
                  )}
                </td>
                {comparison.vendors?.map((v: any) => {
                  const vData = product.vendors?.[v.vendorName];
                  const isLowest = product.lowestRate?.vendor === v.vendorName;
                  return (
                    <td key={v.tceId} className={`px-3 py-3 text-center border-l ${isLowest ? 'bg-emerald-50' : ''}`}>
                      {vData ? (
                        <>
                          <p className={`font-semibold ${isLowest ? 'text-emerald-600' : 'text-gray-900'}`}>
                            ₹{Number(vData.rate || 0).toLocaleString('en-IN')}
                          </p>
                          <p className="text-xs text-gray-500">Disc: {vData.discount || 0}%</p>
                          <p className="text-xs text-gray-500">GST: {vData.gst || 0}%</p>
                          {isLowest && <span className="text-[10px] font-bold text-emerald-600">★ Lowest</span>}
                        </>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Negotiation Tab ──────────────────────────────────────────────────────
function NegotiationTab({ rfqFloatId }: { rfqFloatId: string }) {
  const [negotiations, setNegotiations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNegotiations = async () => {
    try {
      const data = await rfqFloatApi.getNegotiations(rfqFloatId);
      setNegotiations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load negotiations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNegotiations();
  }, [rfqFloatId]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  if (negotiations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-gray-700 mb-1">No Negotiations</h3>
        <p className="text-sm text-gray-500">Start negotiation after receiving vendor quotations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {negotiations.map((neg: any) => (
        <div key={neg.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">{neg.vendorName}</h3>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                neg.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' :
                neg.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                'bg-gray-100 text-gray-600'
              }`}>{neg.status}</span>
            </div>
            {neg.remarks && <p className="text-sm text-gray-500 max-w-md text-right">{neg.remarks}</p>}
          </div>

          {neg.items?.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Item</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Original Rate</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Negotiated Rate</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Final Rate</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Discount %</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Delivery</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {neg.items.map((item: any) => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-700">{item.itemName}</td>
                      <td className="px-3 py-2 text-right">{item.originalRate ? `₹${Number(item.originalRate).toLocaleString('en-IN')}` : '—'}</td>
                      <td className="px-3 py-2 text-right font-medium text-blue-600">{item.negotiatedRate ? `₹${Number(item.negotiatedRate).toLocaleString('en-IN')}` : '—'}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-600">{item.finalRate ? `₹${Number(item.finalRate).toLocaleString('en-IN')}` : '—'}</td>
                      <td className="px-3 py-2 text-right">{item.discountPercentage || 0}%</td>
                      <td className="px-3 py-2 text-gray-600">{item.deliveryTerms || '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{item.paymentTerms || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Activity Tab ─────────────────────────────────────────────────────────
function ActivityTab({ rfqFloatId }: { rfqFloatId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      const data = await rfqFloatApi.getActivityLogs(rfqFloatId);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [rfqFloatId]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Log</h3>
      {logs.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No activity recorded yet.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log: any) => (
            <div key={log.id} className="flex items-start gap-3 pb-3 border-b border-gray-100 last:border-0">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-2 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{log.action?.replace(/_/g, ' ')}</p>
                {log.description && <p className="text-xs text-gray-500 mt-0.5">{log.description}</p>}
              </div>
              <p className="text-xs text-gray-400 flex-shrink-0">{new Date(log.createdAt).toLocaleString('en-IN')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Email Tab ────────────────────────────────────────────────────────────
function EmailTab({ rfqFloatId }: { rfqFloatId: string }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLogs = async () => {
    try {
      const data = await rfqFloatApi.getEmailLogs(rfqFloatId);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load email logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [rfqFloatId]);

  if (loading) return <div className="text-center py-8 text-gray-500">Loading...</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Log</h3>
      {logs.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No emails sent yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Recipient</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Subject</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-gray-700">{log.emailType?.replace(/_/g, ' ')}</td>
                  <td className="px-3 py-2 text-gray-600">{log.recipientEmail}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-[300px] truncate">{log.subject}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      log.deliveryStatus === 'SENT' ? 'bg-emerald-100 text-emerald-700' :
                      log.deliveryStatus === 'FAILED' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{log.deliveryStatus}</span>
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{new Date(log.sentAt).toLocaleString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
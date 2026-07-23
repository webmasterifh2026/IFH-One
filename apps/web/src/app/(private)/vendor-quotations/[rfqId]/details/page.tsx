'use client';

import { useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft, Download, Send, CheckCircle2, XCircle, AlertCircle, Clock,
  MessageSquare, TrendingUp, FileText, ThumbsUp, ThumbsDown
} from 'lucide-react';
import Link from 'next/link';
import {
  useQuotation,
  useUpdateQuotationStatus,
  useSendCounterOffer,
  useShortlistVendor,
  useSelectVendor,
  useRejectVendor,
  useNegotiationHistory,
} from '@/hooks/useVendorRFQ';
import { PageHeader } from '@/components/ui/page-header';
import { EnterpriseCard } from '@/components/ui/enterprise-card';
import { formatDate } from '@/lib/procurement-stages';

export default function QuotationDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const quotationId = searchParams.get('id') as string;

  const { data: quotation, isLoading } = useQuotation(quotationId);
  const { data: negotiationHistory } = useNegotiationHistory(quotationId);
  const updateStatusMutation = useUpdateQuotationStatus();
  const sendCounterOfferMutation = useSendCounterOffer();
  const shortlistMutation = useShortlistVendor();
  const selectMutation = useSelectVendor();
  const rejectMutation = useRejectVendor();

  const [expandedSections, setExpandedSections] = useState({
    items: true,
    attachments: true,
    negotiation: true,
  });

  const [showCounterOfferForm, setShowCounterOfferForm] = useState(false);
  const [counterOfferAmount, setCounterOfferAmount] = useState(quotation?.grandTotalAmount || 0);
  const [counterOfferTerms, setCounterOfferTerms] = useState('');
  const [actionInProgress, setActionInProgress] = useState(false);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleCounterOffer = async () => {
    if (!quotation || !quotationId) return;
    setActionInProgress(true);
    try {
      await sendCounterOfferMutation.mutateAsync({
        quotationId,
        data: {
          counterOfferAmount,
          counterOfferTerms,
        },
      });
      setShowCounterOfferForm(false);
      setCounterOfferTerms('');
    } catch (err) {
      console.error('Failed to send counter-offer:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleShortlist = async () => {
    if (!quotationId) return;
    setActionInProgress(true);
    try {
      await shortlistMutation.mutateAsync({ quotationId });
    } catch (err) {
      console.error('Failed to shortlist:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleSelect = async () => {
    if (!quotationId) return;
    setActionInProgress(true);
    try {
      await selectMutation.mutateAsync({ quotationId });
    } catch (err) {
      console.error('Failed to select vendor:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  const handleReject = async () => {
    if (!quotationId || !confirm('Are you sure you want to reject this quotation?')) return;
    setActionInProgress(true);
    try {
      await rejectMutation.mutateAsync({ quotationId });
    } catch (err) {
      console.error('Failed to reject:', err);
    } finally {
      setActionInProgress(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-200 rounded-lg w-1/3" />
          <div className="h-40 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="text-lg font-semibold text-red-900">Quotation Not Found</h3>
            <p className="text-red-800 mt-1">The requested quotation could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    SUBMITTED: 'bg-blue-50 text-blue-700 border-blue-200',
    UNDER_REVIEW: 'bg-purple-50 text-purple-700 border-purple-200',
    UNDER_NEGOTIATION: 'bg-orange-50 text-orange-700 border-orange-200',
    NEGOTIATION_COMPLETE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    SHORTLISTED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    SELECTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
  };

  const statusClass = statusColors[quotation.quotationStatus] || statusColors.SUBMITTED;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/vendor-quotations/${quotation.rfqId}`}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quotation Details</h1>
            <p className="text-gray-500 mt-1">{quotation.quotationNumber}</p>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-lg border ${statusClass}`}>
          <p className="text-sm font-semibold">{quotation.quotationStatus}</p>
        </div>
      </div>

      {/* Summary Card */}
      <EnterpriseCard className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Vendor</p>
            <p className="text-lg font-semibold text-gray-900">{quotation.vendorForm?.vendorName}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Grand Total</p>
            <p className="text-lg font-bold text-gray-900">₹{quotation.grandTotalAmount?.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Submitted</p>
            <p className="text-sm text-gray-900">{formatDate(quotation.submittedAt)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Payment Terms</p>
            <p className="text-sm text-gray-900">{quotation.paymentTerms || '—'}</p>
          </div>
        </div>
      </EnterpriseCard>

      {/* Line Items */}
      <EnterpriseCard className="overflow-hidden">
        <button
          onClick={() => toggleSection('items')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
        >
          <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
          <span className="text-gray-400">{expandedSections.items ? '▼' : '▶'}</span>
        </button>
        {expandedSections.items && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-gray-200 bg-gray-50/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600">Item</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Qty</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Rate</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Discount</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">GST</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotation.lineItems?.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{item.itemName}</p>
                        {item.itemCode && <p className="text-xs text-gray-500">{item.itemCode}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-right text-gray-900">
                      {item.quantity} {item.unitOfMeasure}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-900">₹{item.quotedRate}</td>
                    <td className="px-6 py-3 text-right text-gray-700">{item.discountPercentage}%</td>
                    <td className="px-6 py-3 text-right text-gray-700">{item.gstPercentage}%</td>
                    <td className="px-6 py-3 text-right font-semibold text-gray-900">
                      ₹{item.totalAmount?.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </EnterpriseCard>

      {/* Attachments */}
      {quotation.attachments && quotation.attachments.length > 0 && (
        <EnterpriseCard className="overflow-hidden">
          <button
            onClick={() => toggleSection('attachments')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h2 className="text-lg font-semibold text-gray-900">Attachments</h2>
            <span className="text-gray-400">{expandedSections.attachments ? '▼' : '▶'}</span>
          </button>
          {expandedSections.attachments && (
            <div className="px-6 py-4 border-t border-gray-200 space-y-2">
              {quotation.attachments.map((att) => (
                <a
                  key={att.id}
                  href={att.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <FileText className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{att.fileName}</p>
                    <p className="text-xs text-gray-500">{att.documentType}</p>
                  </div>
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </a>
              ))}
            </div>
          )}
        </EnterpriseCard>
      )}

      {/* Negotiation History */}
      {negotiationHistory && negotiationHistory.length > 0 && (
        <EnterpriseCard className="overflow-hidden">
          <button
            onClick={() => toggleSection('negotiation')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
          >
            <h2 className="text-lg font-semibold text-gray-900">Negotiation History</h2>
            <span className="text-gray-400">{expandedSections.negotiation ? '▼' : '▶'}</span>
          </button>
          {expandedSections.negotiation && (
            <div className="px-6 py-4 border-t border-gray-200 space-y-4">
              {negotiationHistory.map((round, idx) => (
                <div key={round.id} className="pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-gray-900">Round {round.roundNumber}</p>
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded">
                      {round.vendorResponseStatus}
                    </span>
                  </div>
                  {round.counterOfferAmount && (
                    <p className="text-sm text-gray-700 mb-2">
                      Counter-offer: <span className="font-semibold">₹{round.counterOfferAmount.toLocaleString('en-IN')}</span>
                    </p>
                  )}
                  {round.counterOfferTerms && (
                    <p className="text-sm text-gray-700">{round.counterOfferTerms}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </EnterpriseCard>
      )}

      {/* Counter-Offer Form */}
      {showCounterOfferForm && quotation.quotationStatus !== 'SELECTED' && quotation.quotationStatus !== 'REJECTED' && (
        <EnterpriseCard className="p-6 border-2 border-blue-200 bg-blue-50/50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Send Counter-Offer</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Counter-Offer Amount</label>
              <input
                type="number"
                value={counterOfferAmount}
                onChange={(e) => setCounterOfferAmount(parseFloat(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-2">Terms & Conditions</label>
              <textarea
                value={counterOfferTerms}
                onChange={(e) => setCounterOfferTerms(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg min-h-[100px] resize-none"
                placeholder="Enter any additional terms or conditions..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowCounterOfferForm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCounterOffer}
                disabled={actionInProgress}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send Offer
              </button>
            </div>
          </div>
        </EnterpriseCard>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 flex-wrap">
        {quotation.quotationStatus === 'SUBMITTED' && (
          <>
            <button
              onClick={() => setShowCounterOfferForm(!showCounterOfferForm)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 text-orange-600 font-semibold hover:bg-orange-100 border border-orange-200 transition-colors"
              disabled={actionInProgress}
            >
              <MessageSquare className="w-4 h-4" />
              Counter-Offer
            </button>
            <button
              onClick={handleShortlist}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 font-semibold hover:bg-blue-100 border border-blue-200 transition-colors"
              disabled={actionInProgress}
            >
              <ThumbsUp className="w-4 h-4" />
              Shortlist
            </button>
            <button
              onClick={handleReject}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 text-red-600 font-semibold hover:bg-red-100 border border-red-200 transition-colors"
              disabled={actionInProgress}
            >
              <ThumbsDown className="w-4 h-4" />
              Reject
            </button>
          </>
        )}
        {quotation.quotationStatus === 'SHORTLISTED' && (
          <button
            onClick={handleSelect}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition-colors"
            disabled={actionInProgress}
          >
            <CheckCircle2 className="w-4 h-4" />
            Select Vendor
          </button>
        )}
      </div>
    </div>
  );
}

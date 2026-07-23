'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Download, BarChart3, Search, Filter, CheckCircle2, XCircle,
  AlertCircle, Clock, TrendingDown, DollarSign, Zap, Send, Eye, MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { useQuotationComparison, useQuotationsForRFQ } from '@/hooks/useVendorRFQ';
import { PageHeader } from '@/components/ui/page-header';
import { EnterpriseCard } from '@/components/ui/enterprise-card';
import { formatDate } from '@/lib/procurement-stages';

export default function VendorQuotationsPage() {
  const params = useParams();
  const rfqId = params.rfqId as string;

  const { data: comparison, isLoading } = useQuotationComparison(rfqId);
  const { data: quotations } = useQuotationsForRFQ(rfqId);

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'delivery' | 'rating'>('price');

  if (isLoading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-12 bg-gray-200 rounded-lg w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-yellow-900">No Quotations Yet</h3>
            <p className="text-yellow-800 mt-1">No vendor quotations have been submitted for this RFQ yet.</p>
          </div>
        </div>
      </div>
    );
  }

  const sortedQuotations = [...(comparison.quotations || [])].sort((a, b) => {
    if (sortBy === 'price') return a.grandTotal - b.grandTotal;
    if (sortBy === 'delivery') return (a.leadTime || 0) - (b.leadTime || 0);
    return 0;
  });

  const lowestPrice = Math.min(...sortedQuotations.map(q => q.grandTotal));
  const fastestDelivery = Math.min(...sortedQuotations.map(q => q.leadTime || Infinity));

  const stats = [
    {
      label: 'Total Quotations',
      value: comparison.totalQuotations,
      icon: BarChart3,
      color: 'text-blue-600 bg-blue-50',
    },
    {
      label: 'Lowest Price',
      value: `₹${lowestPrice.toLocaleString('en-IN')}`,
      icon: TrendingDown,
      color: 'text-emerald-600 bg-emerald-50',
    },
    {
      label: 'Fastest Delivery',
      value: `${fastestDelivery} days`,
      icon: Zap,
      color: 'text-orange-600 bg-orange-50',
    },
    {
      label: 'RFQ',
      value: comparison.rfqNumber,
      icon: DollarSign,
      color: 'text-purple-600 bg-purple-50',
    },
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/rfqs"
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Quotation Comparison</h1>
            <p className="text-gray-500 mt-1">{comparison.rfqNumber}</p>
          </div>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
          <Download className="w-4 h-4" />
          <span className="text-sm font-semibold">Export</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <EnterpriseCard key={stat.label} className="flex items-center gap-3 py-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 uppercase">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 leading-none">{stat.value}</p>
            </div>
          </EnterpriseCard>
        ))}
      </div>

      {/* Filters */}
      <EnterpriseCard className="p-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-10 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 h-10 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="price">Sort by Price</option>
            <option value="delivery">Sort by Delivery</option>
            <option value="rating">Sort by Rating</option>
          </select>
        </div>
      </EnterpriseCard>

      {/* Comparison Table */}
      <EnterpriseCard noPadding className="overflow-x-auto">
        <table className="w-full text-left border-collapse ifh-table">
          <thead>
            <tr>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 z-10">Vendor</th>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">Total Price</th>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">Payment Terms</th>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">Delivery Basis</th>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">Lead Time</th>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">Warranty</th>
              <th className="px-6 py-4 bg-gray-50/80 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sortedQuotations.map((q) => {
              const isBestPrice = q.grandTotal === lowestPrice;
              const isFastestDelivery = q.leadTime === fastestDelivery;

              return (
                <tr key={q.quotationId} className="group hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 sticky left-0 z-9 bg-white group-hover:bg-gray-50/50">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{q.vendorName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{q.vendorCode}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">₹{q.grandTotal.toLocaleString('en-IN')}</span>
                      {isBestPrice && (
                        <span className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 font-semibold rounded">Best</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{q.paymentTerms || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{q.deliveryBasis || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{q.leadTime || '—'} days</span>
                      {isFastestDelivery && q.leadTime && (
                        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 font-semibold rounded">Fast</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-700">{q.warranty || '—'}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/vendor-quotations/${q.quotationId}/details`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors"
                        title="Negotiate"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </EnterpriseCard>

      {/* Product Comparison Grid */}
      <EnterpriseCard className="p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Product-wise Comparison</h2>
        <div className="space-y-6">
          {comparison.quotations[0]?.lineItems?.map((_, idx) => {
            const product = {
              sku: comparison.quotations[0].lineItems[idx]?.itemCode || 'N/A',
              name: comparison.quotations[0].lineItems[idx]?.itemName || 'Product',
            };

            return (
              <div key={idx} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-900">{product.name}</p>
                  <p className="text-xs text-gray-500">{product.sku}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Vendor</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Rate</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Discount</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">GST</th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {comparison.quotations.map((q) => {
                        const item = q.lineItems[idx];
                        if (!item) return null;
                        return (
                          <tr key={q.quotationId} className="hover:bg-gray-50/50">
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{q.vendorName}</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">₹{item.quotedRate}</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">{item.discountPercentage}%</td>
                            <td className="px-4 py-3 text-right text-sm text-gray-700">{item.gstPercentage}%</td>
                            <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                              ₹{item.totalAmount?.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </EnterpriseCard>
    </div>
  );
}

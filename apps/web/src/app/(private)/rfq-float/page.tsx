'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/ui/page-header';
import { Search, Plus, Eye, Filter, RefreshCw, Calendar, Package, Users } from 'lucide-react';
import { apiFetch } from '@/lib/api/fetch';
import { formatDate } from '@/lib/procurement-stages';

export default function RfqFloatListingPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['rfq-floats', { search: searchTerm, status: statusFilter }],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      return apiFetch(`/rfq-float?${params.toString()}`);
    }
  });

  const rfqs = data?.data || [];

  return (
    <div className="page-content">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <PageHeader
          title="RFQ Float"
          description="Manage RFQs floated to multiple vendors for competitive bidding"
        />
        <Link 
          href="/rfq-float/create" 
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm self-start md:self-auto font-medium"
        >
          <Plus className="w-5 h-5" />
          Float New RFQ
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 justify-between bg-gray-50/50">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search RFQ Number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>
            <div className="relative w-48">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm appearance-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all"
              >
                <option value="">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="PARTIAL_RECEIVED">Partial Received</option>
                <option value="QUOTATIONS_RECEIVED">Quotations Received</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>
          </div>
          
          <button 
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-blue-500' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">RFQ Details</th>
                <th className="px-6 py-4">Timeline</th>
                <th className="px-6 py-4">Scope</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                      <p className="text-sm text-gray-500">Loading RFQs...</p>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-red-500">
                    Failed to load RFQs. Please try again.
                  </td>
                </tr>
              ) : rfqs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                        <Search className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-600 font-medium">No RFQs found</p>
                      <p className="text-sm text-gray-400">Try adjusting your search or filters.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                rfqs.map((rfq: any) => (
                  <tr key={rfq.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {rfq.rfqNumber}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">{rfq.title || 'Multi-Indent RFQ'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span>Floated: {formatDate(rfq.rfqDate)}</span>
                        </div>
                        {rfq.submissionDeadline && (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <ClockIcon className="w-3.5 h-3.5 text-amber-500" />
                            <span className="text-amber-700">Due: {formatDate(rfq.submissionDeadline)}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600" title="Total Items">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{rfq._count?.items || rfq.items?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-600" title="Total Vendors">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{rfq._count?.vendors || rfq.vendors?.length || 0}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                        rfq.status === 'PUBLISHED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        rfq.status === 'QUOTATIONS_RECEIVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        rfq.status === 'PARTIAL_RECEIVED' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                        {rfq.status?.replace('_', ' ') || 'UNKNOWN'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/rfq-float/${rfq.id}`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ClockIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

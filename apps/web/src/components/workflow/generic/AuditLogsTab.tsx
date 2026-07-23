'use client';

import { useState } from 'react';
import { Search, Clock, User as UserIcon } from 'lucide-react';
import type { ProcurementHistory } from '@/lib/api/procurement';
import { formatDateTime } from '@/lib/procurement-stages';

export function AuditLogsTab({ history }: { history: ProcurementHistory[] }) {
  const [query, setQuery] = useState('');

  const sorted = [...history].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const filtered = query.trim()
    ? sorted.filter(
        (log) =>
          log.action.toLowerCase().includes(query.toLowerCase()) ||
          log.description.toLowerCase().includes(query.toLowerCase()) ||
          log.performedBy?.fullName?.toLowerCase().includes(query.toLowerCase())
      )
    : sorted;

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full min-h-[500px]">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-[14px] font-bold text-gray-900">
            System Audit Logs
          </h2>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search audit logs..."
              className="h-8 pl-8 pr-3 text-[12px] bg-white border border-gray-300 rounded-md outline-none focus:border-[#0F7B45] w-[300px]"
            />
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-gray-600 uppercase tracking-wider w-full">
                  Remarks &amp; Changes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-8 text-center text-[13px] text-gray-500"
                  >
                    No audit events found.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  let parsedMeta: any = null;
                  try {
                    if (log.metadata) parsedMeta = JSON.parse(log.metadata);
                  } catch {
                    /* noop */
                  }
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-3 text-[12px] text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />{' '}
                          {formatDateTime(log.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-3 text-[13px] font-semibold text-gray-900">
                        <div className="flex items-center gap-1.5">
                          <UserIcon className="w-3.5 h-3.5 text-gray-400" />{' '}
                          {log.performedBy?.fullName}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700 uppercase">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-[12px] text-gray-600 font-medium">
                        {log.stageNumber !== null &&
                        log.stageNumber !== undefined
                          ? `Stage ${log.stageNumber}`
                          : '—'}
                      </td>
                      <td className="px-6 py-3 text-[13px] text-gray-700 whitespace-normal min-w-[300px]">
                        {log.description}
                        {parsedMeta && (
                          <div className="mt-1.5 p-2 bg-slate-50 border border-slate-100 rounded text-[11px] font-mono text-slate-600">
                            {JSON.stringify(parsedMeta)}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

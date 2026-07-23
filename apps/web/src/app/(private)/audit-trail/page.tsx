'use client';

import { useState, useEffect } from 'react';
import { Activity, Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { apiFetch } from '@/lib/api/fetch';
import { formatDateTime } from '@/lib/procurement-stages';

interface AuditEvent {
  id: string;
  timestamp: string;
  action: string;
  indentNo: string | null;
  recordId: string | null;
  user: string;
  stage: number | null;
  details: string;
  type: string;
}

export default function AuditTrailPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await apiFetch(`/audit?page=${page}&limit=50&search=${encodeURIComponent(searchQuery)}`);
        setEvents(res?.data || []);
        setTotalPages(res?.meta?.totalPages || 1);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [page, searchQuery]);

  const fmtDate = formatDateTime;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--background)' }}>
      <PageHeader 
        title="Audit Trail" 
        description="Comprehensive immutable ledger of all system and workflow events."
      />
      
      <div style={{ padding: '20px 28px', flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 300 }}>
            <input 
              type="text" 
              placeholder="Search users, actions, indents..." 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '8px 12px', paddingLeft: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 13 }}
            />
            <Activity style={{ position: 'absolute', left: 10, top: 10, width: 14, height: 14, color: 'var(--text-faint)' }} />
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table className="ifh-table">
            <thead>
              <tr>
                <th>TIMESTAMP</th>
                <th>ACTOR</th>
                <th>ACTION</th>
                <th>MODULE/TYPE</th>
                <th>INDENT NO</th>
                <th>DETAILS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Loading audit trail...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    No audit records found.
                  </td>
                </tr>
              ) : (
                events.map(ev => (
                  <tr key={ev.id}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>{fmtDate(ev.timestamp)}</td>
                    <td style={{ fontWeight: 500 }}>{ev.user}</td>
                    <td>
                      <span style={{ 
                        padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: ev.type === 'SYSTEM' ? '#FEF3C7' : '#DBEAFE',
                        color: ev.type === 'SYSTEM' ? '#92400E' : '#1D4ED8'
                      }}>
                        {ev.action}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ev.type}</td>
                    <td>{ev.indentNo ? <a href={`/procurement/${ev.recordId}`} style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>{ev.indentNo}</a> : '-'}</td>
                    <td style={{ fontSize: 12 }}>{ev.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div style={{ padding: '12px 28px', background: 'var(--card)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[
            { icon: <ChevronsLeft style={{ width: 13, height: 13 }} />, action: () => setPage(1), disabled: page === 1 },
            { icon: <ChevronLeft style={{ width: 13, height: 13 }} />, action: () => setPage(p => Math.max(1, p - 1)), disabled: page === 1 },
          ].map((b, i) => (
            <button key={`prev-${i}`} onClick={b.action} disabled={b.disabled}
              style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', cursor: b.disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {b.icon}
            </button>
          ))}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
            return (
              <button key={`pg-${p}`} onClick={() => setPage(p)}
                style={{ width: 30, height: 30, borderRadius: 6, fontSize: 12, fontWeight: p === page ? 700 : 400, border: `1px solid ${p === page ? 'var(--primary)' : 'var(--border)'}`, background: p === page ? 'var(--primary)' : 'var(--card)', color: p === page ? '#fff' : 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {p}
              </button>
            );
          })}
          {[
            { icon: <ChevronRight style={{ width: 13, height: 13 }} />, action: () => setPage(p => Math.min(totalPages, p + 1)), disabled: page === totalPages },
            { icon: <ChevronsRight style={{ width: 13, height: 13 }} />, action: () => setPage(totalPages), disabled: page === totalPages },
          ].map((b, i) => (
            <button key={`next-${i}`} onClick={b.action} disabled={b.disabled}
              style={{ width: 30, height: 30, borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', cursor: b.disabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {b.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

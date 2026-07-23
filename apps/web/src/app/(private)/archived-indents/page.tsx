'use client';

import { useState, useMemo } from 'react';
import { Search, Eye, ExternalLink, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Archive } from 'lucide-react';
import { useAllReportRecords } from '@/hooks/useQueries';
import { PageHeader } from '@/components/ui/page-header';

export default function ArchivedIndentsPage() {
  const { data: records = [], isLoading } = useAllReportRecords();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 50;

  // Filter for completed/archived indents
  const archivedRecords = useMemo(() => {
    let filtered = records.filter(r => r.status === 'COMPLETED');
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(r => 
        (r.referenceNo && r.referenceNo.toLowerCase().includes(q)) ||
        (r.title && r.title.toLowerCase().includes(q)) ||
        (r.projectName && r.projectName.toLowerCase().includes(q))
      );
    }
    return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(archivedRecords.length / itemsPerPage));
  const displayed = archivedRecords.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const fmtDate = (d: string) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--background)' }}>
      <PageHeader 
        title="Archived Indents" 
        description="Historical view of fully completed and archived procurement records"
      />

      <div style={{ padding: '20px 28px', flex: 1, overflow: 'auto' }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 300 }}>
            <input 
              type="text" 
              placeholder="Search reference no, project..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '8px 12px', paddingLeft: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', fontSize: 13 }}
            />
            <Search style={{ position: 'absolute', left: 10, top: 10, width: 14, height: 14, color: 'var(--text-faint)' }} />
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <table className="ifh-table">
            <thead>
              <tr>
                <th>REF NO</th>
                <th>PROJECT</th>
                <th>TITLE</th>
                <th>VENDOR</th>
                <th>CREATED</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    Loading archive...
                  </td>
                </tr>
              ) : displayed.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                    No archived indents found.
                  </td>
                </tr>
              ) : (
                displayed.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>{r.referenceNo}</td>
                    <td>{r.projectName || '-'}</td>
                    <td>{r.title}</td>
                    <td>{r.vendorName || '-'}</td>
                    <td>{fmtDate(r.createdAt)}</td>
                    <td>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#D1FAE5', color: '#065F46' }}>
                        ARCHIVED
                      </span>
                    </td>
                    <td>
                      <a href={`/procurement/${r.id}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                        <ExternalLink style={{ width: 12, height: 12 }} /> Open
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ padding: '12px 28px', background: 'var(--card)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {page} of {totalPages}</span>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => setPage(1)} disabled={page === 1} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}><ChevronsLeft style={{ width: 14, height: 14 }} /></button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', cursor: page === 1 ? 'not-allowed' : 'pointer' }}><ChevronLeft style={{ width: 14, height: 14 }} /></button>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}><ChevronRight style={{ width: 14, height: 14 }} /></button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages} style={{ width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--card)', cursor: page === totalPages ? 'not-allowed' : 'pointer' }}><ChevronsRight style={{ width: 14, height: 14 }} /></button>
        </div>
      </div>
    </div>
  );
}

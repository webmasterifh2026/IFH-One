'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, ShoppingCart, Truck, Send, CreditCard, X } from 'lucide-react';
import { type ReportRecord } from '@/lib/api/procurement';
import { useAllReportRecords } from '@/hooks/useQueries';

const STAGE_NAMES: Record<number, string> = {
  0:'Indent Creation',1:'Indent Verification',2:'Store Check',3:'RFQ Float',4:'TCE',5:'Negotiation',
  6:'PO Creation',7:'PO Approval L1',8:'PO Approval L2',9:'Vendor Acceptance',10:'Vendor Follow-Up',
  11:'Material Receipt',12:'Material Inspection',13:'Secondary Inspection',14:'Final Inspection',
  15:'Debit Note',16:'Bill to Accounts',17:'Bill to Purchase',18:'Bill Creation',19:'Tally Entry',
  20:'Bill Approval L1',21:'Bill Approval L2',22:'Payment Advice',23:'Completed',
};

function getRecordType(r: ReportRecord): { type: string; icon: React.ElementType; color: string } {
  if (r.currentStage >= 16) return { type: 'Bill', icon: CreditCard, color: '#7C3AED' };
  if (r.currentStage >= 6) return { type: 'PO', icon: ShoppingCart, color: '#059669' };
  if (r.currentStage >= 3) return { type: 'RFQ', icon: Send, color: '#2563EB' };
  return { type: 'Indent', icon: FileText, color: '#D97706' };
}

const statusColor: Record<string, string> = {
  IN_PROGRESS:'#2563EB', COMPLETED:'#059669', ON_HOLD:'#D97706',
  REJECTED:'#DC2626', DRAFT:'#6B7280', CANCELLED:'#475569',
};

const EMPTY_RECORDS: ReportRecord[] = [];

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ReportRecord[]>([]);
  const [open, setOpen] = useState(false);
  const { data } = useAllReportRecords();
  const records = data || EMPTY_RECORDS;
  const [activeIdx, setActiveIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) { 
      setResults([]); 
      setOpen(false);
      return; 
    }
    const ql = query.toLowerCase();
    const found = records.filter(r =>
      r.referenceNo.toLowerCase().includes(ql) ||
      r.title.toLowerCase().includes(ql) ||
      (r.vendorName && r.vendorName.toLowerCase().includes(ql)) ||
      (r.projectName && r.projectName.toLowerCase().includes(ql))
    ).slice(0, 8);
    setResults(found);
    setActiveIdx(-1);
    setOpen(true);
  }, [query, records]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && activeIdx >= 0) {
      navigateTo(results[activeIdx]);
    } else if (e.key === 'Escape') {
      setOpen(false); setQuery('');
      inputRef.current?.blur();
    }
  }

  function navigateTo(r: ReportRecord) {
    router.push(`/procurement/${r.id}`);
    setOpen(false);
    setQuery('');
  }

  return (
    <div ref={containerRef} style={{ position:'relative', width:360 }}>
      <Search style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', width:14, height:14, color:'var(--text-faint)', pointerEvents:'none' }} />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (query.trim()) setOpen(true); }}
        placeholder="Search indents, POs, vendors, projects…"
        style={{
          width:'100%', height:36, paddingLeft:36, paddingRight: query ? 32 : 12,
          borderRadius:8, border:'1px solid var(--border)', background:'var(--surface2)',
          fontSize:13, color:'var(--text-primary)', outline:'none',
          transition:'border-color 150ms, box-shadow 150ms', fontFamily:'var(--font-sans)',
        }}
        onFocusCapture={e => {
          e.currentTarget.style.borderColor = 'var(--primary)';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,123,69,0.10)';
          e.currentTarget.style.background = 'var(--card)';
        }}
        onBlurCapture={e => {
          e.currentTarget.style.borderColor = 'var(--border)';
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.background = 'var(--surface2)';
        }}
      />
      {query && (
        <button onClick={()=>{setQuery('');setOpen(false);inputRef.current?.focus();}}
          style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:2, color:'var(--text-faint)' }}>
          <X style={{ width:12, height:12 }} />
        </button>
      )}

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, right:0, zIndex:1000,
          background:'var(--card)', border:'1px solid var(--border)', borderRadius:12,
          boxShadow:'0 8px 32px rgba(0,0,0,0.12)', overflow:'hidden',
        }}>
          {results.length === 0 ? (
            <div style={{ padding:'24px 16px', textAlign:'center', color:'var(--text-muted)', fontSize:13 }}>
              No records found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              <div style={{ padding:'8px 12px 4px', fontSize:10, fontWeight:700, color:'var(--text-faint)', letterSpacing:'0.12em', textTransform:'uppercase' }}>
                {results.length} result{results.length !== 1 ? 's' : ''}
              </div>
              {results.map((r, i) => {
                const { type, icon: Icon, color } = getRecordType(r);
                const isActive = i === activeIdx;
                return (
                  <div key={r.id}
                    onClick={() => navigateTo(r)}
                    onMouseEnter={() => setActiveIdx(i)}
                    style={{
                      padding:'10px 14px', cursor:'pointer', display:'flex', alignItems:'center', gap:10,
                      background: isActive ? 'var(--surface2)' : 'transparent',
                      transition:'background 80ms',
                    }}>
                    <div style={{ width:30, height:30, borderRadius:8, background:color+'18', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <Icon style={{ width:14, height:14, color }} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                        <span style={{ fontSize:11, fontWeight:700, color, fontFamily:'monospace' }}>{type}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', fontFamily:'monospace' }}>{r.referenceNo}</span>
                      </div>
                      <div style={{ fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</div>
                    </div>
                    <div style={{ flexShrink:0, textAlign:'right' }}>
                      <div style={{ fontSize:10, padding:'2px 7px', borderRadius:4, fontWeight:700, background:(statusColor[r.status]||'#6B7280')+'18', color:statusColor[r.status]||'#6B7280', marginBottom:4 }}>{r.status}</div>
                      <div style={{ fontSize:10, color:'var(--text-faint)' }}>S{r.currentStage}</div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
}

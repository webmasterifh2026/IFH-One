'use client';

import { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Loader2 } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string, option: SelectOption | null) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
  searchPlaceholder?: string;
  emptyMessage?: string;
  name?: string;
  /** When provided, enables server-side search. Called with the search query string (debounced). */
  onSearch?: (query: string) => void;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  loading = false,
  error = false,
  searchPlaceholder = 'Search…',
  emptyMessage = 'No results found',
  name,
  onSearch,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  // Portal dropdown position
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  // Mount guard for portal (SSR safety)
  useEffect(() => { setMounted(true); }, []);

  const selected = options.find(o => o.value === value) ?? null;

  // When onSearch is provided (server-side), use all options as-is (already filtered server-side)
  // When not provided, do client-side filtering
  const filtered = onSearch
    ? options
    : query.trim()
      ? options.filter(o =>
          o.label.toLowerCase().includes(query.toLowerCase()) ||
          o.value.toLowerCase().includes(query.toLowerCase()) ||
          (o.sublabel ?? '').toLowerCase().includes(query.toLowerCase())
        )
      : options;

  // Debounced server-side search callback
  const debounceSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!onSearch) return;
    if (debounceSearchRef.current) clearTimeout(debounceSearchRef.current);
    debounceSearchRef.current = setTimeout(() => {
      onSearch(query);
    }, 300);
    return () => { if (debounceSearchRef.current) clearTimeout(debounceSearchRef.current); };
  }, [query, onSearch]);

  const pick = useCallback((opt: SelectOption) => {
    onChange(opt.value, opt);
    setOpen(false);
    setQuery('');
    setHighlightedIdx(0);
  }, [onChange]);

  const clear = useCallback(() => {
    onChange('', null);
    setQuery('');
  }, [onChange]);

  // Calculate dropdown position relative to viewport for portal rendering
  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropHeight = Math.min(280, Math.max(options.length, 1) * 40 + 52);

    const openAbove = spaceBelow < dropHeight && spaceAbove > spaceBelow;

    setDropdownStyle({
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
      borderRadius: 10,
      background: 'var(--card)',
      border: '1px solid var(--border)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
      overflow: 'hidden',
      ...(openAbove
        ? { bottom: window.innerHeight - rect.top + 4 }
        : { top: rect.bottom + 4 }),
    });
  }, [options]);

  useEffect(() => {
    if (open) {
      updatePosition();
      setHighlightedIdx(0);
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open, updatePosition]);

  useEffect(() => { setHighlightedIdx(0); }, [query]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      const target = e.target as Node;
      // Check trigger
      if (containerRef.current?.contains(target)) return;
      // Check portal dropdown
      const portalEl = document.getElementById(`${id}-portal`);
      if (portalEl?.contains(target)) return;
      setOpen(false);
      setQuery('');
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [open, id]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const handleReposition = () => updatePosition();
    window.addEventListener('scroll', handleReposition, true);
    window.addEventListener('resize', handleReposition);
    return () => {
      window.removeEventListener('scroll', handleReposition, true);
      window.removeEventListener('resize', handleReposition);
    };
  }, [open, updatePosition]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLLIElement>('li[role="option"]');
    items[highlightedIdx]?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIdx, open]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === 'Escape') { setOpen(false); setQuery(''); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedIdx(i => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedIdx(i => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[highlightedIdx]) pick(filtered[highlightedIdx]);
      return;
    }
  }

  const trigger: React.CSSProperties = {
    width: '100%', height: 38, padding: '0 36px 0 12px', borderRadius: 8,
    border: `1px solid ${error ? '#DC2626' : open ? 'var(--primary)' : 'var(--border)'}`,
    boxShadow: open ? '0 0 0 3px rgba(15,123,69,0.10)' : error ? '0 0 0 3px rgba(220,38,38,0.08)' : 'none',
    background: disabled ? 'var(--surface2)' : 'var(--card)',
    color: selected ? 'var(--text-primary)' : 'var(--text-faint)',
    fontSize: 13, fontFamily: 'var(--font-sans)', outline: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    textAlign: 'left', display: 'flex', alignItems: 'center',
    transition: 'border-color 150ms, box-shadow 150ms',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    position: 'relative',
  };

  const dropdownContent = (
    <div id={`${id}-portal`} style={dropdownStyle}>
      {/* Search box */}
      <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Search style={{ width: 13, height: 13, color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          ref={searchRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={searchPlaceholder}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 12, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)',
          }}
        />
      </div>
      {/* Option list */}
      <ul
        ref={listRef}
        id={`${id}-list`}
        role="listbox"
        style={{ maxHeight: 240, overflowY: 'auto', margin: 0, padding: '4px 0', listStyle: 'none' }}
      >
        {filtered.length === 0 ? (
          <li style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
            {emptyMessage}
          </li>
        ) : filtered.map((opt, i) => (
          <li
            key={`${opt.value}-${i}`}
            role="option"
            aria-selected={opt.value === value}
            onMouseEnter={() => setHighlightedIdx(i)}
            onMouseDown={(e) => { e.preventDefault(); pick(opt); }}
            style={{
              padding: '8px 14px', cursor: 'pointer', fontSize: 13,
              background: i === highlightedIdx
                ? 'var(--primary-light)'
                : opt.value === value
                  ? 'rgba(15,123,69,0.06)'
                  : 'transparent',
              color: opt.value === value ? 'var(--primary)' : 'var(--text-primary)',
              fontWeight: opt.value === value ? 600 : 400,
              borderLeft: opt.value === value ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'background 80ms',
              display: 'flex', flexDirection: 'column', gap: 2,
            }}
          >
            <span>{opt.label}</span>
            {opt.sublabel && (
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{opt.sublabel}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }} onKeyDown={onKeyDown}>
      {/* Hidden native input for form compat */}
      {name && <input type="hidden" name={name} value={value} />}

      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => !disabled && setOpen(v => !v)}
        style={trigger}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {loading
            ? <span style={{ color: 'var(--text-faint)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Loader2 style={{ width: 13, height: 13 }} className="animate-spin" /> Loading…
              </span>
            : selected
              ? <span>{selected.label}{selected.sublabel && <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontSize: 11 }}>{selected.sublabel}</span>}</span>
              : placeholder
          }
        </span>
        <ChevronDown style={{
          position: 'absolute', right: 10, top: '50%', transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`,
          width: 13, height: 13, color: 'var(--text-muted)', transition: 'transform 150ms', flexShrink: 0,
        }} />
      </button>

      {/* Portal: renders outside all stacking contexts directly on document.body */}
      {open && mounted && createPortal(dropdownContent, document.body)}
    </div>
  );
}

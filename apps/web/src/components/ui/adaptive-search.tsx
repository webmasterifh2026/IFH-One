'use client';

import React, { useState, useRef, useEffect, useCallback, useId, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, Loader2, Sparkles, Clock, History } from 'lucide-react';
import { apiFetch } from '@/lib/api/fetch';

export interface AdaptiveSearchOption {
  value: string;
  label: string;
  sublabel?: string;
  itemCode: string;
  itemName: string;
  unit: string;
  _group?: string;
}

interface AdaptiveSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: AdaptiveSearchOption) => void;
  placeholder?: string;
}

// ─── Simple LRU Cache ──────────────────────────────────────────────────────
class LRUCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private maxSize: number;
  private ttlMs: number;

  constructor(maxSize = 50, ttlMs = 60000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first inserted)
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }
}

// Shared cache instance across all AdaptiveSearch instances
const searchCache = new LRUCache<any>(50, 30000); // 50 entries, 30s TTL

export function AdaptiveSearch({
  value,
  onChange,
  onSelect,
  placeholder = 'Search by SKU or Item Description...',
}: AdaptiveSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  
  const [options, setOptions] = useState<AdaptiveSearchOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'search' | 'suggestions'>('suggestions');
  const [isFuzzyFallback, setIsFuzzyFallback] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  // AbortController ref for cancelling stale requests
  const abortRef = useRef<AbortController | null>(null);
  // Track latest query to ignore stale responses
  const latestQueryRef = useRef<string>('');
  // Track if recommendations have been pre-fetched
  const preFetchedRef = useRef(false);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { setQuery(value); }, [value]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const fetchResults = useCallback(async (searchQuery: string) => {
    // Cancel any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const abortController = new AbortController();
    abortRef.current = abortController;
    latestQueryRef.current = searchQuery;

    // Check cache first
    const cacheKey = searchQuery.trim() || '__empty__';
    const cached = searchCache.get(cacheKey);
    if (cached) {
      setOptions(cached.options);
      setMode(cached.mode);
      setIsFuzzyFallback(cached.isFuzzyFallback);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (searchQuery.trim()) qs.set('q', searchQuery.trim());
      qs.set('limit', '30');

      const url = `/api/skus/search/enterprise?${qs.toString()}`;
      const token = typeof window !== 'undefined' ? localStorage.getItem('ifh_token') : null;
      
      const response = await fetch(url, {
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      // If this request was aborted or is stale, ignore
      if (abortController.signal.aborted) return;
      if (latestQueryRef.current !== searchQuery) return;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
      
      // Stale check after JSON parse
      if (abortController.signal.aborted) return;
      if (latestQueryRef.current !== searchQuery) return;

      const payload = json?.data ?? json;
      let newOptions: AdaptiveSearchOption[] = [];
      let newMode: 'search' | 'suggestions' = 'search';
      let newFuzzy = false;

      if (payload && payload.mode) {
        newMode = payload.mode;
        if (payload.mode === 'suggestions') {
          const allOptions: AdaptiveSearchOption[] = [];
          const seen = new Set<string>();
          
          const addGroup = (arr: any[], prefix: string) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((item: any) => {
              if (!seen.has(item.itemCode)) {
                seen.add(item.itemCode);
                allOptions.push({
                  value: item.itemCode,
                  label: item.itemCode,
                  sublabel: item.description,
                  itemCode: item.itemCode,
                  itemName: item.description,
                  unit: item.uom,
                  _group: prefix
                });
              }
            });
          };

          if (payload.items?.project) addGroup(payload.items.project, 'Project Suggested');
          if (payload.items?.recent) addGroup(payload.items.recent, 'Recently Viewed');
          if (payload.items?.frequent) addGroup(payload.items.frequent, 'Frequently Used');
          newOptions = allOptions;
        } else {
          newFuzzy = !!payload.isFuzzyFallback;
          const arr = Array.isArray(payload.items) ? payload.items : [];
          newOptions = arr.map((item: any) => ({
            value: item.itemCode,
            label: item.itemCode,
            sublabel: item.description,
            itemCode: item.itemCode,
            itemName: item.description,
            unit: item.uom,
            _group: item.category
          }));
        }
      } else {
        const items = Array.isArray(payload) ? payload : (Array.isArray(payload?.items) ? payload.items : []);
        if (items.length > 0) {
          newMode = 'search';
          newOptions = items.map((item: any) => ({
            value: item.itemCode,
            label: item.itemCode,
            sublabel: item.description,
            itemCode: item.itemCode,
            itemName: item.description,
            unit: item.uom,
            _group: item.category
          }));
        }
      }

      // Cache the result
      searchCache.set(cacheKey, { options: newOptions, mode: newMode, isFuzzyFallback: newFuzzy });

      setOptions(newOptions);
      setMode(newMode);
      setIsFuzzyFallback(newFuzzy);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (latestQueryRef.current !== searchQuery) return;
      
      // Fallback to basic search
      try {
        const fallbackRes = await apiFetch(`/skus/search?q=${encodeURIComponent(searchQuery.trim())}&limit=30`);
        const items = Array.isArray(fallbackRes) ? fallbackRes : [];
        const fallbackOptions = items.map((item: any) => ({
          value: item.itemCode,
          label: item.itemCode,
          sublabel: item.description,
          itemCode: item.itemCode,
          itemName: item.description,
          unit: item.uom,
          _group: item.category
        }));
        searchCache.set(cacheKey, { options: fallbackOptions, mode: 'search', isFuzzyFallback: false });
        setOptions(fallbackOptions);
        setMode('search');
        setIsFuzzyFallback(false);
      } catch {
        setOptions([]);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  // Pre-fetch recommendations on mount (for instant focus response)
  useEffect(() => {
    if (!preFetchedRef.current) {
      preFetchedRef.current = true;
      fetchResults('');
    }
  }, [fetchResults]);

  // Debounced search with 200ms
  useEffect(() => {
    if (!open) return;
    
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchResults(query);
    }, 200);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, open, fetchResults]);

  const pick = useCallback((opt: AdaptiveSearchOption) => {
    setOpen(false);
    onChange(opt.value);
    onSelect(opt);
  }, [onChange, onSelect]);

  const commitSearch = useCallback(() => {
    setOpen(false);
    onChange(query);
  }, [query, onChange]);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
    });
  }, []);

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    } else {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    }
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => { setHighlightedIdx(0); }, [query, options]);

  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (open && containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const portalEl = document.getElementById(`portal-adaptive-${id}`);
        if (portalEl && portalEl.contains(e.target as Node)) return;
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [open, id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setOpen(true);
      }
      if (e.key === 'Enter') {
        commitSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIdx(prev => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIdx(prev => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (options[highlightedIdx]) {
          pick(options[highlightedIdx]);
        } else {
          commitSearch();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
    }
  };

  useEffect(() => {
    if (open && listRef.current) {
      const activeEl = listRef.current.children[highlightedIdx] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIdx, open]);

  const highlightMatch = useCallback((text: string, q: string) => {
    if (!q) return text;
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === q.toLowerCase() ? <strong key={i} style={{ color: 'var(--primary)' }}>{part}</strong> : part
    );
  }, []);

  const renderOptions = useCallback(() => {
    if (options.length === 0) {
      if (!query) return null;
      return (
        <li style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>
            No matching items found.
          </div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Try searching by:</div>
          <div style={{ fontSize: 13, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>&bull; SKU Code</span>
            <span>&bull; Item Name</span>
          </div>
        </li>
      );
    }

    let currentGroup = '';
    const items = options.map((opt, i) => {
      const group = opt._group;
      const showHeader = mode === 'suggestions' && group !== currentGroup;
      if (showHeader && group) currentGroup = group;

      return (
        <React.Fragment key={opt.value}>
          {showHeader && (
            <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--primary)', background: 'rgba(15,123,69,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
              {group === 'Project Suggested' ? <Sparkles size={12} /> : group === 'Recently Viewed' ? <Clock size={12} /> : <History size={12} />}
              {group}
            </div>
          )}
          <li
            onClick={() => pick(opt)}
            onMouseEnter={() => setHighlightedIdx(i)}
            style={{ padding: '10px 12px', cursor: 'pointer', background: highlightedIdx === i ? 'var(--surface2)' : 'transparent', display: 'flex', flexDirection: 'column', gap: 2, borderBottom: '1px solid var(--border)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{highlightMatch(opt.label, query)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{opt.unit}</span>
            </div>
            {opt.sublabel && (
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                {highlightMatch(opt.sublabel, query)}
              </span>
            )}
          </li>
        </React.Fragment>
      );
    });

    return (
      <>
        {isFuzzyFallback && mode === 'search' && (
          <div style={{ padding: '10px 12px', fontSize: 13, fontWeight: 500, color: '#D97706', background: '#FEF3C7', borderBottom: '1px solid #FDE68A' }}>
            No exact matches found. Did you mean...
          </div>
        )}
        {items}
      </>
    );
  }, [options, query, mode, isFuzzyFallback, highlightedIdx, pick, highlightMatch]);

  const portalContent = useMemo(() => (
    <div 
      id={`portal-adaptive-${id}`} 
      style={{ 
        ...dropdownStyle, 
        background: 'var(--card)', 
        border: '1px solid var(--border)', 
        borderRadius: 8, 
        boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
        display: 'flex', 
        flexDirection: 'column', 
        maxHeight: 400, 
        overflow: 'hidden'
      }}
    >
      <ul ref={listRef} style={{ listStyle: 'none', margin: 0, padding: 0, overflowY: 'auto', flex: 1 }}>
        {renderOptions()}
      </ul>
    </div>
  ), [dropdownStyle, id, renderOptions]);

  return (
    <div ref={containerRef} style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 300, position: 'relative' }}>
      <Search style={{ width: 15, height: 15, color: 'var(--text-muted)', flexShrink: 0 }} />
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={query}
        onFocus={() => { 
          setOpen(true); 
          // Use cached results if available (instant response)
          const cached = searchCache.get(query.trim() || '__empty__');
          if (cached) {
            setOptions(cached.options);
            setMode(cached.mode);
            setIsFuzzyFallback(cached.isFuzzyFallback);
          } else {
            fetchResults(query);
          }
        }}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        className="ifh-input" 
        style={{ border: 'none', background: 'transparent', flex: 1, padding: 0 }}
        autoComplete="off"
      />
      {loading && <Loader2 className="animate-spin" style={{ width: 14, height: 14, color: 'var(--primary)', flexShrink: 0 }} />}
      {query && (
        <button 
          onClick={() => { 
            setQuery(''); 
            onChange(''); 
            setOpen(false); 
            inputRef.current?.focus(); 
          }} 
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0 4px', fontSize: 16, lineHeight: 1 }}
          aria-label="Clear search"
        >
          &times;
        </button>
      )}
      {mounted && open && (query.trim().length > 0 || options.length > 0) && createPortal(portalContent, document.body)}
    </div>
  );
}
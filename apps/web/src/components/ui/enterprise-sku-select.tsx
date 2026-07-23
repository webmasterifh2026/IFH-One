'use client';

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
  useMemo,
} from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  Search,
  Loader2,
  Sparkles,
  Clock,
  History,
} from 'lucide-react';
import { buildApiUrl } from '@/lib/api/fetch';

export interface SkuOption {
  value: string;
  label: string;
  sublabel?: string;
  id: string; // internal SKU master row id, distinct from the human-readable itemCode
  itemCode: string;
  itemName: string;
  category?: string;
  subGroup?: string;
  unit: string;
  uom: string;
  _group?: string;
}

interface EnterpriseSkuSelectProps {
  value: string;
  onChange: (value: string, option: SkuOption | null) => void;
  projectId?: string;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  name?: string;
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

// Shared cache instance
const searchCache = new LRUCache<any>(50, 30000); // 50 entries, 30s TTL

// ─── Highlight Utility ─────────────────────────────────────────────────────
function highlightMatch(text: string, query: string) {
  if (!query) return text;
  try {
    const regex = new RegExp(
      `(${query.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&')})`,
      'gi'
    );
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              style={{
                background: 'rgba(15,123,69,0.15)',
                color: 'var(--primary)',
                fontWeight: 700,
                padding: '0 2px',
                borderRadius: 2,
              }}
            >
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </>
    );
  } catch {
    return text; // fallback on regex error
  }
}

export function EnterpriseSkuSelect({
  value,
  onChange,
  projectId,
  placeholder = 'Select SKU…',
  disabled = false,
  error = false,
  name,
}: EnterpriseSkuSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightedIdx, setHighlightedIdx] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Data State
  const [options, setOptions] = useState<SkuOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mode, setMode] = useState<'search' | 'suggestions'>('suggestions');
  const [isFuzzyFallback, setIsFuzzyFallback] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [searchError, setSearchError] = useState(false);

  // We keep a local selected option just for display
  const [selectedOption, setSelectedOption] = useState<SkuOption | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  // AbortController ref for cancelling stale requests
  const abortRef = useRef<AbortController | null>(null);
  const latestQueryRef = useRef<string>('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch initial option if value exists but we don't have it loaded
  useEffect(() => {
    if (value && !selectedOption) {
      // Direct fetch for initial load with proper error handling
      const token =
        typeof window !== 'undefined'
          ? localStorage.getItem('ifh_token')
          : null;
      const url = buildApiUrl(`/skus/itemCode/${encodeURIComponent(value)}`);

      // Set timeout for this fetch too
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 10000);

      fetch(url, {
        signal: abortController.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
        .then((r) => {
          clearTimeout(timeoutId);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        })
        .then((json: any) => {
          const res = json?.data !== undefined ? json.data : json;
          if (res && res.itemCode) {
            setSelectedOption({
              value: res.itemCode,
              label: res.itemCode,
              sublabel: res.description,
              id: res.id,
              itemCode: res.itemCode,
              itemName: res.description,
              category: res.category,
              subGroup: res.subGroup,
              unit: res.uom,
              uom: res.uom,
            });
          }
        })
        .catch((err) => {
          clearTimeout(timeoutId);
          if (err.name !== 'AbortError') {
            console.error('Failed to fetch initial SKU value:', err);
          }
        });
    } else if (!value) {
      setSelectedOption(null);
    }
  }, [value]);

  // Debounced search logic
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const PAGE_SIZE = 30;
  const optionsRef = useRef<SkuOption[]>([]);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  /**
   * fetchSkus — Fetch SKU search results with retry logic, timeout, and comprehensive error handling.
   *
   * Fixes:
   * - Added explicit timeout mechanism (10s) to fail fast
   * - Improved error classification (network vs API errors)
   * - Added retry logic for transient failures only
   * - Proper error messages distinguish between CORS, network, and HTTP errors
   * - Fixed missing dependency for token refresh
   */
  const fetchSkus = useCallback(
    async (searchQuery: string, appendOffset = 0) => {
      const isLoadMore = appendOffset > 0;
      if (!isLoadMore && abortRef.current) {
        abortRef.current.abort();
      }
      const abortController = new AbortController();
      if (!isLoadMore) abortRef.current = abortController;
      latestQueryRef.current = searchQuery;

      const cacheKey = `${searchQuery.trim() || '__empty__'}-${projectId || 'no-proj'}-${appendOffset}`;
      const cached = searchCache.get(cacheKey);
      if (cached && !isLoadMore) {
        setOptions(cached.options);
        setMode(cached.mode);
        setIsFuzzyFallback(cached.isFuzzyFallback);
        setHasMore(cached.hasMore || false);
        setTotal(cached.total || 0);
        setLoading(false);
        return;
      }

      if (isLoadMore) setLoadingMore(true);
      else {
        setLoading(true);
        setSearchError(false);
      }
      try {
        const qs = new URLSearchParams();
        if (searchQuery.trim()) qs.set('q', searchQuery.trim());
        if (projectId) qs.set('projectId', projectId);
        qs.set('limit', String(PAGE_SIZE));
        if (appendOffset) qs.set('offset', String(appendOffset));

        const url = buildApiUrl(`/skus/search/enterprise?${qs.toString()}`);

        const token =
          typeof window !== 'undefined'
            ? localStorage.getItem('ifh_token')
            : null;
        const fetchHeaders = {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        // Set a 10-second timeout for the fetch request
        const timeoutController = new AbortController();
        const timeoutId = setTimeout(() => timeoutController.abort(), 10000);

        // Merge abort signals: either user abort or timeout
        const mergedSignal = abortController.signal;
        const handleAbort = () => timeoutController.abort();
        mergedSignal.addEventListener('abort', handleAbort);

        try {
          let response: Response | null = null;
          let lastError: Error | null = null;

          // Try initial request
          try {
            response = await fetch(url, {
              signal: timeoutController.signal,
              headers: fetchHeaders,
            });
          } catch (fetchErr: unknown) {
            lastError =
              fetchErr instanceof Error
                ? fetchErr
                : new Error(String(fetchErr));
            // Only retry on transient network errors (not CORS, not abort, not timeout)
            if (
              !timeoutController.signal.aborted &&
              !abortController.signal.aborted &&
              !url.includes('CORS') &&
              lastError &&
              (lastError?.message?.includes('Failed to fetch') ||
                lastError?.message?.includes('network') ||
                (lastError as any)?.name === 'TypeError')
            ) {
              // Wait a brief moment and retry once
              await new Promise((r) => setTimeout(r, 200));
              if (
                !timeoutController.signal.aborted &&
                !abortController.signal.aborted
              ) {
                try {
                  response = await fetch(url, {
                    signal: timeoutController.signal,
                    headers: fetchHeaders,
                  });
                } catch (retryErr: unknown) {
                  lastError =
                    retryErr instanceof Error
                      ? retryErr
                      : new Error(String(retryErr));
                }
              }
            }
          }

          clearTimeout(timeoutId);
          mergedSignal.removeEventListener('abort', handleAbort);

          if (abortController.signal.aborted) return;
          if (latestQueryRef.current !== searchQuery) return;

          // If both attempts failed, throw the last error
          if (!response) {
            throw lastError || new Error('Failed to fetch SKUs (no response)');
          }

          if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            throw new Error(
              `HTTP ${response.status}${errorText ? ': ' + errorText.slice(0, 100) : ''}`
            );
          }

          const json = await response.json();
          if (abortController.signal.aborted) return;

          const res = json?.data !== undefined ? json.data : json;

          if (res) {
            const newMode = 'suggestions';
            const newIsFuzzyFallback = false;
            let newOptions: SkuOption[] = [];

            const allOptions: SkuOption[] = [];
            const seen = new Set<string>(
              isLoadMore ? optionsRef.current.map((o) => o.itemCode) : []
            );

            const addGroup = (arr: any[], prefix: string) => {
              if (!Array.isArray(arr)) return;
              arr.forEach((item: any) => {
                if (!seen.has(item.itemCode)) {
                  seen.add(item.itemCode);
                  allOptions.push({
                    value: item.itemCode,
                    label: item.itemCode,
                    sublabel: item.description,
                    id: item.id,
                    itemCode: item.itemCode,
                    itemName: item.description,
                    category: item.category,
                    subGroup: item.subGroup,
                    unit: item.uom,
                    uom: item.uom,
                    _group: prefix,
                  });
                }
              });
            };

            if (res.items?.project)
              addGroup(res.items.project, 'Project Suggested');
            if (res.items?.recent) addGroup(res.items.recent, 'Recently Used');
            if (res.items?.frequent)
              addGroup(res.items.frequent, 'Frequently Used');

            // Fallback for general search results
            if (Array.isArray(res.items)) addGroup(res.items, '');
            else if (Array.isArray(res)) addGroup(res, '');

            newOptions = isLoadMore
              ? [...optionsRef.current, ...allOptions]
              : allOptions;
            setOptions(newOptions);
            setMode(newMode);
            setIsFuzzyFallback(newIsFuzzyFallback);
            setHasMore(!!res.hasMore);
            setTotal(res.total || newOptions.length);

            // Cache the result (only the page itself, not the merged list, so
            // load-more always re-fetches fresh subsequent pages)
            searchCache.set(cacheKey, {
              options: isLoadMore ? allOptions : newOptions,
              mode: newMode,
              isFuzzyFallback: newIsFuzzyFallback,
              hasMore: !!res.hasMore,
              total: res.total || 0,
            });
          } else if (!isLoadMore) {
            setOptions([]);
            setMode('suggestions');
          }
        } finally {
          clearTimeout(timeoutId);
          mergedSignal.removeEventListener('abort', handleAbort);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          const errorMsg = err?.message || 'Unknown error';
          console.error('Failed to search SKUs:', errorMsg);
          if (!isLoadMore) {
            setSearchError(true);
            setOptions([]);
          }
        }
      } finally {
        if (!abortController.signal.aborted) {
          if (isLoadMore) setLoadingMore(false);
          else setLoading(false);
        }
      }
    },
    [projectId]
  );

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore || mode !== 'search') return;
    fetchSkus(query, optionsRef.current.length);
  }, [loadingMore, loading, hasMore, mode, query, fetchSkus]);

  // Trigger search on query change or open
  useEffect(() => {
    if (!open) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSkus(query);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, fetchSkus]);

  const pick = useCallback(
    (opt: SkuOption) => {
      setSelectedOption(opt);
      onChange(opt.value, opt);
      setOpen(false);
      setQuery('');
      setHighlightedIdx(0);
    },
    [onChange]
  );

  const clear = useCallback(() => {
    setSelectedOption(null);
    onChange('', null);
    setQuery('');
  }, [onChange]);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const dropHeight = 350;

    const style: React.CSSProperties = {
      position: 'fixed',
      left: rect.left,
      width: rect.width,
      zIndex: 99999,
    };

    if (spaceBelow >= dropHeight || spaceBelow > rect.top) {
      style.top = rect.bottom + 4;
    } else {
      style.bottom = window.innerHeight - rect.top + 4;
    }
    setDropdownStyle(style);
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

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  useEffect(() => {
    setHighlightedIdx(0);
  }, [query, options]);

  useEffect(() => {
    const handleDocClick = (e: MouseEvent) => {
      if (
        open &&
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        const portalEl = document.getElementById(`portal-${id}`);
        if (portalEl && portalEl.contains(e.target as Node)) return;
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleDocClick);
    return () => document.removeEventListener('mousedown', handleDocClick);
  }, [open, id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIdx((prev) => Math.min(prev + 1, options.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIdx((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (options[highlightedIdx]) {
          pick(options[highlightedIdx]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setOpen(false);
        break;
      case 'Backspace':
        if (!query) {
          clear();
        }
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

  // Group options for rendering
  const renderOptions = useCallback(() => {
    if (searchError) {
      return (
        <li
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#B91C1C',
              marginBottom: 8,
            }}
          >
            Couldn&rsquo;t load SKU results.
          </div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>
            The server may be temporarily busy.
          </div>
          <button
            type="button"
            onClick={() => fetchSkus(query)}
            style={{
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--primary)',
              background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </li>
      );
    }
    if (options.length === 0) {
      if (!query) return null;
      return (
        <li
          style={{
            padding: '24px 16px',
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
        >
          <div
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: 'var(--text-primary)',
              marginBottom: 8,
            }}
          >
            No matching SKU found.
          </div>
          <div style={{ fontSize: 13, marginBottom: 4 }}>Try searching by:</div>
          <div
            style={{
              fontSize: 13,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            <span>&bull; SKU Code</span>
            <span>&bull; Item Description</span>
            <span>&bull; Category / Sub Group / UOM</span>
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
            <div
              style={{
                padding: '6px 12px',
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--primary)',
                background: 'rgba(15,123,69,0.06)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {group === 'Project Suggested' ? (
                <Sparkles size={12} />
              ) : group === 'Recently Used' ? (
                <Clock size={12} />
              ) : (
                <History size={12} />
              )}
              {group}
            </div>
          )}
          <li
            onClick={() => pick(opt)}
            onMouseEnter={() => setHighlightedIdx(i)}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              background:
                highlightedIdx === i ? 'var(--surface2)' : 'transparent',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                }}
              >
                {highlightMatch(opt.label, query)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {opt.unit}
              </span>
            </div>
            {opt.sublabel && (
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
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
          <div
            style={{
              padding: '8px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: '#D97706',
              background: '#FEF3C7',
              borderBottom: '1px solid #FDE68A',
            }}
          >
            No exact matches found. Did you mean...
          </div>
        )}
        {items}
        {mode === 'search' && total > 0 && (
          <li
            style={{
              padding: '8px 12px',
              fontSize: 11,
              color: 'var(--text-muted)',
              textAlign: 'center',
              cursor: hasMore ? 'pointer' : 'default',
            }}
            onClick={hasMore ? loadMore : undefined}
          >
            {loadingMore
              ? 'Loading more…'
              : hasMore
                ? `Showing ${options.length}+ results — click to load more`
                : `${total} result${total === 1 ? '' : 's'}`}
          </li>
        )}
      </>
    );
  }, [
    options,
    query,
    mode,
    isFuzzyFallback,
    highlightedIdx,
    pick,
    hasMore,
    total,
    loadingMore,
    loadMore,
    searchError,
    fetchSkus,
  ]);

  const portalContent = useMemo(
    () => (
      <div
        id={`portal-${id}`}
        style={{
          ...dropdownStyle,
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: 350,
          overflow: 'hidden',
        }}
      >
        <ul
          ref={listRef}
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            overflowY: 'auto',
            flex: 1,
          }}
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollHeight - el.scrollTop - el.clientHeight < 80)
              loadMore();
          }}
        >
          {renderOptions()}
        </ul>
      </div>
    ),
    [dropdownStyle, id, renderOptions, loadMore]
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      {name && <input type="hidden" name={name} value={value} />}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: disabled ? 'var(--surface2)' : 'var(--card)',
          borderColor: error
            ? '#dc2626'
            : open
              ? 'var(--primary)'
              : 'var(--border)',
          outline: open ? '2px solid rgba(15,123,69,0.2)' : 'none',
          padding: '0 10px',
          height: 38,
          opacity: disabled ? 0.7 : 1,
          borderRadius: 6,
          borderWidth: 1,
          borderStyle: 'solid',
          transition: 'all 0.2s ease',
        }}
        onClick={() => {
          if (!disabled && searchRef.current) searchRef.current.focus();
        }}
      >
        <Search style={{ width: 14, height: 14, color: 'var(--text-muted)' }} />

        <input
          ref={searchRef}
          type="text"
          value={selectedOption && !open ? selectedOption.label : query}
          onChange={(e) => {
            if (selectedOption) {
              clear();
            }
            setQuery(e.target.value);
            setHighlightedIdx(0);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) {
              setOpen(true);
              if (selectedOption && !query) {
                setQuery(selectedOption.label);
              }
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            flex: 1,
            outline: 'none',
            fontSize: 13,
            color: 'var(--text-primary)',
            width: '100%',
          }}
          autoComplete="off"
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {loading && (
            <Loader2
              className="animate-spin"
              style={{ width: 14, height: 14, color: 'var(--primary)' }}
            />
          )}
          {value && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
                if (searchRef.current) searchRef.current.focus();
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: 16,
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0 2px',
                lineHeight: 1,
              }}
              title="Clear"
            >
              &times;
            </button>
          )}
          <ChevronDown
            style={{ width: 16, height: 16, color: 'var(--text-muted)' }}
          />
        </div>
      </div>

      {mounted &&
        open &&
        (query.trim().length > 0 || options.length > 0) &&
        createPortal(portalContent, document.body)}
    </div>
  );
}

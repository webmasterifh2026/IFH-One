'use client';

import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api/fetch';

export interface ProjectOption {
  id: string;
  projectId: string;
  projectName: string;
}

interface ProjectSelectProps {
  value: string; // Project ID
  onChange: (projectId: string, option: ProjectOption | null) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  name?: string;
}

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
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.data;
  }

  set(key: string, data: T): void {
    if (this.cache.has(key)) this.cache.delete(key);
    else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
    this.cache.set(key, { data, timestamp: Date.now() });
  }
}

interface ProjectSearchResult {
  items: ProjectOption[];
  total: number;
  hasMore: boolean;
}

const searchCache = new LRUCache<ProjectSearchResult>(50, 30000);

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
    return text;
  }
}

export function ProjectSelect({
  value,
  onChange,
  placeholder = 'Search project...',
  disabled = false,
  error = false,
  name,
}: ProjectSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [selectedOption, setSelectedOption] = useState<ProjectOption | null>(
    null
  );
  const optionsRef = useRef<ProjectOption[]>([]);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);

  const uid = useId();
  const listboxId = `project-select-listbox-${uid}`;

  const PAGE_SIZE = 100;

  // ============================================================================
  // COMBINED EFFECT: Both initial load and search use a single effect
  // to prevent duplicate/simultaneous requests to the same endpoint.
  //
  // LOGIC:
  // 1. When dropdown opens (isOpen=true) and no search term: load empty query
  // 2. When search term changes: fetch with term, reset pagination
  // 3. When value prop changes: fetch by ID (for pre-filling existing selections)
  // 4. Cleanup: abort pending requests if component unmounts/effect re-triggers
  // ============================================================================
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const performFetch = async () => {
      if (!active) return;

      try {
        // Determine what to fetch based on current state
        let fetchUrl: string;

        if (searchQuery !== '') {
          // User is searching
          fetchUrl = `/projects/search?q=${encodeURIComponent(searchQuery)}&limit=${PAGE_SIZE}`;
        } else if (!isOpen) {
          // Dropdown is closed, nothing to fetch
          return;
        } else if (value && !selectedOption?.projectId) {
          // Dropdown is open, we have a value prop, but haven't loaded it yet
          fetchUrl = `/projects/search?q=${encodeURIComponent(value)}`;
        } else if (isOpen && !searchQuery) {
          // Dropdown is open with empty search - load initial page
          fetchUrl = `/projects/search?q=&limit=${PAGE_SIZE}`;
        } else {
          return;
        }

        // Check cache before fetching
        const cacheKey =
          (searchQuery || value || '__empty__').trim() || '__empty__';
        const cached = searchCache.get(cacheKey);
        if (cached && searchQuery !== '') {
          // Cache hit for search queries
          setOptions(cached.items);
          setTotal(cached.total);
          setHasMore(cached.hasMore);
          setLoading(false);
          return;
        }

        if (searchQuery !== '' || isOpen) {
          setLoading(true);
        }

        const res = await apiFetch(fetchUrl);
        if (!active) return;

        const items = res?.items || res?.data || res || [];
        const result: ProjectSearchResult = {
          items,
          total: res?.total ?? items.length,
          hasMore: res?.hasMore ?? false,
        };

        // Update cache for search queries only
        if (searchQuery !== '') {
          searchCache.set(cacheKey, result);
        }

        if (active) {
          // If this was an initial load by value, extract and set the selected option
          if (value && !selectedOption?.projectId && searchQuery === '') {
            const match = items.find((p: any) => p.projectId === value);
            if (match) {
              setSelectedOption(match);
            }
          }

          // Set dropdown options if search is active or dropdown is open
          if (searchQuery !== '' || isOpen) {
            setOptions(result.items);
            setTotal(result.total);
            setHasMore(result.hasMore);
          }
        }
      } catch (err) {
        if (active) {
          console.error('Project fetch failed', err);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    // Debounce search queries, but immediate fetches for value/isOpen changes
    if (searchQuery !== '') {
      const debounceTimer = setTimeout(performFetch, 300);
      return () => {
        clearTimeout(debounceTimer);
        active = false;
        controller.abort();
      };
    } else {
      performFetch();
      return () => {
        active = false;
        controller.abort();
      };
    }
  }, [searchQuery, isOpen, value]);

  const loadMore = useCallback(async () => {
    if (loadingMore || loading || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await apiFetch(
        `/projects/search?q=${encodeURIComponent(searchQuery)}&limit=${PAGE_SIZE}&offset=${optionsRef.current.length}`
      );
      const items = res?.items || res?.data || res || [];
      const seen = new Set(optionsRef.current.map((o) => o.projectId));
      const merged = [
        ...optionsRef.current,
        ...items.filter((i: ProjectOption) => !seen.has(i.projectId)),
      ];
      setOptions(merged);
      setTotal(res?.total ?? merged.length);
      setHasMore(res?.hasMore ?? false);
    } catch (err) {
      console.error('Load more failed', err);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, loading, hasMore, searchQuery]);

  // Click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node) &&
        (!listboxRef.current || !listboxRef.current.contains(e.target as Node))
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt: ProjectOption) => {
    onChange(opt.projectId, opt);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', null);
    setSelectedOption(null);
  };

  // Keyboard navigation
  const [activeIndex, setActiveIndex] = useState(-1);
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && options[activeIndex]) {
        handleSelect(options[activeIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Reset active index when options change
  useEffect(() => {
    setActiveIndex(-1);
  }, [options, searchQuery]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        fontFamily: 'var(--font-sans)',
      }}
    >
      {name && <input type="hidden" name={name} value={value} />}

      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        tabIndex={disabled ? -1 : 0}
        onKeyDown={handleKeyDown}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: disabled ? 'var(--surface2)' : 'var(--card)',
          border: `1px solid ${error ? '#DC2626' : isOpen ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          boxShadow: isOpen
            ? '0 0 0 3px rgba(15,123,69,0.1)'
            : 'var(--shadow-xs)',
          minHeight: 42,
          transition: 'all 0.2s',
          color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
        }}
      >
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedOption ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 13,
                  background: 'var(--surface2)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                {selectedOption.projectId}
              </span>
              <span style={{ fontSize: 14 }}>{selectedOption.projectName}</span>
            </div>
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {placeholder}
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-muted)',
          }}
        >
          {selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                borderRadius: '50%',
                color: 'var(--text-muted)',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'var(--surface2)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
          <ChevronDown
            size={16}
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.2s',
            }}
          />
        </div>
      </div>

      {isOpen &&
        !disabled &&
        createPortal(
          <div
            ref={listboxRef}
            id={listboxId}
            role="listbox"
            style={{
              position: 'absolute',
              top: containerRef.current
                ? containerRef.current.getBoundingClientRect().bottom + 8
                : 0,
              left: containerRef.current
                ? containerRef.current.getBoundingClientRect().left
                : 0,
              width: containerRef.current
                ? containerRef.current.getBoundingClientRect().width
                : 'auto',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              boxShadow: 'var(--shadow-lg)',
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 320,
              overflow: 'hidden',
            }}
          >
            {/* Search Input */}
            <div
              style={{
                padding: '10px 12px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'var(--surface2)',
              }}
            >
              <Search size={16} color="var(--text-muted)" />
              <input
                ref={inputRef}
                autoFocus
                type="text"
                placeholder="Type to search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                }}
              />
              {loading && (
                <Loader2
                  size={16}
                  color="var(--primary)"
                  className="animate-spin"
                />
              )}
            </div>

            {/* Options List */}
            <div
              style={{ overflowY: 'auto', flex: 1, padding: 4 }}
              onScroll={(e) => {
                const el = e.currentTarget;
                if (el.scrollHeight - el.scrollTop - el.clientHeight < 80)
                  loadMore();
              }}
            >
              {options.length === 0 && !loading ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    fontSize: 13,
                  }}
                >
                  No projects found.
                </div>
              ) : (
                options.map((opt, i) => {
                  const isActive = i === activeIndex;
                  const isSelected = opt.projectId === value;
                  return (
                    <div
                      key={opt.projectId}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setActiveIndex(i)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        background: isActive
                          ? 'var(--primary-light)'
                          : 'transparent',
                        color: isActive
                          ? 'var(--primary)'
                          : 'var(--text-primary)',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 12,
                              background: isActive
                                ? 'rgba(15,123,69,0.1)'
                                : 'var(--surface2)',
                              color: isActive
                                ? 'var(--primary)'
                                : 'var(--text-muted)',
                              padding: '2px 6px',
                              borderRadius: 4,
                              fontWeight: 600,
                            }}
                          >
                            {highlightMatch(opt.projectId, searchQuery)}
                          </span>
                          {highlightMatch(opt.projectName, searchQuery)}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {options.length > 0 && total > 0 && (
                <div
                  onClick={hasMore ? loadMore : undefined}
                  style={{
                    padding: '8px 12px',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    cursor: hasMore ? 'pointer' : 'default',
                  }}
                >
                  {loadingMore
                    ? 'Loading more…'
                    : hasMore
                      ? `Showing ${options.length}+ results — click to load more`
                      : `${total} result${total === 1 ? '' : 's'}`}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

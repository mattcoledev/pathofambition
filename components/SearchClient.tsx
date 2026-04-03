'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import Fuse from 'fuse.js';
import type { SearchResult } from '@/lib/types';

const TYPE_LABELS: Record<string, string> = {
  profession: 'Profession',
  spell: 'Spell',
  origin: 'Origin',
  feat: 'Feat',
  action: 'Action',
  equipment: 'Equipment',
};

const TYPE_HREFS: Record<string, (slug: string) => string> = {
  profession: (slug) => `/professions/${slug}`,
  spell: (slug) => `/spells/${slug}`,
  origin: (slug) => `/origins/${slug}`,
  feat: (slug) => `/feats`,
  action: (slug) => `/actions`,
  equipment: (slug) => `/equipment`,
};

const TYPE_COLORS: Record<string, React.CSSProperties> = {
  profession: { backgroundColor: '#DBEAFE', color: '#1D4ED8' },
  spell: { backgroundColor: '#F3E8FF', color: '#7C3AED' },
  origin: { backgroundColor: '#D1FAE5', color: '#065F46' },
  feat: { backgroundColor: 'var(--accent-light)', color: 'var(--accent)' },
  action: { backgroundColor: '#FEE2E2', color: '#B91C1C' },
  equipment: { backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)' },
};

interface Props {
  index: SearchResult[];
}

export default function SearchClient({ index }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searched, setSearched] = useState(false);

  const fuse = useCallback(
    () =>
      new Fuse(index, {
        keys: [
          { name: 'name', weight: 2 },
          { name: 'description', weight: 1 },
          { name: 'tags', weight: 0.5 },
        ],
        threshold: 0.35,
        minMatchCharLength: 2,
      }),
    [index]
  );

  const handleSearch = useCallback(
    (q: string) => {
      setQuery(q);
      if (q.trim().length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }
      const hits = fuse().search(q).map((r) => r.item);
      setResults(hits);
      setSearched(true);
    },
    [fuse]
  );

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = [];
    acc[r.type].push(r);
    return acc;
  }, {});

  return (
    <div>
      {/* Search input */}
      <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
        <div style={{
          position: 'absolute',
          left: '0.875rem',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}>
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search professions, spells, feats, actions…"
          aria-label="Search game content"
          style={{
            width: '100%',
            padding: '0.75rem 1rem 0.75rem 2.75rem',
            fontSize: '1rem',
            fontFamily: 'var(--font-body)',
            border: '1.5px solid var(--border)',
            borderRadius: '0.5rem',
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text)',
            outline: 'none',
            transition: 'border-color 0.15s',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
        />
      </div>

      {/* Results */}
      {searched && results.length === 0 && (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
          No results for &ldquo;{query}&rdquo;
        </p>
      )}

      {searched && results.length > 0 && (
        <div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            {results.length} result{results.length !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>

          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} style={{ marginBottom: '1.5rem' }}>
              <h2 style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: '0.75rem',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '0.5rem',
              }}>
                {TYPE_LABELS[type]} ({items.length})
              </h2>
              <div className="space-y-2">
                {items.slice(0, 20).map((item) => (
                  <Link
                    key={item.id}
                    href={TYPE_HREFS[item.type]?.(item.slug) ?? '#'}
                    style={{
                      display: 'block',
                      padding: '0.75rem 1rem',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.5rem',
                      textDecoration: 'none',
                      transition: 'border-color 0.15s, box-shadow 0.15s',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.boxShadow = '0 1px 6px rgba(15,118,110,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div className="flex items-start gap-2.5">
                      <span style={{
                        ...TYPE_COLORS[item.type],
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        fontFamily: 'var(--font-heading)',
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '9999px',
                        whiteSpace: 'nowrap',
                        marginTop: '0.1rem',
                        flexShrink: 0,
                      }}>
                        {TYPE_LABELS[item.type]}
                      </span>
                      <div>
                        <div style={{
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 600,
                          fontSize: '0.95rem',
                          color: 'var(--text)',
                          marginBottom: '0.15rem',
                        }}>
                          {item.name}
                        </div>
                        {item.description && (
                          <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-muted)',
                            lineHeight: 1.5,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}>
                            {item.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {!searched && (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: 'var(--text-muted)',
        }}>
          <svg className="w-12 h-12 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--border-hover)' }} aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <p style={{ fontSize: '0.95rem' }}>Type to search across all game content</p>
        </div>
      )}
    </div>
  );
}

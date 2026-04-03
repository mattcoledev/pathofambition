'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import TraitBadge from './TraitBadge';
import type { Spell } from '@/lib/types';

const SOURCES = ['Anima', 'Mana', 'Soul', 'Primeval'];
const SPHERES = ['Aberration', 'Augmentation', 'Conjuration', 'Decimation', 'Divination', 'Mortification', 'Reclamation'];

const SCHOOL_COLORS: Record<string, { bg: string; text: string }> = {
  Conjuration:  { bg: '#DBEAFE', text: '#1D4ED8' },
  Aberration:   { bg: '#F3E8FF', text: '#7C3AED' },
  Mortification:{ bg: '#FCE7F3', text: '#9D174D' },
  Augmentation: { bg: '#FEF9C3', text: '#854D0E' },
  Decimation:   { bg: '#FEE2E2', text: '#B91C1C' },
  Divination:   { bg: '#E0F2FE', text: '#075985' },
  Reclamation:  { bg: '#D1FAE5', text: '#065F46' },
};

function schoolStyle(school: string) {
  return SCHOOL_COLORS[school] ?? { bg: 'var(--bg-nav)', text: 'var(--text-muted)' };
}

function FilterPill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.25rem 0.625rem',
        borderRadius: '9999px',
        fontSize: '0.75rem',
        fontFamily: 'var(--font-heading)',
        fontWeight: 600,
        border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
        backgroundColor: active ? 'var(--primary)' : 'var(--bg-card)',
        color: active ? '#fff' : 'var(--text-muted)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}

interface Props {
  spells: Spell[];
}

export default function SpellsClient({ spells }: Props) {
  const [activeSources, setActiveSources] = useState<Set<string>>(new Set());
  const [activeSpheres, setActiveSpheres] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  function toggleSource(s: string) {
    setActiveSources((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  function toggleSphere(s: string) {
    setActiveSpheres((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  const filtered = useMemo(() => {
    return spells.filter((spell) => {
      if (activeSources.size > 0 && !(spell.sources ?? []).some((src) => activeSources.has(src))) return false;
      if (activeSpheres.size > 0 && !activeSpheres.has(spell.school)) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!spell.name.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [spells, activeSources, activeSpheres, search]);

  const byTier: Record<number, Spell[]> = {};
  filtered.forEach((s) => {
    if (!byTier[s.tier]) byTier[s.tier] = [];
    byTier[s.tier].push(s);
  });
  const tiers = Object.keys(byTier).map(Number).sort((a, b) => a - b);

  const hasFilters = activeSources.size > 0 || activeSpheres.size > 0 || search.trim();

  return (
    <div>
      {/* Filter bar */}
      <div style={{
        marginBottom: '1.5rem', padding: '1rem 1.25rem',
        backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)',
        borderRadius: '0.625rem',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', marginBottom: '1rem' }}>
          <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
            </svg>
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by spell name…"
            aria-label="Filter spells by name"
            style={{
              width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem',
              fontSize: '0.875rem', fontFamily: 'var(--font-body)',
              border: '1.5px solid var(--border)', borderRadius: '0.375rem',
              backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
          />
        </div>

        {/* Source filters */}
        <div style={{ marginBottom: '0.625rem' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', display: 'block', marginBottom: '0.375rem' }}>
            Source
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {SOURCES.map((s) => (
              <FilterPill key={s} label={s} active={activeSources.has(s)} onClick={() => toggleSource(s)} />
            ))}
          </div>
        </div>

        {/* Sphere filters */}
        <div>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', display: 'block', marginBottom: '0.375rem' }}>
            Sphere
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {SPHERES.map((s) => (
              <FilterPill key={s} label={s} active={activeSpheres.has(s)} onClick={() => toggleSphere(s)} />
            ))}
          </div>
        </div>

        {/* Active filter summary + clear */}
        {hasFilters && (
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {filtered.length} spell{filtered.length !== 1 ? 's' : ''} match
            </span>
            <button
              onClick={() => { setActiveSources(new Set()); setActiveSpheres(new Set()); setSearch(''); }}
              style={{
                fontSize: '0.75rem', color: 'var(--primary)', background: 'none', border: 'none',
                cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600, padding: '0.15rem 0.375rem',
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Spell list */}
      {tiers.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>No spells match the selected filters.</p>
      ) : (
        tiers.map((tier) => (
          <div key={tier} style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
              {tier === 0 ? 'Cantrips' : `Tier ${tier}`}{' '}
              <span style={{ fontWeight: 400, color: 'var(--border-hover)' }}>({byTier[tier].length})</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.625rem' }}>
              {byTier[tier].map((spell) => {
                const sc = schoolStyle(spell.school);
                return (
                  <Link
                    key={spell.id}
                    href={`/spells/${spell.slug}`}
                    className="hover-card hover-card-subtle"
                    style={{
                      display: 'block', padding: '0.875rem 1rem',
                      backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
                      borderRadius: '0.625rem', textDecoration: 'none',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.95rem', color: 'var(--primary)' }}>
                        {spell.name}
                      </span>
                      {spell.is_cantrip && <TraitBadge trait="Cantrip" variant="muted" />}
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                      {spell.school && (
                        <span style={{
                          fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-heading)',
                          letterSpacing: '0.04em', textTransform: 'uppercase',
                          padding: '0.1rem 0.4rem', borderRadius: '9999px',
                          backgroundColor: sc.bg, color: sc.text,
                        }}>
                          {spell.school}
                        </span>
                      )}
                      {(spell.sources ?? []).map((src) => (
                        <span key={src} style={{
                          fontSize: '0.65rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
                          letterSpacing: '0.04em', textTransform: 'uppercase',
                          padding: '0.1rem 0.4rem', borderRadius: '9999px',
                          backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)',
                        }}>
                          {src}
                        </span>
                      ))}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {spell.range && <span style={{ marginRight: '0.5rem' }}>Range: {spell.range}</span>}
                      {spell.duration && <span>Duration: {spell.duration}</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

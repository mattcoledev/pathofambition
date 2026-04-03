'use client';

import { useState } from 'react';
import MarkdownContent from './MarkdownContent';
import TraitBadge from './TraitBadge';
import type { Feat, FeatOwner } from '@/lib/types';

const ORIGINS = [
  'Acolyte', 'Apprentice', 'Boroughborn', 'Chosen', 'Commonfolk',
  'Cursed', 'Farmhand', 'Guildmate', 'Magic Initiate', 'Nobility',
  'Nomad', 'Outlaw', 'Soldier',
];

const PROFESSIONS = [
  'Agent', 'Berserker', 'Drifter', 'Duelist', 'Eidolon', 'Fighter',
  'Mage', 'Mercenary', 'Mesmer', 'Oathbound', 'Phagite', 'Warden',
];

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

function FeatCard({ feat }: { feat: Feat }) {
  const isPathFeat = feat.tag && feat.tag !== feat.owner_name;
  return (
    <div style={{
      padding: '1rem 1.25rem',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '0.625rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', margin: 0 }}>
          {feat.name}
        </h3>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', flexShrink: 0 }}>
          {feat.tier !== undefined && <TraitBadge trait={`Tier ${feat.tier}`} variant="muted" />}
          {feat.traits?.map((t) => <TraitBadge key={t} trait={t} variant="muted" />)}
          {feat.activation?.raw && feat.activation.raw !== '-' && <TraitBadge trait={feat.activation.raw} variant="accent" />}
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        {isPathFeat && (
          <span style={{ fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 500 }}>
            Path: <strong>{feat.tag}</strong>
          </span>
        )}
        {feat.required && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Requires: <strong style={{ color: 'var(--text)' }}>{feat.required}</strong>
          </span>
        )}
        {feat.path_investment && (
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Investment: <strong style={{ color: 'var(--text)' }}>{feat.path_investment}</strong>
          </span>
        )}
      </div>
      <MarkdownContent content={feat.description_markdown} />
    </div>
  );
}

interface Props {
  profOwners: FeatOwner[];
  profFeats: Feat[];
  originOwners: FeatOwner[];
  originFeats: Feat[];
}

export default function FeatsClient({ profOwners, profFeats, originOwners, originFeats }: Props) {
  const [activeProfs, setActiveProfs] = useState<Set<string>>(new Set());
  const [activeOrigins, setActiveOrigins] = useState<Set<string>>(new Set());

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, value: string) {
    const next = new Set(set);
    next.has(value) ? next.delete(value) : next.add(value);
    setter(next);
  }

  const hasFilters = activeProfs.size > 0 || activeOrigins.size > 0;

  const visibleProfOwners = activeProfs.size > 0
    ? profOwners.filter((o) => activeProfs.has(o.name))
    : profOwners;

  const visibleOriginOwners = activeOrigins.size > 0
    ? originOwners.filter((o) => activeOrigins.has(o.name))
    : originOwners;

  const filteredProfCount = visibleProfOwners.reduce(
    (n, o) => n + profFeats.filter((f) => f.owner_id === o.id).length, 0
  );
  const filteredOriginCount = visibleOriginOwners.reduce(
    (n, o) => n + originFeats.filter((f) => f.owner_id === o.id).length, 0
  );

  return (
    <div>
      {/* Filter bar */}
      <div style={{
        marginBottom: '2rem', padding: '1rem 1.25rem',
        backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)',
        borderRadius: '0.625rem',
      }}>
        {/* Profession filters */}
        <div style={{ marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', display: 'block', marginBottom: '0.375rem' }}>
            Profession
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {PROFESSIONS.map((p) => (
              <FilterPill key={p} label={p} active={activeProfs.has(p)} onClick={() => toggle(activeProfs, setActiveProfs, p)} />
            ))}
          </div>
        </div>

        {/* Origin filters */}
        <div>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', display: 'block', marginBottom: '0.375rem' }}>
            Origin
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
            {ORIGINS.map((o) => (
              <FilterPill key={o} label={o} active={activeOrigins.has(o)} onClick={() => toggle(activeOrigins, setActiveOrigins, o)} />
            ))}
          </div>
        </div>

        {/* Filter summary + clear */}
        {hasFilters && (
          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {filteredProfCount + filteredOriginCount} feat{filteredProfCount + filteredOriginCount !== 1 ? 's' : ''} match
            </span>
            <button
              onClick={() => { setActiveProfs(new Set()); setActiveOrigins(new Set()); }}
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

      {/* Profession Feats */}
      {(activeOrigins.size === 0 || activeProfs.size > 0) && (
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem',
            color: 'var(--text)', marginBottom: '1.25rem', paddingBottom: '0.5rem',
            borderBottom: '2px solid var(--primary)', display: 'inline-block',
          }}>
            Profession Feats
          </h2>

          {visibleProfOwners.map((owner) => {
            const ownerFeats = profFeats.filter((f) => f.owner_id === owner.id);
            if (!ownerFeats.length) return null;
            return (
              <div key={owner.id} style={{ marginBottom: '1.75rem' }}>
                <h3 style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem',
                  color: 'var(--primary)', marginBottom: '0.625rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  {owner.name}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                    ({ownerFeats.length})
                  </span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {ownerFeats.map((feat) => <FeatCard key={feat.id} feat={feat} />)}
                </div>
              </div>
            );
          })}

          {visibleProfOwners.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No profession feats match the selected filters.</p>
          )}
        </section>
      )}

      {/* Origin Feats */}
      {(activeProfs.size === 0 || activeOrigins.size > 0) && (
        <section>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem',
            color: 'var(--text)', marginBottom: '1.25rem', paddingBottom: '0.5rem',
            borderBottom: '2px solid var(--primary)', display: 'inline-block',
          }}>
            Origin Feats
          </h2>

          {visibleOriginOwners.map((owner) => {
            const ownerFeats = originFeats.filter((f) => f.owner_id === owner.id);
            if (!ownerFeats.length) return null;
            return (
              <div key={owner.id} style={{ marginBottom: '1.75rem' }}>
                <h3 style={{
                  fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem',
                  color: 'var(--primary)', marginBottom: '0.625rem',
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                }}>
                  {owner.name}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                    ({ownerFeats.length})
                  </span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {ownerFeats.map((feat) => <FeatCard key={feat.id} feat={feat} />)}
                </div>
              </div>
            );
          })}

          {visibleOriginOwners.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No origin feats match the selected filters.</p>
          )}
        </section>
      )}
    </div>
  );
}

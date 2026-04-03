import Link from 'next/link';
import { getSpells } from '@/lib/data';
import PageHeader from '@/components/PageHeader';
import TraitBadge from '@/components/TraitBadge';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Spells' };

const SCHOOL_COLORS: Record<string, { bg: string; text: string }> = {
  Conjuration: { bg: '#DBEAFE', text: '#1D4ED8' },
  Aberration: { bg: '#F3E8FF', text: '#7C3AED' },
  Mortification: { bg: '#FCE7F3', text: '#9D174D' },
  Illumination: { bg: '#FEF9C3', text: '#854D0E' },
  Elemental: { bg: '#D1FAE5', text: '#065F46' },
  Transmutation: { bg: '#FEF3C7', text: '#92400E' },
  Divination: { bg: '#E0F2FE', text: '#075985' },
};

function schoolStyle(school: string) {
  return SCHOOL_COLORS[school] ?? { bg: 'var(--bg-nav)', text: 'var(--text-muted)' };
}

export default function SpellsPage() {
  const spells = getSpells();

  const byTier: Record<number, typeof spells> = {};
  spells.forEach((s) => {
    if (!byTier[s.tier]) byTier[s.tier] = [];
    byTier[s.tier].push(s);
  });
  const tiers = Object.keys(byTier).map(Number).sort((a, b) => a - b);

  return (
    <div>
      <PageHeader
        title="Spells"
        subtitle="All spells organized by tier and school. Click any spell for full details."
        count={spells.length}
        countLabel="spells"
      />

      {tiers.map((tier) => (
        <div key={tier} style={{ marginBottom: '2rem' }}>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.8rem',
            color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.625rem',
          }}>
            {tier === 0 ? 'Cantrips' : `Tier ${tier}`} <span style={{ fontWeight: 400, color: 'var(--border-hover)' }}>({byTier[tier].length})</span>
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.625rem' }}>
            {byTier[tier].map((spell) => {
              const sc = schoolStyle(spell.school);
              return (
                <Link
                  key={spell.id}
                  href={`/spells/${spell.slug}`}
                  className="hover-card-subtle hover-card"
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
      ))}
    </div>
  );
}

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getSpells, getSpell } from '@/lib/data';
import MarkdownContent from '@/components/MarkdownContent';
import TraitBadge from '@/components/TraitBadge';
import type { Metadata } from 'next';

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getSpells().map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const spell = getSpell(slug);
  return { title: spell?.name ?? 'Not Found' };
}

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

export default async function SpellDetailPage({ params }: Props) {
  const { slug } = await params;
  const spell = getSpell(slug);
  if (!spell) notFound();

  const sc = schoolStyle(spell.school);

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
        <Link href="/spells" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Spells</Link>
        <span style={{ color: 'var(--text-muted)', margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'var(--text-muted)' }}>{spell.name}</span>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '2rem', color: 'var(--text)', margin: 0 }}>
            {spell.name}
          </h1>
          {spell.is_cantrip && <TraitBadge trait="Cantrip" variant="muted" />}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-heading)',
            letterSpacing: '0.04em', textTransform: 'uppercase',
            padding: '0.2rem 0.6rem', borderRadius: '9999px',
            backgroundColor: sc.bg, color: sc.text,
          }}>
            {spell.school}
          </span>
          <span style={{
            fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
            padding: '0.2rem 0.6rem', borderRadius: '9999px',
            backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
          }}>
            {spell.tier_label}
          </span>
          {(spell.sources ?? []).map((src) => (
            <span key={src} style={{
              fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
              padding: '0.2rem 0.6rem', borderRadius: '9999px',
              backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)',
            }}>
              {src}
            </span>
          ))}
        </div>
      </div>

      {/* Spell stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.625rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Range', value: spell.range },
          { label: 'Duration', value: spell.duration },
          ...(spell.cost ? [{ label: 'Cost', value: spell.cost }] : []),
        ].map((stat) => (
          <div key={stat.label} style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--bg-nav)',
            borderRadius: '0.5rem',
            border: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.2rem', fontFamily: 'var(--font-heading)' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Description */}
      <div style={{ marginBottom: '1.5rem', padding: '1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
        <MarkdownContent content={spell.description_markdown} />
      </div>

      {/* Amps */}
      {spell.amps && spell.amps.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.625rem' }}>
            Amp Options
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {spell.amps.map((amp, i) => (
              <div key={i} style={{
                display: 'flex',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--accent-light)',
                border: '1px solid #FCD34D',
                borderRadius: '0.5rem',
                alignItems: 'flex-start',
              }}>
                <span style={{
                  flexShrink: 0,
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: 'var(--accent)',
                  whiteSpace: 'nowrap',
                }}>
                  Amp {amp.cost}
                </span>
                <span style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.55 }}>
                  {amp.effect}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <Link href="/spells" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
          ← Back to Spells
        </Link>
      </div>
    </div>
  );
}

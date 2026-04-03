import Link from 'next/link';
import { getProfessions } from '@/lib/data';
import PageHeader from '@/components/PageHeader';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Professions' };

export default function ProfessionsPage() {
  const professions = getProfessions();

  return (
    <div>
      <PageHeader
        title="Professions"
        subtitle="Choose your path — each profession defines your character's role and abilities."
        count={professions.length}
        countLabel="professions"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' }}>
        {professions.map((prof) => (
          <Link
            key={prof.id}
            href={`/professions/${prof.slug}`}
            className="hover-card"
            style={{
              display: 'block',
              padding: '1.25rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '0.75rem',
              textDecoration: 'none',
            }}
          >
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.4rem' }}>
              {prof.name}
            </h2>

            {prof.path_options.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.6rem' }}>
                {prof.path_options.map((p) => (
                  <span key={p} style={{
                    fontSize: '0.7rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
                    letterSpacing: '0.04em', padding: '0.1rem 0.4rem', borderRadius: '9999px',
                    backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #FCD34D',
                  }}>
                    {p}
                  </span>
                ))}
              </div>
            )}

            <p style={{
              fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55,
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {prof.role}
            </p>

            <div style={{ marginTop: '0.875rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>Vitality:</span> {prof.starting_vitality}
              {prof.favored_attributes_raw && (
                <> &middot; <span style={{ color: 'var(--text)', fontWeight: 500 }}>Favored:</span> {prof.favored_attributes_raw}</>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

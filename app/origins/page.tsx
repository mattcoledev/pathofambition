import Link from 'next/link';
import { getOrigins } from '@/lib/data';
import PageHeader from '@/components/PageHeader';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Origins' };

export default function OriginsPage() {
  const origins = getOrigins();

  return (
    <div>
      <PageHeader
        title="Origins"
        subtitle="Your origin defines your background, starting equipment, and available vocations."
        count={origins.length}
        countLabel="origins"
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.875rem' }}>
        {origins.map((origin) => (
          <Link
            key={origin.id}
            href={`/origins/${origin.slug}`}
            className="hover-card"
            style={{
              display: 'block', padding: '1.25rem',
              backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '0.75rem', textDecoration: 'none',
            }}
          >
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '0.4rem' }}>
              {origin.name}
            </h2>

            <p style={{
              fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55, marginBottom: '0.75rem',
              display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {origin.flavor}
            </p>

            {origin.vocations.length > 0 && (
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>
                  Vocations:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
                  {origin.vocations.map((v) => (
                    <span key={v.id} style={{
                      fontSize: '0.7rem', fontWeight: 500, padding: '0.1rem 0.4rem',
                      borderRadius: '9999px', backgroundColor: 'var(--primary-light)',
                      color: 'var(--primary)', border: '1px solid #99F6E4',
                    }}>
                      {v.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}

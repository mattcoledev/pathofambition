import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getOrigins, getOrigin, getOriginFeats } from '@/lib/data';
import MarkdownContent from '@/components/MarkdownContent';
import TraitBadge from '@/components/TraitBadge';
import type { Metadata } from 'next';

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getOrigins().map((o) => ({ slug: o.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const origin = getOrigin(slug);
  return { title: origin?.name ?? 'Not Found' };
}

export default async function OriginDetailPage({ params }: Props) {
  const { slug } = await params;
  const origin = getOrigin(slug);
  if (!origin) notFound();

  const { feats } = getOriginFeats();
  const originFeats = feats.filter((f) => f.owner_id === origin.id);

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
        <Link href="/origins" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Origins</Link>
        <span style={{ color: 'var(--text-muted)', margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'var(--text-muted)' }}>{origin.name}</span>
      </nav>

      {/* Title */}
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '2rem', color: 'var(--text)', marginBottom: '0.25rem' }}>
          {origin.name}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{origin.pack_name}</p>
      </div>

      {/* Flavor */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', backgroundColor: 'var(--primary-light)', border: '1px solid #99F6E4', borderRadius: '0.625rem' }}>
        <p style={{ color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>{origin.flavor}</p>
      </div>

      {/* Origin Features */}
      {origin.origin_features.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.15rem', marginBottom: '0.875rem', color: 'var(--text)' }}>
            Origin Features
          </h2>
          {origin.origin_features.map((feat) => (
            <div key={feat.id} style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '0.625rem',
              marginBottom: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem', color: 'var(--text)', margin: 0 }}>
                  {feat.name}
                </h3>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {feat.traits?.map((t) => <TraitBadge key={t} trait={t} />)}
                </div>
              </div>
              <MarkdownContent content={feat.description_markdown} />
            </div>
          ))}
        </div>
      )}

      {/* Vocations */}
      {origin.vocations.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.15rem', marginBottom: '0.875rem', color: 'var(--text)' }}>
            Vocations
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {origin.vocations.map((voc) => (
              <div key={voc.id} style={{
                padding: '1.25rem',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '0.75rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)', margin: 0 }}>
                    {voc.name}
                  </h3>
                  {voc.attribute_bonus.raw && (
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
                      padding: '0.15rem 0.45rem', borderRadius: '9999px',
                      backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #FCD34D',
                    }}>
                      {voc.attribute_bonus.raw}
                    </span>
                  )}
                </div>
                {voc.flavor && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '0.875rem' }}>
                    {voc.flavor}
                  </p>
                )}
                {voc.features.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {voc.features.map((feat) => (
                      <div key={feat.id} style={{
                        padding: '0.875rem 1rem',
                        backgroundColor: 'var(--bg-nav)',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border)',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.375rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
                            {feat.name}
                          </span>
                          <div style={{ display: 'flex', gap: '0.3rem' }}>
                            {feat.traits?.map((t) => <TraitBadge key={t} trait={t} variant="muted" />)}
                          </div>
                        </div>
                        <MarkdownContent content={feat.description_markdown} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Starting Pack */}
      {origin.origin_pack.raw && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.15rem', marginBottom: '0.75rem', color: 'var(--text)' }}>
            Starting Pack
          </h2>
          <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.625rem' }}>
            <MarkdownContent content={origin.origin_pack.raw} />
          </div>
        </div>
      )}

      {/* Origin Feats */}
      {originFeats.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.15rem', marginBottom: '0.875rem', color: 'var(--text)' }}>
            {origin.name} Feats
          </h2>
          {originFeats.map((feat) => (
            <div key={feat.id} style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '0.625rem',
              marginBottom: '0.75rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem', color: 'var(--text)', margin: 0 }}>
                  {feat.name}
                </h3>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {feat.traits?.map((t) => <TraitBadge key={t} trait={t} />)}
                </div>
              </div>
              {feat.prerequisites && feat.prerequisites.length > 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--accent)', marginBottom: '0.5rem', fontWeight: 500 }}>
                  Prerequisites: {feat.prerequisites.join(', ')}
                </p>
              )}
              <MarkdownContent content={feat.description_markdown} />
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <Link href="/origins" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
          ← Back to Origins
        </Link>
      </div>
    </div>
  );
}

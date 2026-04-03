import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProfessions, getProfession, getProfessionFeats } from '@/lib/data';
import MarkdownContent from '@/components/MarkdownContent';
import TraitBadge from '@/components/TraitBadge';
import type { Metadata } from 'next';
import type { ProfessionFeature, Feat } from '@/lib/types';

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  return getProfessions().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const prof = getProfession(slug);
  return { title: prof?.name ?? 'Not Found' };
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: '0.75rem 1rem',
      backgroundColor: 'var(--bg-nav)',
      borderRadius: '0.5rem',
      border: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.2rem', fontFamily: 'var(--font-heading)' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
        {value}
      </div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: ProfessionFeature | Feat }) {
  return (
    <div style={{
      padding: '1rem 1.25rem',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '0.625rem',
      marginBottom: '0.75rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem', color: 'var(--text)', margin: 0 }}>
          {feature.name}
        </h3>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', flexShrink: 0 }}>
          {feature.traits?.map((t) => (
            <TraitBadge key={t} trait={t} />
          ))}
          {'cost' in feature && feature.cost && feature.cost !== '-' && (
            <TraitBadge trait={feature.cost} variant="accent" />
          )}
          {'activation' in feature && feature.activation?.raw && feature.activation.raw !== '-' && (
            <TraitBadge trait={feature.activation.raw} variant="accent" />
          )}
        </div>
      </div>
      <MarkdownContent content={feature.description_markdown} />
    </div>
  );
}

export default async function ProfessionDetailPage({ params }: Props) {
  const { slug } = await params;
  const prof = getProfession(slug);
  if (!prof) notFound();

  const { feats } = getProfessionFeats();
  const profFeats = feats.filter((f) => f.owner_id === prof.id);

  // Group features by path
  const baseFeatures = prof.features.filter((f) => !f.path);
  const pathGroups: Record<string, ProfessionFeature[]> = {};
  prof.features
    .filter((f) => f.path)
    .forEach((f) => {
      if (!pathGroups[f.path!]) pathGroups[f.path!] = [];
      pathGroups[f.path!].push(f);
    });

  // Group feats by path
  const baseProfFeats = profFeats.filter((f) => !f.path);
  const featPathGroups: Record<string, Feat[]> = {};
  profFeats
    .filter((f) => f.path)
    .forEach((f) => {
      if (!featPathGroups[f.path!]) featPathGroups[f.path!] = [];
      featPathGroups[f.path!].push(f);
    });

  return (
    <div>
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
        <Link href="/professions" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Professions</Link>
        <span style={{ color: 'var(--text-muted)', margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'var(--text-muted)' }}>{prof.name}</span>
      </nav>

      {/* Title */}
      <div style={{ marginBottom: '1.5rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '2rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
          {prof.name}
        </h1>
        {prof.path_options.length > 0 && (
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {prof.path_options.map((p) => (
              <span key={p} style={{
                fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-heading)',
                padding: '0.2rem 0.6rem', borderRadius: '9999px',
                backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #FCD34D',
              }}>
                Path: {p}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Flavor */}
      {prof.flavor && (
        <div style={{ marginBottom: '1.5rem' }}>
          <MarkdownContent content={prof.flavor} />
        </div>
      )}

      {/* Role */}
      <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', backgroundColor: 'var(--primary-light)', border: '1px solid #99F6E4', borderRadius: '0.625rem' }}>
        <p style={{ color: 'var(--text)', lineHeight: 1.65, margin: 0 }}>{prof.role}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.625rem', marginBottom: '2rem' }}>
        {prof.starting_vitality && <StatBlock label="Starting Vitality" value={prof.starting_vitality} />}
        {prof.vitality_gained_per_tier && <StatBlock label="Vitality per Tier" value={prof.vitality_gained_per_tier} />}
        {prof.favored_attributes_raw && <StatBlock label="Favored Attributes" value={prof.favored_attributes_raw} />}
        {prof.body_modifier_bonus && <StatBlock label="Body Modifier Bonus" value={prof.body_modifier_bonus} />}
      </div>

      {/* Proficiencies */}
      {prof.proficiencies.raw && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.15rem', marginBottom: '0.75rem', color: 'var(--text)' }}>
            Proficiencies
          </h2>
          <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.625rem' }}>
            <MarkdownContent content={prof.proficiencies.raw} />
          </div>
        </div>
      )}

      {/* Starting Pack */}
      {prof.starting_pack.raw && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.15rem', marginBottom: '0.75rem', color: 'var(--text)' }}>
            Starting Pack
          </h2>
          <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.625rem' }}>
            <MarkdownContent content={prof.starting_pack.raw} />
          </div>
        </div>
      )}

      {/* Base Features */}
      {baseFeatures.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.15rem', marginBottom: '0.875rem', color: 'var(--text)' }}>
            Base Features
          </h2>
          {baseFeatures.map((f) => <FeatureCard key={f.id} feature={f} />)}
        </div>
      )}

      {/* Path Features */}
      {Object.entries(pathGroups).map(([path, features]) => (
        <div key={path} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.15rem', marginBottom: '0.875rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #FCD34D', fontWeight: 600 }}>
              Path
            </span>
            {path}
          </h2>
          {features.map((f) => <FeatureCard key={f.id} feature={f} />)}
        </div>
      ))}

      {/* Base Feats */}
      {baseProfFeats.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.15rem', marginBottom: '0.875rem', color: 'var(--text)' }}>
            {prof.name} Feats
          </h2>
          {baseProfFeats.map((f) => <FeatureCard key={f.id} feature={f} />)}
        </div>
      )}

      {/* Path Feats */}
      {Object.entries(featPathGroups).map(([path, pfFeats]) => (
        <div key={path} style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.15rem', marginBottom: '0.875rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #FCD34D', fontWeight: 600 }}>
              Path Feats
            </span>
            {path}
          </h2>
          {pfFeats.map((f) => <FeatureCard key={f.id} feature={f} />)}
        </div>
      ))}
    </div>
  );
}

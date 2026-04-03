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
    <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-nav)', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.2rem', fontFamily: 'var(--font-heading)' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>
        {value}
      </div>
    </div>
  );
}

function ProficiencyList({ prof }: { prof: ReturnType<typeof getProfession> }) {
  if (!prof) return null;
  const p = prof.proficiencies;
  const hasData = p.vitals_skills.length > 0 || p.armaments.length > 0 || p.protection.length > 0 || p.tool_kits.length > 0;

  if (!hasData && !p.raw) {
    return (
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        Proficiency data not available in source file.
      </p>
    );
  }

  // Use structured fields if available, otherwise fall back to raw markdown
  if (hasData) {
    const rows = [
      { label: 'V.I.T.A.L.S. Skills', items: p.vitals_skills },
      { label: 'Armaments', items: p.armaments },
      { label: 'Protection', items: p.protection },
      { label: 'Tool Kits', items: p.tool_kits },
    ].filter((r) => r.items.length > 0 && !(r.items.length === 1 && r.items[0] === '-'));

    return (
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {rows.map((row) => (
          <li key={row.label} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', fontSize: '0.9rem' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--text)', minWidth: '130px', flexShrink: 0 }}>
              {row.label}
            </span>
            <span style={{ color: 'var(--text-muted)' }}>{row.items.join(' ')}</span>
          </li>
        ))}
      </ul>
    );
  }

  return <MarkdownContent content={p.raw} />;
}

function StartingPackList({ pack }: { pack: NonNullable<ReturnType<typeof getProfession>>['starting_pack'] }) {
  // Try structured sub-arrays first
  const sections = [
    { label: 'Weapons', items: pack.weapons?.items ?? [] },
    { label: 'Armor', items: pack.armor?.items ?? [] },
    { label: 'Kit', items: pack.kit?.items ?? [] },
    { label: 'Inventory', items: pack.inventory?.items ?? [] },
  ].filter((s) => s.items.length > 0 && !(s.items.length === 1 && (s.items[0] === '' || s.items[0].toLowerCase() === 'none')));

  const hasSections = sections.length > 0;

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
      {hasSections ? (
        <>
          {sections.map((sec) => (
            <li key={sec.label}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)', display: 'block', marginBottom: '0.2rem' }}>
                {sec.label}
              </span>
              <ul style={{ listStyle: 'disc', paddingLeft: '1.25rem', margin: 0 }}>
                {sec.items.map((item, i) => (
                  <li key={i} style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>{item}</li>
                ))}
              </ul>
            </li>
          ))}
        </>
      ) : (
        // Fall back: parse the raw comma-separated or line-separated string
        pack.raw.split(/,\s*|\n/).filter(Boolean).map((item, i) => (
          <li key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
            <span style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '0.25rem' }}>•</span>
            <span>{item.trim()}</span>
          </li>
        ))
      )}
      {pack.starting_currency && (
        <li style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.25rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>Starting Currency</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--accent)', fontWeight: 600 }}>{pack.starting_currency}</span>
        </li>
      )}
    </ul>
  );
}

function FeatureCard({ feature }: { feature: ProfessionFeature }) {
  return (
    <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.625rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem', color: 'var(--text)', margin: 0 }}>
          {feature.name}
        </h3>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', flexShrink: 0 }}>
          {feature.traits?.map((t) => <TraitBadge key={t} trait={t} />)}
          {feature.activation?.raw && feature.activation.raw !== '-' && (
            <TraitBadge trait={feature.activation.raw} variant="accent" />
          )}
        </div>
      </div>
      <MarkdownContent content={feature.description_markdown} />
    </div>
  );
}

function FeatCard({ feat }: { feat: Feat }) {
  const isPathFeat = feat.tag && feat.tag !== feat.owner_name;
  return (
    <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.625rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem', color: 'var(--text)', margin: 0 }}>
          {feat.name}
        </h3>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', flexShrink: 0 }}>
          {feat.tier !== undefined && (
            <TraitBadge trait={`Tier ${feat.tier}`} variant="muted" />
          )}
          {feat.traits?.map((t) => <TraitBadge key={t} trait={t} />)}
          {feat.activation?.raw && feat.activation.raw !== '-' && (
            <TraitBadge trait={feat.activation.raw} variant="accent" />
          )}
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
      </div>
      <MarkdownContent content={feat.description_markdown} />
    </div>
  );
}

export default async function ProfessionDetailPage({ params }: Props) {
  const { slug } = await params;
  const prof = getProfession(slug);
  if (!prof) notFound();

  const { feats } = getProfessionFeats();
  const profFeats = feats.filter((f) => f.owner_id === prof.id);

  const baseFeatures = prof.features.filter((f) => !f.path);
  const pathGroups: Record<string, ProfessionFeature[]> = {};
  prof.features.filter((f) => f.path).forEach((f) => {
    if (!pathGroups[f.path!]) pathGroups[f.path!] = [];
    pathGroups[f.path!].push(f);
  });

  // Group feats: base (tag === owner_name or no tag) vs by path (tag)
  const baseProfFeats = profFeats.filter((f) => !f.tag || f.tag === f.owner_name);
  const featPathGroups: Record<string, Feat[]> = {};
  profFeats.filter((f) => f.tag && f.tag !== f.owner_name).forEach((f) => {
    if (!featPathGroups[f.tag!]) featPathGroups[f.tag!] = [];
    featPathGroups[f.tag!].push(f);
  });

  const hasStartingPack = prof.starting_pack.raw || prof.starting_pack.weapons?.items?.length > 0;

  return (
    <div>
      <nav aria-label="Breadcrumb" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
        <Link href="/professions" style={{ color: 'var(--primary)', textDecoration: 'none' }}>Professions</Link>
        <span style={{ color: 'var(--text-muted)', margin: '0 0.4rem' }}>›</span>
        <span style={{ color: 'var(--text-muted)' }}>{prof.name}</span>
      </nav>

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

      {prof.flavor && (
        <div style={{ marginBottom: '1.5rem' }}>
          <MarkdownContent content={prof.flavor} />
        </div>
      )}

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
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.15rem', marginBottom: '0.75rem', color: 'var(--text)' }}>
          Proficiencies
        </h2>
        <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.625rem' }}>
          <ProficiencyList prof={prof} />
        </div>
      </div>

      {/* Starting Pack */}
      {hasStartingPack && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.15rem', marginBottom: '0.75rem', color: 'var(--text)' }}>
            Starting Pack
          </h2>
          <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.625rem' }}>
            <StartingPackList pack={prof.starting_pack} />
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
          {baseProfFeats.map((f) => <FeatCard key={f.id} feat={f} />)}
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
          {pfFeats.map((f) => <FeatCard key={f.id} feat={f} />)}
        </div>
      ))}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <Link href="/professions" style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none' }}>
          ← Back to Professions
        </Link>
      </div>
    </div>
  );
}

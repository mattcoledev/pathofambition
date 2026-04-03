import { getProfessionFeats, getOriginFeats } from '@/lib/data';
import PageHeader from '@/components/PageHeader';
import MarkdownContent from '@/components/MarkdownContent';
import TraitBadge from '@/components/TraitBadge';
import type { Metadata } from 'next';
import type { Feat } from '@/lib/types';

export const metadata: Metadata = { title: 'Feats' };

function FeatCard({ feat }: { feat: Feat }) {
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
          {feat.traits?.map((t) => <TraitBadge key={t} trait={t} variant="muted" />)}
          {feat.cost && feat.cost !== '-' && <TraitBadge trait={feat.cost} variant="accent" />}
          {feat.activation?.raw && feat.activation.raw !== '-' && <TraitBadge trait={feat.activation.raw} variant="accent" />}
        </div>
      </div>
      {feat.prerequisites && feat.prerequisites.length > 0 && (
        <p style={{ fontSize: '0.78rem', color: 'var(--accent)', marginBottom: '0.4rem', fontWeight: 500 }}>
          Prerequisites: {feat.prerequisites.join(', ')}
        </p>
      )}
      {feat.path && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
          Path: <strong style={{ color: 'var(--text)' }}>{feat.path}</strong>
          {feat.path_tier ? ` (Tier ${feat.path_tier})` : ''}
        </p>
      )}
      <MarkdownContent content={feat.description_markdown} />
    </div>
  );
}

export default function FeatsPage() {
  const { owners: profOwners, feats: profFeats } = getProfessionFeats();
  const { owners: originOwners, feats: originFeats } = getOriginFeats();

  const total = profFeats.length + originFeats.length;

  return (
    <div>
      <PageHeader
        title="Feats"
        subtitle="Special abilities earned through origins and profession advancement."
        count={total}
        countLabel="feats"
      />

      {/* Profession Feats */}
      <section style={{ marginBottom: '2.5rem' }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: '1.25rem',
          color: 'var(--text)',
          marginBottom: '1.25rem',
          paddingBottom: '0.5rem',
          borderBottom: '2px solid var(--primary)',
          display: 'inline-block',
        }}>
          Profession Feats
        </h2>

        {profOwners.map((owner) => {
          const ownerFeats = profFeats.filter((f) => f.owner_id === owner.id);
          if (!ownerFeats.length) return null;
          return (
            <div key={owner.id} style={{ marginBottom: '1.75rem' }}>
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: '1rem',
                color: 'var(--primary)',
                marginBottom: '0.625rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
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
      </section>

      {/* Origin Feats */}
      <section>
        <h2 style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: '1.25rem',
          color: 'var(--text)',
          marginBottom: '1.25rem',
          paddingBottom: '0.5rem',
          borderBottom: '2px solid var(--primary)',
          display: 'inline-block',
        }}>
          Origin Feats
        </h2>

        {originOwners.map((owner) => {
          const ownerFeats = originFeats.filter((f) => f.owner_id === owner.id);
          if (!ownerFeats.length) return null;
          return (
            <div key={owner.id} style={{ marginBottom: '1.75rem' }}>
              <h3 style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: '1rem',
                color: 'var(--primary)',
                marginBottom: '0.625rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
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
      </section>
    </div>
  );
}

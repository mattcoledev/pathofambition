import { getActions } from '@/lib/data';
import PageHeader from '@/components/PageHeader';
import TraitBadge from '@/components/TraitBadge';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Actions' };

const GROUP_COLORS: Record<string, string> = {
  offensive: '#FEE2E2',
  maneuver: '#DBEAFE',
  utility_actions: '#D1FAE5',
  general_actions: 'var(--primary-light)',
  narrative_actions: '#F3E8FF',
  passive: 'var(--accent-light)',
  triggers: '#E0F2FE',
};

export default function ActionsPage() {
  const { groups, actions } = getActions();
  const sortedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <PageHeader
        title="Actions"
        subtitle="All combat and narrative actions available to characters, grouped by type."
        count={actions.length}
        countLabel="actions"
      />

      {sortedGroups.map((group) => {
        const groupActions = actions
          .filter((a) => (a as unknown as { group_id: string }).group_id === group.id)
          .sort((a, b) => {
            const ao = (a as unknown as { sort_order: number }).sort_order ?? 0;
            const bo = (b as unknown as { sort_order: number }).sort_order ?? 0;
            return ao - bo;
          });
        if (!groupActions.length) return null;

        const bgColor = GROUP_COLORS[group.id] ?? 'var(--bg-nav)';

        return (
          <div key={group.id} style={{ marginBottom: '2.5rem' }}>
            {/* Group header */}
            <div style={{
              marginBottom: '1rem',
              padding: '0.875rem 1.25rem',
              backgroundColor: bgColor,
              borderRadius: '0.625rem',
              border: '1px solid var(--border)',
            }}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)', margin: '0 0 0.25rem' }}>
                {group.name}
              </h2>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.55 }}>
                {group.description}
              </p>
              {group.rules.length > 0 && (
                <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', marginBottom: 0 }}>
                  {group.rules.map((rule, i) => (
                    <li key={i} style={{ fontSize: '0.825rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{rule}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Actions in group */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {groupActions.map((action) => {
                const a = action as unknown as {
                  id: string; name: string; slug: string;
                  activation?: { raw: string }; description?: string;
                  description_markdown?: string; outcomes?: Array<{ label: string; description: string }>;
                  required?: string | null; traits?: string[];
                };
                return (
                  <div
                    key={a.id}
                    style={{
                      padding: '1rem 1.25rem',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: '0.625rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem', color: 'var(--text)', margin: 0 }}>
                        {a.name}
                      </h3>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', flexShrink: 0 }}>
                        {a.activation?.raw && a.activation.raw !== '-' && (
                          <TraitBadge trait={a.activation.raw} variant="accent" />
                        )}
                        {a.traits?.map((t) => <TraitBadge key={t} trait={t} variant="muted" />)}
                      </div>
                    </div>

                    {a.required && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--accent)', marginBottom: '0.4rem', fontWeight: 500 }}>
                        Required: {a.required}
                      </p>
                    )}

                    {(a.description || a.description_markdown) && (
                      <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>
                        {a.description ?? a.description_markdown}
                      </p>
                    )}

                    {/* Outcomes */}
                    {a.outcomes && a.outcomes.length > 0 && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                        {a.outcomes.map((outcome, i) => (
                          <div key={i} style={{
                            display: 'flex', gap: '0.5rem',
                            padding: '0.4rem 0.75rem',
                            backgroundColor: 'var(--bg-nav)',
                            borderRadius: '0.375rem',
                            fontSize: '0.85rem',
                          }}>
                            <span style={{ fontWeight: 600, color: 'var(--primary)', whiteSpace: 'nowrap', flexShrink: 0 }}>{outcome.label}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{outcome.description}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

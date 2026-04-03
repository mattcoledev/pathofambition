import { getEquipment } from '@/lib/data';
import PageHeader from '@/components/PageHeader';
import TraitBadge from '@/components/TraitBadge';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Equipment' };

interface Weapon {
  id: string; name: string; slug: string;
  groups: string[]; damage: string;
  damage_types: string[]; range_bands: string[];
  traits: string[]; cost: number | null;
}

interface Kit {
  id: string; name: string; slug: string; category: string;
  uses: string[]; bonus: string; critical: string;
}

interface Shield {
  id: string; name: string; slug: string;
  shield_type: string | null; armor_type: string | null;
  bonus: { raw: string | null; value: number | null };
  reduction_pool: number; traits: string[];
}

interface ArmorType {
  id: string; type: string; bonus_range: string;
  traits: string[]; augment_slots: string;
}

interface ItemTrait {
  id: string; name: string; alias: string | null; effect: string;
}

const DMG_LABELS: Record<string, string> = { B: 'Blunt', P: 'Puncture', S: 'Slash' };
const RANGE_LABELS: Record<string, string> = { M: 'Melee', C: 'Close', N: 'Nearby', F: 'Far' };

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      fontSize: '1.15rem',
      color: 'var(--text)',
      marginBottom: '0.875rem',
      paddingBottom: '0.4rem',
      borderBottom: '2px solid var(--primary)',
      display: 'inline-block',
    }}>
      {children}
    </h2>
  );
}

function RuleCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: '1rem 1.25rem',
      backgroundColor: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '0.625rem',
    }}>
      <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function EquipmentPage() {
  const eq = getEquipment() as Record<string, unknown>;
  const rules = eq.rules as Record<string, unknown>;
  const weapons = (eq.weapons as Weapon[]) ?? [];
  const kits = (eq.kits as Kit[]) ?? [];
  const shields = (eq.shields as Shield[]) ?? [];
  const armorTypes = (eq.armor_types as ArmorType[]) ?? [];
  const itemTraits = (eq.item_traits as ItemTrait[]) ?? [];

  const recovery = rules?.recovery as Record<string, unknown>;
  const inventory = rules?.inventory as Record<string, unknown>;
  const masterwork = eq.masterwork_quality as Record<string, unknown> | undefined;

  // Group weapons by first group
  const weaponsByGroup: Record<string, Weapon[]> = {};
  weapons.forEach((w) => {
    const g = w.groups[0] ?? 'Other';
    if (!weaponsByGroup[g]) weaponsByGroup[g] = [];
    weaponsByGroup[g].push(w);
  });

  return (
    <div>
      <PageHeader
        title="Equipment"
        subtitle="Weapons, armor, kits, shields, and the rules that govern them."
      />

      {/* Recovery Rules */}
      {recovery && (
        <div style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Recovery</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', marginTop: '0.875rem' }}>
            {Object.entries(recovery as Record<string, Record<string, unknown>>).map(([key, val]) => {
              const typed = val as { duration?: string; restore?: Record<string, string> };
              return (
                <RuleCard key={key} title={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}>
                  <dl style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {typed.duration && (
                      <div><dt style={{ fontWeight: 600, color: 'var(--text)' }}>Duration</dt><dd style={{ marginBottom: '0.3rem' }}>{typed.duration}</dd></div>
                    )}
                    {typed.restore && Object.entries(typed.restore).map(([k, v]) => (
                      <div key={k}><dt style={{ fontWeight: 600, color: 'var(--text)', textTransform: 'capitalize' }}>{k}</dt><dd style={{ marginBottom: '0.25rem' }}>{v}</dd></div>
                    ))}
                  </dl>
                </RuleCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Inventory */}
      {inventory && (
        <div style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Inventory</SectionTitle>
          <div style={{ marginTop: '0.875rem', padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.625rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <div>
                <span style={{ fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '0.2rem' }}>Carry Weight</span>
                <span style={{ color: 'var(--text-muted)' }}>{eq.carry_weight_formula as string ?? (inventory as Record<string,unknown>).carry_weight_formula as string}</span>
              </div>
              {(inventory as Record<string,Record<string,string>>).item_slots && (
                <div>
                  <span style={{ fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '0.2rem' }}>Item Slots</span>
                  <span style={{ color: 'var(--text-muted)' }}>{(inventory as Record<string,Record<string,string>>).item_slots.default_rule}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Armor Types */}
      {armorTypes.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Armor</SectionTitle>
          <div style={{ marginTop: '0.875rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.625rem' }}>
            {armorTypes.map((a) => (
              <div key={a.id} style={{
                padding: '1rem',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '0.625rem',
              }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.3rem' }}>
                  {a.type}
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Bonus: <strong style={{ color: 'var(--text)' }}>{a.bonus_range}</strong>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>
                  Augment Slots: <strong style={{ color: 'var(--text)' }}>{a.augment_slots}</strong>
                </div>
                {a.traits.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                    {a.traits.map((t) => <TraitBadge key={t} trait={t} variant="muted" />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Masterwork Quality */}
      {masterwork && (
        <div style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Masterwork Quality</SectionTitle>
          <div style={{ marginTop: '0.875rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.625rem' }}>
            {(masterwork.tiers as Array<{ name: string; bonus: number }>).map((tier) => (
              <div key={tier.name} style={{
                padding: '0.875rem',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '0.5rem',
                textAlign: 'center',
              }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--primary)' }}>
                  +{tier.bonus}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text)', fontWeight: 500 }}>{tier.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weapons */}
      {weapons.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Weapons</SectionTitle>
          {Object.entries(weaponsByGroup).map(([group, groupWeapons]) => (
            <div key={group} style={{ marginBottom: '1.5rem', marginTop: '1rem' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.625rem' }}>
                {group} ({groupWeapons.length})
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr>
                      {['Weapon', 'Damage', 'Type', 'Range', 'Traits', 'Cost'].map((h) => (
                        <th key={h} style={{
                          padding: '0.5rem 0.75rem',
                          backgroundColor: 'var(--bg-nav)',
                          borderBottom: '1px solid var(--border)',
                          fontFamily: 'var(--font-heading)',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--text-muted)',
                          textAlign: 'left',
                          whiteSpace: 'nowrap',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {groupWeapons.map((w, i) => (
                      <tr key={w.id} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-nav)' }}>
                        <td style={{ padding: '0.5rem 0.75rem', fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>{w.name}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--primary)', fontFamily: 'var(--font-heading)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{w.damage}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{w.damage_types.map(d => DMG_LABELS[d] ?? d).join(', ')}</td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>{w.range_bands.map(r => RANGE_LABELS[r] ?? r).join(', ')}</td>
                        <td style={{ padding: '0.5rem 0.75rem', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                            {w.traits.map(t => <TraitBadge key={t} trait={t} variant="muted" />)}
                          </div>
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                          {w.cost != null ? `${w.cost}g` : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Shields */}
      {shields.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Shields</SectionTitle>
          <div style={{ marginTop: '0.875rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
            {shields.map((s) => (
              <div key={s.id} style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.625rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.35rem' }}>{s.name}</h3>
                {s.shield_type && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Type: <strong style={{ color: 'var(--text)' }}>{s.shield_type}</strong></div>}
                {s.bonus.raw && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Bonus: <strong style={{ color: 'var(--primary)' }}>{s.bonus.raw}</strong></div>}
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Pool: <strong style={{ color: 'var(--text)' }}>{s.reduction_pool}</strong></div>
                {s.traits.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {s.traits.map(t => <TraitBadge key={t} trait={t} variant="muted" />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Kits */}
      {kits.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Kits</SectionTitle>
          <div style={{ marginTop: '0.875rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '0.625rem' }}>
            {kits.map((k) => (
              <div key={k.id} style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.625rem' }}>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.35rem' }}>{k.name}</h3>
                {k.category && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: '0.4rem' }}>{k.category}</div>}
                {k.bonus && <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.25rem' }}><strong>Bonus:</strong> {k.bonus}</div>}
                {k.critical && <div style={{ fontSize: '0.85rem', color: 'var(--text)', marginBottom: '0.25rem' }}><strong>Critical:</strong> {k.critical}</div>}
                {k.uses?.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Uses: {k.uses.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item Traits */}
      {itemTraits.length > 0 && (
        <div style={{ marginBottom: '2.5rem' }}>
          <SectionTitle>Item Traits</SectionTitle>
          <div style={{ marginTop: '0.875rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.625rem' }}>
            {itemTraits.map((t) => (
              <div key={t.id} style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{
                  flexShrink: 0, fontFamily: 'var(--font-heading)', fontWeight: 700,
                  fontSize: '0.75rem', color: 'var(--primary)',
                  backgroundColor: 'var(--primary-light)', padding: '0.2rem 0.5rem',
                  borderRadius: '0.25rem', whiteSpace: 'nowrap',
                }}>
                  {t.name}{t.alias ? ` (${t.alias})` : ''}
                </span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.effect}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

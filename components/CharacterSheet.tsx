'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MarkdownContent from './MarkdownContent';
import { getCharacter, updateCharacter, deleteCharacter } from '@/lib/characterStorage';
import {
  getTotalAttributes, calcStartingVitality, calcBodyDefense, calcMindDefense,
  calcWillDefense, calcMaxWounds, calcCarryWeight, calcReservoir, calcSpellDC,
} from '@/lib/characterCalc';
import type {
  Character, BuilderProfession, BuilderOrigin, BuilderFeat, BuilderSpell,
  InventoryItem, InventoryCategory,
} from '@/lib/characterTypes';

interface Props {
  id: string;
  professions: BuilderProfession[];
  origins: BuilderOrigin[];
  professionFeats: BuilderFeat[];
  originFeats: BuilderFeat[];
  spells: BuilderSpell[];
}

type TabId = 'feats' | 'inventory' | 'spellcasting' | 'notes';

const INVENTORY_CATEGORIES: InventoryCategory[] = ['Weapon', 'Armor', 'Shield', 'Kit', 'Consumable', 'Misc'];

// ─── Helper components ────────────────────────────────────────────────────────

function EditableNumber({
  label, value, min, max, onChange,
}: { label: string; value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.625rem 0.5rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
        <button onClick={() => onChange(Math.max(min ?? 0, value - 1))} style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
        <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--primary)', minWidth: '32px', textAlign: 'center' }}>{value}</span>
        <button onClick={() => onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)} style={{ width: '24px', height: '24px', borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.75rem 0.5rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.875rem', paddingBottom: '0.375rem', borderBottom: '2px solid var(--primary)', display: 'inline-block' }}>
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CharacterSheetPage({ id, professions, professionFeats, originFeats, spells }: Props) {
  const router = useRouter();
  const [char, setChar] = useState<Character | null>(null);
  const [mounted, setMounted] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState('');
  const [maxVitalityInput, setMaxVitalityInput] = useState('');
  const [editingMaxVitality, setEditingMaxVitality] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('feats');

  // Add item form
  const [addingItem, setAddingItem] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<InventoryCategory>('Misc');
  const [newQty, setNewQty] = useState(1);
  const [newWeight, setNewWeight] = useState(0);
  const [newNotes, setNewNotes] = useState('');

  useEffect(() => {
    const loaded = getCharacter(id);
    setChar(loaded);
    if (loaded) {
      setNotesVal(loaded.notes ?? '');
      setMaxVitalityInput(loaded.maxVitality !== null ? String(loaded.maxVitality) : '');
      setEditingMaxVitality(loaded.maxVitality === null);
    }
    setMounted(true);
  }, [id]);

  if (!mounted) return null;
  if (!char) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Character not found.</p>
        <Link href="/characters" style={{ color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>← Back to Characters</Link>
      </div>
    );
  }

  // char is non-null past the guard above; capture for closure use
  const c = char!;
  const prof = professions.find((p) => p.id === c.professionId) ?? null;
  const attrs = getTotalAttributes(char);
  const isCaster = prof?.casterType != null;
  const modKey = (prof?.casterModifierOptions?.length === 1 ? prof.casterModifierOptions[0] : char.spellcastingModifier) ?? 'mind';
  const modVal = attrs[modKey];

  const bodyDef = calcBodyDefense(attrs);
  const mindDef = calcMindDefense(attrs);
  const willDef = calcWillDefense(attrs);
  const maxWounds = calcMaxWounds(attrs, char.tier);
  const carryWeight = calcCarryWeight(attrs, char.tier);
  const reservoir = isCaster ? calcReservoir(prof!.casterType, char.tier, modVal) : null;
  const spellDC = isCaster ? calcSpellDC(char.tier, modVal) : null;

  const selectedFeats = [
    ...professionFeats.filter((f) => char.selectedFeatIds.includes(f.id)),
    ...originFeats.filter((f) => char.selectedFeatIds.includes(f.id)),
  ];
  const mySpells = spells.filter((s) => char.knownSpellIds.includes(s.id));
  const inventory: InventoryItem[] = char.inventory ?? [];
  const totalCarried = inventory.reduce((s, i) => s + i.weight * i.quantity, 0);

  function persist(updates: Partial<Character>) {
    const updated = updateCharacter(id, updates);
    if (updated) setChar(updated);
  }

  function handleDelete() {
    if (!confirm(`Delete "${char!.name}"? This cannot be undone.`)) return;
    deleteCharacter(id);
    router.push('/characters');
  }

  // ─── Inventory handlers ──────────────────────────────────────────────────
  function addItem() {
    if (!newName.trim()) return;
    const item: InventoryItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newName.trim(),
      category: newCategory,
      quantity: newQty,
      weight: newWeight,
      notes: newNotes,
      source: 'manual',
    };
    persist({ inventory: [...inventory, item] });
    setNewName(''); setNewCategory('Misc'); setNewQty(1); setNewWeight(0); setNewNotes('');
    setAddingItem(false);
  }

  function removeItem(itemId: string) {
    persist({ inventory: inventory.filter((i) => i.id !== itemId) });
  }

  function updateItem(itemId: string, updates: Partial<InventoryItem>) {
    persist({ inventory: inventory.map((i) => i.id === itemId ? { ...i, ...updates } : i) });
  }

  const fmtAttr = (v: number) => v >= 0 ? `+${v}` : String(v);

  // ─── Render helpers ──────────────────────────────────────────────────────

  const inputStyle: React.CSSProperties = {
    padding: '0.3rem 0.5rem', fontSize: '0.825rem', fontFamily: 'var(--font-body)',
    border: '1px solid var(--border)', borderRadius: '0.25rem',
    backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none',
  };

  function renderFeatsTab() {
    const baseFeatures = prof?.baseFeatures ?? [];
    const hasFeatContent = baseFeatures.length > 0 || selectedFeats.length > 0;
    if (!hasFeatContent) return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No feats or features.</p>;

    function FeatCard({ name, tier, activationRaw, required, pathInvestment, descriptionMarkdown, traits }: {
      name: string; tier?: number; activationRaw?: string | null; required?: string | null;
      pathInvestment?: string | null; descriptionMarkdown: string; traits?: string[];
    }) {
      return (
        <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{name}</span>
            {tier && <span style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-heading)', padding: '0.1rem 0.4rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Tier {tier}</span>}
            {activationRaw && activationRaw !== '-' && activationRaw !== 'null' && (
              <span style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-heading)', padding: '0.1rem 0.4rem', borderRadius: '9999px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #FCD34D' }}>{activationRaw}</span>
            )}
            {traits?.map((t) => (
              <span key={t} style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-heading)' }}>{t}</span>
            ))}
          </div>
          {required && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Requires: {required}</div>}
          {pathInvestment && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Investment: {pathInvestment}</div>}
          <MarkdownContent content={descriptionMarkdown} />
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {baseFeatures.length > 0 && (
          <>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.1rem' }}>
              Base Features
            </div>
            {baseFeatures.map((f) => (
              <FeatCard key={f.id} name={f.name} activationRaw={f.activationRaw} descriptionMarkdown={f.descriptionMarkdown} traits={f.traits} />
            ))}
          </>
        )}
        {selectedFeats.length > 0 && (
          <>
            {baseFeatures.length > 0 && <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginTop: '0.5rem', marginBottom: '0.1rem' }}>Selected Feats</div>}
            {selectedFeats.map((feat) => (
              <FeatCard key={feat.id} name={feat.name} tier={feat.tier} activationRaw={feat.activationRaw} required={feat.required} pathInvestment={feat.pathInvestment} descriptionMarkdown={feat.descriptionMarkdown} traits={feat.traits} />
            ))}
          </>
        )}
      </div>
    );
  }

  function renderInventoryTab() {
    return (
      <div>
        {/* Currency */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', whiteSpace: 'nowrap' }}>Currency</span>
          <input
            type="text"
            defaultValue={c.currency}
            onBlur={(e) => persist({ currency: e.target.value })}
            placeholder="—"
            style={{ ...inputStyle, width: '160px' }}
          />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Carried: {totalCarried.toFixed(1)} / {carryWeight}
            {totalCarried > carryWeight && <span style={{ color: '#EF4444', fontWeight: 700, marginLeft: '0.4rem' }}>⚠ Over limit</span>}
          </span>
        </div>

        {/* Table */}
        {inventory.length > 0 && (
          <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Name', 'Category', 'Qty', 'Weight', 'Notes', ''].map((h) => (
                    <th key={h} style={{ padding: '0.375rem 0.5rem', textAlign: 'left', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.375rem 0.5rem', color: 'var(--text)', fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: '0.375rem 0.5rem' }}>
                      <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>{item.category}</span>
                    </td>
                    <td style={{ padding: '0.375rem 0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <button onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })} style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ minWidth: '20px', textAlign: 'center', fontWeight: 700, color: 'var(--text)' }}>{item.quantity}</span>
                        <button onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })} style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    </td>
                    <td style={{ padding: '0.375rem 0.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>{item.weight > 0 ? item.weight : '—'}</td>
                    <td style={{ padding: '0.375rem 0.5rem', color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.notes || '—'}</td>
                    <td style={{ padding: '0.375rem 0.25rem' }}>
                      <button onClick={() => removeItem(item.id)} style={{ padding: '0.2rem 0.4rem', border: '1px solid var(--border)', borderRadius: '0.25rem', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.72rem' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add item */}
        {!addingItem ? (
          <button
            onClick={() => setAddingItem(true)}
            style={{ padding: '0.4rem 0.875rem', border: '1.5px dashed var(--border)', borderRadius: '0.375rem', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.8rem' }}
          >+ Add Item</button>
        ) : (
          <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>New Item</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Name *</div>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Item name…" style={{ ...inputStyle, width: '100%' }} onKeyDown={(e) => e.key === 'Enter' && addItem()} autoFocus />
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Category</div>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as InventoryCategory)} style={{ ...inputStyle }}>
                  {INVENTORY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Qty</div>
                <input type="number" value={newQty} min={1} onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inputStyle, width: '60px' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Weight</div>
                <input type="number" value={newWeight} min={0} step={0.5} onChange={(e) => setNewWeight(parseFloat(e.target.value) || 0)} style={{ ...inputStyle, width: '60px' }} />
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Notes</div>
              <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional notes…" style={{ ...inputStyle, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={addItem} disabled={!newName.trim()} style={{ padding: '0.375rem 0.875rem', backgroundColor: newName.trim() ? 'var(--primary)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: newName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.8rem' }}>Add</button>
              <button onClick={() => { setAddingItem(false); setNewName(''); }} style={{ padding: '0.375rem 0.875rem', backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSpellcastingTab() {
    if (mySpells.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No known spells.</p>;
    const cantrips = mySpells.filter((s) => s.isCantrip);
    const tiered = mySpells.filter((s) => !s.isCantrip).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
    const byTier: Record<number, typeof tiered> = {};
    tiered.forEach((s) => { if (!byTier[s.tier]) byTier[s.tier] = []; byTier[s.tier].push(s); });

    function SpellCard({ spell }: { spell: typeof mySpells[0] }) {
      return (
        <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>{spell.name}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-heading)', padding: '0.1rem 0.4rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {spell.isCantrip ? 'Cantrip' : `Tier ${spell.tier}`}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            {spell.range && <span style={{ marginRight: '0.75rem' }}>Range: {spell.range}</span>}
            {spell.duration && <span>Duration: {spell.duration}</span>}
          </div>
          <MarkdownContent content={spell.descriptionMarkdown} />
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {isCaster && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <StatCard label="Reservoir" value={reservoir ?? '—'} sub={prof?.casterSource ?? ''} />
            <StatCard label="Spell DC" value={spellDC ?? '—'} />
            <StatCard label="Modifier" value={fmtAttr(modVal)} sub={modKey} />
          </div>
        )}
        {cantrips.length > 0 && (
          <>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>Cantrips</div>
            {cantrips.map((s) => <SpellCard key={s.id} spell={s} />)}
          </>
        )}
        {Object.keys(byTier).map(Number).sort().map((tier) => (
          <div key={tier}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', margin: '0.5rem 0 0.25rem' }}>Tier {tier}</div>
            {byTier[tier].map((s) => <SpellCard key={s.id} spell={s} />)}
          </div>
        ))}
      </div>
    );
  }

  function renderNotesTab() {
    return editingNotes ? (
      <div>
        <textarea
          value={notesVal}
          onChange={(e) => setNotesVal(e.target.value)}
          rows={8}
          style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontFamily: 'var(--font-body)', border: '1.5px solid var(--primary)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
        />
        <button onClick={() => { persist({ notes: notesVal }); setEditingNotes(false); }} style={{ marginTop: '0.5rem', padding: '0.375rem 0.875rem', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.8rem' }}>Save</button>
      </div>
    ) : (
      <div
        onClick={() => setEditingNotes(true)}
        style={{ minHeight: '100px', padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: '0.375rem', cursor: 'text', fontSize: '0.875rem', color: c.notes ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
      >
        {c.notes || 'Click to add notes…'}
      </div>
    );
  }

  // ─── Tab config ──────────────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; hidden?: boolean }[] = [
    { id: 'feats', label: `Feats` },
    { id: 'inventory', label: 'Inventory' },
    { id: 'spellcasting', label: 'Spellcasting', hidden: !isCaster && mySpells.length === 0 },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--text)', margin: 0 }}>
            {char.name || 'Unnamed Adventurer'}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-heading)', padding: '0.2rem 0.625rem', borderRadius: '9999px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>
              Tier {char.tier}
            </span>
            <button onClick={handleDelete} style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-heading)' }}>Delete</button>
          </div>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {[char.professionName, char.originName && `${char.originName}${char.vocationName ? ` (${char.vocationName})` : ''}`].filter(Boolean).join(' · ')}
        </div>
        {char.ambition && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ambition: {char.ambition}</div>
        )}
        <div style={{ marginTop: '0.625rem' }}>
          <Link href="/characters" style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>← All Characters</Link>
        </div>
      </div>

      {/* Combat Stats */}
      <Section title="Combat Stats">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <EditableNumber
            label={`Vitality${char.maxVitality ? ` / ${char.maxVitality}` : ''}`}
            value={char.currentVitality ?? 0}
            min={0}
            max={char.maxVitality ?? undefined}
            onChange={(v) => persist({ currentVitality: v })}
          />
          <div style={{ padding: '0.625rem 0.5rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.25rem', textAlign: 'center' }}>Max Vitality</div>
            {editingMaxVitality ? (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'center' }}>
                <input type="number" value={maxVitalityInput} onChange={(e) => setMaxVitalityInput(e.target.value)} placeholder={prof ? String(calcStartingVitality(prof, attrs)) : '—'} style={{ width: '60px', padding: '0.2rem 0.4rem', fontSize: '0.9rem', border: '1px solid var(--border)', borderRadius: '0.25rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', textAlign: 'center' }} />
                <button onClick={() => { const n = parseInt(maxVitalityInput); if (!isNaN(n)) { persist({ maxVitality: n }); setEditingMaxVitality(false); } }} style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', border: 'none', borderRadius: '0.25rem', backgroundColor: 'var(--primary)', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Set</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--primary)' }}>{char.maxVitality ?? '—'}</div>
                {prof && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Formula: {prof.startingVitality}</div>}
                <button onClick={() => setEditingMaxVitality(true)} style={{ fontSize: '0.65rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Edit</button>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <EditableNumber label={`Wounds / ${maxWounds}`} value={char.currentWounds ?? 0} min={0} max={maxWounds} onChange={(v) => persist({ currentWounds: v })} />
          <EditableNumber label="Renown" value={char.renown ?? 0} min={0} onChange={(v) => persist({ renown: v })} />
          <EditableNumber label="Ambition" value={char.currentAmbition ?? 0} min={0} onChange={(v) => persist({ currentAmbition: v })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <StatCard label="Armor Def" value={10} sub="Base (+ armor)" />
          <StatCard label="Body Def" value={bodyDef} />
          <StatCard label="Mind Def" value={mindDef} />
          <StatCard label="Will Def" value={willDef} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          <StatCard label="Carry Weight" value={carryWeight} sub="5 + Body + Tier" />
          {isCaster && <StatCard label="Reservoir" value={reservoir ?? '—'} sub={prof?.casterSource ?? ''} />}
          {isCaster && <StatCard label="Spell DC" value={spellDC ?? '—'} />}
        </div>
      </Section>

      {/* Attributes */}
      <Section title="Attributes">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {(['body', 'mind', 'will'] as const).map((attr) => {
            const base = char.baseAttributes[attr];
            const voc = char.vocationAttributeBonus.attribute === attr ? char.vocationAttributeBonus.value : 0;
            return (
              <div key={attr} style={{ padding: '0.875rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>{attr.charAt(0).toUpperCase() + attr.slice(1)}</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '2rem', color: 'var(--primary)', lineHeight: 1 }}>{fmtAttr(attrs[attr])}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                  {fmtAttr(base)} base{voc > 0 ? ` + ${voc} (${char.vocationName})` : ''}
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Proficiencies */}
      <Section title="Proficiencies">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.375rem' }}>V.I.T.A.L.S.</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {['Vigor', 'Intuition', 'Talent', 'Awareness', 'Lore', 'Social'].map((skill) => {
                const proficient = char.vitalsProficiencies.includes(skill);
                return (
                  <span key={skill} style={{ fontSize: '0.8rem', padding: '0.2rem 0.625rem', borderRadius: '9999px', fontFamily: 'var(--font-heading)', fontWeight: 600, border: `1.5px solid ${proficient ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: proficient ? 'var(--primary-light)' : 'var(--bg-nav)', color: proficient ? 'var(--primary)' : 'var(--text-muted)' }}>
                    {proficient ? '✓ ' : ''}{skill}
                  </span>
                );
              })}
            </div>
          </div>
          {prof && prof.armaments.length > 0 && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.375rem' }}>Armaments</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {prof.armaments.map((a) => <span key={a} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', color: 'var(--text)' }}>{a}</span>)}
              </div>
            </div>
          )}
          {prof && prof.protection.length > 0 && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.375rem' }}>Protection</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {prof.protection.map((p) => <span key={p} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', color: 'var(--text)' }}>{p}</span>)}
              </div>
            </div>
          )}
          {prof && prof.toolKits.filter((t) => t !== '-').length > 0 && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.375rem' }}>Tool Kits</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {prof.toolKits.filter((t) => t !== '-').map((t) => <span key={t} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', color: 'var(--text)' }}>{t}</span>)}
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Tabbed Section */}
      <div>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: '1.5rem', gap: '0' }}>
          {tabs.filter((t) => !t.hidden).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '0.5rem 1.125rem', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.85rem',
                backgroundColor: 'transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                marginBottom: '-2px', transition: 'color 0.12s',
              }}
            >{tab.label}</button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'feats' && renderFeatsTab()}
        {activeTab === 'inventory' && renderInventoryTab()}
        {activeTab === 'spellcasting' && renderSpellcastingTab()}
        {activeTab === 'notes' && renderNotesTab()}
      </div>
    </div>
  );
}

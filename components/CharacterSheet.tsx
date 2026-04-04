'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MarkdownContent from './MarkdownContent';
import { getCharacter, updateCharacter, deleteCharacter } from '@/lib/characterStorage';
import {
  getTotalAttributes, calcStartingVitality, calcBodyDefense, calcMindDefense,
  calcWillDefense, calcMaxWounds, calcCarryWeight, calcReservoir, calcSpellDC,
  calcAmbition,
} from '@/lib/characterCalc';
import type {
  Character, BuilderProfession, BuilderOrigin, BuilderFeat, BuilderSpell,
  InventoryItem, InventoryCategory, InventorySlot,
} from '@/lib/characterTypes';
import type { CatalogItem } from '@/lib/builderData';

interface Props {
  id: string;
  professions: BuilderProfession[];
  origins: BuilderOrigin[];
  professionFeats: BuilderFeat[];
  originFeats: BuilderFeat[];
  spells: BuilderSpell[];
  catalog: CatalogItem[];
}

type TabId = 'feats' | 'inventory' | 'spellcasting' | 'notes';

const INVENTORY_CATEGORIES: InventoryCategory[] = ['Weapon', 'Armor', 'Shield', 'Kit', 'Consumable', 'Misc'];

// ─── Helper components ────────────────────────────────────────────────────────

function EditableNumber({ label, value, min, max, onChange }: {
  label: string; value: number; min?: number; max?: number; onChange: (v: number) => void;
}) {
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
      <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.875rem', paddingBottom: '0.375rem', borderBottom: '2px solid var(--primary)', display: 'inline-block' }}>{title}</h2>
      <div>{children}</div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CharacterSheetPage({ id, professions, professionFeats, originFeats, spells, catalog }: Props) {
  const router = useRouter();
  const [char, setChar] = useState<Character | null>(null);
  const [mounted, setMounted] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState('');
  const [maxVitalityInput, setMaxVitalityInput] = useState('');
  const [editingMaxVitality, setEditingMaxVitality] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('feats');

  // Feat expand state (Issue 4 — collapsed by default)
  const [expandedFeats, setExpandedFeats] = useState<Set<string>>(new Set());

  // Inventory add form
  const [addingItem, setAddingItem] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogSelected, setCatalogSelected] = useState<CatalogItem | null>(null);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<InventoryCategory>('Misc');
  const [newQty, setNewQty] = useState(1);
  const [newWeight, setNewWeight] = useState(0);
  const [newNotes, setNewNotes] = useState('');
  const [newSlot, setNewSlot] = useState<InventorySlot>(null);

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    if (!q) return catalog;
    return catalog.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [catalogSearch, catalog]);

  // Spell amp state (temporary, not persisted)
  const [activeAmps, setActiveAmps] = useState<Record<string, Set<number>>>({});
  const [expandedAmps, setExpandedAmps] = useState<Set<string>>(new Set());

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

  const c = char!;
  const prof = professions.find((p) => p.id === c.professionId) ?? null;
  const attrs = getTotalAttributes(c);

  // Caster: from profession OR any selected feat
  const allFeats = [...professionFeats, ...originFeats];
  const featCaster = allFeats.find((f) => c.selectedFeatIds.includes(f.id) && f.casterInfo)?.casterInfo ?? null;
  const casterInfo = prof?.casterType ? { casterType: prof.casterType, casterSource: prof.casterSource ?? '', casterModifierOptions: prof.casterModifierOptions } : featCaster;
  const isCaster = !!casterInfo;
  const modKey = (casterInfo?.casterModifierOptions?.length === 1 ? casterInfo.casterModifierOptions[0] : c.spellcastingModifier) ?? 'mind';
  const modVal = attrs[modKey];

  const maxReservoir = isCaster ? (calcReservoir(casterInfo!.casterType, c.tier, modVal) ?? 0) : 0;
  const bodyDef = calcBodyDefense(attrs);
  const mindDef = calcMindDefense(attrs);
  const willDef = calcWillDefense(attrs);
  const maxWounds = calcMaxWounds(attrs, c.tier);
  const carryWeight = calcCarryWeight(attrs, c.tier);
  const spellDC = isCaster ? calcSpellDC(c.tier, modVal) : null;

  const ambition = calcAmbition(attrs.will);
  const maxAmbition = c.maxAmbition ?? ambition.max;
  const ambitionDice = c.ambitionDice ?? ambition.dice;

  const selectedFeats = [
    ...professionFeats.filter((f) => c.selectedFeatIds.includes(f.id)),
    ...originFeats.filter((f) => c.selectedFeatIds.includes(f.id)),
  ];
  const mySpells = spells.filter((s) => c.knownSpellIds.includes(s.id)).sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  const inventory: InventoryItem[] = c.inventory ?? [];
  const totalCarried = inventory.reduce((s, i) => s + i.weight * i.quantity, 0);

  const currentReservoir = c.currentReservoir ?? maxReservoir;
  const currentRespites = c.currentRespites ?? 3;

  function persist(updates: Partial<Character>) {
    const updated = updateCharacter(id, updates);
    if (updated) setChar(updated);
  }

  function handleDelete() {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    deleteCharacter(id);
    router.push('/characters');
  }

  // ─── Rest actions ────────────────────────────────────────────────────────
  function takeRespite() {
    if (currentRespites <= 0) return;
    const vitRestore = Math.max(4, attrs.body * 2);
    const ambRestore = Math.max(4, attrs.will);
    persist({
      currentRespites: currentRespites - 1,
      currentVitality: Math.min(c.maxVitality ?? 999, (c.currentVitality ?? 0) + vitRestore),
      currentAmbition: Math.min(maxAmbition, (c.currentAmbition ?? 0) + ambRestore),
    });
  }

  function takeLongRest() {
    const vitRestore = Math.max(10, attrs.body * 3);
    const ambRestore = Math.max(10, attrs.will * 2);
    const resRestore = isCaster ? Math.max(9, modVal * 2) : 0;
    persist({
      currentRespites: Math.min(3, currentRespites + 1),
      currentVitality: Math.min(c.maxVitality ?? 999, (c.currentVitality ?? 0) + vitRestore),
      currentAmbition: Math.min(maxAmbition, (c.currentAmbition ?? 0) + ambRestore),
      currentReservoir: Math.min(maxReservoir, currentReservoir + resRestore),
    });
  }

  function takeFullRest() {
    const resRestore = isCaster ? Math.max(18, modVal * 3) : 0;
    persist({
      currentRespites: 3,
      currentVitality: c.maxVitality ?? (c.currentVitality ?? 0),
      currentAmbition: maxAmbition,
      currentReservoir: Math.min(maxReservoir, currentReservoir + resRestore),
      currentWounds: Math.max(0, (c.currentWounds ?? 0) - 1),
    });
  }

  // ─── Inventory handlers ──────────────────────────────────────────────────
  function selectCatalogItem(item: CatalogItem) {
    setCatalogSelected(item);
    setNewName(item.name);
    setNewCategory(item.category as InventoryCategory);
    setNewWeight(item.weight);
    setNewSlot(item.slot as InventorySlot);
    setNewQty(1);
    setNewNotes('');
  }

  function addItem() {
    if (!newName.trim()) return;
    const item: InventoryItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: newName.trim(),
      category: newCategory,
      quantity: newQty,
      weight: newWeight,
      notes: newNotes,
      source: catalogSelected ? 'catalog' : 'manual',
      slot: newSlot,
      equipped: false,
      traits: catalogSelected?.traits ?? [],
      catalogItemId: catalogSelected?.id ?? null,
    };
    persist({ inventory: [...inventory, item] });
    setNewName(''); setNewCategory('Misc'); setNewQty(1); setNewWeight(0); setNewNotes(''); setNewSlot(null);
    setCatalogSelected(null); setCatalogSearch(''); setAddingItem(false);
  }

  function removeItem(itemId: string) {
    persist({ inventory: inventory.filter((i) => i.id !== itemId) });
  }

  function updateItem(itemId: string, updates: Partial<InventoryItem>) {
    persist({ inventory: inventory.map((i) => i.id === itemId ? { ...i, ...updates } : i) });
  }

  function equipItem(itemId: string, slot: InventorySlot) {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    const isTwoHanded = item.traits.includes('Two-Handed') || slot === 'Two Hands';
    // Unequip anything in conflicting slots
    const updated = inventory.map((i) => {
      if (i.id === itemId) return { ...i, equipped: true, slot };
      if (isTwoHanded && (i.slot === 'Main Hand' || i.slot === 'Off Hand' || i.slot === 'Two Hands') && i.equipped) return { ...i, equipped: false };
      if (!isTwoHanded && i.slot === slot && i.equipped && i.id !== itemId) return { ...i, equipped: false };
      return i;
    });
    persist({ inventory: updated });
  }

  const fmtAttr = (v: number) => v >= 0 ? `+${v}` : String(v);

  const inputStyle: React.CSSProperties = {
    padding: '0.3rem 0.5rem', fontSize: '0.825rem', fontFamily: 'var(--font-body)',
    border: '1px solid var(--border)', borderRadius: '0.25rem',
    backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none',
  };

  // ─── Equipped slots ──────────────────────────────────────────────────────
  const equippedMain = inventory.find((i) => i.equipped && i.slot === 'Main Hand') ?? null;
  const equippedOff = inventory.find((i) => i.equipped && i.slot === 'Off Hand') ?? null;
  const equippedTwoHands = inventory.find((i) => i.equipped && i.slot === 'Two Hands') ?? null;
  const equippedBody = inventory.find((i) => i.equipped && i.slot === 'Body') ?? null;

  // ─── Tab content renderers ───────────────────────────────────────────────

  function renderFeatsTab() {
    const baseFeatures = prof?.baseFeatures ?? [];
    if (baseFeatures.length === 0 && selectedFeats.length === 0) {
      return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No feats or features.</p>;
    }

    function toggleFeat(id: string) {
      setExpandedFeats((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }

    function FeatRow({ id, name, tier, activationRaw, traits, descriptionMarkdown, required, pathInvestment }: {
      id: string; name: string; tier?: number; activationRaw?: string | null; traits?: string[];
      descriptionMarkdown: string; required?: string | null; pathInvestment?: string | null;
    }) {
      const expanded = expandedFeats.has(id);
      return (
        <div style={{ border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
          <button
            onClick={() => toggleFeat(id)}
            style={{ width: '100%', padding: '0.625rem 0.875rem', backgroundColor: expanded ? 'var(--primary-light)' : 'var(--bg-card)', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
          >
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', color: expanded ? 'var(--primary)' : 'var(--text)', flex: 1 }}>{name}</span>
            {tier !== undefined && <span style={{ fontSize: '0.62rem', fontWeight: 700, fontFamily: 'var(--font-heading)', padding: '0.1rem 0.35rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Tier {tier}</span>}
            {activationRaw && activationRaw !== '-' && activationRaw !== 'null' && <span style={{ fontSize: '0.62rem', fontWeight: 700, fontFamily: 'var(--font-heading)', padding: '0.1rem 0.35rem', borderRadius: '9999px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #FCD34D' }}>{activationRaw}</span>}
            {traits?.filter((t) => t).map((t) => <span key={t} style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-heading)' }}>{t}</span>)}
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{expanded ? '▲' : '▼'}</span>
          </button>
          {expanded && (
            <div style={{ padding: '0.75rem 0.875rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
              {required && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Requires: {required}</div>}
              {pathInvestment && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Investment: {pathInvestment}</div>}
              <MarkdownContent content={descriptionMarkdown} />
            </div>
          )}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {baseFeatures.length > 0 && (
          <>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.2rem' }}>Base Features</div>
            {baseFeatures.map((f) => <FeatRow key={f.id} id={`base-${f.id}`} name={f.name} activationRaw={f.activationRaw} traits={f.traits} descriptionMarkdown={f.descriptionMarkdown} />)}
          </>
        )}
        {selectedFeats.length > 0 && (
          <>
            {baseFeatures.length > 0 && <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginTop: '0.5rem', marginBottom: '0.2rem' }}>Selected Feats</div>}
            {selectedFeats.map((f) => <FeatRow key={f.id} id={f.id} name={f.name} tier={f.tier} activationRaw={f.activationRaw} traits={f.traits} descriptionMarkdown={f.descriptionMarkdown} required={f.required} pathInvestment={f.pathInvestment} />)}
          </>
        )}
      </div>
    );
  }

  function renderInventoryTab() {
    const slots: { label: string; slot: InventorySlot; item: InventoryItem | null }[] = [
      { label: 'Main Hand', slot: 'Main Hand', item: equippedTwoHands ?? equippedMain },
      { label: 'Off Hand', slot: 'Off Hand', item: equippedTwoHands ?? equippedOff },
      { label: 'Body', slot: 'Body', item: equippedBody },
    ];
    return (
      <div>
        {/* Equipped slots */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>Equipped</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
            {slots.map(({ label, slot, item }) => {
              const isTwoHandedOccupied = equippedTwoHands && (slot === 'Off Hand');
              const displayItem = isTwoHandedOccupied ? equippedTwoHands : item;
              return (
                <div key={label} style={{ padding: '0.625rem', backgroundColor: 'var(--bg-nav)', border: `1px solid ${displayItem ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '0.5rem' }}>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.25rem' }}>
                    {label}{isTwoHandedOccupied ? ' (2H)' : ''}
                  </div>
                  {displayItem ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-heading)' }}>{displayItem.name}</span>
                      {!isTwoHandedOccupied && <button onClick={() => updateItem(displayItem.id, { equipped: false })} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0' }}>✕</button>}
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Empty</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Currency + carry weight */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.875rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', whiteSpace: 'nowrap' }}>Currency</span>
          <input type="text" defaultValue={c.currency} onBlur={(e) => persist({ currency: e.target.value })} placeholder="—" style={{ ...inputStyle, width: '140px' }} />
          <span style={{ fontSize: '0.78rem', color: totalCarried > carryWeight ? '#EF4444' : 'var(--text-muted)' }}>
            Weight: {totalCarried.toFixed(1)} / {carryWeight}
            {totalCarried > carryWeight && <strong> ⚠ Over</strong>}
          </span>
        </div>

        {/* Inventory table */}
        {inventory.length > 0 && (
          <div style={{ overflowX: 'auto', marginBottom: '0.75rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['Name', 'Cat.', 'Slot', 'Qty', 'Wt', 'Eq.', ''].map((h) => (
                    <th key={h} style={{ padding: '0.3rem 0.4rem', textAlign: 'left', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)', backgroundColor: item.equipped ? 'var(--primary-light)' : 'transparent' }}>
                    <td style={{ padding: '0.3rem 0.4rem', color: 'var(--text)', fontWeight: 600 }}>{item.name}</td>
                    <td style={{ padding: '0.3rem 0.4rem' }}>
                      <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-heading)', fontWeight: 600, whiteSpace: 'nowrap' }}>{item.category}</span>
                    </td>
                    <td style={{ padding: '0.3rem 0.4rem', color: 'var(--text-muted)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{item.slot ?? '—'}</td>
                    <td style={{ padding: '0.3rem 0.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                        <button onClick={() => updateItem(item.id, { quantity: Math.max(1, item.quantity - 1) })} style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ minWidth: '18px', textAlign: 'center', fontWeight: 700, color: 'var(--text)', fontSize: '0.8rem' }}>{item.quantity}</span>
                        <button onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })} style={{ width: '18px', height: '18px', borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    </td>
                    <td style={{ padding: '0.3rem 0.4rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.78rem' }}>{item.weight > 0 ? item.weight : '—'}</td>
                    <td style={{ padding: '0.3rem 0.25rem', textAlign: 'center' }}>
                      {item.slot ? (
                        <button
                          onClick={() => item.equipped ? updateItem(item.id, { equipped: false }) : equipItem(item.id, item.slot)}
                          style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', border: `1px solid ${item.equipped ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '0.25rem', backgroundColor: item.equipped ? 'var(--primary)' : 'transparent', color: item.equipped ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600 }}
                        >{item.equipped ? 'ON' : 'OFF'}</button>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.3rem 0.25rem' }}>
                      <button onClick={() => removeItem(item.id)} style={{ padding: '0.15rem 0.3rem', border: '1px solid var(--border)', borderRadius: '0.25rem', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.7rem' }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Add item */}
        {!addingItem ? (
          <button onClick={() => setAddingItem(true)} style={{ padding: '0.4rem 0.875rem', border: '1.5px dashed var(--border)', borderRadius: '0.375rem', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.8rem' }}>+ Add Item</button>
        ) : (
          <div style={{ padding: '0.875rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>Add Item</div>

            {/* Catalog search (Issue 9) */}
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Search catalog</div>
              <input value={catalogSearch} onChange={(e) => { setCatalogSearch(e.target.value); setCatalogSelected(null); }} placeholder="Search weapons, armor, kits…" style={{ ...inputStyle, width: '100%', marginBottom: '0.375rem' }} />
              {catalogSearch.trim() && (
                <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)' }}>
                  {filteredCatalog.length === 0 ? (
                    <div style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No results — use manual entry below</div>
                  ) : filteredCatalog.map((item) => (
                    <button key={item.id} onClick={() => selectCatalogItem(item)} style={{ width: '100%', padding: '0.4rem 0.75rem', border: 'none', borderBottom: '1px solid var(--border)', backgroundColor: catalogSelected?.id === item.id ? 'var(--primary-light)' : 'transparent', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.825rem', color: 'var(--text)' }}>{item.name}</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.category}</span>
                      {item.traits.length > 0 && <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{item.traits.join(', ')}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual / prefilled fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '0.5rem', alignItems: 'end' }}>
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Name *</div>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Item name…" style={{ ...inputStyle, width: '100%' }} onKeyDown={(e) => e.key === 'Enter' && addItem()} autoFocus={!catalogSearch} />
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Category</div>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value as InventoryCategory)} style={inputStyle}>
                  {INVENTORY_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Qty</div>
                <input type="number" value={newQty} min={1} onChange={(e) => setNewQty(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inputStyle, width: '55px' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Weight</div>
                <input type="number" value={newWeight} min={0} step={0.1} onChange={(e) => setNewWeight(parseFloat(e.target.value) || 0)} style={{ ...inputStyle, width: '55px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Notes</div>
                <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} placeholder="Optional…" style={{ ...inputStyle, width: '100%' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Slot</div>
                <select value={newSlot ?? ''} onChange={(e) => setNewSlot((e.target.value || null) as InventorySlot)} style={inputStyle}>
                  <option value="">None</option>
                  <option value="Main Hand">Main Hand</option>
                  <option value="Off Hand">Off Hand</option>
                  <option value="Two Hands">Two Hands</option>
                  <option value="Body">Body</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={addItem} disabled={!newName.trim()} style={{ padding: '0.375rem 0.875rem', backgroundColor: newName.trim() ? 'var(--primary)' : 'var(--border)', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: newName.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.8rem' }}>Add</button>
              <button onClick={() => { setAddingItem(false); setNewName(''); setCatalogSearch(''); setCatalogSelected(null); }} style={{ padding: '0.375rem 0.875rem', backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSpellcastingTab() {
    const cantrips = mySpells.filter((s) => s.isCantrip);
    const tiered = mySpells.filter((s) => !s.isCantrip);
    const byTier: Record<number, typeof tiered> = {};
    tiered.forEach((s) => { if (!byTier[s.tier]) byTier[s.tier] = []; byTier[s.tier].push(s); });

    if (!isCaster && mySpells.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No spellcasting.</p>;

    function SpellCard({ spell }: { spell: typeof mySpells[0] }) {
      const ampToggle = activeAmps[spell.id] ?? new Set<number>();
      const ampExpanded = expandedAmps.has(spell.id);
      // Spell cost = 1 per tier (cantrips = 0) + amp costs
      const baseCost = spell.isCantrip ? 0 : spell.tier;
      const totalCost = baseCost; // Amp support: would add amp costs here
      const canCast = currentReservoir >= totalCost;

      function handleCast() {
        if (!canCast) return;
        persist({ currentReservoir: Math.max(0, currentReservoir - totalCost) });
      }

      return (
        <div style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)', flex: 1 }}>{spell.name}</span>
            <span style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-heading)', padding: '0.1rem 0.4rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {spell.isCantrip ? 'Cantrip' : `Tier ${spell.tier}`}
            </span>
            <button
              onClick={handleCast}
              disabled={!canCast}
              style={{ padding: '0.2rem 0.625rem', border: 'none', borderRadius: '0.375rem', backgroundColor: canCast ? 'var(--primary)' : 'var(--border)', color: '#fff', cursor: canCast ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.72rem' }}
            >{spell.isCantrip ? 'Cast (free)' : `Cast (${totalCost})`}</button>
          </div>
          {!canCast && !spell.isCantrip && <div style={{ fontSize: '0.72rem', color: '#EF4444', fontStyle: 'italic', marginBottom: '0.25rem' }}>Not enough Reservoir to cast this spell.</div>}
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
            {spell.range && <span style={{ marginRight: '0.75rem' }}>Range: {spell.range}</span>}
            {spell.duration && <span>Duration: {spell.duration}</span>}
          </div>
          <MarkdownContent content={spell.descriptionMarkdown} />
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Spellcasting stats + reservoir control */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          <StatCard label="Caster" value={casterInfo?.casterType === 'full' ? 'Full' : casterInfo?.casterType === 'half' ? 'Half' : 'Ltd.'} sub={casterInfo?.casterSource ?? ''} />
          <div style={{ textAlign: 'center', padding: '0.625rem 0.5rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Reservoir</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              <button onClick={() => persist({ currentReservoir: Math.max(0, currentReservoir - 1) })} style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{currentReservoir}<span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/{maxReservoir}</span></span>
              <button onClick={() => persist({ currentReservoir: Math.min(maxReservoir, currentReservoir + 1) })} style={{ width: '20px', height: '20px', borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
          <StatCard label="Spell DC" value={spellDC ?? '—'} />
          <StatCard label="Modifier" value={fmtAttr(modVal)} sub={modKey} />
        </div>

        {mySpells.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No known spells selected.</p>}

        {cantrips.length > 0 && (
          <>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>Cantrips</div>
            {cantrips.map((s) => <SpellCard key={s.id} spell={s} />)}
          </>
        )}
        {Object.keys(byTier).map(Number).sort().map((tier) => (
          <div key={tier}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.25rem' }}>Tier {tier}</div>
            {byTier[tier].map((s) => <SpellCard key={s.id} spell={s} />)}
          </div>
        ))}
      </div>
    );
  }

  function renderNotesTab() {
    return editingNotes ? (
      <div>
        <textarea value={notesVal} onChange={(e) => setNotesVal(e.target.value)} rows={8} style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontFamily: 'var(--font-body)', border: '1.5px solid var(--primary)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none', resize: 'vertical' }} />
        <button onClick={() => { persist({ notes: notesVal }); setEditingNotes(false); }} style={{ marginTop: '0.5rem', padding: '0.375rem 0.875rem', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.8rem' }}>Save</button>
      </div>
    ) : (
      <div onClick={() => setEditingNotes(true)} style={{ minHeight: '100px', padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: '0.375rem', cursor: 'text', fontSize: '0.875rem', color: c.notes ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
        {c.notes || 'Click to add notes…'}
      </div>
    );
  }

  const tabs: { id: TabId; label: string; hidden?: boolean }[] = [
    { id: 'feats', label: 'Feats' },
    { id: 'inventory', label: 'Inventory' },
    { id: 'spellcasting', label: 'Spellcasting', hidden: !isCaster && mySpells.length === 0 },
    { id: 'notes', label: 'Notes' },
  ];

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem', padding: '1.25rem 1.5rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--text)', margin: 0 }}>{c.name || 'Unnamed Adventurer'}</h1>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-heading)', padding: '0.2rem 0.625rem', borderRadius: '9999px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary)' }}>Tier {c.tier}</span>
            <button onClick={handleDelete} style={{ padding: '0.25rem 0.5rem', border: '1px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem', fontFamily: 'var(--font-heading)' }}>Delete</button>
          </div>
        </div>
        <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          {[c.professionName, c.originName && `${c.originName}${c.vocationName ? ` (${c.vocationName})` : ''}`].filter(Boolean).join(' · ')}
        </div>
        {c.ambition && <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Ambition: {c.ambition}</div>}
        <div style={{ marginTop: '0.625rem' }}>
          <Link href="/characters" style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>← All Characters</Link>
        </div>
      </div>

      {/* Combat Stats */}
      <Section title="Combat Stats">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <EditableNumber label={`Vitality${c.maxVitality ? ` / ${c.maxVitality}` : ''}`} value={c.currentVitality ?? 0} min={0} max={c.maxVitality ?? undefined} onChange={(v) => persist({ currentVitality: v })} />
          <div style={{ padding: '0.625rem 0.5rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.25rem', textAlign: 'center' }}>Max Vitality</div>
            {editingMaxVitality ? (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'center' }}>
                <input type="number" value={maxVitalityInput} onChange={(e) => setMaxVitalityInput(e.target.value)} placeholder={prof ? String(calcStartingVitality(prof, attrs)) : '—'} style={{ width: '60px', padding: '0.2rem 0.4rem', fontSize: '0.9rem', border: '1px solid var(--border)', borderRadius: '0.25rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', textAlign: 'center' }} />
                <button onClick={() => { const n = parseInt(maxVitalityInput); if (!isNaN(n)) { persist({ maxVitality: n }); setEditingMaxVitality(false); } }} style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', border: 'none', borderRadius: '0.25rem', backgroundColor: 'var(--primary)', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Set</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.3rem', color: 'var(--primary)' }}>{c.maxVitality ?? '—'}</div>
                {prof && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>Formula: {prof.startingVitality}</div>}
                <button onClick={() => setEditingMaxVitality(true)} style={{ fontSize: '0.65rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Edit</button>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <EditableNumber label={`Wounds / ${maxWounds}`} value={c.currentWounds ?? 0} min={0} max={maxWounds} onChange={(v) => persist({ currentWounds: v })} />
          <EditableNumber label="Renown" value={c.renown ?? 0} min={0} onChange={(v) => persist({ renown: v })} />
          <div style={{ textAlign: 'center', padding: '0.625rem 0.5rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Ambition</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <button onClick={() => persist({ currentAmbition: Math.max(0, (c.currentAmbition ?? 0) - 1) })} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{c.currentAmbition ?? 0}<span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>/{maxAmbition}</span></span>
              <button onClick={() => persist({ currentAmbition: Math.min(maxAmbition, (c.currentAmbition ?? 0) + 1) })} style={{ width: '22px', height: '22px', borderRadius: '50%', border: '1px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
            <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{ambitionDice}</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <StatCard label="Armor Def" value={10} sub="Base (+ armor)" />
          <StatCard label="Body Def" value={bodyDef} />
          <StatCard label="Mind Def" value={mindDef} />
          <StatCard label="Will Def" value={willDef} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isCaster ? 3 : 1}, 1fr)`, gap: '0.5rem' }}>
          <StatCard label="Carry Weight" value={carryWeight} sub="5 + Body + Tier" />
          {isCaster && <StatCard label="Max Reservoir" value={maxReservoir} sub={casterInfo?.casterSource ?? ''} />}
          {isCaster && <StatCard label="Spell DC" value={spellDC ?? '—'} />}
        </div>
      </Section>

      {/* Rest Tracker (Issue 5) */}
      <Section title="Rest">
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text)' }}>Respites:</span>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${i < currentRespites ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: i < currentRespites ? 'var(--primary)' : 'transparent', cursor: 'pointer' }} onClick={() => persist({ currentRespites: i < currentRespites ? i : i + 1 })} />
            ))}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{currentRespites}/3</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
          <button
            onClick={takeRespite}
            disabled={currentRespites <= 0}
            style={{ padding: '0.5rem 1rem', border: 'none', borderRadius: '0.5rem', backgroundColor: currentRespites > 0 ? 'var(--primary)' : 'var(--border)', color: '#fff', cursor: currentRespites > 0 ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.825rem' }}
          >Respite <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>({Math.max(4, attrs.body * 2)} Vit, {Math.max(4, attrs.will)} Amb)</span></button>
          <button
            onClick={takeLongRest}
            style={{ padding: '0.5rem 1rem', border: '1.5px solid var(--primary)', borderRadius: '0.5rem', backgroundColor: 'transparent', color: 'var(--primary)', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.825rem' }}
          >Long Rest <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>({Math.max(10, attrs.body * 3)} Vit, +1 Resp)</span></button>
          <button
            onClick={takeFullRest}
            style={{ padding: '0.5rem 1rem', border: '1.5px solid var(--text-muted)', borderRadius: '0.5rem', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.825rem' }}
          >Full Rest <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>(full recovery, safe location)</span></button>
        </div>
      </Section>

      {/* Attributes */}
      <Section title="Attributes">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
          {(['body', 'mind', 'will'] as const).map((attr) => {
            const base = c.baseAttributes[attr];
            const voc = c.vocationAttributeBonus.attribute === attr ? c.vocationAttributeBonus.value : 0;
            return (
              <div key={attr} style={{ padding: '0.875rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>{attr.charAt(0).toUpperCase() + attr.slice(1)}</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '2rem', color: 'var(--primary)', lineHeight: 1 }}>{fmtAttr(attrs[attr])}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>{fmtAttr(base)} base{voc > 0 ? ` + ${voc} (${c.vocationName})` : ''}</div>
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
                const proficient = c.vitalsProficiencies.includes(skill);
                return <span key={skill} style={{ fontSize: '0.8rem', padding: '0.2rem 0.625rem', borderRadius: '9999px', fontFamily: 'var(--font-heading)', fontWeight: 600, border: `1.5px solid ${proficient ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: proficient ? 'var(--primary-light)' : 'var(--bg-nav)', color: proficient ? 'var(--primary)' : 'var(--text-muted)' }}>{proficient ? '✓ ' : ''}{skill}</span>;
              })}
            </div>
          </div>
          {prof && prof.armaments.length > 0 && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.375rem' }}>Armaments</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>{prof.armaments.map((a) => <span key={a} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', color: 'var(--text)' }}>{a}</span>)}</div>
            </div>
          )}
          {prof && prof.protection.length > 0 && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.375rem' }}>Protection</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>{prof.protection.map((p) => <span key={p} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', color: 'var(--text)' }}>{p}</span>)}</div>
            </div>
          )}
          {prof && prof.toolKits.filter((t) => t !== '-').length > 0 && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.375rem' }}>Tool Kits</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>{prof.toolKits.filter((t) => t !== '-').map((t) => <span key={t} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', color: 'var(--text)' }}>{t}</span>)}</div>
            </div>
          )}
        </div>
      </Section>

      {/* Tabbed Section */}
      <div>
        <div style={{ display: 'flex', borderBottom: '2px solid var(--border)', marginBottom: '1.5rem' }}>
          {tabs.filter((t) => !t.hidden).map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '0.5rem 1.125rem', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.85rem', backgroundColor: 'transparent', color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent', marginBottom: '-2px', transition: 'color 0.12s' }}>{tab.label}</button>
          ))}
        </div>
        {activeTab === 'feats' && renderFeatsTab()}
        {activeTab === 'inventory' && renderInventoryTab()}
        {activeTab === 'spellcasting' && renderSpellcastingTab()}
        {activeTab === 'notes' && renderNotesTab()}
      </div>
    </div>
  );
}

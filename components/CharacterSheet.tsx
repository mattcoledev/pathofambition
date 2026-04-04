'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MarkdownContent from './MarkdownContent';
import { getCharacter, updateCharacter, deleteCharacter } from '@/lib/characterStorage';
import {
  getTotalAttributes, calcStartingVitality, calcBodyDefense, calcMindDefense,
  calcWillDefense, calcMaxWounds, calcCarryWeight, calcReservoir, calcSpellDC,
  calcAmbition, calcArmorDefense,
} from '@/lib/characterCalc';
import type {
  Character, BuilderProfession, BuilderOrigin, BuilderFeat, BuilderSpell,
  InventoryItem, InventoryCategory, InventorySlot, ChoiceFeature,
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
  choiceFeatures: ChoiceFeature[];
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

export default function CharacterSheetPage({ id, professions, origins, professionFeats, originFeats, spells, catalog, choiceFeatures }: Props) {
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
  const [newArmorBonus, setNewArmorBonus] = useState(0);
  const [newArmorCategory, setNewArmorCategory] = useState<'Light' | 'Medium' | 'Heavy' | null>(null);
  const [newModifierStat, setNewModifierStat] = useState<'Body' | 'Mind' | 'Will' | null>(null);
  const [newIsRanged, setNewIsRanged] = useState(false);
  const [newDamageDiceCount, setNewDamageDiceCount] = useState(0);
  const [newDamageDiceSize, setNewDamageDiceSize] = useState(6);
  const [newDamageTypes, setNewDamageTypes] = useState('');
  const [newMasterworkBonus, setNewMasterworkBonus] = useState(0);

  // Item editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<InventoryItem>>({});

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    if (!q) return catalog;
    return catalog.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
  }, [catalogSearch, catalog]);

  // Spell amp state (temporary, not persisted)
  const [activeAmps, setActiveAmps] = useState<Record<string, Set<number>>>({});
  // Spell feed / manager state
  const [expandedSpells, setExpandedSpells] = useState<Set<string>>(new Set());
  const [showSpellManager, setShowSpellManager] = useState(false);
  const [spellManagerSearch, setSpellManagerSearch] = useState('');

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
  const origin = origins.find((o) => o.id === c.originId) ?? null;
  const vocation = origin?.vocations.find((v) => v.id === c.vocationId) ?? null;
  const attrs = getTotalAttributes(c);

  // Caster: from profession OR any selected feat
  const allFeats = [...professionFeats, ...originFeats];
  const featCaster = allFeats.find((f) => c.selectedFeatIds.includes(f.id) && f.casterInfo)?.casterInfo ?? null;
  const casterInfo = prof?.casterType ? { casterType: prof.casterType, casterSource: prof.casterSource ?? '', casterModifierOptions: prof.casterModifierOptions } : c.vocationCaster ?? featCaster;
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

  // Agile detection: check profession base features, vocation features, and selected feats
  const hasAgile = !!(
    prof?.baseFeatures.some((f) => f.name === 'Agile') ||
    vocation?.features.some((f) => f.name === 'Agile') ||
    selectedFeats.some((f) => f.name === 'Agile')
  );

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
    setNewArmorBonus(item.armorBonus ?? 0);
    setNewArmorCategory((item.armorCategory as 'Light' | 'Medium' | 'Heavy' | null) ?? null);
    // Parse catalog damage string e.g. "2d6" into count/size
    const diceMatch = (item.damage ?? '').match(/^(\d+)d(\d+)$/i);
    setNewDamageDiceCount(diceMatch ? parseInt(diceMatch[1]) : 0);
    setNewDamageDiceSize(diceMatch ? parseInt(diceMatch[2]) : 6);
    setNewDamageTypes('');
    setNewModifierStat(null);
    setNewIsRanged(false);
    setNewMasterworkBonus(0);
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
      armorBonus: newArmorBonus,
      armorCategory: newArmorCategory,
      modifierStat: newModifierStat,
      isRanged: newIsRanged,
      damageDiceCount: newDamageDiceCount,
      damageDiceSize: newDamageDiceSize,
      damageTypes: newDamageTypes.split(',').map((t) => t.trim()).filter(Boolean),
      masterworkBonus: newMasterworkBonus,
      equippable: catalogSelected ? (catalogSelected.equippable ?? newSlot !== null) : newSlot !== null,
    };
    persist({ inventory: [...inventory, item] });
    setNewName(''); setNewCategory('Misc'); setNewQty(1); setNewWeight(0); setNewNotes(''); setNewSlot(null);
    setNewArmorBonus(0); setNewArmorCategory(null);
    setNewModifierStat(null); setNewIsRanged(false); setNewDamageDiceCount(0); setNewDamageDiceSize(6); setNewDamageTypes('');
    setNewMasterworkBonus(0);
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
  const equippedShield = inventory.find((i) => i.equipped && i.slot === 'Off Hand' && i.category === 'Shield') ?? null;
  const armorDefense = calcArmorDefense(equippedBody, equippedShield, attrs, hasAgile);

  // Weapon combat stats helper
  function weaponStats(item: InventoryItem | null): { toHit: string; damage: string } | null {
    if (!item || item.category !== 'Weapon') return null;
    const modAttr = item.modifierStat ? attrs[item.modifierStat.toLowerCase() as keyof typeof attrs] : null;
    const mw = item.masterworkBonus ?? 0;
    const toHitVal = (modAttr ?? 0) + mw;
    const diceStr = item.damageDiceCount > 0 ? `${item.damageDiceCount}d${item.damageDiceSize}` : '—';
    const damageMod = !item.isRanged && modAttr !== null ? modAttr + mw : mw > 0 ? mw : null;
    const damageStr = damageMod !== null && damageMod !== 0
      ? `${diceStr} ${damageMod >= 0 ? '+' : ''}${damageMod}`
      : diceStr;
    return {
      toHit: toHitVal >= 0 ? `+${toHitVal}` : String(toHitVal),
      damage: damageStr + (item.damageTypes.length > 0 ? ` (${item.damageTypes.join('/')})` : ''),
    };
  }

  const primaryWeapon = equippedTwoHands ?? equippedMain;
  const primaryWeaponStats = weaponStats(primaryWeapon);
  const offWeaponStats = weaponStats(equippedOff?.category === 'Weapon' ? equippedOff : null);

  // ─── Tab content renderers ───────────────────────────────────────────────

  function renderFeatsTab() {
    const baseFeatures = prof?.baseFeatures ?? [];
    const vocationFeatures = vocation?.features ?? [];
    if (baseFeatures.length === 0 && vocationFeatures.length === 0 && selectedFeats.length === 0) {
      return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No feats or features.</p>;
    }

    function toggleFeat(id: string) {
      setExpandedFeats((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }

    /** Look up resolved option names + effect text from choice_selections. */
    function getResolvedOptions(featureName: string, entityName: string): { name: string; effectText: string }[] | null {
      const key = `${entityName}__${featureName}`;
      const selected = c.choiceSelections?.[key];
      if (!selected?.length) return null;
      const cf = choiceFeatures.find((f) => f.feature_name === featureName && f.entity_name === entityName);
      if (!cf) return null;
      return cf.options.filter((o) => selected.includes(o.name)).map((o) => ({ name: o.name, effectText: o.effect_text }));
    }

    function FeatRow({ id, name, tier, activationRaw, traits, descriptionMarkdown, required, pathInvestment, resolvedOptions }: {
      id: string; name: string; tier?: number; activationRaw?: string | null; traits?: string[];
      descriptionMarkdown: string; required?: string | null; pathInvestment?: string | null;
      resolvedOptions?: { name: string; effectText: string }[] | null;
    }) {
      const expanded = expandedFeats.has(id);
      return (
        <div style={{ border: '1px solid var(--border)', borderRadius: '0.5rem', overflow: 'hidden' }}>
          <button
            onClick={() => toggleFeat(id)}
            style={{ width: '100%', padding: '0.625rem 0.875rem', backgroundColor: expanded ? 'var(--primary-light)' : 'var(--bg-card)', border: 'none', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}
          >
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', color: expanded ? 'var(--primary)' : 'var(--text)', flex: 1 }}>{name}</span>
            {resolvedOptions && resolvedOptions.length > 0 && (
              <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--primary)', backgroundColor: 'var(--primary-light)', padding: '0.1rem 0.4rem', borderRadius: '9999px', border: '1px solid var(--primary)' }}>
                {resolvedOptions.map((o) => o.name).join(', ')}
              </span>
            )}
            {tier !== undefined && <span style={{ fontSize: '0.62rem', fontWeight: 700, fontFamily: 'var(--font-heading)', padding: '0.1rem 0.35rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Tier {tier}</span>}
            {activationRaw && activationRaw !== '-' && activationRaw !== 'null' && <span style={{ fontSize: '0.62rem', fontWeight: 700, fontFamily: 'var(--font-heading)', padding: '0.1rem 0.35rem', borderRadius: '9999px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #FCD34D' }}>{activationRaw}</span>}
            {traits?.filter((t) => t).map((t) => <span key={t} style={{ fontSize: '0.6rem', padding: '0.1rem 0.35rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-heading)' }}>{t}</span>)}
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{expanded ? '▲' : '▼'}</span>
          </button>
          {expanded && (
            <div style={{ padding: '0.75rem 0.875rem', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-card)' }}>
              {resolvedOptions && resolvedOptions.length > 0 && (
                <div style={{ marginBottom: '0.625rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '0.375rem' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--primary)', fontFamily: 'var(--font-heading)', marginBottom: '0.25rem' }}>
                    {resolvedOptions.length > 1 ? 'Chosen options' : 'Chosen option'}
                  </div>
                  {resolvedOptions.map((o) => (
                    <div key={o.name}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--primary)' }}>{o.name}: </span>
                      <span style={{ fontSize: '0.825rem', color: 'var(--text)', lineHeight: 1.5 }}>{o.effectText}</span>
                    </div>
                  ))}
                </div>
              )}
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
            {baseFeatures.map((f) => <FeatRow key={f.id} id={`base-${f.id}`} name={f.name} activationRaw={f.activationRaw} traits={f.traits} descriptionMarkdown={f.descriptionMarkdown} resolvedOptions={getResolvedOptions(f.name, c.professionName)} />)}
          </>
        )}
        {vocationFeatures.length > 0 && (
          <>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginTop: '0.5rem', marginBottom: '0.2rem' }}>Vocation Features</div>
            {vocationFeatures.map((f) => <FeatRow key={f.id} id={`voc-${f.id}`} name={f.name} activationRaw={f.activationRaw} traits={f.traits} descriptionMarkdown={f.descriptionMarkdown} resolvedOptions={getResolvedOptions(f.name, c.vocationName)} />)}
          </>
        )}
        {selectedFeats.length > 0 && (
          <>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginTop: '0.5rem', marginBottom: '0.2rem' }}>Selected Feats</div>
            {selectedFeats.map((f) => <FeatRow key={f.id} id={f.id} name={f.name} tier={f.tier} activationRaw={f.activationRaw} traits={f.traits} descriptionMarkdown={f.descriptionMarkdown} required={f.required} pathInvestment={f.pathInvestment} resolvedOptions={getResolvedOptions(f.name, f.ownerName)} />)}
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
                  {['Name', 'Cat.', 'Slot', 'Qty', 'Wt', 'Eq.', '', ''].map((h) => (
                    <th key={h} style={{ padding: '0.3rem 0.4rem', textAlign: 'left', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => (
                  <React.Fragment key={item.id}>
                  <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: item.equipped ? 'var(--primary-light)' : 'transparent' }}>
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
                      {item.equippable ? (
                        <button
                          onClick={() => item.equipped ? updateItem(item.id, { equipped: false }) : equipItem(item.id, item.slot)}
                          style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', border: `1px solid ${item.equipped ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '0.25rem', backgroundColor: item.equipped ? 'var(--primary)' : 'transparent', color: item.equipped ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600 }}
                        >{item.equipped ? 'ON' : 'OFF'}</button>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '0.3rem 0.15rem' }}>
                      <button onClick={() => { setEditingItemId(editingItemId === item.id ? null : item.id); setEditFields({ ...item }); }} style={{ padding: '0.15rem 0.3rem', border: '1px solid var(--border)', borderRadius: '0.25rem', backgroundColor: editingItemId === item.id ? 'var(--primary-light)' : 'transparent', cursor: 'pointer', color: editingItemId === item.id ? 'var(--primary)' : 'var(--text-muted)', fontSize: '0.7rem' }}>✎</button>
                    </td>
                    <td style={{ padding: '0.3rem 0.25rem' }}>
                      <button onClick={() => removeItem(item.id)} style={{ padding: '0.15rem 0.3rem', border: '1px solid var(--border)', borderRadius: '0.25rem', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.7rem' }}>✕</button>
                    </td>
                  </tr>
                  {editingItemId === item.id && (
                    <tr style={{ backgroundColor: 'var(--bg-nav)' }}>
                      <td colSpan={8} style={{ padding: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: '0.5rem', alignItems: 'end' }}>
                            <div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Name</div>
                              <input value={editFields.name ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, name: e.target.value }))} style={{ ...inputStyle, width: '100%' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Category</div>
                              <select value={editFields.category ?? 'Misc'} onChange={(e) => setEditFields((f) => ({ ...f, category: e.target.value as InventoryCategory }))} style={inputStyle}>
                                {INVENTORY_CATEGORIES.map((cat) => <option key={cat}>{cat}</option>)}
                              </select>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Weight</div>
                              <input type="number" value={editFields.weight ?? 0} min={0} step={0.1} onChange={(e) => setEditFields((f) => ({ ...f, weight: parseFloat(e.target.value) || 0 }))} style={{ ...inputStyle, width: '55px' }} />
                            </div>
                            <div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>MW Bonus</div>
                              <select value={editFields.masterworkBonus ?? 0} onChange={(e) => setEditFields((f) => ({ ...f, masterworkBonus: parseInt(e.target.value) }))} style={{ ...inputStyle, width: '65px' }}>
                                <option value={0}>None</option>
                                <option value={1}>+1</option>
                                <option value={2}>+2</option>
                                <option value={3}>+3</option>
                              </select>
                            </div>
                            <div>
                              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Slot</div>
                              <select value={editFields.slot ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, slot: (e.target.value || null) as InventorySlot }))} style={inputStyle}>
                                <option value="">None</option>
                                <option value="Main Hand">Main Hand</option>
                                <option value="Off Hand">Off Hand</option>
                                <option value="Two Hands">Two Hands</option>
                                <option value="Body">Body</option>
                              </select>
                            </div>
                          </div>
                          {(editFields.category === 'Armor') && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
                              <div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Armor Category</div>
                                <select value={editFields.armorCategory ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, armorCategory: (e.target.value || null) as 'Light' | 'Medium' | 'Heavy' | null }))} style={inputStyle}>
                                  <option value="">—</option>
                                  <option value="Light">Light</option>
                                  <option value="Medium">Medium</option>
                                  <option value="Heavy">Heavy</option>
                                </select>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Armor Bonus</div>
                                <input type="number" value={editFields.armorBonus ?? 0} min={0} max={10} onChange={(e) => setEditFields((f) => ({ ...f, armorBonus: parseInt(e.target.value) || 0 }))} style={{ ...inputStyle, width: '55px' }} />
                              </div>
                            </div>
                          )}
                          {(editFields.category === 'Weapon') && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
                              <div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Modifier</div>
                                <select value={editFields.modifierStat ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, modifierStat: (e.target.value || null) as 'Body' | 'Mind' | 'Will' | null }))} style={{ ...inputStyle, width: '70px' }}>
                                  <option value="">—</option>
                                  <option value="Body">Body</option>
                                  <option value="Mind">Mind</option>
                                  <option value="Will">Will</option>
                                </select>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Dice</div>
                                <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                                  <input type="number" value={editFields.damageDiceCount ?? 0} min={0} max={20} onChange={(e) => setEditFields((f) => ({ ...f, damageDiceCount: parseInt(e.target.value) || 0 }))} style={{ ...inputStyle, width: '40px' }} />
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>d</span>
                                  <select value={editFields.damageDiceSize ?? 6} onChange={(e) => setEditFields((f) => ({ ...f, damageDiceSize: parseInt(e.target.value) }))} style={{ ...inputStyle, width: '55px' }}>
                                    {[4, 6, 8, 10, 12, 20].map((d) => <option key={d} value={d}>d{d}</option>)}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Damage Type(s)</div>
                                <input value={(editFields.damageTypes ?? []).join(', ')} onChange={(e) => setEditFields((f) => ({ ...f, damageTypes: e.target.value.split(',').map((t) => t.trim()).filter(Boolean) }))} placeholder="Slashing…" style={{ ...inputStyle, width: '110px' }} />
                              </div>
                              <div style={{ paddingBottom: '0.15rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  <input type="checkbox" checked={editFields.isRanged ?? false} onChange={(e) => setEditFields((f) => ({ ...f, isRanged: e.target.checked }))} />
                                  Ranged
                                </label>
                              </div>
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Notes</div>
                            <input value={editFields.notes ?? ''} onChange={(e) => setEditFields((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional…" style={{ ...inputStyle, width: '100%' }} />
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => { updateItem(item.id, editFields); setEditingItemId(null); }} style={{ padding: '0.3rem 0.75rem', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.8rem' }}>Save</button>
                            <button onClick={() => setEditingItemId(null)} style={{ padding: '0.3rem 0.75rem', backgroundColor: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
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
            {newCategory === 'Armor' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end' }}>
                <div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Armor Category</div>
                  <select value={newArmorCategory ?? ''} onChange={(e) => setNewArmorCategory((e.target.value || null) as 'Light' | 'Medium' | 'Heavy' | null)} style={inputStyle}>
                    <option value="">—</option>
                    <option value="Light">Light</option>
                    <option value="Medium">Medium</option>
                    <option value="Heavy">Heavy</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Armor Bonus</div>
                  <input type="number" value={newArmorBonus} min={0} max={10} onChange={(e) => setNewArmorBonus(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: '55px' }} />
                </div>
              </div>
            )}
            {newCategory === 'Weapon' && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Modifier</div>
                  <select value={newModifierStat ?? ''} onChange={(e) => setNewModifierStat((e.target.value || null) as 'Body' | 'Mind' | 'Will' | null)} style={{ ...inputStyle, width: '70px' }}>
                    <option value="">—</option>
                    <option value="Body">Body</option>
                    <option value="Mind">Mind</option>
                    <option value="Will">Will</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Dice</div>
                  <div style={{ display: 'flex', gap: '0.2rem', alignItems: 'center' }}>
                    <input type="number" value={newDamageDiceCount} min={0} max={20} onChange={(e) => setNewDamageDiceCount(parseInt(e.target.value) || 0)} style={{ ...inputStyle, width: '40px' }} />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>d</span>
                    <select value={newDamageDiceSize} onChange={(e) => setNewDamageDiceSize(parseInt(e.target.value))} style={{ ...inputStyle, width: '55px' }}>
                      {[4, 6, 8, 10, 12, 20].map((d) => <option key={d} value={d}>d{d}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>Damage Type(s)</div>
                  <input value={newDamageTypes} onChange={(e) => setNewDamageTypes(e.target.value)} placeholder="Slashing, Piercing…" style={{ ...inputStyle, width: '130px' }} />
                </div>
                <div style={{ paddingBottom: '0.2rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <input type="checkbox" checked={newIsRanged} onChange={(e) => setNewIsRanged(e.target.checked)} />
                    Ranged
                  </label>
                </div>
              </div>
            )}
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
    if (!isCaster && mySpells.length === 0) return <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No spellcasting.</p>;

    // Active feed: use persisted list, defaulting to all known spells
    const feedIds = (c.activeFeedSpellIds ?? []).length > 0 ? c.activeFeedSpellIds : c.knownSpellIds;
    const feedSpells = mySpells.filter((s) => feedIds.includes(s.id));
    const cantrips = feedSpells.filter((s) => s.isCantrip);
    const tiered = feedSpells.filter((s) => !s.isCantrip);
    const byTier: Record<number, typeof tiered> = {};
    tiered.forEach((s) => { if (!byTier[s.tier]) byTier[s.tier] = []; byTier[s.tier].push(s); });

    function toggleSpellExpand(id: string) {
      setExpandedSpells((prev) => {
        const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
      });
    }

    function toggleAmp(spellId: string, ampIdx: number) {
      setActiveAmps((prev) => {
        const current = new Set(prev[spellId] ?? []);
        current.has(ampIdx) ? current.delete(ampIdx) : current.add(ampIdx);
        return { ...prev, [spellId]: current };
      });
    }

    function toggleFeedSpell(spellId: string) {
      const current = (c.activeFeedSpellIds ?? []).length > 0 ? c.activeFeedSpellIds : c.knownSpellIds;
      const next = current.includes(spellId) ? current.filter((id) => id !== spellId) : [...current, spellId];
      persist({ activeFeedSpellIds: next });
    }

    function addToKnown(spellId: string) {
      if (c.knownSpellIds.includes(spellId)) return;
      const newKnown = [...c.knownSpellIds, spellId];
      const newFeed = [...(c.activeFeedSpellIds ?? c.knownSpellIds), spellId];
      persist({ knownSpellIds: newKnown, activeFeedSpellIds: newFeed });
    }

    function removeFromKnown(spellId: string) {
      persist({
        knownSpellIds: c.knownSpellIds.filter((id) => id !== spellId),
        activeFeedSpellIds: (c.activeFeedSpellIds ?? []).filter((id) => id !== spellId),
      });
    }

    function SpellCard({ spell }: { spell: typeof mySpells[0] }) {
      const expanded = expandedSpells.has(spell.id);
      const ampState = activeAmps[spell.id] ?? new Set<number>();
      const baseCost = spell.isCantrip ? 0 : spell.tier;
      const ampCost = (spell.amps ?? []).reduce((sum, amp, i) =>
        ampState.has(i) ? sum + parseInt(amp.cost.replace('+', '')) : sum, 0);
      const totalCost = baseCost + ampCost;
      const canCast = spell.isCantrip || currentReservoir >= totalCost;
      const hasAmps = (spell.amps ?? []).length > 0;

      function handleCast() {
        if (!canCast || spell.isCantrip) { if (spell.isCantrip) return; return; }
        persist({ currentReservoir: Math.max(0, currentReservoir - totalCost) });
      }

      const badgeStyle: React.CSSProperties = { fontSize: '0.62rem', fontWeight: 700, fontFamily: 'var(--font-heading)', padding: '0.1rem 0.35rem', borderRadius: '9999px', border: '1px solid var(--border)', backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', whiteSpace: 'nowrap' };

      return (
        <div style={{ border: `1px solid ${expanded ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '0.5rem', overflow: 'hidden', backgroundColor: 'var(--bg-card)' }}>
          {/* Collapsed header */}
          <button
            onClick={() => toggleSpellExpand(spell.id)}
            style={{ width: '100%', padding: '0.6rem 0.875rem', border: 'none', cursor: 'pointer', textAlign: 'left', backgroundColor: expanded ? 'var(--primary-light)' : 'var(--bg-card)', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}
          >
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', color: expanded ? 'var(--primary)' : 'var(--text)', flex: 1, minWidth: '120px' }}>{spell.name}</span>
            <span style={{ ...badgeStyle, backgroundColor: spell.isCantrip ? 'var(--accent-light)' : 'var(--bg-nav)', color: spell.isCantrip ? 'var(--accent)' : 'var(--text-muted)', border: spell.isCantrip ? '1px solid #FCD34D' : '1px solid var(--border)' }}>
              {spell.isCantrip ? 'Cantrip' : `Tier ${spell.tier}`}
            </span>
            {!spell.isCantrip && (
              <span style={{ ...badgeStyle, backgroundColor: canCast ? 'var(--primary-light)' : 'var(--bg-nav)', color: canCast ? 'var(--primary)' : 'var(--text-muted)', border: canCast ? '1px solid var(--primary)' : '1px solid var(--border)' }}>
                Cost: {totalCost}
              </span>
            )}
            {spell.range && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{spell.range}</span>}
            {spell.duration && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{spell.duration}</span>}
            {hasAmps && <span style={{ ...badgeStyle, backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>Amps</span>}
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{expanded ? '▲' : '▼'}</span>
          </button>

          {/* Expanded content */}
          {expanded && (
            <div style={{ padding: '0.75rem 0.875rem', borderTop: `1px solid ${expanded ? 'var(--primary)' : 'var(--border)'}` }}>
              <MarkdownContent content={spell.descriptionMarkdown} />

              {/* Amp panel */}
              {hasAmps && (
                <div style={{ marginTop: '0.75rem', padding: '0.625rem 0.75rem', backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: '0.375rem' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#92400E', fontFamily: 'var(--font-heading)', marginBottom: '0.375rem' }}>Amps</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {(spell.amps ?? []).map((amp, i) => {
                      const active = ampState.has(i);
                      return (
                        <button
                          key={i}
                          onClick={() => toggleAmp(spell.id, i)}
                          style={{ width: '100%', textAlign: 'left', padding: '0.375rem 0.625rem', border: `1.5px solid ${active ? '#D97706' : '#FCD34D'}`, borderRadius: '0.375rem', backgroundColor: active ? '#FEF3C7' : '#FFFBEB', cursor: 'pointer', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}
                        >
                          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.72rem', color: active ? '#92400E' : '#D97706', whiteSpace: 'nowrap', minWidth: '50px' }}>Amp {amp.cost}</span>
                          <span style={{ fontSize: '0.78rem', color: '#78350F', lineHeight: 1.45 }}>{amp.effect}</span>
                          {active && <span style={{ marginLeft: 'auto', fontSize: '0.65rem', fontWeight: 700, color: '#92400E', fontFamily: 'var(--font-heading)' }}>✓</span>}
                        </button>
                      );
                    })}
                  </div>
                  {ampCost > 0 && (
                    <div style={{ marginTop: '0.375rem', fontSize: '0.72rem', color: '#92400E', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                      Total cost: {baseCost} + {ampCost} amps = {totalCost}
                    </div>
                  )}
                </div>
              )}

              {/* Cast button */}
              <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {!spell.isCantrip ? (
                  <>
                    <button
                      onClick={handleCast}
                      disabled={!canCast}
                      style={{ padding: '0.3rem 0.875rem', border: 'none', borderRadius: '0.375rem', backgroundColor: canCast ? 'var(--primary)' : 'var(--border)', color: '#fff', cursor: canCast ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.8rem' }}
                    >Cast ({totalCost})</button>
                    {!canCast && <span style={{ fontSize: '0.72rem', color: '#EF4444', fontStyle: 'italic' }}>Not enough Reservoir.</span>}
                  </>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Cantrip — free to cast.</span>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // ─── Known Spells Manager Modal ─────────────────────────────────────────
    const allSearchable = spellManagerSearch.trim()
      ? spells.filter((s) => s.name.toLowerCase().includes(spellManagerSearch.toLowerCase()) || s.school.toLowerCase().includes(spellManagerSearch.toLowerCase()))
      : spells;
    const unknownSpells = allSearchable.filter((s) => !c.knownSpellIds.includes(s.id));

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {/* Summary row */}
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

        {/* Known Spells button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={() => setShowSpellManager(true)}
            style={{ padding: '0.35rem 0.875rem', border: '1.5px solid var(--primary)', borderRadius: '0.375rem', backgroundColor: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.8rem' }}
          >Known Spells ({c.knownSpellIds.length})</button>
        </div>

        {/* Spell feed */}
        {feedSpells.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            {mySpells.length === 0 ? 'No known spells. Use "Known Spells" to add spells.' : 'All spells hidden. Use "Known Spells" to toggle spells into your feed.'}
          </p>
        )}

        {cantrips.length > 0 && (
          <div>
            <div style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.375rem' }}>Cantrips</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {cantrips.map((s) => <SpellCard key={s.id} spell={s} />)}
            </div>
          </div>
        )}
        {Object.keys(byTier).map(Number).sort().map((tier) => (
          <div key={tier}>
            <div style={{ fontSize: '0.63rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.375rem' }}>Tier {tier}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {byTier[tier].map((s) => <SpellCard key={s.id} spell={s} />)}
            </div>
          </div>
        ))}

        {/* Known Spells Manager Modal */}
        {showSpellManager && (
          <div
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 50, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}
            onClick={(e) => { if (e.target === e.currentTarget) setShowSpellManager(false); }}
          >
            <div style={{ width: '100%', maxWidth: '600px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
              <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>Known Spells</h3>
                <button onClick={() => setShowSpellManager(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-muted)', padding: '0.2rem 0.4rem' }}>✕</button>
              </div>

              <div style={{ padding: '1rem 1.25rem', maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Known spells list */}
                {mySpells.length > 0 && (
                  <div style={{ marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>
                      Your Known Spells — toggle to show/hide in feed
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {mySpells.map((s) => {
                        const inFeed = feedIds.includes(s.id);
                        return (
                          <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.625rem', backgroundColor: inFeed ? 'var(--primary-light)' : 'var(--bg-nav)', border: `1px solid ${inFeed ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '0.375rem' }}>
                            <button
                              onClick={() => toggleFeedSpell(s.id)}
                              style={{ width: '22px', height: '22px', borderRadius: '50%', border: `2px solid ${inFeed ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: inFeed ? 'var(--primary)' : 'transparent', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.65rem' }}
                            >{inFeed ? '✓' : ''}</button>
                            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)', flex: 1 }}>{s.name}</span>
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.isCantrip ? 'Cantrip' : `Tier ${s.tier}`}</span>
                            {s.range && <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.range}</span>}
                            {s.duration && <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{s.duration}</span>}
                            <button
                              onClick={() => removeFromKnown(s.id)}
                              title="Remove from known spells"
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.7rem', padding: '0.1rem 0.25rem', flexShrink: 0 }}
                            >✕</button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add spell search */}
                <div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>Add Spell</div>
                  <input
                    value={spellManagerSearch}
                    onChange={(e) => setSpellManagerSearch(e.target.value)}
                    placeholder="Search by name or school…"
                    style={{ width: '100%', padding: '0.375rem 0.625rem', fontSize: '0.825rem', fontFamily: 'var(--font-body)', border: '1px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-nav)', color: 'var(--text)', outline: 'none', marginBottom: '0.5rem', boxSizing: 'border-box' }}
                  />
                  {spellManagerSearch.trim() && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '220px', overflowY: 'auto' }}>
                      {unknownSpells.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No results.</p>
                      ) : unknownSpells.map((s) => (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.625rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.375rem' }}>
                          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)', flex: 1 }}>{s.name}</span>
                          <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{s.isCantrip ? 'Cantrip' : `Tier ${s.tier}`}</span>
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{s.school}</span>
                          <button
                            onClick={() => addToKnown(s.id)}
                            style={{ padding: '0.15rem 0.5rem', border: 'none', borderRadius: '0.25rem', backgroundColor: 'var(--primary)', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.72rem', flexShrink: 0 }}
                          >+ Add</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
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
          <StatCard label="Armor Def" value={armorDefense} sub={hasAgile && !equippedShield && (!equippedBody || equippedBody.armorCategory === 'Light' || !equippedBody.armorCategory) ? 'Agile' : equippedBody ? `${equippedBody.name} +${equippedBody.armorBonus}` : 'Base'} />
          <StatCard label="Body Def" value={bodyDef} />
          <StatCard label="Mind Def" value={mindDef} />
          <StatCard label="Will Def" value={willDef} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isCaster ? 3 : 1}, 1fr)`, gap: '0.5rem' }}>
          <StatCard label="Carry Weight" value={carryWeight} sub="5 + Body + Tier" />
          {isCaster && <StatCard label="Max Reservoir" value={maxReservoir} sub={casterInfo?.casterSource ?? ''} />}
          {isCaster && <StatCard label="Spell DC" value={spellDC ?? '—'} />}
        </div>
        {(primaryWeaponStats || offWeaponStats) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
            {primaryWeaponStats && (
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.2rem' }}>
                  {primaryWeapon?.name ?? 'Weapon'}{primaryWeapon?.isRanged ? ' (Ranged)' : ''}
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text)' }}>
                  <span><span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>To Hit </span><strong style={{ color: 'var(--primary)' }}>{primaryWeaponStats.toHit}</strong></span>
                  <span><span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Dmg </span><strong>{primaryWeaponStats.damage}</strong></span>
                </div>
              </div>
            )}
            {offWeaponStats && equippedOff && (
              <div style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.2rem' }}>
                  {equippedOff.name} (Off)
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: 'var(--text)' }}>
                  <span><span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>To Hit </span><strong style={{ color: 'var(--primary)' }}>{offWeaponStats.toHit}</strong></span>
                  <span><span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Dmg </span><strong>{offWeaponStats.damage}</strong></span>
                </div>
              </div>
            )}
          </div>
        )}
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

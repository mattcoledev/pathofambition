'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MarkdownContent from './MarkdownContent';
import { saveCharacter } from '@/lib/characterStorage';
import {
  calcStartingVitality, calcBodyDefense, calcMindDefense, calcWillDefense,
  calcMaxWounds, calcCarryWeight, calcReservoir, calcSpellDC,
  FEAT_ALLOWANCE, calcFeatVitalityBonus, calcAmbition,
} from '@/lib/characterCalc';
import type {
  BuilderProfession, BuilderOrigin, BuilderFeat, BuilderSpell,
  Character, AttributeKey, CharacterAttributes, BuilderVocationCaster,
} from '@/lib/characterTypes';

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_VITALS = ['Vigor', 'Intuition', 'Talent', 'Awareness', 'Lore', 'Social'];

const STEPS = [
  { id: 1, label: 'Tier' },
  { id: 2, label: 'Profession' },
  { id: 3, label: 'Origin' },
  { id: 4, label: 'Items' },
  { id: 5, label: 'Proficiencies' },
  { id: 6, label: 'Attributes' },
  { id: 7, label: 'Feats' },
  { id: 8, label: 'Summary' },
];

const STEP_TITLES: Record<number, string> = {
  1: 'Name & Tier',
  2: 'Choose a Profession',
  3: 'Choose an Origin',
  4: 'Starting Items',
  5: 'V.I.T.A.L.S. & Proficiencies',
  6: 'Assign Attributes',
  7: 'Select Feats',
  8: 'Character Summary',
};

// ─── Draft type ───────────────────────────────────────────────────────────────

interface Draft {
  name: string;
  tier: number;
  featAllowance: number;
  professionId: string;
  professionName: string;
  originId: string;
  originName: string;
  vocationId: string;
  vocationName: string;
  vocationAttributeBonus: { attribute: AttributeKey; value: number };
  vocationCaster: BuilderVocationCaster | null;
  baseAttributes: CharacterAttributes;
  vitalsProficiencies: string[];
  spellcastingModifier: AttributeKey | null;
  selectedFeatIds: string[];
  knownSpellIds: string[];
  ambition: string;
  inventoryNotes: string;
  currency: string;
  notes: string;
}

const emptyDraft: Draft = {
  name: '', tier: 1, featAllowance: 0,
  professionId: '', professionName: '',
  originId: '', originName: '', vocationId: '', vocationName: '',
  vocationAttributeBonus: { attribute: 'body', value: 1 },
  vocationCaster: null,
  baseAttributes: { body: 0, mind: 0, will: 0 },
  vitalsProficiencies: [],
  spellcastingModifier: null,
  selectedFeatIds: [],
  knownSpellIds: [],
  ambition: '', inventoryNotes: '', currency: '', notes: '',
};

// ─── Feat logic helpers ───────────────────────────────────────────────────────

function parsePathInvestment(pi: string): { count: number; keyword: string } | null {
  if (!pi) return null;
  const num = pi.match(/^(\d+|one|two|three|four|five)\s+/i);
  if (!num) return null;
  const wordMap: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  const count = isNaN(Number(num[1])) ? (wordMap[num[1].toLowerCase()] ?? 1) : Number(num[1]);
  const keyword = pi.slice(num[0].length).replace(/\s+[Ff]eats?$/, '').trim().toLowerCase();
  return { count, keyword };
}

interface FeatStatus {
  blocked: boolean;
  reason: string | null;
}

function getFeatStatus(
  feat: BuilderFeat,
  selectedIds: string[],
  allFeats: BuilderFeat[],
  atCap: boolean,
): FeatStatus {
  const isSelected = selectedIds.includes(feat.id);

  // Feat cap
  if (!isSelected && atCap) return { blocked: true, reason: 'Feat cap reached for this Tier' };

  // Requires
  if (feat.required) {
    const reqMet = allFeats.some((f) => f.name === feat.required && selectedIds.includes(f.id));
    if (!reqMet) return { blocked: true, reason: `Requires: ${feat.required}` };
  }

  // Path investment
  if (feat.pathInvestment) {
    const parsed = parsePathInvestment(feat.pathInvestment);
    if (parsed) {
      const selectedFromPath = allFeats.filter(
        (f) => selectedIds.includes(f.id) && f.id !== feat.id &&
          (f.ownerName.toLowerCase().includes(parsed.keyword) || (f.tag?.toLowerCase().includes(parsed.keyword) ?? false))
      ).length;
      if (selectedFromPath < parsed.count) {
        return { blocked: true, reason: `Investment: ${feat.pathInvestment}` };
      }
    }
  }

  return { blocked: false, reason: null };
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>
      {children}
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.625rem 0.5rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.375rem' }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--primary)' }}>{value}</div>
      <div style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.58rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
    </div>
  );
}

function Pill({ label, active, onClick, accent, disabled }: { label: string; active: boolean; onClick?: () => void; accent?: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '0.3rem 0.75rem', borderRadius: '9999px', cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '0.8rem', fontFamily: 'var(--font-heading)', fontWeight: 600,
        border: `1.5px solid ${active ? (accent ? 'var(--accent)' : 'var(--primary)') : 'var(--border)'}`,
        backgroundColor: active ? (accent ? 'var(--accent)' : 'var(--primary)') : 'var(--bg-card)',
        color: active ? '#fff' : disabled ? 'var(--border)' : 'var(--text-muted)',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.12s',
      }}
    >
      {label}
    </button>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  professions: BuilderProfession[];
  origins: BuilderOrigin[];
  professionFeats: BuilderFeat[];
  originFeats: BuilderFeat[];
  spells: BuilderSpell[];
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CharacterBuilder({ professions, origins, professionFeats, originFeats, spells }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft);

  function update(partial: Partial<Draft>) {
    setDraft((d) => ({ ...d, ...partial }));
  }

  const selectedProf = professions.find((p) => p.id === draft.professionId) ?? null;
  const selectedOrigin = origins.find((o) => o.id === draft.originId) ?? null;
  const selectedVocation = selectedOrigin?.vocations.find((v) => v.id === draft.vocationId) ?? null;

  const totalAttributes = {
    body: draft.baseAttributes.body + (draft.vocationAttributeBonus.attribute === 'body' ? draft.vocationAttributeBonus.value : 0),
    mind: draft.baseAttributes.mind + (draft.vocationAttributeBonus.attribute === 'mind' ? draft.vocationAttributeBonus.value : 0),
    will: draft.baseAttributes.will + (draft.vocationAttributeBonus.attribute === 'will' ? draft.vocationAttributeBonus.value : 0),
  };

  const allFeats = useMemo(() => [...professionFeats, ...originFeats], [professionFeats, originFeats]);
  const myProfFeats = professionFeats.filter((f) => f.ownerId === draft.professionId);
  const myOriginFeats = originFeats.filter((f) => f.ownerId === draft.originId);

  const featVitalityBonus = calcFeatVitalityBonus(draft.selectedFeatIds, allFeats);
  const atFeatCap = draft.selectedFeatIds.length >= draft.featAllowance && draft.featAllowance > 0;

  // Effective caster: profession, vocation, OR a selected feat that grants spellcasting
  const featCaster = useMemo(() => {
    for (const id of draft.selectedFeatIds) {
      const feat = allFeats.find((f) => f.id === id);
      if (feat?.casterInfo) return feat.casterInfo;
    }
    return null;
  }, [draft.selectedFeatIds, allFeats]);

  const effectiveCaster = selectedProf?.casterType ? {
    casterType: selectedProf.casterType,
    casterSource: selectedProf.casterSource ?? '',
    casterModifierOptions: selectedProf.casterModifierOptions,
  } : draft.vocationCaster ?? featCaster;

  const mySpells = useMemo(() => {
    const source = effectiveCaster?.casterSource;
    if (!source) return [];
    return spells.filter((s) => s.sources.includes(source) || s.sources.length === 0);
  }, [spells, effectiveCaster]);

  const totalBasePoints = draft.baseAttributes.body + draft.baseAttributes.mind + draft.baseAttributes.will;

  // ─── Navigation ──────────────────────────────────────────────────────────

  function canAdvance(): boolean {
    if (step === 1) return draft.name.trim().length > 0;
    if (step === 2) return !!draft.professionId;
    if (step === 3) return !!draft.originId && !!draft.vocationId;
    if (step === 4) return true; // read-only
    if (step === 5) return draft.vitalsProficiencies.length === (selectedProf?.vitalsChoiceCount ?? 0);
    if (step === 6) return totalBasePoints === 4;
    return true;
  }

  function handleNext() {
    if (!canAdvance()) return;
    setStep((s) => Math.min(s + 1, STEPS.length));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  function handleSave() {
    if (!draft.name.trim()) return;
    const attrs = totalAttributes;
    const startVit = selectedProf ? calcStartingVitality(selectedProf, attrs) + featVitalityBonus : 10;

    // Build structured inventory from starting packs
    let itemIdCounter = 0;
    function makeItem(name: string, category: import('@/lib/characterTypes').InventoryCategory, slot: import('@/lib/characterTypes').InventorySlot = null): import('@/lib/characterTypes').InventoryItem {
      return { id: `item_${Date.now()}_${itemIdCounter++}`, name, category, quantity: 1, weight: 0, notes: '', source: 'creation', slot, equipped: false, traits: [], catalogItemId: null };
    }
    const startingInventory: import('@/lib/characterTypes').InventoryItem[] = [];
    const profPack = selectedProf?.startingPack;
    if (profPack) {
      profPack.weapons.forEach((n) => startingInventory.push(makeItem(n, 'Weapon')));
      profPack.armor.forEach((n) => startingInventory.push(makeItem(n, 'Armor')));
      profPack.kit.forEach((n) => startingInventory.push(makeItem(n, 'Kit')));
      profPack.inventory.forEach((n) => startingInventory.push(makeItem(n, 'Misc')));
    }
    const originPack = selectedOrigin?.originPack;
    if (originPack) {
      originPack.categories.forEach((cat) => {
        const category: import('@/lib/characterTypes').InventoryCategory =
          cat.label.toLowerCase().includes('weapon') ? 'Weapon' :
          cat.label.toLowerCase().includes('armor') ? 'Armor' :
          cat.label.toLowerCase().includes('kit') ? 'Kit' : 'Misc';
        cat.items.forEach((n) => startingInventory.push(makeItem(n, category)));
      });
    }

    // Sum currency from both packs
    const profCurrency = profPack?.currency ?? '';
    const originCurrency = '';  // origins tracked via originPack categories
    const combinedCurrency = [profCurrency, originCurrency].filter(Boolean).join(', ');

    const ambition = calcAmbition(totalAttributes.will);
    const startReservoir = effectiveCaster
      ? (calcReservoir(effectiveCaster.casterType, draft.tier,
          totalAttributes[(effectiveCaster.casterModifierOptions[0] ?? draft.spellcastingModifier ?? 'mind')]) ?? 0)
      : 0;

    const charData: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> = {
      ...draft,
      currency: draft.currency || combinedCurrency,
      inventory: startingInventory,
      maxAmbition: ambition.max,
      ambitionDice: ambition.dice,
      currentAmbition: ambition.max,
      currentReservoir: startReservoir,
      currentRespites: 3,
      currentVitality: startVit,
      maxVitality: null,
      currentWounds: 0,
      renown: 0,
      featsPurchased: draft.selectedFeatIds.length,
    };
    const saved = saveCharacter(charData);
    router.push(`/characters/${saved.id}`);
  }

  // ─── Feat toggling with reactive deselection ──────────────────────────────

  function toggleFeat(id: string) {
    const current = draft.selectedFeatIds;
    if (current.includes(id)) {
      // Deselect and cascade — find feats that require the name of this feat
      const removedFeat = allFeats.find((f) => f.id === id);
      if (!removedFeat) return;
      const dependents = allFeats
        .filter((f) => f.required === removedFeat.name && current.includes(f.id))
        .map((f) => f.id);
      update({ selectedFeatIds: current.filter((f) => f !== id && !dependents.includes(f)) });
    } else {
      const status = getFeatStatus(
        allFeats.find((f) => f.id === id)!,
        current,
        allFeats,
        atFeatCap,
      );
      if (status.blocked) return;
      update({ selectedFeatIds: [...current, id] });
    }
  }

  // ─── Steps ────────────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <SectionLabel>Character Name</SectionLabel>
          <input
            type="text"
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Enter a name…"
            autoFocus
            style={{
              width: '100%', padding: '0.625rem 0.875rem', fontSize: '1rem',
              fontFamily: 'var(--font-body)', border: '1.5px solid var(--border)',
              borderRadius: '0.5rem', backgroundColor: 'var(--bg-card)',
              color: 'var(--text)', outline: 'none',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border)'; }}
          />
        </div>

        <div>
          <SectionLabel>Tier</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
            {[1, 2, 3, 4, 5].map((t) => {
              const allowance = FEAT_ALLOWANCE[t];
              const sel = draft.tier === t;
              return (
                <div
                  key={t}
                  onClick={() => update({ tier: t, featAllowance: FEAT_ALLOWANCE[t], selectedFeatIds: [] })}
                  style={{
                    padding: '0.875rem 0.5rem', textAlign: 'center', borderRadius: '0.5rem', cursor: 'pointer',
                    border: `2px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: sel ? 'var(--primary-light)' : 'var(--bg-card)',
                    transition: 'all 0.12s',
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.5rem', color: sel ? 'var(--primary)' : 'var(--text)', lineHeight: 1 }}>{t}</div>
                  <div style={{ fontSize: '0.6rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '0.25rem' }}>Tier</div>
                  <div style={{ fontSize: '0.65rem', color: sel ? 'var(--primary)' : 'var(--text-muted)', marginTop: '0.3rem', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                    {allowance} feat{allowance !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
            New adventurers start at <strong>Tier 1</strong>. Feat allowance reflects the total feats earned by that tier.
          </p>
        </div>
      </div>
    );
  }

  // Profession step — compact list + detail panel
  const [profDetail, setProfDetail] = useState<string | null>(null);
  const detailProf = professions.find((p) => p.id === (profDetail ?? draft.professionId)) ?? null;

  function renderStep2() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Compact selectable list */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {professions.map((p) => {
            const sel = draft.professionId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => {
                  update({ professionId: p.id, professionName: p.name, vitalsProficiencies: [], selectedFeatIds: [] });
                  setProfDetail(p.id);
                }}
                style={{
                  padding: '0.3rem 0.75rem', borderRadius: '9999px', cursor: 'pointer',
                  fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.85rem',
                  border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                  backgroundColor: sel ? 'var(--primary)' : 'var(--bg-card)',
                  color: sel ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.12s',
                }}
              >
                {p.name}
              </button>
            );
          })}
        </div>

        {/* Detail panel */}
        {detailProf && (
          <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.625rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)', margin: 0 }}>{detailProf.name}</h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{detailProf.role}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                  {detailProf.startingVitality} HP
                </span>
                <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>
                  +{detailProf.vitalityPerTier}/tier
                </span>
                {detailProf.casterType && (
                  <span style={{ fontSize: '0.72rem', padding: '0.2rem 0.5rem', borderRadius: '9999px', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', color: 'var(--primary)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                    {detailProf.casterType === 'full' ? 'Full Caster' : detailProf.casterType === 'half' ? 'Half Caster' : 'Limited Caster'}
                  </span>
                )}
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '0.875rem' }}>{detailProf.flavor}</p>

            {/* Proficiencies summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.875rem', fontSize: '0.8rem' }}>
              {[
                ['Armaments', detailProf.armaments.join(', ')],
                ['Protection', detailProf.protection.join(', ')],
                ['Tool Kits', detailProf.toolKits.join(', ') || '—'],
                ['V.I.T.A.L.S.', detailProf.vitalsChoiceCount > 0 ? `Choose ${detailProf.vitalsChoiceCount}: ${detailProf.vitalsOptions.join(', ')}` : '—'],
              ].map(([label, val]) => (
                <div key={label}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label} </span>
                  <span style={{ color: 'var(--text)' }}>{val}</span>
                </div>
              ))}
            </div>

            {/* Paths — informational only */}
            {detailProf.pathOptions.length > 0 && (
              <div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.3rem' }}>Paths</div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {detailProf.pathOptions.map((path) => (
                    <span key={path} style={{ fontSize: '0.78rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #FCD34D', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                      {path}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Base Features — auto-granted, display only */}
            {detailProf.baseFeatures.length > 0 && (
              <div style={{ marginTop: '0.875rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>
                  Base Features <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(automatically granted)</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                  {detailProf.baseFeatures.map((f) => (
                    <div key={f.id} style={{ padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.375rem', fontSize: '0.8rem' }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text)', marginBottom: '0.125rem' }}>{f.name}</div>
                      <div style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{f.descriptionMarkdown.slice(0, 160)}{f.descriptionMarkdown.length > 160 ? '…' : ''}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {draft.professionId === detailProf.id && (
              <div style={{ marginTop: '1rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '0.375rem', fontSize: '0.8rem', color: 'var(--primary)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                ✓ {detailProf.name} selected
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Origin step — compact list + expand + vocation select
  const [originDetail, setOriginDetail] = useState<string | null>(null);
  const [vocDetail, setVocDetail] = useState<string | null>(null);
  const detailOrigin = origins.find((o) => o.id === (originDetail ?? draft.originId)) ?? null;

  function renderStep3() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Origin list */}
        <div>
          <SectionLabel>Origin</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {origins.map((o) => {
              const sel = draft.originId === o.id;
              return (
                <button
                  key={o.id}
                  onClick={() => {
                    update({ originId: o.id, originName: o.name, vocationId: '', vocationName: '', vocationAttributeBonus: { attribute: 'body', value: 1 }, vocationCaster: null });
                    setOriginDetail(o.id);
                    setVocDetail(null);
                  }}
                  style={{
                    padding: '0.3rem 0.75rem', borderRadius: '9999px', cursor: 'pointer',
                    fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.85rem',
                    border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: sel ? 'var(--primary)' : 'var(--bg-card)',
                    color: sel ? '#fff' : 'var(--text-muted)',
                    transition: 'all 0.12s',
                  }}
                >
                  {o.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        {detailOrigin && (
          <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.625rem' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)', margin: '0 0 0.375rem' }}>{detailOrigin.name}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.65, marginBottom: '1rem' }}>{detailOrigin.flavor}</p>

            <SectionLabel>Choose a Vocation</SectionLabel>
            {/* Vocation pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.875rem' }}>
              {detailOrigin.vocations.map((v) => {
                const sel = draft.vocationId === v.id;
                const previewing = vocDetail === v.id || (!vocDetail && sel);
                return (
                  <button
                    key={v.id}
                    onClick={() => {
                      setVocDetail(v.id);
                      update({ vocationId: v.id, vocationName: v.name, vocationAttributeBonus: v.attributeBonus, vocationCaster: v.caster });
                    }}
                    style={{
                      padding: '0.3rem 0.75rem', borderRadius: '9999px', cursor: 'pointer',
                      fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.85rem',
                      border: `1.5px solid ${sel ? 'var(--accent)' : previewing ? 'var(--border)' : 'var(--border)'}`,
                      backgroundColor: sel ? 'var(--accent)' : 'var(--bg-card)',
                      color: sel ? '#fff' : 'var(--text-muted)',
                      transition: 'all 0.12s',
                    }}
                  >{v.name}</button>
                );
              })}
            </div>
            {/* Vocation detail panel */}
            {(() => {
              const v = detailOrigin.vocations.find((v) => v.id === (vocDetail ?? draft.vocationId));
              if (!v) return null;
              return (
                <div style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: '0.25rem' }}>{v.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '0.5rem' }}>{v.flavor}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--accent)' }}>
                      +{v.attributeBonus.value} {v.attributeBonus.attribute.charAt(0).toUpperCase() + v.attributeBonus.attribute.slice(1)}
                    </span>
                    {v.caster && (
                      <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '9999px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                        {v.caster.casterType.charAt(0).toUpperCase() + v.caster.casterType.slice(1)} Caster — {v.caster.casterSource}
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}

            {draft.vocationId && detailOrigin.id === draft.originId && (
              <div style={{ marginTop: '1rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '0.375rem', fontSize: '0.8rem', color: 'var(--primary)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                ✓ {draft.originName} — {draft.vocationName} selected
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderStep4() {
    // Starting Items — read-only aggregated view
    const profPack = selectedProf?.startingPack;
    const originPack = selectedOrigin?.originPack;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
          Your starting equipment from your <strong>{draft.professionName}</strong> and <strong>{draft.originName}</strong> backgrounds.
        </p>

        {/* Profession pack */}
        {profPack && (
          <div>
            <SectionLabel>{draft.professionName} Starting Pack</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Weapons', items: profPack.weapons },
                { label: 'Armor', items: profPack.armor },
                { label: 'Kit', items: profPack.kit },
                { label: 'Inventory', items: profPack.inventory },
              ].filter((cat) => cat.items.length > 0).map((cat) => (
                <div key={cat.label} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-nav)', borderRadius: '0.375rem', fontSize: '0.85rem' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', minWidth: '70px', flexShrink: 0, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{cat.label}</span>
                  <span style={{ color: 'var(--text)' }}>{cat.items.join(', ')}</span>
                </div>
              ))}
              {profPack.currency && (
                <div style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-nav)', borderRadius: '0.375rem', fontSize: '0.85rem' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', minWidth: '70px', flexShrink: 0, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Currency</span>
                  <span style={{ color: 'var(--text)' }}>{profPack.currency}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Origin pack */}
        {originPack && (
          <div>
            <SectionLabel>{originPack.name}</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {originPack.categories.map((cat) => (
                <div key={cat.label} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-nav)', borderRadius: '0.375rem', fontSize: '0.85rem' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-muted)', minWidth: '70px', flexShrink: 0, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{cat.label}</span>
                  <span style={{ color: 'var(--text)' }}>{cat.items.join(', ')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>
          These items are pre-filled into your inventory on the character sheet. You can edit them freely.
        </p>
      </div>
    );
  }

  function renderStep5() {
    // Proficiencies (was step 6)
    if (!selectedProf) return null;
    const { vitalsChoiceCount, vitalsOptions } = selectedProf;

    function toggleVital(skill: string) {
      const current = draft.vitalsProficiencies;
      if (current.includes(skill)) {
        update({ vitalsProficiencies: current.filter((s) => s !== skill) });
      } else if (current.length < vitalsChoiceCount) {
        update({ vitalsProficiencies: [...current, skill] });
      }
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <SectionLabel>V.I.T.A.L.S. Skills</SectionLabel>
          {vitalsChoiceCount > 0 ? (
            <>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Choose <strong>{vitalsChoiceCount}</strong> from: {vitalsOptions.join(', ')}.
                &nbsp;({draft.vitalsProficiencies.length}/{vitalsChoiceCount} chosen)
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.5rem' }}>
                {vitalsOptions.map((skill) => {
                  const selected = draft.vitalsProficiencies.includes(skill);
                  const disabled = !selected && draft.vitalsProficiencies.length >= vitalsChoiceCount;
                  return (
                    <button
                      key={skill}
                      onClick={() => !disabled && toggleVital(skill)}
                      style={{
                        padding: '0.5rem 0.75rem', borderRadius: '0.375rem', cursor: disabled ? 'not-allowed' : 'pointer',
                        border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor: selected ? 'var(--primary-light)' : 'var(--bg-card)',
                        color: 'var(--text)', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.875rem',
                        opacity: disabled ? 0.4 : 1, textAlign: 'left',
                      }}
                    >
                      {selected && '✓ '}{skill}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No V.I.T.A.L.S. proficiency choices from this profession.</p>
          )}
        </div>

        {/* Full V.I.T.A.L.S. overview */}
        <div>
          <SectionLabel>All V.I.T.A.L.S.</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {ALL_VITALS.map((skill) => {
              const proficient = draft.vitalsProficiencies.includes(skill);
              return (
                <span key={skill} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontFamily: 'var(--font-heading)', fontWeight: 600, border: `1.5px solid ${proficient ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: proficient ? 'var(--primary-light)' : 'var(--bg-nav)', color: proficient ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {proficient ? '✓ ' : ''}{skill}
                </span>
              );
            })}
          </div>
        </div>

        {/* Other proficiencies */}
        {[
          { label: 'Armaments', items: selectedProf.armaments },
          { label: 'Protection', items: selectedProf.protection },
          { label: 'Tool Kits', items: selectedProf.toolKits.filter((t) => t !== '-') },
        ].filter((g) => g.items.length > 0).map((group) => (
          <div key={group.label}>
            <SectionLabel>{group.label}</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {group.items.map((item) => (
                <span key={item} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', color: 'var(--text)' }}>{item}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderStep6() {
    // Attributes (was step 5 — now after proficiencies)
    const attrs: AttributeKey[] = ['body', 'mind', 'will'];
    const remaining = 4 - totalBasePoints;

    function adjust(attr: AttributeKey, delta: number) {
      const current = draft.baseAttributes[attr];
      const newVal = current + delta;
      if (newVal < 0 || newVal > 3) return;
      if (delta > 0 && remaining <= 0) return;
      update({ baseAttributes: { ...draft.baseAttributes, [attr]: newVal } });
    }

    const derived = selectedProf ? {
      startingVitality: calcStartingVitality(selectedProf, totalAttributes) + featVitalityBonus,
      bodyDef: calcBodyDefense(totalAttributes),
      mindDef: calcMindDefense(totalAttributes),
      willDef: calcWillDefense(totalAttributes),
      wounds: calcMaxWounds(totalAttributes, draft.tier),
      carry: calcCarryWeight(totalAttributes, draft.tier),
    } : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '0.5rem', fontSize: '0.85rem', color: 'var(--text)' }}>
          Distribute <strong>4 points</strong> among Body, Mind, and Will (max +3 each).
          {draft.vocationAttributeBonus.value > 0 && (
            <> Your <strong>{draft.vocationName}</strong> vocation adds <strong>+{draft.vocationAttributeBonus.value} {draft.vocationAttributeBonus.attribute.charAt(0).toUpperCase() + draft.vocationAttributeBonus.attribute.slice(1)}</strong> automatically.</>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {attrs.map((attr) => {
            const base = draft.baseAttributes[attr];
            const total = totalAttributes[attr];
            const isVoc = draft.vocationAttributeBonus.attribute === attr;
            return (
              <div key={attr} style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.625rem' }}>
                  {attr.charAt(0).toUpperCase() + attr.slice(1)}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--primary)', marginBottom: '0.4rem', lineHeight: 1 }}>
                  {total >= 0 ? `+${total}` : total}
                </div>
                {isVoc && (
                  <div style={{ fontSize: '0.62rem', color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-heading)', marginBottom: '0.4rem' }}>
                    +{draft.vocationAttributeBonus.value} from {draft.vocationName}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                  <button onClick={() => adjust(attr, -1)} disabled={base <= 0} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', color: 'var(--text-muted)' }}>−</button>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{base >= 0 ? `+${base}` : base}</span>
                  <button onClick={() => adjust(attr, 1)} disabled={base >= 3 || remaining <= 0} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', color: 'var(--text-muted)' }}>+</button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.9rem', fontFamily: 'var(--font-heading)', fontWeight: 600, color: remaining === 0 ? 'var(--primary)' : 'var(--accent)' }}>
          {remaining} point{remaining !== 1 ? 's' : ''} remaining
        </div>

        {derived && (
          <div>
            <SectionLabel>Derived Stats Preview</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <StatBox label="Starting Vitality" value={derived.startingVitality} sub={selectedProf!.vitalityPerTier + '/tier'} />
              <StatBox label="Body Def" value={derived.bodyDef} />
              <StatBox label="Mind Def" value={derived.mindDef} />
              <StatBox label="Will Def" value={derived.willDef} />
              <StatBox label="Max Wounds" value={derived.wounds} />
              <StatBox label="Carry Weight" value={derived.carry} />
            </div>
          </div>
        )}

        {/* Spellcasting modifier choice */}
        {effectiveCaster && effectiveCaster.casterModifierOptions.length > 1 && (
          <div>
            <SectionLabel>Spellcasting Modifier</SectionLabel>
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              {effectiveCaster.casterModifierOptions.map((attr) => (
                <div
                  key={attr}
                  onClick={() => update({ spellcastingModifier: attr })}
                  style={{
                    padding: '0.625rem 1rem', borderRadius: '0.5rem', cursor: 'pointer',
                    border: `2px solid ${draft.spellcastingModifier === attr ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: draft.spellcastingModifier === attr ? 'var(--primary-light)' : 'var(--bg-card)',
                  }}
                >
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', color: draft.spellcastingModifier === attr ? 'var(--primary)' : 'var(--text)' }}>
                    {attr.charAt(0).toUpperCase() + attr.slice(1)} ({totalAttributes[attr] >= 0 ? `+${totalAttributes[attr]}` : totalAttributes[attr]})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStep7() {
    const allMyFeats = [...myProfFeats, ...myOriginFeats];
    if (allMyFeats.length === 0) {
      return <p style={{ color: 'var(--text-muted)' }}>No feats available for your selections.</p>;
    }

    const allowance = draft.featAllowance;

    function renderFeatGroup(feats: BuilderFeat[], title: string) {
      const byTier: Record<number, BuilderFeat[]> = {};
      feats.forEach((f) => { if (!byTier[f.tier ?? 1]) byTier[f.tier ?? 1] = []; byTier[f.tier ?? 1].push(f); });

      return (
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.75rem', paddingBottom: '0.375rem', borderBottom: '2px solid var(--primary)', display: 'inline-block' }}>{title}</h3>
          {Object.keys(byTier).map(Number).sort().map((tier) => (
            <div key={tier} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.4rem' }}>Tier {tier}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                {byTier[tier].map((feat) => {
                  const selected = draft.selectedFeatIds.includes(feat.id);
                  const status = getFeatStatus(feat, draft.selectedFeatIds, allFeats, atFeatCap && !selected);
                  const blocked = status.blocked;
                  return (
                    <label
                      key={feat.id}
                      style={{
                        display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                        padding: '0.625rem 0.875rem', borderRadius: '0.375rem',
                        cursor: blocked ? 'not-allowed' : 'pointer',
                        border: `1.5px solid ${selected ? 'var(--primary)' : blocked ? 'var(--border)' : 'var(--border)'}`,
                        backgroundColor: selected ? 'var(--primary-light)' : 'var(--bg-card)',
                        opacity: blocked && !selected ? 0.5 : 1,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={blocked && !selected}
                        onChange={() => toggleFeat(feat.id)}
                        style={{ marginTop: '0.15rem', accentColor: 'var(--primary)', flexShrink: 0, cursor: blocked && !selected ? 'not-allowed' : 'pointer' }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', marginBottom: '0.1rem' }}>{feat.name}</div>
                        {status.reason && !selected && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>⚠ {status.reason}</div>
                        )}
                        {feat.required && !status.reason && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Requires: {feat.required}</div>}
                        {feat.pathInvestment && !status.reason && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Investment: {feat.pathInvestment}</div>}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Cap indicator */}
        <div style={{ padding: '0.625rem 1rem', backgroundColor: allowance === 0 ? 'var(--bg-nav)' : atFeatCap ? 'var(--accent-light)' : 'var(--primary-light)', border: `1px solid ${allowance === 0 ? 'var(--border)' : atFeatCap ? '#FCD34D' : 'var(--primary)'}`, borderRadius: '0.5rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: 'var(--text)' }}>
            {allowance === 0
              ? 'Tier 1 characters start with 0 feats. Feats are earned through play.'
              : <><strong>{draft.selectedFeatIds.length}</strong> / {allowance} feat{allowance !== 1 ? 's' : ''} selected</>
            }
          </span>
          {draft.selectedFeatIds.length > 0 && (
            <button onClick={() => update({ selectedFeatIds: [] })} style={{ fontSize: '0.72rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>Clear</button>
          )}
        </div>

        {myProfFeats.length > 0 && renderFeatGroup(myProfFeats, `${draft.professionName} Feats`)}
        {myOriginFeats.length > 0 && renderFeatGroup(myOriginFeats, `${draft.originName} Feats`)}
      </div>
    );
  }

  function renderSpellSelection() {
    if (!effectiveCaster) return null;

    function toggleSpell(id: string) {
      update({ knownSpellIds: draft.knownSpellIds.includes(id) ? draft.knownSpellIds.filter((s) => s !== id) : [...draft.knownSpellIds, id] });
    }

    const modKey = (effectiveCaster.casterModifierOptions.length === 1 ? effectiveCaster.casterModifierOptions[0] : draft.spellcastingModifier) ?? 'mind';
    const modVal = totalAttributes[modKey];
    const reservoir = calcReservoir(effectiveCaster.casterType, draft.tier, modVal);
    const spellDC = calcSpellDC(draft.tier, modVal);
    const cantrips = mySpells.filter((s) => s.isCantrip);
    const tieredSpells = mySpells.filter((s) => !s.isCantrip);
    const byTier: Record<number, BuilderSpell[]> = {};
    tieredSpells.forEach((s) => { if (!byTier[s.tier]) byTier[s.tier] = []; byTier[s.tier].push(s); });

    return (
      <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.875rem', paddingBottom: '0.375rem', borderBottom: '2px solid var(--primary)', display: 'inline-block' }}>Known Spells</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '1rem' }}>
          <StatBox label="Caster Type" value={effectiveCaster.casterType === 'full' ? 'Full' : effectiveCaster.casterType === 'half' ? 'Half' : 'Limited'} />
          <StatBox label="Reservoir" value={reservoir ?? '—'} sub={effectiveCaster.casterSource} />
          <StatBox label="Spell DC" value={spellDC} />
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          {draft.knownSpellIds.length} spell{draft.knownSpellIds.length !== 1 ? 's' : ''} selected. Check all spells your character currently knows.
        </p>

        {cantrips.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.4rem' }}>Cantrips</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {cantrips.map((s) => {
                const sel = draft.knownSpellIds.includes(s.id);
                return (
                  <label key={s.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.5rem 0.875rem', borderRadius: '0.375rem', cursor: 'pointer', border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: sel ? 'var(--primary-light)' : 'var(--bg-card)' }}>
                    <input type="checkbox" checked={sel} onChange={() => toggleSpell(s.id)} style={{ accentColor: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>{s.name}</span>
                    {(s.range || s.duration) && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{[s.range && `R: ${s.range}`, s.duration && `D: ${s.duration}`].filter(Boolean).join(' · ')}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {Object.keys(byTier).map(Number).sort().map((tier) => (
          <div key={tier} style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.4rem' }}>Tier {tier}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {byTier[tier].map((s) => {
                const sel = draft.knownSpellIds.includes(s.id);
                return (
                  <label key={s.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.5rem 0.875rem', borderRadius: '0.375rem', cursor: 'pointer', border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: sel ? 'var(--primary-light)' : 'var(--bg-card)' }}>
                    <input type="checkbox" checked={sel} onChange={() => toggleSpell(s.id)} style={{ accentColor: 'var(--primary)', flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>{s.name}</span>
                    {(s.range || s.duration) && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>{[s.range && `R: ${s.range}`, s.duration && `D: ${s.duration}`].filter(Boolean).join(' · ')}</span>}
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        {cantrips.length === 0 && Object.keys(byTier).length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No spells found for {effectiveCaster.casterSource} source.</p>
        )}
      </div>
    );
  }

  function renderStep8() {
    const startVit = selectedProf ? calcStartingVitality(selectedProf, totalAttributes) + featVitalityBonus : 10;

    // Pre-build combined inventory suggestion
    const packLines: string[] = [];
    const profPack = selectedProf?.startingPack;
    if (profPack) {
      if (profPack.weapons.length) packLines.push(`Weapons: ${profPack.weapons.join(', ')}`);
      if (profPack.armor.length) packLines.push(`Armor: ${profPack.armor.join(', ')}`);
      if (profPack.kit.length) packLines.push(`Kit: ${profPack.kit.join(', ')}`);
      if (profPack.inventory.length) packLines.push(`Inventory: ${profPack.inventory.join(', ')}`);
    }
    const originPack = selectedOrigin?.originPack;
    if (originPack) {
      originPack.categories.forEach((cat) => packLines.push(`${cat.label}: ${cat.items.join(', ')}`));
    }
    const suggestedInventory = packLines.join('\n');
    const suggestedCurrency = profPack?.currency ?? '';

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* Character overview */}
        <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.625rem' }}>
          <SectionLabel>Overview</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem' }}>
            {[
              ['Name', draft.name],
              ['Tier', `${draft.tier} (${draft.featAllowance} feat${draft.featAllowance !== 1 ? 's' : ''})`],
              ['Profession', draft.professionName],
              ['Origin', `${draft.originName}${draft.vocationName ? ` — ${draft.vocationName}` : ''}`],
              ['Attributes', `Body ${totalAttributes.body >= 0 ? '+' : ''}${totalAttributes.body} · Mind ${totalAttributes.mind >= 0 ? '+' : ''}${totalAttributes.mind} · Will ${totalAttributes.will >= 0 ? '+' : ''}${totalAttributes.will}`],
              ['Starting Vitality', String(startVit) + (featVitalityBonus > 0 ? ` (+${featVitalityBonus} from feats)` : '')],
              ['Feats', `${draft.selectedFeatIds.length} / ${draft.featAllowance}`],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', gap: '0.75rem' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, minWidth: '110px', color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                <span style={{ color: 'var(--text)' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Spells for casters */}
        {renderSpellSelection()}

        {/* Final details */}
        <div>
          <SectionLabel>Ambition</SectionLabel>
          <input
            type="text"
            value={draft.ambition}
            onChange={(e) => update({ ambition: e.target.value })}
            placeholder="What drives your character?"
            style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.9rem', fontFamily: 'var(--font-body)', border: '1.5px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none' }}
          />
        </div>

        <div>
          <SectionLabel>Starting Currency</SectionLabel>
          <input
            type="text"
            value={draft.currency || suggestedCurrency}
            onChange={(e) => update({ currency: e.target.value })}
            placeholder={suggestedCurrency || 'e.g. 15 gold…'}
            style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.9rem', fontFamily: 'var(--font-body)', border: '1.5px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none' }}
          />
        </div>

        <div>
          <SectionLabel>Inventory</SectionLabel>
          <textarea
            value={draft.inventoryNotes || suggestedInventory}
            onChange={(e) => update({ inventoryNotes: e.target.value })}
            rows={5}
            placeholder={suggestedInventory || 'List your starting equipment…'}
            style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontFamily: 'var(--font-body)', border: '1.5px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
          />
        </div>

        <div>
          <SectionLabel>Character Notes</SectionLabel>
          <textarea
            value={draft.notes}
            onChange={(e) => update({ notes: e.target.value })}
            rows={4}
            placeholder="Backstory, appearance, personality…"
            style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontFamily: 'var(--font-body)', border: '1.5px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
          />
        </div>
      </div>
    );
  }

  const stepContent: Record<number, () => React.ReactNode> = {
    1: renderStep1, 2: renderStep2, 3: renderStep3, 4: renderStep4,
    5: renderStep5, 6: renderStep6, 7: renderStep7, 8: renderStep8,
  };

  const isLast = step === STEPS.length;

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Progress bar */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.875rem' }}>
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => s.id < step && setStep(s.id)}
              title={s.label}
              style={{
                flex: '1 1 0', height: '4px', borderRadius: '2px', border: 'none',
                backgroundColor: s.id < step ? 'var(--primary)' : s.id === step ? 'var(--accent)' : 'var(--border)',
                cursor: s.id < step ? 'pointer' : 'default',
                transition: 'background-color 0.2s',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text)', margin: 0 }}>
            {STEP_TITLES[step]}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>
            {step} / {STEPS.length}
          </span>
        </div>
      </div>

      {/* Content */}
      <div style={{ marginBottom: '2rem', minHeight: '200px' }}>
        {stepContent[step]?.()}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleBack}
          disabled={step === 1}
          style={{
            padding: '0.625rem 1.25rem', border: '1.5px solid var(--border)', borderRadius: '0.5rem',
            cursor: step === 1 ? 'not-allowed' : 'pointer', backgroundColor: 'var(--bg-card)',
            color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.875rem',
            opacity: step === 1 ? 0.4 : 1,
          }}
        >
          ← Back
        </button>

        {!isLast ? (
          <button
            onClick={handleNext}
            disabled={!canAdvance()}
            style={{
              padding: '0.625rem 1.5rem', border: 'none', borderRadius: '0.5rem',
              cursor: canAdvance() ? 'pointer' : 'not-allowed',
              backgroundColor: canAdvance() ? 'var(--primary)' : 'var(--border)',
              color: canAdvance() ? '#fff' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.875rem',
            }}
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSave}
            style={{
              padding: '0.625rem 1.75rem', border: 'none', borderRadius: '0.5rem',
              cursor: 'pointer', backgroundColor: 'var(--primary)',
              color: '#fff', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem',
            }}
          >
            Save Character →
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import MarkdownContent from './MarkdownContent';
import { saveCharacter } from '@/lib/characterStorage';
import {
  calcStartingVitality, calcBodyDefense, calcMindDefense, calcWillDefense,
  calcMaxWounds, calcCarryWeight, calcReservoir, calcSpellDC,
} from '@/lib/characterCalc';
import type {
  BuilderProfession, BuilderOrigin, BuilderFeat, BuilderSpell,
  Character, AttributeKey, CharacterAttributes,
} from '@/lib/characterTypes';

// ─── Constants ───────────────────────────────────────────────────────────────

const ALL_VITALS = ['Vigor', 'Intuition', 'Talent', 'Awareness', 'Lore', 'Social'];

const STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'Profession' },
  { id: 3, label: 'Origin' },
  { id: 4, label: 'Path' },
  { id: 5, label: 'Attributes' },
  { id: 6, label: 'Proficiencies' },
  { id: 7, label: 'Feats' },
  { id: 8, label: 'Spells' },
  { id: 9, label: 'Finish' },
];

// ─── Draft type ───────────────────────────────────────────────────────────────

interface Draft {
  name: string;
  tier: number;
  professionId: string;
  professionName: string;
  originId: string;
  originName: string;
  vocationId: string;
  vocationName: string;
  vocationAttributeBonus: { attribute: AttributeKey; value: number };
  pathChoice: string;
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
  name: '', tier: 1,
  professionId: '', professionName: '',
  originId: '', originName: '', vocationId: '', vocationName: '',
  vocationAttributeBonus: { attribute: 'body', value: 1 },
  pathChoice: '',
  baseAttributes: { body: 0, mind: 0, will: 0 },
  vitalsProficiencies: [],
  spellcastingModifier: null,
  selectedFeatIds: [],
  knownSpellIds: [],
  ambition: '', inventoryNotes: '', currency: '', notes: '',
};

// ─── Shared UI primitives ────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>
      {children}
    </div>
  );
}

function SelectCard({
  selected, onClick, children, accent,
}: { selected: boolean; onClick: () => void; children: React.ReactNode; accent?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '0.875rem 1rem', borderRadius: '0.5rem', cursor: 'pointer',
        border: `2px solid ${selected ? (accent ? 'var(--accent)' : 'var(--primary)') : 'var(--border)'}`,
        backgroundColor: selected ? (accent ? 'var(--accent-light)' : 'var(--primary-light)') : 'var(--bg-card)',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </div>
  );
}

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0.625rem 0.5rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.375rem' }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--primary)' }}>{value}</div>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>{label}</div>
      {sub && <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{sub}</div>}
    </div>
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
  const totalAttributes = {
    body: draft.baseAttributes.body + (draft.vocationAttributeBonus.attribute === 'body' ? draft.vocationAttributeBonus.value : 0),
    mind: draft.baseAttributes.mind + (draft.vocationAttributeBonus.attribute === 'mind' ? draft.vocationAttributeBonus.value : 0),
    will: draft.baseAttributes.will + (draft.vocationAttributeBonus.attribute === 'will' ? draft.vocationAttributeBonus.value : 0),
  };

  const isCaster = selectedProf && selectedProf.casterType !== null;
  const totalBasePoints = draft.baseAttributes.body + draft.baseAttributes.mind + draft.baseAttributes.will;

  // Feats relevant to this character
  const myProfFeats = professionFeats.filter((f) => f.ownerId === draft.professionId);
  const myOriginFeats = originFeats.filter((f) => f.ownerId === draft.originId);

  // Spells filtered by profession source
  const mySpells = useMemo(() => {
    if (!selectedProf?.casterSource) return [];
    return spells.filter((s) =>
      s.sources.includes(selectedProf.casterSource!) || s.sources.length === 0
    );
  }, [spells, selectedProf]);

  // ─── Navigation ──────────────────────────────────────────────────────────

  function canAdvance(): boolean {
    if (step === 1) return draft.name.trim().length > 0;
    if (step === 2) return !!draft.professionId;
    if (step === 3) return !!draft.originId && !!draft.vocationId;
    if (step === 4) return !!draft.pathChoice;
    if (step === 5) return totalBasePoints === 4;
    if (step === 6) return draft.vitalsProficiencies.length === (selectedProf?.vitalsChoiceCount ?? 0);
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
    const charData: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> = {
      ...draft,
      currentVitality: selectedProf ? calcStartingVitality(selectedProf, totalAttributes) : 10,
      maxVitality: null,
      currentWounds: 0,
      renown: 0,
      featsPurchased: draft.selectedFeatIds.length,
    };
    const saved = saveCharacter(charData);
    router.push(`/characters/${saved.id}`);
  }

  // ─── Step renders ─────────────────────────────────────────────────────────

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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.5rem' }}>
            {[1, 2, 3, 4, 5].map((t) => (
              <SelectCard key={t} selected={draft.tier === t} onClick={() => update({ tier: t })}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', color: draft.tier === t ? 'var(--primary)' : 'var(--text)' }}>{t}</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>Tier</div>
                </div>
              </SelectCard>
            ))}
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            Tier reflects your power level. New adventurers start at Tier 1.
          </p>
        </div>
      </div>
    );
  }

  function renderStep2() {
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
          {professions.map((p) => (
            <SelectCard key={p.id} selected={draft.professionId === p.id} onClick={() => update({ professionId: p.id, professionName: p.name, pathChoice: '', vitalsProficiencies: [] })}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.95rem', color: draft.professionId === p.id ? 'var(--primary)' : 'var(--text)', marginBottom: '0.2rem' }}>{p.name}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>{p.role}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '0.5rem' }}>{p.flavor.slice(0, 100)}{p.flavor.length > 100 ? '…' : ''}</div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                  {p.startingVitality} HP
                </span>
                {p.casterType && (
                  <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: '9999px', backgroundColor: 'var(--primary-light)', color: 'var(--primary)', border: '1px solid var(--primary)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                    {p.casterType === 'full' ? 'Full Caster' : p.casterType === 'half' ? 'Half Caster' : 'Limited Caster'}
                  </span>
                )}
              </div>
            </SelectCard>
          ))}
        </div>
      </div>
    );
  }

  function renderStep3() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <SectionLabel>Origin</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
            {origins.map((o) => (
              <SelectCard key={o.id} selected={draft.originId === o.id} onClick={() => update({ originId: o.id, originName: o.name, vocationId: '', vocationName: '', vocationAttributeBonus: { attribute: 'body', value: 1 } })}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', color: draft.originId === o.id ? 'var(--primary)' : 'var(--text)', marginBottom: '0.2rem' }}>{o.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {o.vocations.map((v) => v.name).join(' · ')}
                </div>
              </SelectCard>
            ))}
          </div>
        </div>

        {selectedOrigin && (
          <div>
            <SectionLabel>Vocation</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.625rem' }}>
              {selectedOrigin.vocations.map((v) => (
                <SelectCard
                  key={v.id}
                  selected={draft.vocationId === v.id}
                  onClick={() => update({
                    vocationId: v.id,
                    vocationName: v.name,
                    vocationAttributeBonus: v.attributeBonus,
                  })}
                  accent
                >
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', color: draft.vocationId === v.id ? 'var(--accent)' : 'var(--text)', marginBottom: '0.2rem' }}>{v.name}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>{v.flavor.slice(0, 80)}{v.flavor.length > 80 ? '…' : ''}</div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--accent)' }}>
                    +{v.attributeBonus.value} {v.attributeBonus.attribute.charAt(0).toUpperCase() + v.attributeBonus.attribute.slice(1)}
                  </span>
                </SelectCard>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStep4() {
    if (!selectedProf) return null;
    return (
      <div>
        <SectionLabel>Choose Your Path</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.875rem' }}>
          {selectedProf.pathOptions.map((path) => (
            <SelectCard key={path} selected={draft.pathChoice === path} onClick={() => update({ pathChoice: path })}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: draft.pathChoice === path ? 'var(--primary)' : 'var(--text)', marginBottom: '0.3rem' }}>
                Path of the {path}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Specialized path for {draft.professionName} adventurers
              </div>
            </SelectCard>
          ))}
        </div>
      </div>
    );
  }

  function renderStep5() {
    const attrs: AttributeKey[] = ['body', 'mind', 'will'];
    const remaining = 4 - totalBasePoints;

    function adjust(attr: AttributeKey, delta: number) {
      const current = draft.baseAttributes[attr];
      const newVal = current + delta;
      if (newVal < 0) return;
      if (newVal > 3) return; // max +3
      if (delta > 0 && remaining <= 0) return;
      update({ baseAttributes: { ...draft.baseAttributes, [attr]: newVal } });
    }

    const derived = selectedProf ? {
      startingVitality: calcStartingVitality(selectedProf, totalAttributes),
      bodyDef: calcBodyDefense(totalAttributes),
      mindDef: calcMindDefense(totalAttributes),
      willDef: calcWillDefense(totalAttributes),
      wounds: calcMaxWounds(totalAttributes, draft.tier),
      carry: calcCarryWeight(totalAttributes, draft.tier),
    } : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '0.5rem', fontSize: '0.85rem', color: 'var(--text)' }}>
          Distribute <strong>4 points</strong> among Body, Mind, and Will. Max +3 in any one attribute.
          {draft.vocationAttributeBonus.value > 0 && (
            <> Your <strong>{draft.vocationName}</strong> vocation adds <strong>+{draft.vocationAttributeBonus.value} {draft.vocationAttributeBonus.attribute.charAt(0).toUpperCase() + draft.vocationAttributeBonus.attribute.slice(1)}</strong> automatically.</>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {attrs.map((attr) => {
            const base = draft.baseAttributes[attr];
            const total = totalAttributes[attr];
            const isVocBonus = draft.vocationAttributeBonus.attribute === attr;
            return (
              <div key={attr} style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  {attr.charAt(0).toUpperCase() + attr.slice(1)}
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--primary)', marginBottom: '0.5rem' }}>
                  {total >= 0 ? `+${total}` : total}
                </div>
                {isVocBonus && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--accent)', fontWeight: 600, fontFamily: 'var(--font-heading)', marginBottom: '0.5rem' }}>
                    +{draft.vocationAttributeBonus.value} from {draft.vocationName}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                  <button onClick={() => adjust(attr, -1)} disabled={base <= 0} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, minWidth: '20px', textAlign: 'center' }}>{base >= 0 ? `+${base}` : base}</span>
                  <button onClick={() => adjust(attr, 1)} disabled={base >= 3 || remaining <= 0} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1.5px solid var(--border)', backgroundColor: 'var(--bg-card)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
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
        {selectedProf?.casterType && selectedProf.casterModifierOptions.length > 1 && (
          <div>
            <SectionLabel>Spellcasting Modifier</SectionLabel>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Your profession allows either attribute as your spellcasting modifier.
            </p>
            <div style={{ display: 'flex', gap: '0.625rem' }}>
              {selectedProf.casterModifierOptions.map((attr) => (
                <SelectCard key={attr} selected={draft.spellcastingModifier === attr} onClick={() => update({ spellcastingModifier: attr })}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', color: draft.spellcastingModifier === attr ? 'var(--primary)' : 'var(--text)' }}>
                    {attr.charAt(0).toUpperCase() + attr.slice(1)} ({totalAttributes[attr] >= 0 ? `+${totalAttributes[attr]}` : totalAttributes[attr]})
                  </span>
                </SelectCard>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStep6() {
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
        {/* V.I.T.A.L.S. */}
        <div>
          <SectionLabel>V.I.T.A.L.S. Skills</SectionLabel>
          {vitalsChoiceCount > 0 ? (
            <>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                Choose <strong>{vitalsChoiceCount}</strong> proficient skill{vitalsChoiceCount > 1 ? 's' : ''} from: {vitalsOptions.join(', ')}.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
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
                        color: disabled && !selected ? 'var(--text-muted)' : 'var(--text)',
                        fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.875rem',
                        opacity: disabled ? 0.5 : 1, textAlign: 'left',
                      }}
                    >
                      {selected && '✓ '}{skill}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No V.I.T.A.L.S. skill proficiencies from your profession.</p>
          )}
        </div>

        {/* Armaments */}
        <div>
          <SectionLabel>Armaments Proficiency</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {selectedProf.armaments.map((a) => (
              <span key={a} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', color: 'var(--text)' }}>{a}</span>
            ))}
          </div>
        </div>

        {/* Protection */}
        <div>
          <SectionLabel>Protection Proficiency</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {selectedProf.protection.map((p) => (
              <span key={p} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', color: 'var(--text)' }}>{p}</span>
            ))}
          </div>
        </div>

        {/* Tool Kits */}
        {selectedProf.toolKits.filter((t) => t !== '-').length > 0 && (
          <div>
            <SectionLabel>Tool Kit Proficiency</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {selectedProf.toolKits.filter((t) => t !== '-').map((t) => (
                <span key={t} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', color: 'var(--text)' }}>{t}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderStep7() {
    const allFeats = [...myProfFeats, ...myOriginFeats];
    if (allFeats.length === 0) {
      return <p style={{ color: 'var(--text-muted)' }}>No feats available for your selections.</p>;
    }

    function toggleFeat(id: string) {
      const current = draft.selectedFeatIds;
      update({
        selectedFeatIds: current.includes(id)
          ? current.filter((f) => f !== id)
          : [...current, id],
      });
    }

    function renderFeatGroup(feats: BuilderFeat[], title: string) {
      const byTier: Record<number, BuilderFeat[]> = {};
      feats.forEach((f) => {
        const t = f.tier ?? 1;
        if (!byTier[t]) byTier[t] = [];
        byTier[t].push(f);
      });
      return (
        <div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.75rem', paddingBottom: '0.375rem', borderBottom: '2px solid var(--primary)', display: 'inline-block' }}>{title}</h3>
          {Object.keys(byTier).map(Number).sort().map((tier) => (
            <div key={tier} style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.4rem' }}>Tier {tier}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {byTier[tier].map((feat) => {
                  const selected = draft.selectedFeatIds.includes(feat.id);
                  return (
                    <label
                      key={feat.id}
                      style={{
                        display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                        padding: '0.625rem 0.875rem', borderRadius: '0.375rem', cursor: 'pointer',
                        border: `1.5px solid ${selected ? 'var(--primary)' : 'var(--border)'}`,
                        backgroundColor: selected ? 'var(--primary-light)' : 'var(--bg-card)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleFeat(feat.id)}
                        style={{ marginTop: '0.15rem', accentColor: 'var(--primary)', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', marginBottom: '0.1rem' }}>{feat.name}</div>
                        {feat.required && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Requires: {feat.required}</div>}
                        {feat.pathInvestment && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Investment: {feat.pathInvestment}</div>}
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
        <div style={{ padding: '0.625rem 1rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          {draft.selectedFeatIds.length} feat{draft.selectedFeatIds.length !== 1 ? 's' : ''} selected. Check the feats your character has earned.
        </div>
        {myProfFeats.length > 0 && renderFeatGroup(myProfFeats, `${draft.professionName} Feats`)}
        {myOriginFeats.length > 0 && renderFeatGroup(myOriginFeats, `${draft.originName} Feats`)}
      </div>
    );
  }

  function renderStep8() {
    if (!isCaster) {
      return (
        <div style={{ padding: '1.5rem', textAlign: 'center', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.75rem' }}>
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>
            The <strong>{draft.professionName}</strong> is not a spellcaster. Skip this step.
          </p>
        </div>
      );
    }

    function toggleSpell(id: string) {
      const current = draft.knownSpellIds;
      update({
        knownSpellIds: current.includes(id)
          ? current.filter((s) => s !== id)
          : [...current, id],
      });
    }

    const cantrips = mySpells.filter((s) => s.isCantrip);
    const tieredSpells = mySpells.filter((s) => !s.isCantrip && s.tier <= draft.tier + 1);

    const spellsByTier: Record<number, BuilderSpell[]> = {};
    tieredSpells.forEach((s) => {
      if (!spellsByTier[s.tier]) spellsByTier[s.tier] = [];
      spellsByTier[s.tier].push(s);
    });

    const modKey = (selectedProf!.casterModifierOptions.length === 1 ? selectedProf!.casterModifierOptions[0] : draft.spellcastingModifier) ?? 'mind';
    const modVal = totalAttributes[modKey];
    const reservoir = calcReservoir(selectedProf!.casterType, draft.tier, modVal);
    const spellDC = calcSpellDC(draft.tier, modVal);

    function renderSpellOption(spell: BuilderSpell) {
      const sel = draft.knownSpellIds.includes(spell.id);
      return (
        <label key={spell.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', padding: '0.625rem 0.875rem', borderRadius: '0.375rem', cursor: 'pointer', border: `1.5px solid ${sel ? 'var(--primary)' : 'var(--border)'}`, backgroundColor: sel ? 'var(--primary-light)' : 'var(--bg-card)' }}>
          <input type="checkbox" checked={sel} onChange={() => toggleSpell(spell.id)} style={{ marginTop: '0.15rem', accentColor: 'var(--primary)', flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>{spell.name}</div>
            {(spell.range || spell.duration) && (
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {spell.range && `Range: ${spell.range}`}{spell.range && spell.duration && ' · '}{spell.duration && `Duration: ${spell.duration}`}
              </div>
            )}
          </div>
        </label>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          <StatBox label="Caster Type" value={selectedProf!.casterType === 'full' ? 'Full' : selectedProf!.casterType === 'half' ? 'Half' : 'Limited'} />
          <StatBox label="Reservoir" value={reservoir ?? '—'} sub={`${selectedProf!.casterSource ?? ''}`} />
          <StatBox label="Spell DC" value={spellDC} />
        </div>

        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '0.625rem 1rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
          {draft.knownSpellIds.length} spell{draft.knownSpellIds.length !== 1 ? 's' : ''} known. Select all the spells your character currently knows.
        </div>

        {cantrips.length > 0 && (
          <div>
            <SectionLabel>Cantrips</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {cantrips.map(renderSpellOption)}
            </div>
          </div>
        )}

        {Object.keys(spellsByTier).map(Number).sort().map((tier) => (
          <div key={tier}>
            <SectionLabel>Tier {tier} Spells</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {spellsByTier[tier].map(renderSpellOption)}
            </div>
          </div>
        ))}

        {cantrips.length === 0 && Object.keys(spellsByTier).length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No spells found for {selectedProf!.casterSource} source.</p>
        )}
      </div>
    );
  }

  function renderStep9() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <SectionLabel>Ambition</SectionLabel>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.375rem' }}>What drives your character? A short goal or motivation.</p>
          <input
            type="text"
            value={draft.ambition}
            onChange={(e) => update({ ambition: e.target.value })}
            placeholder="e.g. Avenge my fallen mentor…"
            style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.9rem', fontFamily: 'var(--font-body)', border: '1.5px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none' }}
          />
        </div>

        <div>
          <SectionLabel>Starting Currency</SectionLabel>
          <input
            type="text"
            value={draft.currency}
            onChange={(e) => update({ currency: e.target.value })}
            placeholder="e.g. 15 gold, 3 silver…"
            style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.9rem', fontFamily: 'var(--font-body)', border: '1.5px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none' }}
          />
        </div>

        <div>
          <SectionLabel>Starting Inventory</SectionLabel>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 0.375rem' }}>List your starting equipment from your profession pack.</p>
          <textarea
            value={draft.inventoryNotes}
            onChange={(e) => update({ inventoryNotes: e.target.value })}
            placeholder="Weapons, armor, kit items, supplies…"
            rows={4}
            style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontFamily: 'var(--font-body)', border: '1.5px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
          />
        </div>

        <div>
          <SectionLabel>Character Notes</SectionLabel>
          <textarea
            value={draft.notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Backstory, appearance, personality…"
            rows={4}
            style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontFamily: 'var(--font-body)', border: '1.5px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
          />
        </div>

        {/* Summary */}
        <div style={{ padding: '1rem 1.25rem', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', borderRadius: '0.625rem' }}>
          <SectionLabel>Summary</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.875rem' }}>
            {[
              ['Name', draft.name],
              ['Tier', String(draft.tier)],
              ['Profession', `${draft.professionName}${draft.pathChoice ? ` (${draft.pathChoice})` : ''}`],
              ['Origin', `${draft.originName}${draft.vocationName ? ` — ${draft.vocationName}` : ''}`],
              ['Attributes', `Body ${totalAttributes.body >= 0 ? '+' : ''}${totalAttributes.body} · Mind ${totalAttributes.mind >= 0 ? '+' : ''}${totalAttributes.mind} · Will ${totalAttributes.will >= 0 ? '+' : ''}${totalAttributes.will}`],
              ['Feats', `${draft.selectedFeatIds.length} selected`],
              ['Spells', isCaster ? `${draft.knownSpellIds.length} known` : 'Non-caster'],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', gap: '0.75rem' }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, minWidth: '90px', color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                <span style={{ color: 'var(--text)' }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const stepContent: Record<number, () => React.ReactNode> = {
    1: renderStep1, 2: renderStep2, 3: renderStep3, 4: renderStep4,
    5: renderStep5, 6: renderStep6, 7: renderStep7, 8: renderStep8, 9: renderStep9,
  };

  const stepTitles: Record<number, string> = {
    1: 'Name Your Character', 2: 'Choose a Profession', 3: 'Choose an Origin',
    4: 'Choose Your Path', 5: 'Assign Attributes', 6: 'V.I.T.A.L.S. & Proficiencies',
    7: 'Select Feats', 8: 'Known Spells', 9: 'Final Details',
  };

  const isLast = step === STEPS.length;

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Step indicator */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {STEPS.map((s) => (
            <button
              key={s.id}
              onClick={() => s.id < step && setStep(s.id)}
              style={{
                flex: '1 1 0', minWidth: '32px', height: '4px', borderRadius: '2px', border: 'none',
                backgroundColor: s.id < step ? 'var(--primary)' : s.id === step ? 'var(--accent)' : 'var(--border)',
                cursor: s.id < step ? 'pointer' : 'default',
                transition: 'background-color 0.2s',
              }}
              aria-label={`Step ${s.id}: ${s.label}`}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text)', margin: 0 }}>
            {stepTitles[step]}
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>
            Step {step} of {STEPS.length}
          </span>
        </div>
      </div>

      {/* Step content */}
      <div style={{ marginBottom: '2rem', minHeight: '200px' }}>
        {stepContent[step]?.()}
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={handleBack}
          disabled={step === 1}
          style={{
            padding: '0.625rem 1.25rem', border: '1.5px solid var(--border)',
            borderRadius: '0.5rem', cursor: step === 1 ? 'not-allowed' : 'pointer',
            backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)',
            fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.875rem',
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
            disabled={!draft.name.trim()}
            style={{
              padding: '0.625rem 1.75rem', border: 'none', borderRadius: '0.5rem',
              cursor: draft.name.trim() ? 'pointer' : 'not-allowed',
              backgroundColor: draft.name.trim() ? 'var(--primary)' : 'var(--border)',
              color: draft.name.trim() ? '#fff' : 'var(--text-muted)',
              fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem',
            }}
          >
            Save Character →
          </button>
        )}
      </div>
    </div>
  );
}

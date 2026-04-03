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
} from '@/lib/characterTypes';

interface Props {
  id: string;
  professions: BuilderProfession[];
  origins: BuilderOrigin[];
  professionFeats: BuilderFeat[];
  originFeats: BuilderFeat[];
  spells: BuilderSpell[];
}

// ─── Inline edit field ────────────────────────────────────────────────────────
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

function Section({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} style={{ marginBottom: '2rem' }}>
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
  const [editingInventory, setEditingInventory] = useState(false);
  const [notesVal, setNotesVal] = useState('');
  const [inventoryVal, setInventoryVal] = useState('');
  const [maxVitalityInput, setMaxVitalityInput] = useState('');
  const [editingMaxVitality, setEditingMaxVitality] = useState(false);

  useEffect(() => {
    const loaded = getCharacter(id);
    setChar(loaded);
    if (loaded) {
      setNotesVal(loaded.notes ?? '');
      setInventoryVal(loaded.inventoryNotes ?? '');
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

  const prof = professions.find((p) => p.id === char.professionId) ?? null;
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

  const myFeats = [
    ...professionFeats.filter((f) => char.selectedFeatIds.includes(f.id)),
    ...originFeats.filter((f) => char.selectedFeatIds.includes(f.id)),
  ];
  const mySpells = spells.filter((s) => char.knownSpellIds.includes(s.id));

  function persist(updates: Partial<Character>) {
    const updated = updateCharacter(id, updates);
    if (updated) setChar(updated);
  }

  function handleDelete() {
    if (!char) return;
    if (!confirm(`Delete "${char.name}"? This cannot be undone.`)) return;
    deleteCharacter(id);
    router.push('/characters');
  }

  const attrLabel = (key: string) => key.charAt(0).toUpperCase() + key.slice(1);
  const fmtAttr = (v: number) => v >= 0 ? `+${v}` : String(v);

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
          {[
            char.professionName && `${char.professionName}${char.pathChoice ? ` — ${char.pathChoice}` : ''}`,
            char.originName && `${char.originName}${char.vocationName ? ` (${char.vocationName})` : ''}`,
          ].filter(Boolean).join(' · ')}
        </div>
        {char.ambition && (
          <div style={{ marginTop: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Ambition: {char.ambition}
          </div>
        )}
        <div style={{ marginTop: '0.625rem' }}>
          <Link href="/characters" style={{ fontSize: '0.78rem', color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>← All Characters</Link>
        </div>
      </div>

      {/* Combat / Play Tracking */}
      <Section title="Combat Stats">
        {/* Vitality row */}
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
                <input
                  type="number"
                  value={maxVitalityInput}
                  onChange={(e) => setMaxVitalityInput(e.target.value)}
                  placeholder={prof ? String(calcStartingVitality(prof, attrs)) : '—'}
                  style={{ width: '60px', padding: '0.2rem 0.4rem', fontSize: '0.9rem', border: '1px solid var(--border)', borderRadius: '0.25rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', textAlign: 'center' }}
                />
                <button
                  onClick={() => { const n = parseInt(maxVitalityInput); if (!isNaN(n)) { persist({ maxVitality: n }); setEditingMaxVitality(false); } }}
                  style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem', border: 'none', borderRadius: '0.25rem', backgroundColor: 'var(--primary)', color: '#fff', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600 }}
                >Set</button>
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

        {/* Wounds + Renown */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
          <EditableNumber label={`Wounds / ${maxWounds}`} value={char.currentWounds ?? 0} min={0} max={maxWounds} onChange={(v) => persist({ currentWounds: v })} />
          <EditableNumber label="Renown" value={char.renown ?? 0} min={0} onChange={(v) => persist({ renown: v })} />
        </div>

        {/* Defense row */}
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
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>{attrLabel(attr)}</div>
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
          {/* V.I.T.A.L.S. */}
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

          {/* Armaments */}
          {prof && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.375rem' }}>Armaments</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {prof.armaments.map((a) => <span key={a} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', color: 'var(--text)' }}>{a}</span>)}
              </div>
            </div>
          )}

          {/* Protection */}
          {prof && (
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.375rem' }}>Protection</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {prof.protection.map((p) => <span key={p} style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)', color: 'var(--text)' }}>{p}</span>)}
              </div>
            </div>
          )}

          {/* Tool Kits */}
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

      {/* Feats */}
      {myFeats.length > 0 && (
        <Section title={`Feats (${myFeats.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {myFeats.map((feat) => (
              <div key={feat.id} style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>{feat.name}</span>
                  {feat.tier && <span style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-heading)', padding: '0.1rem 0.4rem', borderRadius: '9999px', backgroundColor: 'var(--bg-nav)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>Tier {feat.tier}</span>}
                  {feat.activationRaw && feat.activationRaw !== '-' && <span style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-heading)', padding: '0.1rem 0.4rem', borderRadius: '9999px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', border: '1px solid #FCD34D' }}>{feat.activationRaw}</span>}
                </div>
                {feat.required && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Requires: {feat.required}</div>}
                {feat.pathInvestment && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Investment: {feat.pathInvestment}</div>}
                <MarkdownContent content={feat.descriptionMarkdown} />
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Known Spells */}
      {mySpells.length > 0 && (
        <Section title={`Known Spells (${mySpells.length})`}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {mySpells.map((spell) => (
              <div key={spell.id} style={{ padding: '0.875rem 1rem', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '0.5rem' }}>
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
            ))}
          </div>
        </Section>
      )}

      {/* Inventory */}
      <Section title="Inventory">
        <div style={{ marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)', marginBottom: '0.3rem' }}>Currency</div>
          <input
            type="text"
            defaultValue={char.currency}
            onBlur={(e) => persist({ currency: e.target.value })}
            placeholder="—"
            style={{ padding: '0.4rem 0.625rem', fontSize: '0.875rem', fontFamily: 'var(--font-body)', border: '1px solid var(--border)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none', width: '200px' }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-heading)' }}>Items</div>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Carry weight: {carryWeight} slots</span>
        </div>
        {editingInventory ? (
          <div>
            <textarea
              value={inventoryVal}
              onChange={(e) => setInventoryVal(e.target.value)}
              rows={6}
              style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontFamily: 'var(--font-body)', border: '1.5px solid var(--primary)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
            />
            <button onClick={() => { persist({ inventoryNotes: inventoryVal }); setEditingInventory(false); }} style={{ marginTop: '0.5rem', padding: '0.375rem 0.875rem', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.8rem' }}>Save</button>
          </div>
        ) : (
          <div
            onClick={() => setEditingInventory(true)}
            style={{ minHeight: '80px', padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: '0.375rem', cursor: 'text', fontSize: '0.875rem', color: char.inventoryNotes ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
          >
            {char.inventoryNotes || 'Click to add inventory…'}
          </div>
        )}
      </Section>

      {/* Notes */}
      <Section title="Notes">
        {editingNotes ? (
          <div>
            <textarea
              value={notesVal}
              onChange={(e) => setNotesVal(e.target.value)}
              rows={6}
              style={{ width: '100%', padding: '0.5rem 0.75rem', fontSize: '0.875rem', fontFamily: 'var(--font-body)', border: '1.5px solid var(--primary)', borderRadius: '0.375rem', backgroundColor: 'var(--bg-card)', color: 'var(--text)', outline: 'none', resize: 'vertical' }}
            />
            <button onClick={() => { persist({ notes: notesVal }); setEditingNotes(false); }} style={{ marginTop: '0.5rem', padding: '0.375rem 0.875rem', backgroundColor: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.8rem' }}>Save</button>
          </div>
        ) : (
          <div
            onClick={() => setEditingNotes(true)}
            style={{ minHeight: '80px', padding: '0.625rem 0.875rem', backgroundColor: 'var(--bg-card)', border: '1px dashed var(--border)', borderRadius: '0.375rem', cursor: 'text', fontSize: '0.875rem', color: char.notes ? 'var(--text)' : 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
          >
            {char.notes || 'Click to add notes…'}
          </div>
        )}
      </Section>
    </div>
  );
}

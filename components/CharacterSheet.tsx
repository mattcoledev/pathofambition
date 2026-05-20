"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import MarkdownContent from "./MarkdownContent";
import {
  getCharacter,
  updateCharacter,
  deleteCharacter,
} from "@/lib/characterStorage";
import {
  getTotalAttributes,
  calcStartingVitality,
  calcFeatVitalityBonus,
  calcBodyDefense,
  calcMindDefense,
  calcWillDefense,
  calcMaxWounds,
  calcCarryWeight,
  calcReservoir,
  calcSpellDC,
  calcAmbition,
  calcArmorDefense,
  calcTierFromFeatsPurchased,
  calcSpellcastingThreshold,
  calcSpellcastingTier,
  calcKnownSpells,
  calcPreparedSpells,
  calcSkillPool,
  calcSkillAttrValue,
  calcBaseDiceFromAttr,
  BASE_SKILL_DIE_FACES,
  calcFullMaxVitality,
  computeExpertiseBumps,
  clearFeatChoices,
  VITALS_SET,
} from "@/lib/characterCalc";
import type { SkillPoolInfo, ProficiencyRank } from "@/lib/characterCalc";
import type {
  Character,
  BuilderProfession,
  BuilderOrigin,
  BuilderFeat,
  BuilderSpell,
  InventoryItem,
  InventoryCategory,
  InventorySlot,
  ChoiceFeature,
  AttributeKey,
} from "@/lib/characterTypes";
import type { CatalogItem } from "@/lib/builderData";
import {
  getFeatStatus,
  parseRequired,
  FEAT_COST_BY_TIER,
} from "@/lib/featLogic";

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

type TabId = "feats" | "inventory" | "spellcasting" | "notes";

const INVENTORY_CATEGORIES: InventoryCategory[] = [
  "Weapon",
  "Armor",
  "Shield",
  "Kit",
  "Consumable",
  "Misc",
];

// ─── Helper components ────────────────────────────────────────────────────────

function EditableNumber({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "0.625rem 0.5rem",
        backgroundColor: "var(--bg-nav)",
        border: "1px solid var(--border)",
        borderRadius: "0.5rem",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 700,
          fontSize: "0.6rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          marginBottom: "0.375rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        <button
          onClick={() => onChange(Math.max(min ?? 0, value - 1))}
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-card)",
            cursor: "pointer",
            fontWeight: 700,
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          −
        </button>
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: "1.3rem",
            color: "var(--primary)",
            minWidth: "32px",
            textAlign: "center",
          }}
        >
          {value}
        </span>
        <button
          onClick={() =>
            onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)
          }
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-card)",
            cursor: "pointer",
            fontWeight: 700,
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}

function DeltaNumber({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  const [delta, setDelta] = React.useState("");
  function applyDelta() {
    const n = parseInt(delta);
    if (isNaN(n)) return;
    const next = value + n;
    const clamped = Math.max(
      min ?? -Infinity,
      max !== undefined ? Math.min(max, next) : next,
    );
    onChange(clamped);
    setDelta("");
  }
  return (
    <div
      style={{
        textAlign: "center",
        padding: "0.625rem 0.5rem",
        backgroundColor: "var(--bg-nav)",
        border: "1px solid var(--border)",
        borderRadius: "0.5rem",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 700,
          fontSize: "0.6rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          marginBottom: "0.375rem",
        }}
      >
        {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        <button
          onClick={() => onChange(Math.max(min ?? 0, value - 1))}
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-card)",
            cursor: "pointer",
            fontWeight: 700,
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          −
        </button>
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            fontSize: "1.3rem",
            color: "var(--primary)",
            minWidth: "32px",
            textAlign: "center",
          }}
        >
          {value}
        </span>
        <button
          onClick={() =>
            onChange(max !== undefined ? Math.min(max, value + 1) : value + 1)
          }
          style={{
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            border: "1px solid var(--border)",
            backgroundColor: "var(--bg-card)",
            cursor: "pointer",
            fontWeight: 700,
            color: "var(--text-muted)",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          +
        </button>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.3rem",
          marginTop: "0.35rem",
        }}
      >
        <input
          type="text"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") applyDelta();
          }}
          placeholder="±"
          style={{
            width: "48px",
            padding: "0.15rem 0.25rem",
            fontSize: "0.78rem",
            fontFamily: "var(--font-heading)",
            border: "1px solid var(--border)",
            borderRadius: "0.25rem",
            backgroundColor: "var(--bg-card)",
            color: "var(--text)",
            textAlign: "center",
          }}
        />
        <button
          onClick={applyDelta}
          style={{
            padding: "0.15rem 0.4rem",
            fontSize: "0.68rem",
            fontFamily: "var(--font-heading)",
            fontWeight: 700,
            border: "none",
            borderRadius: "0.25rem",
            backgroundColor: "var(--primary)",
            color: "var(--text-on-primary)",
            cursor: "pointer",
          }}
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "0.625rem 0.5rem",
        backgroundColor: "var(--bg-nav)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-heading)",
          fontWeight: 700,
          fontSize: "1.15rem",
          color: "var(--primary)",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "0.6rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--text-muted)",
          marginTop: "2px",
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "0.6rem",
            color: "var(--text-muted)",
            marginTop: "1px",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        overflow: "hidden",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          padding: "0.625rem 1rem",
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg-nav)",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-heading)",
            fontStyle: "italic",
            fontWeight: 700,
            fontSize: "0.7rem",
            letterSpacing: "0.12em",
            color: "var(--text-muted)",
            margin: 0,
            textTransform: "uppercase",
          }}
        >
          {title}
        </h2>
      </div>
      <div style={{ padding: "0.875rem 1rem" }}>{children}</div>
    </section>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CharacterSheetPage({
  id,
  professions,
  origins,
  professionFeats,
  originFeats,
  spells,
  catalog,
  choiceFeatures,
}: Props) {
  const router = useRouter();
  const [char, setChar] = useState<Character | null>(null);
  const [mounted, setMounted] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState("");

  const [activeTab, setActiveTab] = useState<TabId>("feats");

  // Feat expand state (Issue 4 — collapsed by default)
  const [expandedFeats, setExpandedFeats] = useState<Set<string>>(new Set());

  // Inventory add form
  const [addingItem, setAddingItem] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogSelected, setCatalogSelected] = useState<CatalogItem | null>(
    null,
  );
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<InventoryCategory>("Misc");
  const [newQty, setNewQty] = useState(1);
  const [newWeight, setNewWeight] = useState(0);
  const [newNotes, setNewNotes] = useState("");
  const [newSlot, setNewSlot] = useState<InventorySlot>(null);
  const [newArmorBonus, setNewArmorBonus] = useState(0);
  const [newArmorCategory, setNewArmorCategory] = useState<
    "Light" | "Medium" | "Heavy" | null
  >(null);
  const [newModifierStat, setNewModifierStat] = useState<
    "body" | "mind" | "will" | null
  >(null);
  const [newIsRanged, setNewIsRanged] = useState(false);
  const [newDamageDiceCount, setNewDamageDiceCount] = useState(0);
  const [newDamageDiceSize, setNewDamageDiceSize] = useState(6);
  const [newDamageTypeTags, setNewDamageTypeTags] = useState<string[]>([]);
  const [newArmamentTags, setNewArmamentTags] = useState<string[]>([]);
  const [newEquipSlots, setNewEquipSlots] = useState<string[]>([]);
  const [newMasterworkBonus, setNewMasterworkBonus] = useState(0);

  // Item editing
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<InventoryItem>>({});

  // Equipment slot picker
  const [pickingSlot, setPickingSlot] = useState<InventorySlot>(null);

  // Item notes popover
  const [notePopoverItemId, setNotePopoverItemId] = useState<string | null>(
    null,
  );

  // Traits editing input
  const [traitInputVal, setTraitInputVal] = useState("");

  const filteredCatalog = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    if (!q) return catalog;
    return catalog.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
    );
  }, [catalogSearch, catalog]);

  // Spell amp state (temporary, not persisted)
  const [activeAmps, setActiveAmps] = useState<Record<string, Set<number>>>({});
  // Spell feed / manager state
  const [expandedSpells, setExpandedSpells] = useState<Set<string>>(new Set());
  const [showSpellManager, setShowSpellManager] = useState(false);
  const [spellManagerSearch, setSpellManagerSearch] = useState("");

  // Feat shop state
  const [showFeatShop, setShowFeatShop] = useState(false);
  const [shopExpandedIds, setShopExpandedIds] = useState<Set<string>>(
    new Set(),
  );
  const [shopChoiceQueue, setShopChoiceQueue] = useState<ChoiceFeature[]>([]);
  const [shopChoiceIdx, setShopChoiceIdx] = useState(0);
  const [shopCurrentSels, setShopCurrentSels] = useState<string[]>([]);

  // FEATURE-01: Ref sidebar
  const [showRefSidebar, setShowRefSidebar] = useState(false);

  // FEATURE-02: Apply Damage pipeline
  const [damageInput, setDamageInput] = useState("");

  // AMEND-07: Feat swap / choice edit state
  const [swapSourceFeatId, setSwapSourceFeatId] = useState<string | null>(null);
  const [swapSearch, setSwapSearch] = useState("");
  const [swapPendingFeat, setSwapPendingFeat] = useState<BuilderFeat | null>(
    null,
  );
  const [editChoiceFeatId, setEditChoiceFeatId] = useState<string | null>(null);
  const [editChoiceSels, setEditChoiceSels] = useState<string[]>([]);

  useEffect(() => {
    const loaded = getCharacter(id);
    if (loaded) {
      // Backfill armamentTags on weapons missing them — catalog lookup by name (with fuzzy fallback)
      const catalogByName = new Map(
        catalog.map((ci) => [ci.name.toLowerCase(), ci]),
      );
      function findCatalogItem(name: string) {
        const lower = name
          .toLowerCase()
          .replace(/\s*\(.*\)/, "")
          .trim();
        if (catalogByName.has(lower)) return catalogByName.get(lower)!;
        // "Light armor" → "Light", "Medium armor" → "Medium", etc.
        const noArmor = lower.replace(/\s*armor\b/, "").trim();
        if (noArmor && catalogByName.has(noArmor))
          return catalogByName.get(noArmor)!;
        // Handle "X or Y (note)" — try each alternative
        const parts = lower.split(/\s+or\s+/);
        for (const part of parts) {
          const trimmed = part.trim();
          if (catalogByName.has(trimmed)) return catalogByName.get(trimmed)!;
          // Try prefix match (e.g. "two throwing axes" → "throwing axe")
          for (const [key, val] of catalogByName) {
            if (
              trimmed.includes(key) ||
              key.includes(
                trimmed.replace(/^(two|a|an)\s+/, "").replace(/s$/, ""),
              )
            )
              return val;
          }
        }
        return null;
      }
      const updatedInventory = loaded.inventory.map((item) => {
        const needsWeaponBackfill =
          item.category === "Weapon" && (item.armamentTags ?? []).length === 0;
        const needsArmorBackfill =
          (item.category === "Armor" || item.category === "Shield") &&
          item.armorBonus === 0;
        if (!needsWeaponBackfill && !needsArmorBackfill) return item;
        const ci = findCatalogItem(item.name);
        if (!ci) return item;
        const patch: Partial<typeof item> = {};
        if (needsWeaponBackfill) {
          patch.armamentTags = ci.armamentTags;
          patch.damageTypeTags =
            (item.damageTypeTags ?? []).length > 0
              ? item.damageTypeTags
              : ci.damageTypeTags;
          patch.equipSlots =
            (item.equipSlots ?? []).length > 0
              ? item.equipSlots
              : ci.equipSlots;
          patch.isRanged = ci.isRanged;
          patch.damageDiceCount =
            item.damageDiceCount > 0
              ? item.damageDiceCount
              : ci.damageDiceCount;
          patch.damageDiceSize =
            item.damageDiceSize > 0 ? item.damageDiceSize : ci.damageDiceSize;
        }
        if (needsArmorBackfill && ci.armorBonus) {
          patch.armorBonus = ci.armorBonus;
          patch.armorCategory = (ci.armorCategory ?? null) as
            | "Light"
            | "Medium"
            | "Heavy"
            | null;
        }
        return { ...item, ...patch };
      });
      const inventoryChanged = updatedInventory.some(
        (item, i) => item !== loaded.inventory[i],
      );
      const finalChar = inventoryChanged
        ? { ...loaded, inventory: updatedInventory }
        : loaded;
      if (inventoryChanged)
        updateCharacter(loaded.id, { inventory: updatedInventory });
      setChar(finalChar);
      setNotesVal(loaded.notes ?? "");
      // Auto-calculate max vitality if not yet set
      let resolvedMaxVit = loaded.maxVitality;
      if (resolvedMaxVit === null) {
        const loadedProf =
          professions.find((p) => p.id === loaded.professionId) ?? null;
        const loadedAllFeats = [...professionFeats, ...originFeats];
        const loadedAttrs = getTotalAttributes(loaded);
        if (loadedProf) {
          const featBonus = calcFeatVitalityBonus(
            loaded.selectedFeatIds ?? [],
            loadedAllFeats,
            loaded.tier,
          );
          resolvedMaxVit =
            calcStartingVitality(loadedProf, loadedAttrs) + featBonus;
          updateCharacter(loaded.id, { maxVitality: resolvedMaxVit });
        }
      }
    }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Must be before early returns to satisfy rules of hooks
  const armamentProficiencyTags = useMemo(() => {
    if (!char) return [];
    if ((char.armamentProficiencyTags ?? []).length > 0)
      return char.armamentProficiencyTags;
    const charProf =
      professions.find((p) => p.id === char.professionId) ?? null;
    const tags: string[] = [];
    for (const a of charProf?.armaments ?? []) {
      const lower = a.toLowerCase();
      if (lower.includes("finesse")) tags.push("finesse");
      if (lower.includes("martial")) tags.push("martial");
      if (lower.includes("simple")) tags.push("simple");
      if (lower.includes("defensive")) tags.push("defensive");
      if (lower.includes("catalyst")) tags.push("catalyst");
      if (lower.includes("ranged")) tags.push("ranged");
    }
    return [...new Set(tags)];
  }, [char, professions]);

  if (!mounted) return null;
  if (!char) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", marginBottom: "1rem" }}>
          Character not found.
        </p>
        <Link
          href="/characters"
          style={{
            color: "var(--primary)",
            textDecoration: "none",
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
          }}
        >
          ← Back to Characters
        </Link>
      </div>
    );
  }

  const c = char!;
  const prof = professions.find((p) => p.id === c.professionId) ?? null;
  const origin = origins.find((o) => o.id === c.originId) ?? null;
  const vocation = origin?.vocations.find((v) => v.id === c.vocationId) ?? null;
  const attrs = getTotalAttributes(c);

  // Tier: derived from feats purchased from Renown; creation tier is the floor
  const effectiveTier = Math.max(
    c.tier,
    calcTierFromFeatsPurchased(c.featsPurchased ?? 0),
  );

  // Caster: from profession OR any selected feat
  const allFeats = [...professionFeats, ...originFeats];
  const featCaster =
    allFeats.find((f) => c.selectedFeatIds.includes(f.id) && f.casterInfo)
      ?.casterInfo ?? null;
  const casterInfo = prof?.casterType
    ? {
        casterType: prof.casterType,
        casterSource: prof.casterSource ?? "",
        casterModifierOptions: prof.casterModifierOptions,
      }
    : (c.vocationCaster ?? featCaster);
  const isCaster = !!casterInfo;
  // BUG-10: Multi-option casters (Mesmer/Warden/Oathbound/Drifter) auto-resolve to max(Mind, Will)
  const modKey: AttributeKey = (() => {
    if (!casterInfo?.casterModifierOptions?.length)
      return c.spellcastingModifier ?? "mind";
    if (casterInfo.casterModifierOptions.length === 1)
      return casterInfo.casterModifierOptions[0];
    return casterInfo.casterModifierOptions.reduce((best, key) =>
      attrs[key] >= attrs[best] ? key : best,
    );
  })();
  const modVal = attrs[modKey];

  // Spellcasting-specific derived values
  const spellThreshold = calcSpellcastingThreshold(c.featsPurchased ?? 0);
  const spellTier = isCaster
    ? calcSpellcastingTier(casterInfo!.casterType, spellThreshold)
    : 0;
  const knownSpellsMax = isCaster
    ? calcKnownSpells(casterInfo!.casterType, spellThreshold)
    : 0;
  const preparedSpellsMax = isCaster
    ? calcPreparedSpells(modVal, effectiveTier)
    : 0;

  const maxReservoir = isCaster
    ? (calcReservoir(casterInfo!.casterType, effectiveTier, modVal) ?? 0)
    : 0;
  const bodyDef = calcBodyDefense(attrs);
  const mindDef = calcMindDefense(attrs);
  const willDef = calcWillDefense(attrs);
  const maxWounds = calcMaxWounds(attrs, effectiveTier);
  const carryWeight = calcCarryWeight(attrs, effectiveTier);
  const spellDC = isCaster ? calcSpellDC(spellTier, modVal) : null;

  const ambition = calcAmbition(attrs.will, effectiveTier);
  const maxAmbition = c.maxAmbition ?? ambition.max;
  const ambitionDice = c.ambitionDice ?? ambition.dice;

  // BUG-11: Derive max vitality reactively from profession formula + tier + attrs + feats
  const derivedMaxVitality = prof
    ? calcFullMaxVitality(
        prof,
        attrs,
        effectiveTier,
        c.selectedFeatIds ?? [],
        allFeats,
      )
    : (c.maxVitality ?? 0);

  const selectedFeats = [
    ...professionFeats.filter((f) => c.selectedFeatIds.includes(f.id)),
    ...originFeats.filter((f) => c.selectedFeatIds.includes(f.id)),
  ];
  const mySpells = spells
    .filter((s) => c.knownSpellIds.includes(s.id))
    .sort((a, b) => a.tier - b.tier || a.name.localeCompare(b.name));
  const inventory: InventoryItem[] = c.inventory ?? [];
  const totalCarried = inventory.reduce((s, i) => s + i.weight * i.quantity, 0);

  const currentReservoir = c.currentReservoir ?? maxReservoir;
  const currentRespites = c.currentRespites ?? 3;

  // Agile detection: check profession base features, vocation features, and selected feats
  const hasAgile = !!(
    prof?.baseFeatures.some((f) => f.name === "Agile") ||
    vocation?.features.some((f) => f.name === "Agile") ||
    selectedFeats.some((f) => f.name === "Agile")
  );
  // Unarmored Defense: Berserker only
  const hasUnarmoredDefense = !!(
    prof?.baseFeatures.some((f) => f.name === "Unarmored Defense") ||
    c.professionName === "Berserker"
  );

  function persist(updates: Partial<Character>) {
    const updated = updateCharacter(id, updates);
    if (updated) setChar(updated);
  }

  function handleDelete() {
    if (!confirm(`Delete "${c.name}"? This cannot be undone.`)) return;
    deleteCharacter(id);
    router.push("/characters");
  }

  // ─── Rest actions ────────────────────────────────────────────────────────
  function takeRespite() {
    if (currentRespites <= 0) return;
    const vitRestore = Math.max(4, attrs.body * 2);
    const ambRestore = Math.max(4, attrs.will);
    persist({
      currentRespites: currentRespites - 1,
      currentVitality: Math.min(
        derivedMaxVitality,
        (c.currentVitality ?? 0) + vitRestore,
      ),
      currentAmbition: Math.min(
        maxAmbition,
        (c.currentAmbition ?? 0) + ambRestore,
      ),
    });
  }

  function takeLongRest() {
    const vitRestore = Math.max(10, attrs.body * 3);
    const ambRestore = Math.max(10, attrs.will * 2);
    const resRestore = isCaster ? Math.max(9, modVal * 2) : 0;
    persist({
      currentRespites: Math.min(3, currentRespites + 1),
      currentVitality: Math.min(
        derivedMaxVitality,
        (c.currentVitality ?? 0) + vitRestore,
      ),
      currentAmbition: Math.min(
        maxAmbition,
        (c.currentAmbition ?? 0) + ambRestore,
      ),
      currentReservoir: Math.min(maxReservoir, currentReservoir + resRestore),
    });
  }

  function takeFullRest() {
    const resRestore = isCaster ? Math.max(18, modVal * 3) : 0;
    persist({
      currentRespites: 3,
      currentVitality: derivedMaxVitality,
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
    setNewNotes("");
    setNewArmorBonus(item.armorBonus ?? 0);
    setNewArmorCategory(
      (item.armorCategory as "Light" | "Medium" | "Heavy" | null) ?? null,
    );
    setNewDamageDiceCount(item.damageDiceCount ?? 0);
    setNewDamageDiceSize(item.damageDiceSize ?? 6);
    setNewDamageTypeTags(item.damageTypeTags ?? []);
    setNewArmamentTags(item.armamentTags ?? []);
    setNewEquipSlots(item.equipSlots ?? []);
    setNewModifierStat(null); // modifier_stat not in catalog — user sets it
    setNewIsRanged(item.isRanged ?? false);
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
      source: catalogSelected ? "catalog" : "manual",
      slot: newSlot,
      equipped: false,
      traits: catalogSelected?.traits ?? [],
      catalogItemId: catalogSelected?.id ?? null,
      armorBonus: newArmorBonus,
      armorCategory: newArmorCategory,
      armamentTags: newArmamentTags,
      modifierStat: newModifierStat,
      isRanged: newIsRanged,
      damageDiceCount: newDamageDiceCount,
      damageDiceSize: newDamageDiceSize,
      damageTypeTags: newDamageTypeTags,
      equipSlots: newEquipSlots,
      masterworkBonus: newMasterworkBonus,
      equippable: catalogSelected
        ? (catalogSelected.equippable ?? newSlot !== null)
        : newSlot !== null,
    };
    persist({ inventory: [...inventory, item] });
    setNewName("");
    setNewCategory("Misc");
    setNewQty(1);
    setNewWeight(0);
    setNewNotes("");
    setNewSlot(null);
    setNewArmorBonus(0);
    setNewArmorCategory(null);
    setNewArmamentTags([]);
    setNewModifierStat(null);
    setNewIsRanged(false);
    setNewDamageDiceCount(0);
    setNewDamageDiceSize(6);
    setNewDamageTypeTags([]);
    setNewEquipSlots([]);
    setNewMasterworkBonus(0);
    setCatalogSelected(null);
    setCatalogSearch("");
    setAddingItem(false);
  }

  function removeItem(itemId: string) {
    persist({ inventory: inventory.filter((i) => i.id !== itemId) });
  }

  function updateItem(itemId: string, updates: Partial<InventoryItem>) {
    persist({
      inventory: inventory.map((i) =>
        i.id === itemId ? { ...i, ...updates } : i,
      ),
    });
  }

  // FEATURE-02: default shield reduction pool by shield name
  const SHIELD_POOL_DEFAULTS: Record<string, number> = {
    "improvised shield": 10,
    buckler: 10,
    shield: 15,
    "reinforced shield": 25,
    "tower shield": 40,
    "colossus shield": 50,
  };

  function getShieldPoolDefault(name: string): number {
    const key = name.toLowerCase().trim();
    return SHIELD_POOL_DEFAULTS[key] ?? 15;
  }

  function equipItem(itemId: string, slot: InventorySlot) {
    const item = inventory.find((i) => i.id === itemId);
    if (!item) return;
    const isTwoHanded =
      item.traits.includes("Two-Handed") || slot === "Two Hands";
    const updated = inventory.map((i) => {
      if (i.id === itemId) {
        const base: InventoryItem = { ...i, equipped: true, slot };
        if (i.category === "Shield" && i.reductionPoolMax == null) {
          const pool = getShieldPoolDefault(i.name);
          base.reductionPoolMax = pool;
          base.reductionPoolCurrent = pool;
        }
        return base;
      }
      if (
        isTwoHanded &&
        (i.slot === "Main Hand" ||
          i.slot === "Off Hand" ||
          i.slot === "Two Hands") &&
        i.equipped
      )
        return { ...i, equipped: false };
      if (!isTwoHanded && i.slot === slot && i.equipped && i.id !== itemId)
        return { ...i, equipped: false };
      return i;
    });
    persist({ inventory: updated });
  }

  // FEATURE-02: priority-order damage pipeline — Spell > Feat > Shield > Vitality
  function applyDamage(incoming: number) {
    if (incoming <= 0) return;
    let remaining = incoming;
    const patch: Partial<Character> = {};
    let updatedInventory = [...inventory];

    // Step 1 — Spell pool
    const spellPool = c.spellReductionPool ?? 0;
    if (spellPool > 0 && remaining > 0) {
      const absorbed = Math.min(remaining, spellPool);
      patch.spellReductionPool = spellPool - absorbed;
      remaining -= absorbed;
    }

    // Step 2 — Feat pool
    const featPool = c.featReductionPool ?? 0;
    if (featPool > 0 && remaining > 0) {
      const absorbed = Math.min(remaining, featPool);
      patch.featReductionPool = featPool - absorbed;
      remaining -= absorbed;
    }

    // Step 3 — Shield pool
    if (equippedShield && remaining > 0) {
      const shieldPool = equippedShield.reductionPoolCurrent ?? 0;
      if (shieldPool > 0) {
        const absorbed = Math.min(remaining, shieldPool);
        const newPool = shieldPool - absorbed;
        updatedInventory = updatedInventory.map((i) =>
          i.id === equippedShield.id
            ? { ...i, reductionPoolCurrent: newPool }
            : i,
        );
        remaining -= absorbed;
      }
    }

    // Step 4 — Remaining hits Vitality
    if (remaining > 0) {
      patch.currentVitality = Math.max(0, (c.currentVitality ?? 0) - remaining);
    }

    patch.inventory = updatedInventory;
    persist(patch);
  }

  const fmtAttr = (v: number) => (v >= 0 ? `+${v}` : String(v));

  const inputStyle: React.CSSProperties = {
    padding: "0.3rem 0.5rem",
    fontSize: "0.825rem",
    fontFamily: "var(--font-body)",
    border: "1px solid var(--border)",
    borderRadius: "0.25rem",
    backgroundColor: "var(--bg-card)",
    color: "var(--text)",
    outline: "none",
  };

  // ─── Equipped slots ──────────────────────────────────────────────────────
  const equippedMain =
    inventory.find((i) => i.equipped && i.slot === "Main Hand") ?? null;
  const equippedOff =
    inventory.find((i) => i.equipped && i.slot === "Off Hand") ?? null;
  const equippedTwoHands =
    inventory.find((i) => i.equipped && i.slot === "Two Hands") ?? null;
  const equippedBody =
    inventory.find((i) => i.equipped && i.slot === "Body") ?? null;
  const equippedShield =
    inventory.find(
      (i) => i.equipped && i.slot === "Off Hand" && i.category === "Shield",
    ) ?? null;
  const baseArmorDefense = calcArmorDefense(
    equippedBody,
    equippedShield,
    attrs,
    hasAgile,
    hasUnarmoredDefense,
    effectiveTier,
  );
  // BUG-09: Spell Armor overrides armor defense when active
  const armorDefense =
    c.spellArmorActive && isCaster ? 11 + modVal : baseArmorDefense;

  // AMEND-05: Armor proficiency check
  const isArmorProficient: boolean = (() => {
    if (
      !equippedBody ||
      equippedBody.category !== "Armor" ||
      !equippedBody.armorCategory
    )
      return true;
    const protection = prof?.protection ?? [];
    const cat = equippedBody.armorCategory.toLowerCase();
    return protection.some((p) => p.toLowerCase().includes(cat));
  })();

  const DAMAGE_TYPE_LABEL: Record<string, string> = {
    puncture: "Puncture",
    slash: "Slash",
    blunt: "Blunt",
  };

  // Weapon combat stats — all derived from structured tag fields only
  function weaponStats(
    item: InventoryItem | null,
  ): { toHit: string; damage: string; modStat: AttributeKey } | null {
    if (!item || item.category !== "Weapon" || item.damageDiceCount === 0)
      return null;
    // Infer default modifier: catalyst → spellcasting mod, everything else → body
    const modStat: AttributeKey =
      item.modifierStat ??
      (item.armamentTags?.includes("catalyst")
        ? (c.spellcastingModifier ?? "mind")
        : "body");
    const modAttr = attrs[modStat];
    const mw = item.masterworkBonus ?? 0;
    const proficient =
      item.armamentTags.length > 0
        ? item.armamentTags.some((tag) => armamentProficiencyTags.includes(tag))
        : false;
    const tierBonus = proficient ? effectiveTier : 0;
    const toHitVal = modAttr + tierBonus + mw;
    const diceStr = `${item.damageDiceCount}d${item.damageDiceSize}`;
    const damageMod = item.isRanged ? mw : modAttr + mw;
    const damageStr =
      damageMod !== 0
        ? `${diceStr}${damageMod >= 0 ? "+" : ""}${damageMod}`
        : diceStr;
    const typeLabels = (item.damageTypeTags ?? [])
      .map((t) => DAMAGE_TYPE_LABEL[t] ?? t)
      .join("/");
    return {
      toHit: toHitVal >= 0 ? `+${toHitVal}` : String(toHitVal),
      damage: damageStr + (typeLabels ? ` ${typeLabels}` : ""),
      modStat,
    };
  }

  const primaryWeapon = equippedTwoHands ?? equippedMain;
  const primaryWeaponStats = weaponStats(primaryWeapon);
  const offWeaponStats = weaponStats(
    equippedOff?.category === "Weapon" ? equippedOff : null,
  );

  // ─── Tab content renderers ───────────────────────────────────────────────

  function renderFeatsTab() {
    const baseFeatures = prof?.baseFeatures ?? [];
    const vocationFeatures = vocation?.features ?? [];
    if (
      baseFeatures.length === 0 &&
      vocationFeatures.length === 0 &&
      selectedFeats.length === 0
    ) {
      return (
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          No feats or features.
        </p>
      );
    }

    function toggleFeat(id: string) {
      setExpandedFeats((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
      });
    }

    /** Look up resolved option names + effect text from choice_selections. */
    function getResolvedOptions(
      featureName: string,
      entityName: string,
    ): { name: string; effectText: string }[] | null {
      const key = `${entityName}__${featureName}`;
      const selected = c.choiceSelections?.[key];
      if (!selected?.length) return null;
      const cf = choiceFeatures.find(
        (f) => f.feature_name === featureName && f.entity_name === entityName,
      );
      if (!cf) return null;
      return cf.options
        .filter((o) => selected.includes(o.name))
        .map((o) => ({ name: o.name, effectText: o.effect_text }));
    }

    function FeatRow({
      id,
      name,
      tier,
      activationRaw,
      traits,
      descriptionMarkdown,
      required,
      pathInvestment,
      resolvedOptions,
      ownerName,
    }: {
      id: string;
      name: string;
      tier?: number;
      activationRaw?: string | null;
      traits?: string[];
      descriptionMarkdown: string;
      required?: string | null;
      pathInvestment?: string | null;
      resolvedOptions?: { name: string; effectText: string }[] | null;
      ownerName?: string;
    }) {
      const expanded = expandedFeats.has(id);
      const isPurchasedFeat = tier !== undefined && ownerName !== undefined;
      return (
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "0.5rem",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => toggleFeat(id)}
            style={{
              width: "100%",
              padding: "0.625rem 0.875rem",
              backgroundColor: expanded
                ? "var(--primary-light)"
                : "var(--bg-card)",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "0.9rem",
                color: expanded ? "var(--primary)" : "var(--text)",
                flex: 1,
              }}
            >
              {name}
            </span>
            {resolvedOptions && resolvedOptions.length > 0 && (
              <span
                style={{
                  fontSize: "0.65rem",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  color: "var(--primary)",
                  backgroundColor: "var(--primary-light)",
                  padding: "0.1rem 0.4rem",
                  borderRadius: "9999px",
                  border: "1px solid var(--primary)",
                }}
              >
                {resolvedOptions.map((o) => o.name).join(", ")}
              </span>
            )}
            {tier !== undefined && (
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-heading)",
                  padding: "0.1rem 0.35rem",
                  borderRadius: "9999px",
                  backgroundColor: "var(--bg-nav)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}
              >
                Tier {tier}
              </span>
            )}
            {activationRaw &&
              activationRaw !== "-" &&
              activationRaw !== "null" && (
                <span
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-heading)",
                    padding: "0.1rem 0.35rem",
                    borderRadius: "9999px",
                    backgroundColor: "var(--accent-light)",
                    color: "var(--accent)",
                    border: "1px solid #FCD34D",
                  }}
                >
                  {activationRaw}
                </span>
              )}
            {traits
              ?.filter((t) => t)
              .map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: "0.6rem",
                    padding: "0.1rem 0.35rem",
                    borderRadius: "9999px",
                    backgroundColor: "var(--bg-nav)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border)",
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  {t}
                </span>
              ))}
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--text-muted)",
                marginLeft: "auto",
              }}
            >
              {expanded ? "▲" : "▼"}
            </span>
          </button>
          {expanded && (
            <div
              style={{
                padding: "0.75rem 0.875rem",
                borderTop: "1px solid var(--border)",
                backgroundColor: "var(--bg-card)",
              }}
            >
              {resolvedOptions && resolvedOptions.length > 0 && (
                <div
                  style={{
                    marginBottom: "0.625rem",
                    padding: "0.5rem 0.75rem",
                    backgroundColor: "var(--primary-light)",
                    border: "1px solid var(--primary)",
                    borderRadius: "0.375rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "var(--primary)",
                      fontFamily: "var(--font-heading)",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {resolvedOptions.length > 1
                      ? "Chosen options"
                      : "Chosen option"}
                  </div>
                  {resolvedOptions.map((o) => (
                    <div key={o.name}>
                      <span
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          color: "var(--primary)",
                        }}
                      >
                        {o.name}:{" "}
                      </span>
                      <span
                        style={{
                          fontSize: "0.825rem",
                          color: "var(--text)",
                          lineHeight: 1.5,
                        }}
                      >
                        {o.effectText}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {required &&
                (() => {
                  const { positiveReqs, exclusions } = parseRequired(required);
                  return (
                    <>
                      {positiveReqs.length > 0 && (
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            marginBottom: "0.2rem",
                          }}
                        >
                          Requires: {positiveReqs.join(", ")}
                        </div>
                      )}
                      {exclusions.length > 0 && (
                        <div
                          style={{
                            fontSize: "0.72rem",
                            color: "var(--text-muted)",
                            marginBottom: "0.2rem",
                          }}
                        >
                          Cannot own: {exclusions.join(", ")}
                        </div>
                      )}
                    </>
                  );
                })()}
              {pathInvestment && (
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.25rem",
                  }}
                >
                  Investment: {pathInvestment}
                </div>
              )}
              <MarkdownContent content={descriptionMarkdown} />
              {/* AMEND-07: Edit choices + Swap controls for purchased feats */}
              {isPurchasedFeat && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginTop: "0.75rem",
                    borderTop: "1px solid var(--border)",
                    paddingTop: "0.625rem",
                  }}
                >
                  {choiceFeatures.some(
                    (cf) =>
                      cf.feature_name === name && cf.entity_name === ownerName,
                  ) && (
                    <button
                      onClick={() => {
                        const cf = choiceFeatures.find(
                          (cf) =>
                            cf.feature_name === name &&
                            cf.entity_name === ownerName,
                        );
                        if (!cf) return;
                        const key = `${ownerName}__${name}`;
                        setEditChoiceFeatId(id);
                        setEditChoiceSels(c.choiceSelections?.[key] ?? []);
                      }}
                      style={{
                        padding: "0.25rem 0.625rem",
                        border: "1px solid var(--primary)",
                        borderRadius: "0.25rem",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        color: "var(--primary)",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                        fontSize: "0.75rem",
                      }}
                    >
                      ✎ Edit Choice
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setSwapSourceFeatId(id);
                      setSwapSearch("");
                    }}
                    style={{
                      padding: "0.25rem 0.625rem",
                      border: "1px solid var(--border)",
                      borderRadius: "0.25rem",
                      backgroundColor: "transparent",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                    }}
                  >
                    ⇄ Swap Feat
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    // ─── Feat Shop helpers ────────────────────────────────────────────────────
    const tierCost = FEAT_COST_BY_TIER[effectiveTier] ?? 6;
    const shopAllFeats = [...professionFeats, ...originFeats];
    const shopProfFeats = professionFeats.filter(
      (f) => f.ownerId === c.professionId,
    );
    const shopOriginFeats = originFeats.filter((f) => f.ownerId === c.originId);
    const shopUniversalFeats = originFeats.filter(
      (f) => f.ownerId === "universal" || f.ownerName === "Universal",
    );

    function recomputeExpertise(
      selectedFeatIds: string[],
      choiceSelections: Record<string, string[]>,
    ): { vitalsExpertiseBumps: Record<string, number> } {
      return {
        vitalsExpertiseBumps: computeExpertiseBumps(
          selectedFeatIds,
          shopAllFeats,
          choiceFeatures,
          choiceSelections,
        ),
      };
    }

    function purchaseFeat(feat: BuilderFeat) {
      const renown = c.renown ?? 0;
      if (renown < tierCost) return;
      const newSelected = [...c.selectedFeatIds, feat.id];
      const newFeatsPurchased = (c.featsPurchased ?? 0) + 1;
      const newTier = Math.max(
        c.tier,
        calcTierFromFeatsPurchased(newFeatsPurchased),
      );

      const newUnspentAttr = (c.unspentAttributePoints ?? 0) + 1;
      const isEvenFeat = newFeatsPurchased % 2 === 0;
      const newUnspentSkill =
        (c.unspentSkillPoints ?? 0) + (isEvenFeat ? 2 : 0);

      const expertise = recomputeExpertise(
        newSelected,
        c.choiceSelections ?? {},
      );

      persist({
        selectedFeatIds: newSelected,
        renown: renown - tierCost,
        featsPurchased: newFeatsPurchased,
        tier: newTier,
        unspentAttributePoints: newUnspentAttr,
        unspentSkillPoints: newUnspentSkill,
        ...expertise,
      });

      const onGainChoices = choiceFeatures.filter(
        (cf) =>
          cf.feature_name === feat.name &&
          cf.entity_name === feat.ownerName &&
          cf.selection_timing === "on_gain" &&
          !c.choiceSelections?.[`${feat.ownerName}__${feat.name}`],
      );
      if (onGainChoices.length > 0) {
        setShopChoiceQueue(onGainChoices);
        setShopChoiceIdx(0);
        setShopCurrentSels([]);
      }
    }

    function confirmShopChoice() {
      const current = shopChoiceQueue[shopChoiceIdx];
      if (!current) return;
      const key = `${current.entity_name}__${current.feature_name}`;
      // Clear any stale synthetic follow-up keys before writing new primary selection
      const clearedSelections = clearFeatChoices(
        c.choiceSelections ?? {},
        current.entity_name,
        current.feature_name,
      );
      const updatedSelections = { ...clearedSelections, [key]: shopCurrentSels };
      const expertise = recomputeExpertise(c.selectedFeatIds, updatedSelections);
      persist({ choiceSelections: updatedSelections, ...expertise });

      // Build follow-up synthetic skill picks for options with expertise_skill_count
      const VITALS_SKILLS = [...VITALS_SET];
      const extraQueue: ChoiceFeature[] = [];
      for (const optionName of shopCurrentSels) {
        const opt = current.options.find((o) => o.name === optionName);
        if (!opt?.expertise_skill_count) continue;
        const skillCount = opt.expertise_skill_count;
        const bumpCount = opt.expertise_bump_count ?? 1;
        const syntheticName = `${current.feature_name} Expertise ×${bumpCount}`;
        const syntheticKey = `${current.entity_name}__${syntheticName}`;
        if (!updatedSelections[syntheticKey]) {
          extraQueue.push({
            entity_type: current.entity_type,
            entity_name: current.entity_name,
            source_kind: current.source_kind,
            feature_name: syntheticName,
            tier: current.tier,
            path: current.path,
            choice_type: "permanent_choice",
            selection_rule: skillCount === 1 ? "single" : "fixed_count",
            min_choices: skillCount,
            max_choices: skillCount,
            selection_timing: "on_gain",
            branches_from_feature: current.feature_name,
            notes: `Choose ${skillCount} VITALS skill(s) to gain Expertise in.`,
            grants_expertise: true,
            options: VITALS_SKILLS.map((s) => ({
              name: s,
              effect_text: `Gain Expertise in ${s}.`,
            })),
          });
        }
      }

      const remainingQueue = shopChoiceQueue.slice(shopChoiceIdx + 1);
      const newQueue = [...extraQueue, ...remainingQueue];
      if (newQueue.length > 0) {
        setShopChoiceQueue(newQueue);
        setShopChoiceIdx(0);
        setShopCurrentSels([]);
      } else {
        setShopChoiceQueue([]);
        setShopChoiceIdx(0);
        setShopCurrentSels([]);
      }
    }

    // AMEND-07: Swap feat — replace old feat with new, clear old choice selections, recalc maxVitality
    function confirmSwap(newFeat: BuilderFeat) {
      if (!swapSourceFeatId) return;
      const oldFeat = shopAllFeats.find((f) => f.id === swapSourceFeatId);
      if (!oldFeat) return;
      const newSelected = c.selectedFeatIds.map((id) =>
        id === swapSourceFeatId ? newFeat.id : id,
      );
      // Clear old feat's choice selections (primary + synthetic follow-ups)
      const updatedSelections = clearFeatChoices(
        c.choiceSelections ?? {},
        oldFeat.ownerName,
        oldFeat.name,
      );
      // Post-swap checks: +1 attr point; +2 skill if even-numbered slot
      const slotIdx = c.selectedFeatIds.indexOf(swapSourceFeatId);
      const isEvenSlot = slotIdx >= 0 && (slotIdx + 1) % 2 === 0;
      const expertise = recomputeExpertise(newSelected, updatedSelections);
      persist({
        selectedFeatIds: newSelected,
        choiceSelections: updatedSelections,
        unspentAttributePoints: (c.unspentAttributePoints ?? 0) + 1,
        unspentSkillPoints: (c.unspentSkillPoints ?? 0) + (isEvenSlot ? 2 : 0),
        ...expertise,
      });
      setSwapSourceFeatId(null);
      setSwapSearch("");
      setSwapPendingFeat(null);
      // Trigger choice resolution for new feat if needed
      const onGainChoices = choiceFeatures.filter(
        (cf) =>
          cf.feature_name === newFeat.name &&
          cf.entity_name === newFeat.ownerName &&
          cf.selection_timing === "on_gain",
      );
      if (onGainChoices.length > 0) {
        setShopChoiceQueue(onGainChoices);
        setShopChoiceIdx(0);
        setShopCurrentSels([]);
        setShowFeatShop(true);
      }
    }

    // AMEND-07: Edit choice for existing feat
    function confirmEditChoice() {
      if (!editChoiceFeatId) return;
      const feat = shopAllFeats.find((f) => f.id === editChoiceFeatId);
      if (!feat) return;
      const key = `${feat.ownerName}__${feat.name}`;
      // Clear stale synthetic follow-up keys before writing new selection
      const clearedSelections = clearFeatChoices(c.choiceSelections ?? {}, feat.ownerName, feat.name);
      const updatedSelections = { ...clearedSelections, [key]: editChoiceSels };
      const expertise = recomputeExpertise(c.selectedFeatIds, updatedSelections);
      persist({ choiceSelections: updatedSelections, ...expertise });
      setEditChoiceFeatId(null);
      setEditChoiceSels([]);

      // Find the choice feature for this feat
      const cf = choiceFeatures.find(
        (f) => f.feature_name === feat.name && f.entity_name === feat.ownerName,
      );
      if (!cf) return;
      // Build follow-up queue if selected option has expertise_skill_count
      const VITALS_SKILLS = [...VITALS_SET];
      const extraQueue: ChoiceFeature[] = [];
      for (const optionName of editChoiceSels) {
        const opt = cf.options.find((o) => o.name === optionName);
        if (!opt?.expertise_skill_count) continue;
        const skillCount = opt.expertise_skill_count;
        const bumpCount = opt.expertise_bump_count ?? 1;
        const syntheticName = `${cf.feature_name} Expertise ×${bumpCount}`;
        extraQueue.push({
          entity_type: cf.entity_type,
          entity_name: cf.entity_name,
          source_kind: cf.source_kind,
          feature_name: syntheticName,
          tier: cf.tier,
          path: cf.path,
          choice_type: "permanent_choice",
          selection_rule: skillCount === 1 ? "single" : "fixed_count",
          min_choices: skillCount,
          max_choices: skillCount,
          selection_timing: "on_gain",
          branches_from_feature: cf.feature_name,
          notes: `Choose ${skillCount} VITALS skill(s) to gain Expertise in.`,
          grants_expertise: true,
          options: VITALS_SKILLS.map((s) => ({
            name: s,
            effect_text: `Gain Expertise in ${s}.`,
          })),
        });
      }
      if (extraQueue.length > 0) {
        setShopChoiceQueue(extraQueue);
        setShopChoiceIdx(0);
        setShopCurrentSels([]);
      }
    }

    function renderShopFeatGroup(feats: BuilderFeat[], title: string) {
      const byTier: Record<number, BuilderFeat[]> = {};
      feats.forEach((f) => {
        const t = f.tier ?? 1;
        if (!byTier[t]) byTier[t] = [];
        byTier[t].push(f);
      });
      if (feats.length === 0) return null;
      return (
        <div style={{ marginBottom: "1.25rem" }}>
          <h4
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "var(--text)",
              margin: "0 0 0.625rem",
              paddingBottom: "0.25rem",
              borderBottom: "2px solid var(--primary)",
              display: "inline-block",
            }}
          >
            {title}
          </h4>
          {Object.keys(byTier)
            .map(Number)
            .sort()
            .map((tier) => (
              <div key={tier} style={{ marginBottom: "0.75rem" }}>
                <div
                  style={{
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-heading)",
                    marginBottom: "0.35rem",
                  }}
                >
                  Tier {tier}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  {byTier[tier].map((feat) => {
                    const owned = c.selectedFeatIds.includes(feat.id);
                    const status = getFeatStatus(
                      feat,
                      c.selectedFeatIds,
                      shopAllFeats,
                      false,
                    );
                    const blocked = status.blocked && !owned;
                    const canAfford = (c.renown ?? 0) >= tierCost;
                    const expanded = shopExpandedIds.has(feat.id);
                    const { positiveReqs, exclusions } = parseRequired(
                      feat.required,
                    );
                    return (
                      <div
                        key={feat.id}
                        style={{
                          border: `1.5px solid ${owned ? "var(--primary)" : "var(--border)"}`,
                          borderRadius: "0.375rem",
                          overflow: "hidden",
                          opacity: blocked ? 0.55 : 1,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "flex-start",
                            padding: "0.5rem 0.75rem",
                            backgroundColor: owned
                              ? "var(--primary-light)"
                              : "var(--bg-card)",
                          }}
                        >
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.4rem",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "var(--font-heading)",
                                  fontWeight: 700,
                                  fontSize: "0.875rem",
                                  color: owned
                                    ? "var(--primary)"
                                    : "var(--text)",
                                }}
                              >
                                {feat.name}
                              </span>
                              {owned && (
                                <span
                                  style={{
                                    fontSize: "0.6rem",
                                    fontWeight: 700,
                                    fontFamily: "var(--font-heading)",
                                    padding: "0.1rem 0.35rem",
                                    borderRadius: "9999px",
                                    backgroundColor: "var(--primary)",
                                    color: "var(--text-on-primary)",
                                  }}
                                >
                                  Owned
                                </span>
                              )}
                              {feat.activationRaw &&
                                feat.activationRaw !== "-" &&
                                feat.activationRaw !== "null" && (
                                  <span
                                    style={{
                                      fontSize: "0.62rem",
                                      fontFamily: "var(--font-heading)",
                                      fontWeight: 600,
                                      color: "var(--accent)",
                                      padding: "0.1rem 0.35rem",
                                      borderRadius: "9999px",
                                      backgroundColor: "var(--accent-light)",
                                      border: "1px solid #FCD34D",
                                    }}
                                  >
                                    {feat.activationRaw}
                                  </span>
                                )}
                            </div>
                            {status.reason && !owned && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-muted)",
                                  fontStyle: "italic",
                                  marginTop: "0.1rem",
                                }}
                              >
                                ⚠ {status.reason}
                              </div>
                            )}
                            {!status.reason && positiveReqs.length > 0 && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-muted)",
                                  marginTop: "0.1rem",
                                }}
                              >
                                Requires: {positiveReqs.join(", ")}
                              </div>
                            )}
                            {!status.reason && exclusions.length > 0 && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-muted)",
                                  marginTop: "0.1rem",
                                }}
                              >
                                Cannot own: {exclusions.join(", ")}
                              </div>
                            )}
                            {feat.pathInvestment && !status.reason && (
                              <div
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-muted)",
                                  marginTop: "0.1rem",
                                }}
                              >
                                Investment: {feat.pathInvestment}
                              </div>
                            )}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.35rem",
                              alignItems: "center",
                              flexShrink: 0,
                            }}
                          >
                            <button
                              onClick={() =>
                                setShopExpandedIds((prev) => {
                                  const n = new Set(prev);
                                  n.has(feat.id)
                                    ? n.delete(feat.id)
                                    : n.add(feat.id);
                                  return n;
                                })
                              }
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontSize: "0.65rem",
                                color: "var(--text-muted)",
                                padding: "0.15rem 0.25rem",
                              }}
                            >
                              {expanded ? "▲" : "▼"}
                            </button>
                            {!owned && (
                              <button
                                onClick={() => purchaseFeat(feat)}
                                disabled={blocked || !canAfford}
                                style={{
                                  padding: "0.2rem 0.625rem",
                                  fontSize: "0.72rem",
                                  fontFamily: "var(--font-heading)",
                                  fontWeight: 700,
                                  border: "none",
                                  borderRadius: "0.25rem",
                                  cursor:
                                    blocked || !canAfford
                                      ? "not-allowed"
                                      : "pointer",
                                  backgroundColor:
                                    blocked || !canAfford
                                      ? "var(--border)"
                                      : "var(--primary)",
                                  color: "var(--text-on-primary)",
                                }}
                              >
                                {tierCost} Renown
                              </button>
                            )}
                          </div>
                        </div>
                        {expanded && (
                          <div
                            style={{
                              padding: "0.5rem 0.75rem",
                              borderTop: "1px solid var(--border)",
                              backgroundColor: "var(--bg-nav)",
                              fontSize: "0.82rem",
                              lineHeight: 1.65,
                              color: "var(--text)",
                            }}
                          >
                            <MarkdownContent
                              content={feat.descriptionMarkdown}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      );
    }

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
        {/* Purchase Feats button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "0.5rem",
          }}
        >
          <button
            onClick={() => setShowFeatShop(true)}
            style={{
              padding: "0.35rem 0.875rem",
              border: "1.5px solid var(--primary)",
              borderRadius: "0.375rem",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: "var(--primary)",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "0.8rem",
            }}
          >
            Purchase Feats
          </button>
        </div>

        {baseFeatures.length > 0 && (
          <>
            <div
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                fontFamily: "var(--font-heading)",
                marginBottom: "0.2rem",
              }}
            >
              Base Features
            </div>
            {baseFeatures.map((f) => (
              <FeatRow
                key={`base-${f.id}`}
                id={`base-${f.id}`}
                name={f.name}
                activationRaw={f.activationRaw}
                traits={f.traits}
                descriptionMarkdown={f.descriptionMarkdown}
                resolvedOptions={getResolvedOptions(f.name, c.professionName)}
              />
            ))}
          </>
        )}
        {vocationFeatures.length > 0 && (
          <>
            <div
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                fontFamily: "var(--font-heading)",
                marginTop: "0.5rem",
                marginBottom: "0.2rem",
              }}
            >
              Vocation Features
            </div>
            {vocationFeatures.map((f) => (
              <FeatRow
                key={`voc-${f.id}`}
                id={`voc-${f.id}`}
                name={f.name}
                activationRaw={f.activationRaw}
                traits={f.traits}
                descriptionMarkdown={f.descriptionMarkdown}
                resolvedOptions={getResolvedOptions(f.name, c.vocationName)}
              />
            ))}
          </>
        )}
        {selectedFeats.length > 0 && (
          <>
            <div
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                fontFamily: "var(--font-heading)",
                marginTop: "0.5rem",
                marginBottom: "0.2rem",
              }}
            >
              Selected Feats
            </div>
            {selectedFeats.map((f) => (
              <FeatRow
                key={`feat-${f.id}`}
                id={f.id}
                name={f.name}
                tier={f.tier}
                activationRaw={f.activationRaw}
                traits={f.traits}
                descriptionMarkdown={f.descriptionMarkdown}
                required={f.required}
                pathInvestment={f.pathInvestment}
                resolvedOptions={getResolvedOptions(f.name, f.ownerName)}
                ownerName={f.ownerName}
              />
            ))}
          </>
        )}
        {baseFeatures.length === 0 &&
          vocationFeatures.length === 0 &&
          selectedFeats.length === 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
              No feats or features yet.
            </p>
          )}

        {/* AMEND-07: Edit Choice Modal */}
        {editChoiceFeatId &&
          (() => {
            const feat = shopAllFeats.find((f) => f.id === editChoiceFeatId);
            if (!feat) return null;
            const cf = choiceFeatures.find(
              (c2) =>
                c2.feature_name === feat.name &&
                c2.entity_name === feat.ownerName,
            );
            if (!cf) return null;
            const canConfirm = editChoiceSels.length >= cf.min_choices;
            return (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  zIndex: 60,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "2rem 1rem",
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) {
                    setEditChoiceFeatId(null);
                    setEditChoiceSels([]);
                  }
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: "500px",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: "var(--bg-nav)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontWeight: 700,
                          fontSize: "1rem",
                          color: "var(--text)",
                        }}
                      >
                        Edit Choice: {feat.name}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginTop: "0.1rem",
                        }}
                      >
                        Select{" "}
                        {cf.min_choices === cf.max_choices
                          ? cf.min_choices
                          : `${cf.min_choices}–${cf.max_choices}`}{" "}
                        option{cf.max_choices !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setEditChoiceFeatId(null);
                        setEditChoiceSels([]);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "1.1rem",
                        color: "var(--text-muted)",
                        padding: "0.2rem 0.4rem",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ padding: "1rem 1.25rem" }}>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.375rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      {cf.options.map((opt) => {
                        const sel = editChoiceSels.includes(opt.name);
                        return (
                          <button
                            key={opt.name}
                            onClick={() => {
                              setEditChoiceSels((prev) => {
                                if (sel)
                                  return prev.filter((n) => n !== opt.name);
                                if (prev.length >= cf.max_choices)
                                  return [...prev.slice(1), opt.name];
                                return [...prev, opt.name];
                              });
                            }}
                            style={{
                              padding: "0.5rem 0.875rem",
                              border: `2px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                              borderRadius: "0.375rem",
                              backgroundColor: sel
                                ? "var(--primary-light)"
                                : "var(--bg-card)",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                          >
                            <span
                              style={{
                                fontFamily: "var(--font-heading)",
                                fontWeight: 700,
                                fontSize: "0.85rem",
                                color: sel ? "var(--primary)" : "var(--text)",
                              }}
                            >
                              {opt.name}
                            </span>
                            {opt.effect_text && (
                              <div
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--text-muted)",
                                  marginTop: "0.1rem",
                                }}
                              >
                                {opt.effect_text}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "#856404",
                        backgroundColor: "#fff3cd",
                        border: "1px solid #ffc107",
                        borderRadius: "0.375rem",
                        padding: "0.375rem 0.625rem",
                        marginBottom: "0.625rem",
                      }}
                    >
                      Saving will update any passive effects this feat applies.
                    </div>
                    <button
                      onClick={confirmEditChoice}
                      disabled={!canConfirm}
                      style={{
                        padding: "0.375rem 0.875rem",
                        border: "none",
                        borderRadius: "0.375rem",
                        backgroundColor: canConfirm
                          ? "var(--primary)"
                          : "var(--border)",
                        color: "var(--text-on-primary)",
                        cursor: canConfirm ? "pointer" : "not-allowed",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                      }}
                    >
                      Save Choice
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* AMEND-07: Swap Feat Modal */}
        {swapSourceFeatId &&
          (() => {
            const sourceFeat = shopAllFeats.find(
              (f) => f.id === swapSourceFeatId,
            );
            if (!sourceFeat) return null;
            const closeSwap = () => {
              setSwapSourceFeatId(null);
              setSwapSearch("");
              setSwapPendingFeat(null);
            };
            const eligibleForSwap = shopAllFeats.filter((f) => {
              if (f.id === swapSourceFeatId) return false;
              if (c.selectedFeatIds.includes(f.id)) return false;
              const s = getFeatStatus(
                f,
                c.selectedFeatIds.filter((id) => id !== swapSourceFeatId),
                shopAllFeats,
                false,
              );
              return !s.blocked;
            });
            const filtered = swapSearch.trim()
              ? eligibleForSwap.filter((f) =>
                  f.name.toLowerCase().includes(swapSearch.toLowerCase()),
                )
              : eligibleForSwap;
            const grouped: Record<string, BuilderFeat[]> = {};
            filtered.forEach((f) => {
              const k = f.ownerName;
              if (!grouped[k]) grouped[k] = [];
              grouped[k].push(f);
            });
            const slotIdx = c.selectedFeatIds.indexOf(swapSourceFeatId);
            const isEvenSlot = slotIdx >= 0 && (slotIdx + 1) % 2 === 0;
            return (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  backgroundColor: "rgba(0,0,0,0.55)",
                  zIndex: 60,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "center",
                  padding: "2rem 1rem",
                  overflowY: "auto",
                }}
                onClick={(e) => {
                  if (e.target === e.currentTarget) closeSwap();
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: "620px",
                    backgroundColor: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.75rem",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                      flexWrap: "wrap",
                      backgroundColor: "var(--bg-nav)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontWeight: 700,
                          fontSize: "1rem",
                          color: "var(--text)",
                        }}
                      >
                        {swapPendingFeat
                          ? `Confirm Swap: ${sourceFeat.name}`
                          : `Swap: ${sourceFeat.name}`}
                      </div>
                      <div
                        style={{
                          fontSize: "0.72rem",
                          color: "var(--text-muted)",
                          marginTop: "0.1rem",
                        }}
                      >
                        {swapPendingFeat
                          ? "Review changes below before confirming."
                          : "Choose replacement feat. Old feat effects removed, new applied immediately."}
                      </div>
                    </div>
                    <button
                      onClick={closeSwap}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "1.1rem",
                        color: "var(--text-muted)",
                        padding: "0.2rem 0.4rem",
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {swapPendingFeat ? (
                    /* Confirmation view */
                    <div style={{ padding: "1.25rem" }}>
                      <div
                        style={{
                          padding: "0.75rem 1rem",
                          backgroundColor: "var(--bg-nav)",
                          border: "1px solid var(--border)",
                          borderRadius: "0.5rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.07em",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-heading)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Changes
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                            marginBottom: "0.375rem",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-heading)",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              color: "var(--text)",
                              textDecoration: "line-through",
                              opacity: 0.6,
                            }}
                          >
                            {sourceFeat.name}
                          </span>
                          <span
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            →
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--font-heading)",
                              fontWeight: 700,
                              fontSize: "0.85rem",
                              color: "var(--primary)",
                            }}
                          >
                            {swapPendingFeat.name}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.15rem",
                            marginTop: "0.375rem",
                          }}
                        >
                          <span>+1 Attribute Point</span>
                          {isEvenSlot && (
                            <span>
                              +2 Skill Points (even-numbered feat slot)
                            </span>
                          )}
                          {swapPendingFeat.descriptionMarkdown && (
                            <div
                              style={{
                                marginTop: "0.35rem",
                                fontSize: "0.72rem",
                                color: "var(--text-muted)",
                                borderTop: "1px solid var(--border)",
                                paddingTop: "0.35rem",
                              }}
                            >
                              {swapPendingFeat.descriptionMarkdown
                                .replace(/[*#_`]/g, "")
                                .slice(0, 160)}
                              …
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        style={{
                          padding: "0.5rem 0.75rem",
                          backgroundColor: "#fff3cd",
                          border: "1px solid #ffc107",
                          borderRadius: "0.375rem",
                          fontSize: "0.75rem",
                          color: "#856404",
                          marginBottom: "1rem",
                        }}
                      >
                        All passive effects from{" "}
                        <strong>{sourceFeat.name}</strong> will be removed and
                        replaced with <strong>{swapPendingFeat.name}</strong>.
                        This cannot be undone automatically.
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => confirmSwap(swapPendingFeat)}
                          style={{
                            padding: "0.375rem 0.875rem",
                            border: "none",
                            borderRadius: "0.375rem",
                            backgroundColor: "var(--primary)",
                            color: "var(--text-on-primary)",
                            cursor: "pointer",
                            fontFamily: "var(--font-heading)",
                            fontWeight: 700,
                            fontSize: "0.8rem",
                          }}
                        >
                          Confirm Swap ⇄
                        </button>
                        <button
                          onClick={() => setSwapPendingFeat(null)}
                          style={{
                            padding: "0.375rem 0.875rem",
                            border: "1px solid var(--border)",
                            borderRadius: "0.375rem",
                            backgroundColor: "transparent",
                            color: "var(--text)",
                            cursor: "pointer",
                            fontFamily: "var(--font-heading)",
                            fontWeight: 600,
                            fontSize: "0.8rem",
                          }}
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Feat selection list */
                    <div
                      style={{
                        padding: "1rem 1.25rem",
                        maxHeight: "65vh",
                        overflowY: "auto",
                      }}
                    >
                      <input
                        value={swapSearch}
                        onChange={(e) => setSwapSearch(e.target.value)}
                        placeholder="Search feats…"
                        style={{
                          width: "100%",
                          padding: "0.375rem 0.625rem",
                          fontSize: "0.825rem",
                          fontFamily: "var(--font-body)",
                          border: "1px solid var(--border)",
                          borderRadius: "0.375rem",
                          backgroundColor: "var(--bg-nav)",
                          color: "var(--text)",
                          outline: "none",
                          marginBottom: "0.75rem",
                          boxSizing: "border-box",
                        }}
                      />
                      {filtered.length === 0 && (
                        <p
                          style={{
                            color: "var(--text-muted)",
                            fontSize: "0.875rem",
                          }}
                        >
                          No eligible feats.
                        </p>
                      )}
                      {Object.entries(grouped).map(([owner, feats]) => (
                        <div key={owner} style={{ marginBottom: "1rem" }}>
                          <div
                            style={{
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              letterSpacing: "0.07em",
                              textTransform: "uppercase",
                              color: "var(--text-muted)",
                              fontFamily: "var(--font-heading)",
                              marginBottom: "0.375rem",
                            }}
                          >
                            {owner}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.3rem",
                            }}
                          >
                            {feats.map((f) => (
                              <div
                                key={f.id}
                                style={{
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: "0.5rem",
                                  padding: "0.5rem 0.75rem",
                                  backgroundColor: "var(--bg-nav)",
                                  border: "1px solid var(--border)",
                                  borderRadius: "0.375rem",
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div
                                    style={{
                                      fontFamily: "var(--font-heading)",
                                      fontWeight: 700,
                                      fontSize: "0.875rem",
                                      color: "var(--text)",
                                    }}
                                  >
                                    {f.name}
                                  </div>
                                  {f.required && (
                                    <div
                                      style={{
                                        fontSize: "0.7rem",
                                        color: "var(--text-muted)",
                                        marginTop: "0.1rem",
                                      }}
                                    >
                                      Req: {f.required}
                                    </div>
                                  )}
                                  <div
                                    style={{
                                      fontSize: "0.72rem",
                                      color: "var(--text-muted)",
                                      marginTop: "0.2rem",
                                      display: "-webkit-box",
                                      WebkitLineClamp: 2,
                                      WebkitBoxOrient: "vertical",
                                      overflow: "hidden",
                                    }}
                                  >
                                    {f.descriptionMarkdown
                                      .replace(/[*#_`]/g, "")
                                      .slice(0, 120)}
                                    …
                                  </div>
                                </div>
                                <button
                                  onClick={() => setSwapPendingFeat(f)}
                                  style={{
                                    padding: "0.25rem 0.75rem",
                                    border: "none",
                                    borderRadius: "0.25rem",
                                    backgroundColor: "var(--primary)",
                                    color: "var(--text-on-primary)",
                                    cursor: "pointer",
                                    fontFamily: "var(--font-heading)",
                                    fontWeight: 700,
                                    fontSize: "0.75rem",
                                    flexShrink: 0,
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  Select ⇄
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

        {/* Feat Shop Modal */}
        {showFeatShop && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.55)",
              zIndex: 50,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "2rem 1rem",
              overflowY: "auto",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowFeatShop(false);
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "660px",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                overflow: "hidden",
              }}
            >
              {/* Shop header */}
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "1rem",
                  flexWrap: "wrap",
                  backgroundColor: "var(--bg-nav)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "1rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: "var(--text)",
                    }}
                  >
                    Purchase Feats
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-heading)",
                    }}
                  >
                    Tier {effectiveTier}
                  </span>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 700,
                      color: "var(--primary)",
                    }}
                  >
                    Renown: {c.renown ?? 0}
                  </span>
                  <span
                    style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}
                  >
                    Cost: {tierCost} Renown / feat
                  </span>
                </div>
                <button
                  onClick={() => setShowFeatShop(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1.1rem",
                    color: "var(--text-muted)",
                    padding: "0.2rem 0.4rem",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Choice resolution overlay inside shop */}
              {shopChoiceQueue.length > 0 &&
                shopChoiceIdx < shopChoiceQueue.length && (
                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      backgroundColor: "var(--primary-light)",
                      borderBottom: "1px solid var(--primary)",
                    }}
                  >
                    {(() => {
                      const cf = shopChoiceQueue[shopChoiceIdx];
                      const canConfirm =
                        shopCurrentSels.length >= cf.min_choices;
                      return (
                        <div>
                          <div
                            style={{
                              fontFamily: "var(--font-heading)",
                              fontWeight: 700,
                              fontSize: "0.9rem",
                              color: "var(--primary)",
                              marginBottom: "0.375rem",
                            }}
                          >
                            Choose for: {cf.feature_name}
                          </div>
                          <div
                            style={{
                              fontSize: "0.78rem",
                              color: "var(--text-muted)",
                              marginBottom: "0.625rem",
                            }}
                          >
                            Select{" "}
                            {cf.min_choices === cf.max_choices
                              ? cf.min_choices
                              : `${cf.min_choices}–${cf.max_choices}`}{" "}
                            option{cf.max_choices !== 1 ? "s" : ""}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.375rem",
                              marginBottom: "0.75rem",
                            }}
                          >
                            {cf.options.map((opt) => {
                              const sel = shopCurrentSels.includes(opt.name);
                              return (
                                <button
                                  key={opt.name}
                                  onClick={() => {
                                    setShopCurrentSels((prev) => {
                                      if (sel)
                                        return prev.filter(
                                          (n) => n !== opt.name,
                                        );
                                      if (prev.length >= cf.max_choices)
                                        return [...prev.slice(1), opt.name];
                                      return [...prev, opt.name];
                                    });
                                  }}
                                  style={{
                                    padding: "0.5rem 0.875rem",
                                    border: `2px solid ${sel ? "var(--primary)" : "var(--border)"}`,
                                    borderRadius: "0.375rem",
                                    backgroundColor: sel
                                      ? "var(--primary-light)"
                                      : "var(--bg-card)",
                                    cursor: "pointer",
                                    textAlign: "left",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: "var(--font-heading)",
                                      fontWeight: 700,
                                      fontSize: "0.85rem",
                                      color: sel
                                        ? "var(--primary)"
                                        : "var(--text)",
                                    }}
                                  >
                                    {opt.name}
                                  </span>
                                  {opt.effect_text && (
                                    <div
                                      style={{
                                        fontSize: "0.75rem",
                                        color: "var(--text-muted)",
                                        marginTop: "0.1rem",
                                      }}
                                    >
                                      {opt.effect_text}
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={confirmShopChoice}
                            disabled={!canConfirm}
                            style={{
                              padding: "0.375rem 0.875rem",
                              border: "none",
                              borderRadius: "0.375rem",
                              backgroundColor: canConfirm
                                ? "var(--primary)"
                                : "var(--border)",
                              color: "var(--text-on-primary)",
                              cursor: canConfirm ? "pointer" : "not-allowed",
                              fontFamily: "var(--font-heading)",
                              fontWeight: 700,
                              fontSize: "0.8rem",
                            }}
                          >
                            Confirm
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                )}

              {/* Feat list */}
              <div
                style={{
                  padding: "1.25rem",
                  maxHeight: "65vh",
                  overflowY: "auto",
                }}
              >
                {(c.renown ?? 0) < tierCost && (
                  <div
                    style={{
                      padding: "0.5rem 0.75rem",
                      backgroundColor: "var(--accent-light)",
                      border: "1px solid #FCD34D",
                      borderRadius: "0.375rem",
                      fontSize: "0.8rem",
                      color: "#92400E",
                      marginBottom: "1rem",
                    }}
                  >
                    Not enough Renown to purchase this feat. You need {tierCost}{" "}
                    Renown (have {c.renown ?? 0}).
                  </div>
                )}
                {renderShopFeatGroup(
                  shopProfFeats,
                  `${c.professionName} Feats`,
                )}
                {renderShopFeatGroup(shopOriginFeats, `${c.originName} Feats`)}
                {renderShopFeatGroup(shopUniversalFeats, "Universal Feats")}
                {shopProfFeats.length === 0 &&
                  shopOriginFeats.length === 0 &&
                  shopUniversalFeats.length === 0 && (
                    <p
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.875rem",
                      }}
                    >
                      No feats available for your profession and origin.
                    </p>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderInventoryTab() {
    // Derive equip-slot options for any item
    function getEquipOptions(
      item: InventoryItem,
    ): { label: string; slot: InventorySlot }[] {
      const TAG_MAP: Record<string, { label: string; slot: InventorySlot }> = {
        main_hand: { label: "Main", slot: "Main Hand" },
        off_hand: { label: "Off", slot: "Off Hand" },
        two_hands: { label: "2H", slot: "Two Hands" },
      };
      const opts: { label: string; slot: InventorySlot }[] = [];
      for (const tag of item.equipSlots ?? []) {
        if (TAG_MAP[tag]) opts.push(TAG_MAP[tag]);
      }
      // Items named "Shield" but stored as Armor (legacy) should equip to Off Hand
      const isShieldItem =
        item.category === "Shield" || /^\s*shield\s*$/i.test(item.name);
      if (
        !isShieldItem &&
        item.category === "Armor" &&
        !opts.some((o) => o.slot === "Body")
      )
        opts.push({ label: "Body", slot: "Body" });
      if (isShieldItem && !opts.some((o) => o.slot === "Off Hand"))
        opts.push({ label: "Off", slot: "Off Hand" });
      // Weapon fallback: starting-pack weapons have equipSlots:[] but are still equippable
      if (opts.length === 0 && item.category === "Weapon") {
        const isTwoHanded =
          item.armamentTags?.some(
            (t) => t === "two_handed" || t === "two-handed",
          ) || item.traits?.some((t) => /two.?hand/i.test(t));
        if (isTwoHanded) {
          opts.push({ label: "2H", slot: "Two Hands" });
        } else {
          opts.push({ label: "Main", slot: "Main Hand" });
          opts.push({ label: "Off", slot: "Off Hand" });
        }
      }
      if (opts.length === 0 && item.slot && item.equippable) {
        const lm: Record<string, string> = {
          "Main Hand": "Main",
          "Off Hand": "Off",
          "Two Hands": "2H",
          Body: "Body",
        };
        opts.push({ label: lm[item.slot] ?? item.slot, slot: item.slot });
      }
      return opts;
    }

    // Items eligible to be equipped into a given slot.
    // Main Hand picker also surfaces 2H weapons so the user can pick them from that panel.
    function getPickerItems(targetSlot: InventorySlot): InventoryItem[] {
      return inventory.filter((item) => {
        if (item.equipped) return false;
        const opts = getEquipOptions(item);
        if (opts.some((o) => o.slot === targetSlot)) return true;
        if (
          targetSlot === "Main Hand" &&
          opts.some((o) => o.slot === "Two Hands")
        )
          return true;
        return false;
      });
    }

    const gearSlots: { label: string; slot: InventorySlot }[] = [
      { label: "Main Hand", slot: "Main Hand" },
      { label: "Off Hand", slot: "Off Hand" },
      { label: "Body", slot: "Body" },
    ];

    return (
      <div>
        {/* Temp combat modifiers */}
        {(() => {
          const tth = c.tempToHit ?? 0;
          const tdmg = c.tempDamage ?? 0;
          function TempCtrl({
            label,
            value,
            onDec,
            onInc,
            onClear,
          }: {
            label: string;
            value: number;
            onDec: () => void;
            onInc: () => void;
            onClear: () => void;
          }) {
            return (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.35rem 0.6rem",
                  backgroundColor: "var(--bg-nav)",
                  border: `1px solid ${value !== 0 ? "var(--primary)" : "var(--border)"}`,
                  borderRadius: "0.5rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.6rem",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    color: "var(--text-muted)",
                    flex: 1,
                  }}
                >
                  {label}
                </span>
                <button
                  onClick={onDec}
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-card)",
                    cursor: "pointer",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  −
                </button>
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    color: value !== 0 ? "var(--primary)" : "var(--text)",
                    minWidth: "28px",
                    textAlign: "center",
                  }}
                >
                  {value > 0 ? `+${value}` : value === 0 ? "0" : value}
                </span>
                <button
                  onClick={onInc}
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-card)",
                    cursor: "pointer",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>
                {value !== 0 && (
                  <button
                    onClick={onClear}
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-muted)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          }
          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "0.5rem",
                marginBottom: "0.75rem",
              }}
            >
              <TempCtrl
                label="Temp To Hit"
                value={tth}
                onDec={() => persist({ tempToHit: tth - 1 })}
                onInc={() => persist({ tempToHit: tth + 1 })}
                onClear={() => persist({ tempToHit: 0 })}
              />
              <TempCtrl
                label="Temp Damage"
                value={tdmg}
                onDec={() => persist({ tempDamage: tdmg - 1 })}
                onInc={() => persist({ tempDamage: tdmg + 1 })}
                onClear={() => persist({ tempDamage: 0 })}
              />
            </div>
          );
        })()}
        {/* AMEND-05: Non-proficiency armor penalty banner */}
        {!isArmorProficient && equippedBody && (
          <div
            style={{
              marginBottom: "0.75rem",
              padding: "0.5rem 0.875rem",
              backgroundColor: "var(--section-alert-bg)",
              border: "1px solid #ff7979",
              borderRadius: "0.5rem",
              fontSize: "0.82rem",
              color: "#cc2222",
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
            }}
          >
            ⚠ Non-Proficient Armor ({equippedBody.armorCategory}) — Total
            available AP reduced by 1 · Skill dice reduced one step (min d4)
          </div>
        )}
        {/* Equipped gear */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.07em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              fontFamily: "var(--font-heading)",
              marginBottom: "0.5rem",
            }}
          >
            Equipped Gear
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: "0.5rem",
            }}
          >
            {gearSlots.map(({ label, slot }) => {
              const isTwoHandedOccupied = !!(
                equippedTwoHands && slot === "Off Hand"
              );
              const displayItem = isTwoHandedOccupied
                ? equippedTwoHands
                : slot === "Main Hand"
                  ? (equippedTwoHands ?? equippedMain)
                  : slot === "Off Hand"
                    ? equippedOff
                    : equippedBody;
              const stats = displayItem ? weaponStats(displayItem) : null;
              const pickerOpen = pickingSlot === slot && !displayItem;
              const eligible = pickerOpen ? getPickerItems(slot) : [];
              // AMEND-05: non-proficient armor penalty applies to Body, Main Hand, Off Hand
              const penaltySlot =
                !isArmorProficient &&
                slot !== null &&
                ["Main Hand", "Off Hand", "Body"].includes(slot);
              // FEATURE-02: shield broken = pool depleted
              const isShieldSlot =
                slot === "Off Hand" && displayItem?.category === "Shield";
              const shieldBroken =
                isShieldSlot && (displayItem?.reductionPoolCurrent ?? 1) === 0;
              const slotAlert = penaltySlot || shieldBroken;
              return (
                <div key={label}>
                  <div
                    style={{
                      padding: "0.625rem 0.75rem",
                      backgroundColor: slotAlert
                        ? "var(--section-alert-bg)"
                        : displayItem
                          ? "var(--primary-light)"
                          : "var(--bg-nav)",
                      border: `1.5px solid ${slotAlert ? "#ff7979" : displayItem ? "var(--primary)" : pickerOpen ? "var(--primary)" : "var(--border)"}`,
                      borderRadius: pickerOpen ? "0.5rem 0.5rem 0 0" : "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.58rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        color: slotAlert
                          ? "#ff7979"
                          : displayItem
                            ? "var(--primary)"
                            : "var(--text-muted)",
                        fontFamily: "var(--font-heading)",
                        marginBottom: "0.3rem",
                      }}
                    >
                      {label}
                      {isTwoHandedOccupied ? " (2H)" : ""}
                      {penaltySlot ? " ⚠" : ""}
                      {shieldBroken ? " ✕ Broken" : ""}
                    </div>
                    {displayItem ? (
                      <div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: "0.25rem",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-heading)",
                              fontWeight: 700,
                              fontSize: "0.82rem",
                              color: "var(--text)",
                              lineHeight: 1.25,
                            }}
                          >
                            {displayItem.name}
                          </span>
                          {!isTwoHandedOccupied && (
                            <button
                              onClick={() =>
                                updateItem(displayItem.id, { equipped: false })
                              }
                              style={{
                                fontSize: "0.65rem",
                                color: "var(--text-muted)",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                                flexShrink: 0,
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        {stats && (
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--primary)",
                              fontFamily: "var(--font-heading)",
                              fontWeight: 600,
                              marginTop: "0.2rem",
                            }}
                          >
                            {stats.toHit}
                            {(c.tempToHit ?? 0) !== 0 && (
                              <span style={{ opacity: 0.8 }}>
                                {(c.tempToHit ?? 0) > 0
                                  ? `+${c.tempToHit}`
                                  : c.tempToHit}
                              </span>
                            )}{" "}
                            · {stats.damage}
                            {(c.tempDamage ?? 0) !== 0 && (
                              <span style={{ opacity: 0.8 }}>
                                {(c.tempDamage ?? 0) > 0
                                  ? `+${c.tempDamage}`
                                  : c.tempDamage}
                              </span>
                            )}
                          </div>
                        )}
                        {!stats && displayItem.category === "Armor" && (
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--primary)",
                              fontFamily: "var(--font-heading)",
                              fontWeight: 600,
                              marginTop: "0.2rem",
                            }}
                          >
                            +{displayItem.armorBonus} Armor Def
                            {displayItem.armorCategory
                              ? ` · ${displayItem.armorCategory}`
                              : ""}
                          </div>
                        )}
                        {!stats && displayItem.category === "Shield" && (
                          <div style={{ marginTop: "0.2rem" }}>
                            <div
                              style={{
                                fontSize: "0.7rem",
                                color: shieldBroken
                                  ? "#ff7979"
                                  : "var(--primary)",
                                fontFamily: "var(--font-heading)",
                                fontWeight: 600,
                              }}
                            >
                              +{displayItem.armorBonus ?? 0} Shield Def
                              {shieldBroken ? " (broken)" : ""}
                            </div>
                            {displayItem.reductionPoolMax != null && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.25rem",
                                  marginTop: "0.15rem",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.62rem",
                                    color: shieldBroken
                                      ? "#ff7979"
                                      : "var(--text-muted)",
                                    fontFamily: "var(--font-heading)",
                                  }}
                                >
                                  Pool: {displayItem.reductionPoolCurrent ?? 0}{" "}
                                  / {displayItem.reductionPoolMax}
                                </span>
                                {shieldBroken && (
                                  <button
                                    onClick={() =>
                                      updateItem(displayItem.id, {
                                        reductionPoolCurrent:
                                          displayItem.reductionPoolMax,
                                      })
                                    }
                                    style={{
                                      fontSize: "0.55rem",
                                      padding: "0.05rem 0.35rem",
                                      border: "1px solid #ff7979",
                                      borderRadius: "0.2rem",
                                      backgroundColor: "transparent",
                                      color: "#ff7979",
                                      cursor: "pointer",
                                      fontFamily: "var(--font-heading)",
                                      fontWeight: 700,
                                    }}
                                  >
                                    Repair
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        onClick={() => setPickingSlot(pickerOpen ? null : slot)}
                        style={{
                          fontSize: "0.75rem",
                          color: pickerOpen
                            ? "var(--primary)"
                            : "var(--text-muted)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: 0,
                          fontFamily: "var(--font-heading)",
                          fontWeight: 600,
                        }}
                      >
                        + Equip {pickerOpen ? "▲" : "▼"}
                      </button>
                    )}
                  </div>
                  {pickerOpen && (
                    <div
                      style={{
                        border: "1.5px solid var(--primary)",
                        borderTop: "none",
                        borderRadius: "0 0 0.5rem 0.5rem",
                        backgroundColor: "var(--bg-card)",
                        maxHeight: "160px",
                        overflowY: "auto",
                      }}
                    >
                      {eligible.length === 0 ? (
                        <div
                          style={{
                            padding: "0.5rem 0.75rem",
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                          }}
                        >
                          Nothing available for this slot
                        </div>
                      ) : (
                        eligible.map((item) => {
                          const itemOpts = getEquipOptions(item);
                          const actualSlot: InventorySlot =
                            slot === "Main Hand" &&
                            itemOpts.some((o) => o.slot === "Two Hands")
                              ? "Two Hands"
                              : slot;
                          const slotLabel =
                            actualSlot === "Two Hands" ? " (2H)" : "";
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                equipItem(item.id, actualSlot);
                                setPickingSlot(null);
                              }}
                              style={{
                                width: "100%",
                                padding: "0.375rem 0.75rem",
                                border: "none",
                                borderBottom: "1px solid var(--border)",
                                backgroundColor: "transparent",
                                cursor: "pointer",
                                textAlign: "left",
                                display: "flex",
                                gap: "0.5rem",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "var(--font-heading)",
                                  fontWeight: 600,
                                  fontSize: "0.8rem",
                                  color: "var(--text)",
                                  flex: 1,
                                }}
                              >
                                {item.name}
                                {slotLabel}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.62rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                {item.category}
                              </span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Currency + carry weight */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            marginBottom: "0.875rem",
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              fontFamily: "var(--font-heading)",
              whiteSpace: "nowrap",
            }}
          >
            Currency
          </span>
          <input
            type="text"
            defaultValue={c.currency}
            onBlur={(e) => persist({ currency: e.target.value })}
            placeholder="—"
            style={{ ...inputStyle, width: "140px" }}
          />
          <span
            style={{
              fontSize: "0.78rem",
              color:
                totalCarried > carryWeight ? "#EF4444" : "var(--text-muted)",
            }}
          >
            Weight: {totalCarried.toFixed(1)} / {carryWeight}
            {totalCarried > carryWeight && <strong> ⚠ Over</strong>}
          </span>
        </div>

        {/* Inventory list */}
        {inventory.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.25rem",
              marginBottom: "0.75rem",
            }}
          >
            {inventory.map((item) => {
              const isEditing = editingItemId === item.id;
              const equipOpts = getEquipOptions(item);
              return (
                <div key={item.id}>
                  {/* Main row */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      flexWrap: "wrap",
                      padding: "0.4rem 0.625rem",
                      backgroundColor: item.equipped
                        ? "var(--primary-light)"
                        : "var(--bg-nav)",
                      border: `1px solid ${item.equipped ? "var(--primary)" : "var(--border)"}`,
                      borderRadius: isEditing
                        ? "0.375rem 0.375rem 0 0"
                        : notePopoverItemId === item.id
                          ? "0.375rem 0.375rem 0 0"
                          : "0.375rem",
                    }}
                  >
                    {/* Name + weapon stats + traits inline */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        flex: 1,
                        minWidth: "80px",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          color: "var(--text)",
                        }}
                      >
                        {item.name}
                      </span>
                      {(() => {
                        const ws = weaponStats(item);
                        return ws ? (
                          <span
                            style={{
                              fontSize: "0.62rem",
                              color: "var(--text-muted)",
                              fontFamily: "var(--font-heading)",
                            }}
                          >
                            {ws.toHit} · {ws.damage}{" "}
                            <span style={{ opacity: 0.7 }}>({ws.modStat})</span>
                          </span>
                        ) : null;
                      })()}
                      {item.category === "Armor" &&
                        (item.armorBonus ?? 0) > 0 && (
                          <span
                            style={{
                              fontSize: "0.62rem",
                              color: "var(--text-muted)",
                              fontFamily: "var(--font-heading)",
                            }}
                          >
                            +{item.armorBonus} Armor Def
                            {item.armorCategory
                              ? ` · ${item.armorCategory}`
                              : ""}
                          </span>
                        )}
                      {item.category === "Shield" &&
                        (item.armorBonus ?? 0) > 0 && (
                          <span
                            style={{
                              fontSize: "0.62rem",
                              color: "var(--text-muted)",
                              fontFamily: "var(--font-heading)",
                            }}
                          >
                            +{item.armorBonus} Shield Def
                          </span>
                        )}
                      {/* Traits badges — BUG-06 */}
                      {["Weapon", "Armor", "Shield"].includes(item.category) &&
                        (item.traits ?? []).length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "0.2rem",
                              marginTop: "0.2rem",
                            }}
                          >
                            {(item.traits ?? []).map((t) => (
                              <span
                                key={t}
                                style={{
                                  fontSize: "0.58rem",
                                  padding: "0.05rem 0.3rem",
                                  borderRadius: "9999px",
                                  backgroundColor: "var(--bg-card)",
                                  color: "var(--text-muted)",
                                  border: "1px solid var(--border)",
                                  fontFamily: "var(--font-heading)",
                                  fontWeight: 600,
                                }}
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                    {/* Category badge */}
                    <span
                      style={{
                        fontSize: "0.6rem",
                        padding: "0.1rem 0.3rem",
                        borderRadius: "9999px",
                        backgroundColor: "var(--bg-card)",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border)",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.category}
                    </span>
                    {/* Qty stepper — hidden for non-stackable weapons (melee, bows, etc.) */}
                    {(() => {
                      const isNonStackWeapon =
                        item.category === "Weapon" &&
                        !/\b(throwing|javelin|dart|shuriken|sling)\b/i.test(
                          item.name,
                        );
                      if (isNonStackWeapon) return null;
                      return (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.15rem",
                          }}
                        >
                          <button
                            onClick={() =>
                              updateItem(item.id, {
                                quantity: Math.max(1, item.quantity - 1),
                              })
                            }
                            style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: "50%",
                              border: "1px solid var(--border)",
                              backgroundColor: "var(--bg-card)",
                              cursor: "pointer",
                              fontSize: "0.7rem",
                              color: "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            −
                          </button>
                          <span
                            style={{
                              minWidth: "20px",
                              textAlign: "center",
                              fontWeight: 700,
                              color: "var(--text)",
                              fontSize: "0.75rem",
                            }}
                          >
                            ×{item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateItem(item.id, {
                                quantity: item.quantity + 1,
                              })
                            }
                            style={{
                              width: "16px",
                              height: "16px",
                              borderRadius: "50%",
                              border: "1px solid var(--border)",
                              backgroundColor: "var(--bg-card)",
                              cursor: "pointer",
                              fontSize: "0.7rem",
                              color: "var(--text-muted)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            +
                          </button>
                        </div>
                      );
                    })()}
                    {/* Weight */}
                    {item.weight > 0 && (
                      <span
                        style={{
                          fontSize: "0.68rem",
                          color: "var(--text-muted)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.weight}wt
                      </span>
                    )}
                    {/* Notes icon — BUG-07 */}
                    {item.notes && (
                      <button
                        onClick={() =>
                          setNotePopoverItemId(
                            notePopoverItemId === item.id ? null : item.id,
                          )
                        }
                        title="Show notes"
                        style={{
                          padding: "0.1rem 0.25rem",
                          border: `1px solid ${notePopoverItemId === item.id ? "var(--primary)" : "var(--border)"}`,
                          borderRadius: "0.25rem",
                          backgroundColor:
                            notePopoverItemId === item.id
                              ? "var(--primary-light)"
                              : "transparent",
                          cursor: "pointer",
                          color:
                            notePopoverItemId === item.id
                              ? "var(--primary)"
                              : "var(--text-muted)",
                          fontSize: "0.68rem",
                        }}
                      >
                        📋
                      </button>
                    )}
                    {/* Equip slot pills */}
                    {equipOpts.length > 0 && (
                      <div style={{ display: "flex", gap: "0.2rem" }}>
                        {equipOpts.map(({ label, slot: targetSlot }) => {
                          const active =
                            item.equipped && item.slot === targetSlot;
                          return (
                            <button
                              key={targetSlot}
                              onClick={() =>
                                active
                                  ? updateItem(item.id, { equipped: false })
                                  : equipItem(item.id, targetSlot)
                              }
                              style={{
                                padding: "0.15rem 0.45rem",
                                fontSize: "0.65rem",
                                fontFamily: "var(--font-heading)",
                                fontWeight: 700,
                                borderRadius: "0.25rem",
                                border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                                backgroundColor: active
                                  ? "var(--primary)"
                                  : "transparent",
                                color: active ? "#fff" : "var(--text-muted)",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {label}
                              {active ? " ✓" : ""}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {/* Edit + delete */}
                    <button
                      onClick={() => {
                        setEditingItemId(isEditing ? null : item.id);
                        setEditFields({ ...item });
                        setTraitInputVal("");
                      }}
                      style={{
                        padding: "0.15rem 0.3rem",
                        border: "1px solid var(--border)",
                        borderRadius: "0.25rem",
                        backgroundColor: isEditing
                          ? "var(--primary-light)"
                          : "transparent",
                        cursor: "pointer",
                        color: isEditing
                          ? "var(--primary)"
                          : "var(--text-muted)",
                        fontSize: "0.7rem",
                      }}
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      style={{
                        padding: "0.15rem 0.3rem",
                        border: "1px solid var(--border)",
                        borderRadius: "0.25rem",
                        backgroundColor: "transparent",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        fontSize: "0.7rem",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  {/* Notes popover — BUG-07 */}
                  {notePopoverItemId === item.id && item.notes && (
                    <div
                      style={{
                        padding: "0.5rem 0.75rem",
                        border: "1px solid var(--primary)",
                        borderTop: "none",
                        borderRadius: "0 0 0.375rem 0.375rem",
                        backgroundColor: "var(--primary-light)",
                        fontSize: "0.82rem",
                        color: "var(--text)",
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.5,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "var(--primary)",
                          fontFamily: "var(--font-heading)",
                          display: "block",
                          marginBottom: "0.2rem",
                        }}
                      >
                        Notes
                      </span>
                      {item.notes}
                    </div>
                  )}
                  {/* Edit form */}
                  {isEditing && (
                    <div
                      style={{
                        padding: "0.75rem",
                        border: "1px solid var(--primary)",
                        borderTop: "none",
                        borderRadius: "0 0 0.375rem 0.375rem",
                        backgroundColor: "var(--bg-nav)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.5rem",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr auto auto auto auto",
                            gap: "0.5rem",
                            alignItems: "end",
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: "0.6rem",
                                color: "var(--text-muted)",
                                marginBottom: "0.15rem",
                              }}
                            >
                              Name
                            </div>
                            <input
                              value={editFields.name ?? ""}
                              onChange={(e) =>
                                setEditFields((f) => ({
                                  ...f,
                                  name: e.target.value,
                                }))
                              }
                              style={{ ...inputStyle, width: "100%" }}
                            />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "0.6rem",
                                color: "var(--text-muted)",
                                marginBottom: "0.15rem",
                              }}
                            >
                              Category
                            </div>
                            <select
                              value={editFields.category ?? "Misc"}
                              onChange={(e) =>
                                setEditFields((f) => ({
                                  ...f,
                                  category: e.target.value as InventoryCategory,
                                }))
                              }
                              style={inputStyle}
                            >
                              {INVENTORY_CATEGORIES.map((cat) => (
                                <option key={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "0.6rem",
                                color: "var(--text-muted)",
                                marginBottom: "0.15rem",
                              }}
                            >
                              Weight
                            </div>
                            <input
                              type="number"
                              value={editFields.weight ?? 0}
                              min={0}
                              step={0.1}
                              onChange={(e) =>
                                setEditFields((f) => ({
                                  ...f,
                                  weight: parseFloat(e.target.value) || 0,
                                }))
                              }
                              style={{ ...inputStyle, width: "55px" }}
                            />
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "0.6rem",
                                color: "var(--text-muted)",
                                marginBottom: "0.15rem",
                              }}
                            >
                              MW Bonus
                            </div>
                            <select
                              value={editFields.masterworkBonus ?? 0}
                              onChange={(e) =>
                                setEditFields((f) => ({
                                  ...f,
                                  masterworkBonus: parseInt(e.target.value),
                                }))
                              }
                              style={{ ...inputStyle, width: "65px" }}
                            >
                              <option value={0}>None</option>
                              <option value={1}>+1</option>
                              <option value={2}>+2</option>
                              <option value={3}>+3</option>
                            </select>
                          </div>
                          <div>
                            <div
                              style={{
                                fontSize: "0.6rem",
                                color: "var(--text-muted)",
                                marginBottom: "0.15rem",
                              }}
                            >
                              Slot
                            </div>
                            <select
                              value={editFields.slot ?? ""}
                              onChange={(e) =>
                                setEditFields((f) => ({
                                  ...f,
                                  slot: (e.target.value ||
                                    null) as InventorySlot,
                                }))
                              }
                              style={inputStyle}
                            >
                              <option value="">None</option>
                              <option value="Main Hand">Main Hand</option>
                              <option value="Off Hand">Off Hand</option>
                              <option value="Two Hands">Two Hands</option>
                              <option value="Body">Body</option>
                            </select>
                          </div>
                        </div>
                        {editFields.category === "Armor" && (
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              alignItems: "end",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: "0.6rem",
                                  color: "var(--text-muted)",
                                  marginBottom: "0.15rem",
                                }}
                              >
                                Armor Category
                              </div>
                              <select
                                value={editFields.armorCategory ?? ""}
                                onChange={(e) =>
                                  setEditFields((f) => ({
                                    ...f,
                                    armorCategory: (e.target.value || null) as
                                      | "Light"
                                      | "Medium"
                                      | "Heavy"
                                      | null,
                                  }))
                                }
                                style={inputStyle}
                              >
                                <option value="">—</option>
                                <option value="Light">Light</option>
                                <option value="Medium">Medium</option>
                                <option value="Heavy">Heavy</option>
                              </select>
                            </div>
                            <div>
                              <div
                                style={{
                                  fontSize: "0.6rem",
                                  color: "var(--text-muted)",
                                  marginBottom: "0.15rem",
                                }}
                              >
                                Armor Bonus
                              </div>
                              <input
                                type="number"
                                value={editFields.armorBonus ?? 0}
                                min={0}
                                max={10}
                                onChange={(e) =>
                                  setEditFields((f) => ({
                                    ...f,
                                    armorBonus: parseInt(e.target.value) || 0,
                                  }))
                                }
                                style={{ ...inputStyle, width: "55px" }}
                              />
                            </div>
                          </div>
                        )}
                        {editFields.category === "Weapon" && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.5rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                gap: "0.5rem",
                                alignItems: "end",
                                flexWrap: "wrap",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontSize: "0.6rem",
                                    color: "var(--text-muted)",
                                    marginBottom: "0.15rem",
                                  }}
                                >
                                  Modifier Stat
                                </div>
                                <select
                                  value={editFields.modifierStat ?? ""}
                                  onChange={(e) =>
                                    setEditFields((f) => ({
                                      ...f,
                                      modifierStat: (e.target.value || null) as
                                        | "body"
                                        | "mind"
                                        | "will"
                                        | null,
                                    }))
                                  }
                                  style={{ ...inputStyle, width: "70px" }}
                                >
                                  <option value="">—</option>
                                  <option value="body">Body</option>
                                  <option value="mind">Mind</option>
                                  <option value="will">Will</option>
                                </select>
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: "0.6rem",
                                    color: "var(--text-muted)",
                                    marginBottom: "0.15rem",
                                  }}
                                >
                                  Dice
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.2rem",
                                    alignItems: "center",
                                  }}
                                >
                                  <input
                                    type="number"
                                    value={editFields.damageDiceCount ?? 0}
                                    min={0}
                                    max={20}
                                    onChange={(e) =>
                                      setEditFields((f) => ({
                                        ...f,
                                        damageDiceCount:
                                          parseInt(e.target.value) || 0,
                                      }))
                                    }
                                    style={{ ...inputStyle, width: "40px" }}
                                  />
                                  <span
                                    style={{
                                      fontSize: "0.75rem",
                                      color: "var(--text-muted)",
                                    }}
                                  >
                                    d
                                  </span>
                                  <select
                                    value={editFields.damageDiceSize ?? 6}
                                    onChange={(e) =>
                                      setEditFields((f) => ({
                                        ...f,
                                        damageDiceSize: parseInt(
                                          e.target.value,
                                        ),
                                      }))
                                    }
                                    style={{ ...inputStyle, width: "55px" }}
                                  >
                                    {[4, 6, 8, 10, 12, 20].map((d) => (
                                      <option key={d} value={d}>
                                        d{d}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: "0.6rem",
                                    color: "var(--text-muted)",
                                    marginBottom: "0.15rem",
                                  }}
                                >
                                  MW Rank
                                </div>
                                <select
                                  value={editFields.masterworkBonus ?? 0}
                                  onChange={(e) =>
                                    setEditFields((f) => ({
                                      ...f,
                                      masterworkBonus: parseInt(e.target.value),
                                    }))
                                  }
                                  style={{ ...inputStyle, width: "80px" }}
                                >
                                  <option value={0}>None</option>
                                  <option value={1}>Superior (+1)</option>
                                  <option value={2}>Mastered (+2)</option>
                                  <option value={3}>Fabled (+3)</option>
                                </select>
                              </div>
                              <div style={{ paddingBottom: "0.15rem" }}>
                                <label
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.3rem",
                                    cursor: "pointer",
                                    fontSize: "0.75rem",
                                    color: "var(--text-muted)",
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={editFields.isRanged ?? false}
                                    onChange={(e) =>
                                      setEditFields((f) => ({
                                        ...f,
                                        isRanged: e.target.checked,
                                      }))
                                    }
                                  />
                                  Ranged
                                </label>
                              </div>
                            </div>
                            <div
                              style={{
                                display: "flex",
                                gap: "1rem",
                                flexWrap: "wrap",
                              }}
                            >
                              <div>
                                <div
                                  style={{
                                    fontSize: "0.6rem",
                                    color: "var(--text-muted)",
                                    marginBottom: "0.2rem",
                                  }}
                                >
                                  Armament Type
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "0.35rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {(
                                    [
                                      "simple",
                                      "martial",
                                      "finesse",
                                      "ranged",
                                      "catalyst",
                                      "defensive",
                                    ] as const
                                  ).map((tag) => {
                                    const active = (
                                      editFields.armamentTags ?? []
                                    ).includes(tag);
                                    return (
                                      <button
                                        key={tag}
                                        type="button"
                                        onClick={() =>
                                          setEditFields((f) => ({
                                            ...f,
                                            armamentTags: active
                                              ? (f.armamentTags ?? []).filter(
                                                  (t) => t !== tag,
                                                )
                                              : [
                                                  ...(f.armamentTags ?? []),
                                                  tag,
                                                ],
                                          }))
                                        }
                                        style={{
                                          padding: "0.1rem 0.4rem",
                                          fontSize: "0.65rem",
                                          fontFamily: "var(--font-heading)",
                                          fontWeight: 600,
                                          borderRadius: "9999px",
                                          border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                                          backgroundColor: active
                                            ? "var(--primary-light)"
                                            : "transparent",
                                          color: active
                                            ? "var(--primary)"
                                            : "var(--text-muted)",
                                          cursor: "pointer",
                                          textTransform: "capitalize",
                                        }}
                                      >
                                        {tag}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: "0.6rem",
                                    color: "var(--text-muted)",
                                    marginBottom: "0.2rem",
                                  }}
                                >
                                  Damage Type
                                </div>
                                <div
                                  style={{ display: "flex", gap: "0.35rem" }}
                                >
                                  {(
                                    ["puncture", "slash", "blunt"] as const
                                  ).map((tag) => {
                                    const active = (
                                      editFields.damageTypeTags ?? []
                                    ).includes(tag);
                                    return (
                                      <button
                                        key={tag}
                                        type="button"
                                        onClick={() =>
                                          setEditFields((f) => ({
                                            ...f,
                                            damageTypeTags: active
                                              ? (f.damageTypeTags ?? []).filter(
                                                  (t) => t !== tag,
                                                )
                                              : [
                                                  ...(f.damageTypeTags ?? []),
                                                  tag,
                                                ],
                                          }))
                                        }
                                        style={{
                                          padding: "0.1rem 0.4rem",
                                          fontSize: "0.65rem",
                                          fontFamily: "var(--font-heading)",
                                          fontWeight: 600,
                                          borderRadius: "9999px",
                                          border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                                          backgroundColor: active
                                            ? "var(--primary-light)"
                                            : "transparent",
                                          color: active
                                            ? "var(--primary)"
                                            : "var(--text-muted)",
                                          cursor: "pointer",
                                          textTransform: "capitalize",
                                        }}
                                      >
                                        {tag}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: "0.6rem",
                                    color: "var(--text-muted)",
                                    marginBottom: "0.2rem",
                                  }}
                                >
                                  Equip Slots
                                </div>
                                <div
                                  style={{ display: "flex", gap: "0.35rem" }}
                                >
                                  {[
                                    { tag: "main_hand", label: "Main Hand" },
                                    { tag: "off_hand", label: "Off Hand" },
                                    { tag: "two_hands", label: "2H" },
                                  ].map(({ tag, label }) => {
                                    const active = (
                                      editFields.equipSlots ?? []
                                    ).includes(tag);
                                    return (
                                      <button
                                        key={tag}
                                        type="button"
                                        onClick={() =>
                                          setEditFields((f) => ({
                                            ...f,
                                            equipSlots: active
                                              ? (f.equipSlots ?? []).filter(
                                                  (t) => t !== tag,
                                                )
                                              : [...(f.equipSlots ?? []), tag],
                                          }))
                                        }
                                        style={{
                                          padding: "0.1rem 0.4rem",
                                          fontSize: "0.65rem",
                                          fontFamily: "var(--font-heading)",
                                          fontWeight: 600,
                                          borderRadius: "9999px",
                                          border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                                          backgroundColor: active
                                            ? "var(--primary-light)"
                                            : "transparent",
                                          color: active
                                            ? "var(--primary)"
                                            : "var(--text-muted)",
                                          cursor: "pointer",
                                        }}
                                      >
                                        {label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                        {/* Shield-specific fields — BUG-06 */}
                        {editFields.category === "Shield" && (
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              alignItems: "end",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: "0.6rem",
                                  color: "var(--text-muted)",
                                  marginBottom: "0.15rem",
                                }}
                              >
                                Shield Bonus
                              </div>
                              <input
                                type="number"
                                value={editFields.armorBonus ?? 0}
                                min={0}
                                max={10}
                                onChange={(e) =>
                                  setEditFields((f) => ({
                                    ...f,
                                    armorBonus: parseInt(e.target.value) || 0,
                                  }))
                                }
                                style={{ ...inputStyle, width: "60px" }}
                              />
                            </div>
                          </div>
                        )}
                        {/* Traits editor for Weapon/Armor/Shield — BUG-06 */}
                        {["Weapon", "Armor", "Shield"].includes(
                          editFields.category ?? "",
                        ) && (
                          <div>
                            <div
                              style={{
                                fontSize: "0.6rem",
                                color: "var(--text-muted)",
                                marginBottom: "0.2rem",
                              }}
                            >
                              Traits
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "0.25rem",
                                marginBottom: "0.3rem",
                              }}
                            >
                              {(editFields.traits ?? []).length === 0 && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    color: "var(--text-muted)",
                                    fontStyle: "italic",
                                  }}
                                >
                                  No traits
                                </span>
                              )}
                              {(editFields.traits ?? []).map((t) => (
                                <span
                                  key={t}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.2rem",
                                    fontSize: "0.65rem",
                                    padding: "0.1rem 0.35rem",
                                    borderRadius: "9999px",
                                    backgroundColor: "var(--bg-nav)",
                                    color: "var(--text)",
                                    border: "1px solid var(--border)",
                                    fontFamily: "var(--font-heading)",
                                    fontWeight: 600,
                                  }}
                                >
                                  {t}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditFields((f) => ({
                                        ...f,
                                        traits: (f.traits ?? []).filter(
                                          (x) => x !== t,
                                        ),
                                      }))
                                    }
                                    style={{
                                      background: "none",
                                      border: "none",
                                      cursor: "pointer",
                                      color: "var(--text-muted)",
                                      fontSize: "0.6rem",
                                      padding: 0,
                                      lineHeight: 1,
                                    }}
                                  >
                                    ✕
                                  </button>
                                </span>
                              ))}
                            </div>
                            <div style={{ display: "flex", gap: "0.3rem" }}>
                              <input
                                value={traitInputVal}
                                onChange={(e) =>
                                  setTraitInputVal(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (
                                    e.key === "Enter" &&
                                    traitInputVal.trim()
                                  ) {
                                    e.preventDefault();
                                    const t = traitInputVal.trim();
                                    setEditFields((f) => ({
                                      ...f,
                                      traits: [
                                        ...new Set([...(f.traits ?? []), t]),
                                      ],
                                    }));
                                    setTraitInputVal("");
                                  }
                                }}
                                placeholder="Add trait…"
                                style={{
                                  ...inputStyle,
                                  flex: 1,
                                  fontSize: "0.75rem",
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const t = traitInputVal.trim();
                                  if (!t) return;
                                  setEditFields((f) => ({
                                    ...f,
                                    traits: [
                                      ...new Set([...(f.traits ?? []), t]),
                                    ],
                                  }));
                                  setTraitInputVal("");
                                }}
                                style={{
                                  padding: "0.3rem 0.6rem",
                                  border: "none",
                                  borderRadius: "0.25rem",
                                  backgroundColor: "var(--primary)",
                                  color: "var(--text-on-primary)",
                                  cursor: "pointer",
                                  fontFamily: "var(--font-heading)",
                                  fontWeight: 600,
                                  fontSize: "0.72rem",
                                }}
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        )}
                        <div>
                          <div
                            style={{
                              fontSize: "0.6rem",
                              color: "var(--text-muted)",
                              marginBottom: "0.15rem",
                            }}
                          >
                            Notes
                          </div>
                          <input
                            value={editFields.notes ?? ""}
                            onChange={(e) =>
                              setEditFields((f) => ({
                                ...f,
                                notes: e.target.value,
                              }))
                            }
                            placeholder="Optional…"
                            style={{ ...inputStyle, width: "100%" }}
                          />
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <button
                            onClick={() => {
                              updateItem(item.id, editFields);
                              setEditingItemId(null);
                            }}
                            style={{
                              padding: "0.3rem 0.75rem",
                              backgroundColor: "var(--primary)",
                              color: "var(--text-on-primary)",
                              border: "none",
                              borderRadius: "0.25rem",
                              cursor: "pointer",
                              fontFamily: "var(--font-heading)",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingItemId(null)}
                            style={{
                              padding: "0.3rem 0.75rem",
                              backgroundColor: "transparent",
                              color: "var(--text-muted)",
                              border: "1px solid var(--border)",
                              borderRadius: "0.25rem",
                              cursor: "pointer",
                              fontSize: "0.8rem",
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Add item */}
        {!addingItem ? (
          <button
            onClick={() => setAddingItem(true)}
            style={{
              padding: "0.4rem 0.875rem",
              border: "1.5px dashed var(--border)",
              borderRadius: "0.375rem",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: "var(--primary)",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "0.8rem",
            }}
          >
            + Add Item
          </button>
        ) : (
          <div
            style={{
              padding: "0.875rem",
              backgroundColor: "var(--bg-nav)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <div
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                fontFamily: "var(--font-heading)",
              }}
            >
              Add Item
            </div>

            {/* Catalog search (Issue 9) */}
            <div>
              <div
                style={{
                  fontSize: "0.6rem",
                  color: "var(--text-muted)",
                  marginBottom: "0.25rem",
                }}
              >
                Search catalog
              </div>
              <input
                value={catalogSearch}
                onChange={(e) => {
                  setCatalogSearch(e.target.value);
                  setCatalogSelected(null);
                }}
                placeholder="Search weapons, armor, kits…"
                style={{
                  ...inputStyle,
                  width: "100%",
                  marginBottom: "0.375rem",
                }}
              />
              {catalogSearch.trim() && (
                <div
                  style={{
                    maxHeight: "160px",
                    overflowY: "auto",
                    border: "1px solid var(--border)",
                    borderRadius: "0.375rem",
                    backgroundColor: "var(--bg-card)",
                  }}
                >
                  {filteredCatalog.length === 0 ? (
                    <div
                      style={{
                        padding: "0.5rem 0.75rem",
                        fontSize: "0.8rem",
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      No results — use manual entry below
                    </div>
                  ) : (
                    filteredCatalog.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => selectCatalogItem(item)}
                        style={{
                          width: "100%",
                          padding: "0.4rem 0.75rem",
                          border: "none",
                          borderBottom: "1px solid var(--border)",
                          backgroundColor:
                            catalogSelected?.id === item.id
                              ? "var(--primary-light)"
                              : "transparent",
                          cursor: "pointer",
                          textAlign: "left",
                          display: "flex",
                          gap: "0.5rem",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-heading)",
                            fontWeight: 600,
                            fontSize: "0.825rem",
                            color: "var(--text)",
                          }}
                        >
                          {item.name}
                        </span>
                        <span
                          style={{
                            fontSize: "0.65rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          {item.category}
                        </span>
                        {item.traits.length > 0 && (
                          <span
                            style={{
                              fontSize: "0.62rem",
                              color: "var(--text-muted)",
                              fontStyle: "italic",
                            }}
                          >
                            {item.traits.join(", ")}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Manual / prefilled fields */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto auto",
                gap: "0.5rem",
                alignItems: "end",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.2rem",
                  }}
                >
                  Name *
                </div>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Item name…"
                  style={{ ...inputStyle, width: "100%" }}
                  onKeyDown={(e) => e.key === "Enter" && addItem()}
                  autoFocus={!catalogSearch}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.2rem",
                  }}
                >
                  Category
                </div>
                <select
                  value={newCategory}
                  onChange={(e) =>
                    setNewCategory(e.target.value as InventoryCategory)
                  }
                  style={inputStyle}
                >
                  {INVENTORY_CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.2rem",
                  }}
                >
                  Qty
                </div>
                <input
                  type="number"
                  value={newQty}
                  min={1}
                  onChange={(e) =>
                    setNewQty(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  style={{ ...inputStyle, width: "55px" }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.2rem",
                  }}
                >
                  Weight
                </div>
                <input
                  type="number"
                  value={newWeight}
                  min={0}
                  step={0.1}
                  onChange={(e) =>
                    setNewWeight(parseFloat(e.target.value) || 0)
                  }
                  style={{ ...inputStyle, width: "55px" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "end" }}>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.2rem",
                  }}
                >
                  Notes
                </div>
                <input
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Optional…"
                  style={{ ...inputStyle, width: "100%" }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "0.6rem",
                    color: "var(--text-muted)",
                    marginBottom: "0.2rem",
                  }}
                >
                  Slot
                </div>
                <select
                  value={newSlot ?? ""}
                  onChange={(e) =>
                    setNewSlot((e.target.value || null) as InventorySlot)
                  }
                  style={inputStyle}
                >
                  <option value="">None</option>
                  <option value="Main Hand">Main Hand</option>
                  <option value="Off Hand">Off Hand</option>
                  <option value="Two Hands">Two Hands</option>
                  <option value="Body">Body</option>
                </select>
              </div>
            </div>
            {newCategory === "Armor" && (
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "end" }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-muted)",
                      marginBottom: "0.2rem",
                    }}
                  >
                    Armor Category
                  </div>
                  <select
                    value={newArmorCategory ?? ""}
                    onChange={(e) =>
                      setNewArmorCategory(
                        (e.target.value || null) as
                          | "Light"
                          | "Medium"
                          | "Heavy"
                          | null,
                      )
                    }
                    style={inputStyle}
                  >
                    <option value="">—</option>
                    <option value="Light">Light</option>
                    <option value="Medium">Medium</option>
                    <option value="Heavy">Heavy</option>
                  </select>
                </div>
                <div>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-muted)",
                      marginBottom: "0.2rem",
                    }}
                  >
                    Armor Bonus
                  </div>
                  <input
                    type="number"
                    value={newArmorBonus}
                    min={0}
                    max={10}
                    onChange={(e) =>
                      setNewArmorBonus(parseInt(e.target.value) || 0)
                    }
                    style={{ ...inputStyle, width: "55px" }}
                  />
                </div>
              </div>
            )}
            {newCategory === "Weapon" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "end",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--text-muted)",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Modifier Stat
                    </div>
                    <select
                      value={newModifierStat ?? ""}
                      onChange={(e) =>
                        setNewModifierStat(
                          (e.target.value || null) as
                            | "body"
                            | "mind"
                            | "will"
                            | null,
                        )
                      }
                      style={{ ...inputStyle, width: "70px" }}
                    >
                      <option value="">—</option>
                      <option value="body">Body</option>
                      <option value="mind">Mind</option>
                      <option value="will">Will</option>
                    </select>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--text-muted)",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Dice
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.2rem",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="number"
                        value={newDamageDiceCount}
                        min={0}
                        max={20}
                        onChange={(e) =>
                          setNewDamageDiceCount(parseInt(e.target.value) || 0)
                        }
                        style={{ ...inputStyle, width: "40px" }}
                      />
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        d
                      </span>
                      <select
                        value={newDamageDiceSize}
                        onChange={(e) =>
                          setNewDamageDiceSize(parseInt(e.target.value))
                        }
                        style={{ ...inputStyle, width: "55px" }}
                      >
                        {[4, 6, 8, 10, 12, 20].map((d) => (
                          <option key={d} value={d}>
                            d{d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--text-muted)",
                        marginBottom: "0.2rem",
                      }}
                    >
                      MW Rank
                    </div>
                    <select
                      value={newMasterworkBonus}
                      onChange={(e) =>
                        setNewMasterworkBonus(parseInt(e.target.value))
                      }
                      style={{ ...inputStyle, width: "80px" }}
                    >
                      <option value={0}>None</option>
                      <option value={1}>Superior (+1)</option>
                      <option value={2}>Mastered (+2)</option>
                      <option value={3}>Fabled (+3)</option>
                    </select>
                  </div>
                  <div style={{ paddingBottom: "0.2rem" }}>
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={newIsRanged}
                        onChange={(e) => setNewIsRanged(e.target.checked)}
                      />
                      Ranged
                    </label>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <div
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--text-muted)",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Armament Type
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.3rem",
                        flexWrap: "wrap",
                      }}
                    >
                      {(
                        [
                          "simple",
                          "martial",
                          "finesse",
                          "ranged",
                          "catalyst",
                          "defensive",
                        ] as const
                      ).map((tag) => {
                        const active = newArmamentTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setNewArmamentTags((prev) =>
                                active
                                  ? prev.filter((t) => t !== tag)
                                  : [...prev, tag],
                              )
                            }
                            style={{
                              padding: "0.1rem 0.4rem",
                              fontSize: "0.65rem",
                              fontFamily: "var(--font-heading)",
                              fontWeight: 600,
                              borderRadius: "9999px",
                              border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                              backgroundColor: active
                                ? "var(--primary-light)"
                                : "transparent",
                              color: active
                                ? "var(--primary)"
                                : "var(--text-muted)",
                              cursor: "pointer",
                              textTransform: "capitalize",
                            }}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--text-muted)",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Damage Type
                    </div>
                    <div style={{ display: "flex", gap: "0.3rem" }}>
                      {(["puncture", "slash", "blunt"] as const).map((tag) => {
                        const active = newDamageTypeTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setNewDamageTypeTags((prev) =>
                                active
                                  ? prev.filter((t) => t !== tag)
                                  : [...prev, tag],
                              )
                            }
                            style={{
                              padding: "0.1rem 0.4rem",
                              fontSize: "0.65rem",
                              fontFamily: "var(--font-heading)",
                              fontWeight: 600,
                              borderRadius: "9999px",
                              border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                              backgroundColor: active
                                ? "var(--primary-light)"
                                : "transparent",
                              color: active
                                ? "var(--primary)"
                                : "var(--text-muted)",
                              cursor: "pointer",
                              textTransform: "capitalize",
                            }}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--text-muted)",
                        marginBottom: "0.2rem",
                      }}
                    >
                      Equip Slots
                    </div>
                    <div style={{ display: "flex", gap: "0.3rem" }}>
                      {[
                        { tag: "main_hand", label: "Main Hand" },
                        { tag: "off_hand", label: "Off Hand" },
                        { tag: "two_hands", label: "2H" },
                      ].map(({ tag, label }) => {
                        const active = newEquipSlots.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setNewEquipSlots((prev) =>
                                active
                                  ? prev.filter((t) => t !== tag)
                                  : [...prev, tag],
                              )
                            }
                            style={{
                              padding: "0.1rem 0.4rem",
                              fontSize: "0.65rem",
                              fontFamily: "var(--font-heading)",
                              fontWeight: 600,
                              borderRadius: "9999px",
                              border: `1.5px solid ${active ? "var(--primary)" : "var(--border)"}`,
                              backgroundColor: active
                                ? "var(--primary-light)"
                                : "transparent",
                              color: active
                                ? "var(--primary)"
                                : "var(--text-muted)",
                              cursor: "pointer",
                            }}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button
                onClick={addItem}
                disabled={!newName.trim()}
                style={{
                  padding: "0.375rem 0.875rem",
                  backgroundColor: newName.trim()
                    ? "var(--primary)"
                    : "var(--border)",
                  color: "var(--text-on-primary)",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: newName.trim() ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: "0.8rem",
                }}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setAddingItem(false);
                  setNewName("");
                  setCatalogSearch("");
                  setCatalogSelected(null);
                }}
                style={{
                  padding: "0.375rem 0.875rem",
                  backgroundColor: "transparent",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderSpellcastingTab() {
    if (!isCaster && mySpells.length === 0)
      return (
        <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
          No spellcasting.
        </p>
      );

    // Active feed: use persisted list, defaulting to all known spells
    const feedIds =
      (c.activeFeedSpellIds ?? []).length > 0
        ? c.activeFeedSpellIds
        : c.knownSpellIds;
    const feedSpells = mySpells.filter((s) => feedIds.includes(s.id));
    const cantrips = feedSpells.filter((s) => s.isCantrip);
    const tiered = feedSpells.filter((s) => !s.isCantrip);
    const byTier: Record<number, typeof tiered> = {};
    tiered.forEach((s) => {
      if (!byTier[s.tier]) byTier[s.tier] = [];
      byTier[s.tier].push(s);
    });

    function toggleSpellExpand(id: string) {
      setExpandedSpells((prev) => {
        const next = new Set(prev);
        next.has(id) ? next.delete(id) : next.add(id);
        return next;
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
      const current =
        (c.activeFeedSpellIds ?? []).length > 0
          ? c.activeFeedSpellIds
          : c.knownSpellIds;
      const next = current.includes(spellId)
        ? current.filter((id) => id !== spellId)
        : [...current, spellId];
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
        activeFeedSpellIds: (c.activeFeedSpellIds ?? []).filter(
          (id) => id !== spellId,
        ),
      });
    }

    function SpellCard({ spell }: { spell: (typeof mySpells)[0] }) {
      const expanded = expandedSpells.has(spell.id);
      const ampState = activeAmps[spell.id] ?? new Set<number>();
      const baseCost = spell.isCantrip ? 0 : spell.tier;
      const ampCost = (spell.amps ?? []).reduce(
        (sum, amp, i) =>
          ampState.has(i) ? sum + parseInt(amp.cost.replace("+", "")) : sum,
        0,
      );
      const totalCost = baseCost + ampCost;
      const canCast = spell.isCantrip || currentReservoir >= totalCost;
      const hasAmps = (spell.amps ?? []).length > 0;

      function handleCast() {
        if (!canCast || spell.isCantrip) {
          if (spell.isCantrip) return;
          return;
        }
        persist({
          currentReservoir: Math.max(0, currentReservoir - totalCost),
        });
      }

      const badgeStyle: React.CSSProperties = {
        fontSize: "0.62rem",
        fontWeight: 700,
        fontFamily: "var(--font-heading)",
        padding: "0.1rem 0.35rem",
        borderRadius: "9999px",
        border: "1px solid var(--border)",
        backgroundColor: "var(--bg-nav)",
        color: "var(--text-muted)",
        whiteSpace: "nowrap",
      };

      return (
        <div
          style={{
            border: `1px solid ${expanded ? "var(--primary)" : "var(--border)"}`,
            borderRadius: "0.5rem",
            overflow: "hidden",
            backgroundColor: "var(--bg-card)",
          }}
        >
          {/* Collapsed header */}
          <button
            onClick={() => toggleSpellExpand(spell.id)}
            style={{
              width: "100%",
              padding: "0.6rem 0.875rem",
              border: "none",
              cursor: "pointer",
              textAlign: "left",
              backgroundColor: expanded
                ? "var(--primary-light)"
                : "var(--bg-card)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
                fontSize: "0.9rem",
                color: expanded ? "var(--primary)" : "var(--text)",
                flex: 1,
                minWidth: "120px",
              }}
            >
              {spell.name}
            </span>
            <span
              style={{
                ...badgeStyle,
                backgroundColor: spell.isCantrip
                  ? "var(--accent-light)"
                  : "var(--bg-nav)",
                color: spell.isCantrip ? "var(--accent)" : "var(--text-muted)",
                border: spell.isCantrip
                  ? "1px solid #FCD34D"
                  : "1px solid var(--border)",
              }}
            >
              {spell.isCantrip ? "Cantrip" : `Tier ${spell.tier}`}
            </span>
            {!spell.isCantrip && (
              <span
                style={{
                  ...badgeStyle,
                  backgroundColor: canCast
                    ? "var(--primary-light)"
                    : "var(--bg-nav)",
                  color: canCast ? "var(--primary)" : "var(--text-muted)",
                  border: canCast
                    ? "1px solid var(--primary)"
                    : "1px solid var(--border)",
                }}
              >
                Cost: {totalCost}
              </span>
            )}
            {spell.range && (
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {spell.range}
              </span>
            )}
            {spell.duration && (
              <span
                style={{
                  fontSize: "0.7rem",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                {spell.duration}
              </span>
            )}
            {hasAmps && (
              <span
                style={{
                  ...badgeStyle,
                  backgroundColor: "#FEF3C7",
                  color: "#92400E",
                  border: "1px solid #FCD34D",
                }}
              >
                Amps
              </span>
            )}
            <span
              style={{
                fontSize: "0.65rem",
                color: "var(--text-muted)",
                marginLeft: "auto",
              }}
            >
              {expanded ? "▲" : "▼"}
            </span>
          </button>

          {/* Expanded content */}
          {expanded && (
            <div
              style={{
                padding: "0.75rem 0.875rem",
                borderTop: `1px solid ${expanded ? "var(--primary)" : "var(--border)"}`,
              }}
            >
              <MarkdownContent content={spell.descriptionMarkdown} />

              {/* Amp panel */}
              {hasAmps && (
                <div
                  style={{
                    marginTop: "0.75rem",
                    padding: "0.625rem 0.75rem",
                    backgroundColor: "#FFFBEB",
                    border: "1px solid #FCD34D",
                    borderRadius: "0.375rem",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "#92400E",
                      fontFamily: "var(--font-heading)",
                      marginBottom: "0.375rem",
                    }}
                  >
                    Amps
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.3rem",
                    }}
                  >
                    {(spell.amps ?? []).map((amp, i) => {
                      const active = ampState.has(i);
                      return (
                        <button
                          key={i}
                          onClick={() => toggleAmp(spell.id, i)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "0.375rem 0.625rem",
                            border: `1.5px solid ${active ? "#D97706" : "#FCD34D"}`,
                            borderRadius: "0.375rem",
                            backgroundColor: active ? "#FEF3C7" : "#FFFBEB",
                            cursor: "pointer",
                            display: "flex",
                            gap: "0.5rem",
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              fontFamily: "var(--font-heading)",
                              fontWeight: 700,
                              fontSize: "0.72rem",
                              color: active ? "#92400E" : "#D97706",
                              whiteSpace: "nowrap",
                              minWidth: "50px",
                            }}
                          >
                            Amp {amp.cost}
                          </span>
                          <span
                            style={{
                              fontSize: "0.78rem",
                              color: "#78350F",
                              lineHeight: 1.45,
                            }}
                          >
                            {amp.effect}
                          </span>
                          {active && (
                            <span
                              style={{
                                marginLeft: "auto",
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                color: "#92400E",
                                fontFamily: "var(--font-heading)",
                              }}
                            >
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {ampCost > 0 && (
                    <div
                      style={{
                        marginTop: "0.375rem",
                        fontSize: "0.72rem",
                        color: "#92400E",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                      }}
                    >
                      Total cost: {baseCost} + {ampCost} amps = {totalCost}
                    </div>
                  )}
                </div>
              )}

              {/* Cast button */}
              <div
                style={{
                  marginTop: "0.75rem",
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                {!spell.isCantrip ? (
                  <>
                    <button
                      onClick={handleCast}
                      disabled={!canCast}
                      style={{
                        padding: "0.3rem 0.875rem",
                        border: "none",
                        borderRadius: "0.375rem",
                        backgroundColor: canCast
                          ? "var(--primary)"
                          : "var(--border)",
                        color: "var(--text-on-primary)",
                        cursor: canCast ? "pointer" : "not-allowed",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 700,
                        fontSize: "0.8rem",
                      }}
                    >
                      Cast ({totalCost})
                    </button>
                    {!canCast && (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          color: "#EF4444",
                          fontStyle: "italic",
                        }}
                      >
                        Not enough Reservoir.
                      </span>
                    )}
                  </>
                ) : (
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    Cantrip — free to cast.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    // ─── Known Spells Manager Modal ─────────────────────────────────────────
    const cantripCap = isCaster
      ? casterInfo!.casterType === "full"
        ? 3
        : 2
      : 0;
    const myCantripsAll = mySpells.filter((s) => s.isCantrip);
    const cantripAtCap = myCantripsAll.length >= cantripCap;

    // Sphere access: from casterInfo + any feat-granted caster spheres
    const accessibleSpheres = Array.from(
      new Set(
        [
          casterInfo?.casterSource,
          ...allFeats
            .filter(
              (f) =>
                c.selectedFeatIds.includes(f.id) && f.casterInfo?.casterSource,
            )
            .map((f) => f.casterInfo!.casterSource!),
        ].filter(Boolean) as string[],
      ),
    );

    const allSearchable = spellManagerSearch.trim()
      ? spells.filter(
          (s) =>
            s.name.toLowerCase().includes(spellManagerSearch.toLowerCase()) ||
            s.school.toLowerCase().includes(spellManagerSearch.toLowerCase()) ||
            s.sources.some((src) =>
              src.toLowerCase().includes(spellManagerSearch.toLowerCase()),
            ),
        )
      : spells;
    // Filter by accessible spheres; Universal sphere spells always available to all casters
    const sphereFiltered =
      accessibleSpheres.length > 0
        ? allSearchable.filter(
            (s) =>
              s.sources.includes("Universal") ||
              s.sources.some((src) => accessibleSpheres.includes(src)),
          )
        : allSearchable;
    const unknownSpells = sphereFiltered.filter(
      (s) => !c.knownSpellIds.includes(s.id),
    );

    return (
      <div
        style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}
      >
        {/* Summary row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.5rem",
          }}
        >
          <StatCard
            label="Caster"
            value={
              casterInfo?.casterType === "full"
                ? "Full"
                : casterInfo?.casterType === "half"
                  ? "Half"
                  : "Ltd."
            }
            sub={casterInfo?.casterSource ?? ""}
          />
          <div
            style={{
              textAlign: "center",
              padding: "0.625rem 0.5rem",
              backgroundColor: "var(--bg-nav)",
              border: "1px solid var(--border)",
              borderRadius: "0.5rem",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
                fontSize: "0.6rem",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--text-muted)",
                marginBottom: "0.25rem",
              }}
            >
              Reservoir
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.3rem",
              }}
            >
              <button
                onClick={() =>
                  persist({
                    currentReservoir: Math.max(0, currentReservoir - 1),
                  })
                }
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-card)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                −
              </button>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "var(--primary)",
                }}
              >
                {currentReservoir}
                <span
                  style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}
                >
                  /{maxReservoir}
                </span>
              </span>
              <button
                onClick={() =>
                  persist({
                    currentReservoir: Math.min(
                      maxReservoir,
                      currentReservoir + 1,
                    ),
                  })
                }
                style={{
                  width: "20px",
                  height: "20px",
                  borderRadius: "50%",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-card)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +
              </button>
            </div>
          </div>
          <StatCard
            label="Spell DC"
            value={spellDC ?? "—"}
            sub={`Spell Tier ${spellTier}`}
          />
          <StatCard
            label="Modifier"
            value={fmtAttr(modVal)}
            sub={
              (casterInfo?.casterModifierOptions?.length ?? 0) > 1
                ? `${modKey} (auto)`
                : modKey
            }
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "0.5rem",
          }}
        >
          <StatCard
            label="Spell Threshold"
            value={spellThreshold}
            sub={`${c.featsPurchased ?? 0} feats bought`}
          />
          <StatCard
            label="Known Spells"
            value={knownSpellsMax}
            sub={`${mySpells.filter((s) => !s.isCantrip).length} known`}
          />
          <StatCard
            label="Prepared"
            value={preparedSpellsMax}
            sub="Mod + Tier"
          />
          <StatCard
            label="Cantrips"
            value={`${myCantripsAll.length}/${cantripCap}`}
            sub={cantripAtCap ? "at cap" : "available"}
          />
        </div>

        {/* Sphere access */}
        {accessibleSpheres.length > 0 && (
          <div>
            <div
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                fontFamily: "var(--font-heading)",
                marginBottom: "0.375rem",
              }}
            >
              Spell Spheres
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {accessibleSpheres.map((sphere) => (
                <span
                  key={sphere}
                  style={{
                    fontSize: "0.78rem",
                    padding: "0.2rem 0.625rem",
                    borderRadius: "9999px",
                    backgroundColor: "var(--primary-light)",
                    border: "1px solid var(--primary)",
                    color: "var(--primary)",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 600,
                  }}
                >
                  {sphere}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Known Spells button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => setShowSpellManager(true)}
            style={{
              padding: "0.35rem 0.875rem",
              border: "1.5px solid var(--primary)",
              borderRadius: "0.375rem",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: "var(--primary)",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: "0.8rem",
            }}
          >
            Known Spells ({c.knownSpellIds.length})
          </button>
        </div>

        {/* Spell feed */}
        {feedSpells.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>
            {mySpells.length === 0
              ? 'No known spells. Use "Known Spells" to add spells.'
              : 'All spells hidden. Use "Known Spells" to toggle spells into your feed.'}
          </p>
        )}

        {cantrips.length > 0 && (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.375rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.63rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-heading)",
                }}
              >
                Cantrips
              </div>
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-heading)",
                  padding: "0.05rem 0.3rem",
                  borderRadius: "9999px",
                  border: `1px solid ${cantripAtCap ? "#EF4444" : "var(--primary)"}`,
                  color: cantripAtCap ? "#EF4444" : "var(--primary)",
                }}
              >
                {myCantripsAll.length}/{cantripCap}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.35rem",
              }}
            >
              {cantrips.map((s) => (
                <SpellCard key={s.id} spell={s} />
              ))}
            </div>
          </div>
        )}
        {Object.keys(byTier)
          .map(Number)
          .sort()
          .map((tier) => (
            <div key={tier}>
              <div
                style={{
                  fontSize: "0.63rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-heading)",
                  marginBottom: "0.375rem",
                }}
              >
                Tier {tier}
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.35rem",
                }}
              >
                {byTier[tier].map((s) => (
                  <SpellCard key={s.id} spell={s} />
                ))}
              </div>
            </div>
          ))}

        {/* Known Spells Manager Modal */}
        {showSpellManager && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.55)",
              zIndex: 50,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "2rem 1rem",
              overflowY: "auto",
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowSpellManager(false);
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "600px",
                backgroundColor: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: 0,
                      fontFamily: "var(--font-heading)",
                      fontWeight: 700,
                      fontSize: "1rem",
                      color: "var(--text)",
                    }}
                  >
                    Known Spells
                  </h3>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      color: "var(--text-muted)",
                      marginTop: "0.15rem",
                    }}
                  >
                    Spells: {mySpells.filter((s) => !s.isCantrip).length} ·
                    Cantrips: {myCantripsAll.length}/{cantripCap}
                    {accessibleSpheres.length > 0 && (
                      <>
                        {" "}
                        · Sphere{accessibleSpheres.length > 1 ? "s" : ""}:{" "}
                        {accessibleSpheres.join(", ")}
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowSpellManager(false)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1.1rem",
                    color: "var(--text-muted)",
                    padding: "0.2rem 0.4rem",
                  }}
                >
                  ✕
                </button>
              </div>

              <div
                style={{
                  padding: "1rem 1.25rem",
                  maxHeight: "70vh",
                  overflowY: "auto",
                }}
              >
                {/* Known spells list */}
                {mySpells.length > 0 && (
                  <div style={{ marginBottom: "1.25rem" }}>
                    <div
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-heading)",
                        marginBottom: "0.5rem",
                      }}
                    >
                      Your Known Spells — toggle to show/hide in feed
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.3rem",
                      }}
                    >
                      {mySpells.map((s) => {
                        const inFeed = feedIds.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              padding: "0.4rem 0.625rem",
                              backgroundColor: inFeed
                                ? "var(--primary-light)"
                                : "var(--bg-nav)",
                              border: `1px solid ${inFeed ? "var(--primary)" : "var(--border)"}`,
                              borderRadius: "0.375rem",
                            }}
                          >
                            <button
                              onClick={() => toggleFeedSpell(s.id)}
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                border: `2px solid ${inFeed ? "var(--primary)" : "var(--border)"}`,
                                backgroundColor: inFeed
                                  ? "var(--primary)"
                                  : "transparent",
                                cursor: "pointer",
                                flexShrink: 0,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "var(--text-on-primary)",
                                fontSize: "0.65rem",
                              }}
                            >
                              {inFeed ? "✓" : ""}
                            </button>
                            <span
                              style={{
                                fontFamily: "var(--font-heading)",
                                fontWeight: 600,
                                fontSize: "0.85rem",
                                color: "var(--text)",
                                flex: 1,
                              }}
                            >
                              {s.name}
                            </span>
                            <span
                              style={{
                                fontSize: "0.62rem",
                                color: "var(--text-muted)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {s.isCantrip ? "Cantrip" : `Tier ${s.tier}`}
                            </span>
                            {s.range && (
                              <span
                                style={{
                                  fontSize: "0.62rem",
                                  color: "var(--text-muted)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {s.range}
                              </span>
                            )}
                            {s.duration && (
                              <span
                                style={{
                                  fontSize: "0.62rem",
                                  color: "var(--text-muted)",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {s.duration}
                              </span>
                            )}
                            <button
                              onClick={() => removeFromKnown(s.id)}
                              title="Remove from known spells"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                fontSize: "0.7rem",
                                padding: "0.1rem 0.25rem",
                                flexShrink: 0,
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Add spell search */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-heading)",
                      }}
                    >
                      Add Spell
                    </div>
                    <span
                      style={{
                        fontSize: "0.62rem",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 700,
                        color: cantripAtCap ? "#EF4444" : "var(--text-muted)",
                      }}
                    >
                      Cantrips: {myCantripsAll.length}/{cantripCap}
                    </span>
                  </div>
                  {cantripAtCap && (
                    <div
                      style={{
                        padding: "0.3rem 0.625rem",
                        backgroundColor: "#FEF2F2",
                        border: "1px solid #FCA5A5",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                        color: "#EF4444",
                        marginBottom: "0.375rem",
                        fontFamily: "var(--font-heading)",
                      }}
                    >
                      Cantrip cap reached ({cantripCap}). Remove a cantrip to
                      add another.
                    </div>
                  )}
                  <input
                    value={spellManagerSearch}
                    onChange={(e) => setSpellManagerSearch(e.target.value)}
                    placeholder="Search by name or school…"
                    style={{
                      width: "100%",
                      padding: "0.375rem 0.625rem",
                      fontSize: "0.825rem",
                      fontFamily: "var(--font-body)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.375rem",
                      backgroundColor: "var(--bg-nav)",
                      color: "var(--text)",
                      outline: "none",
                      marginBottom: "0.5rem",
                      boxSizing: "border-box",
                    }}
                  />
                  {spellManagerSearch.trim() && (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                        maxHeight: "220px",
                        overflowY: "auto",
                      }}
                    >
                      {unknownSpells.length === 0 ? (
                        <p
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-muted)",
                            fontStyle: "italic",
                            margin: 0,
                          }}
                        >
                          No results.
                        </p>
                      ) : (
                        unknownSpells.map((s) => {
                          const blocked = s.isCantrip && cantripAtCap;
                          return (
                            <div
                              key={s.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                padding: "0.35rem 0.625rem",
                                backgroundColor: "var(--bg-nav)",
                                border: "1px solid var(--border)",
                                borderRadius: "0.375rem",
                                opacity: blocked ? 0.55 : 1,
                              }}
                            >
                              <span
                                style={{
                                  fontFamily: "var(--font-heading)",
                                  fontWeight: 600,
                                  fontSize: "0.82rem",
                                  color: "var(--text)",
                                  flex: 1,
                                }}
                              >
                                {s.name}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.62rem",
                                  color: s.isCantrip
                                    ? "var(--accent)"
                                    : "var(--text-muted)",
                                }}
                              >
                                {s.isCantrip ? "Cantrip" : `Tier ${s.tier}`}
                              </span>
                              <span
                                style={{
                                  fontSize: "0.6rem",
                                  color: "var(--text-muted)",
                                }}
                              >
                                {s.school}
                              </span>
                              <button
                                onClick={() => {
                                  if (!blocked) addToKnown(s.id);
                                }}
                                disabled={blocked}
                                title={
                                  blocked
                                    ? `Cantrip cap (${cantripCap}) reached`
                                    : undefined
                                }
                                style={{
                                  padding: "0.15rem 0.5rem",
                                  border: "none",
                                  borderRadius: "0.25rem",
                                  backgroundColor: blocked
                                    ? "var(--border)"
                                    : "var(--primary)",
                                  color: "var(--text-on-primary)",
                                  cursor: blocked ? "not-allowed" : "pointer",
                                  fontFamily: "var(--font-heading)",
                                  fontWeight: 600,
                                  fontSize: "0.72rem",
                                  flexShrink: 0,
                                }}
                              >
                                + Add
                              </button>
                            </div>
                          );
                        })
                      )}
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
        <textarea
          value={notesVal}
          onChange={(e) => setNotesVal(e.target.value)}
          rows={8}
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            fontSize: "0.875rem",
            fontFamily: "var(--font-body)",
            border: "1.5px solid var(--primary)",
            borderRadius: "0.375rem",
            backgroundColor: "var(--bg-card)",
            color: "var(--text)",
            outline: "none",
            resize: "vertical",
          }}
        />
        <button
          onClick={() => {
            persist({ notes: notesVal });
            setEditingNotes(false);
          }}
          style={{
            marginTop: "0.5rem",
            padding: "0.375rem 0.875rem",
            backgroundColor: "var(--primary)",
            color: "var(--text-on-primary)",
            border: "none",
            borderRadius: "0.375rem",
            cursor: "pointer",
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: "0.8rem",
          }}
        >
          Save
        </button>
      </div>
    ) : (
      <div
        onClick={() => setEditingNotes(true)}
        style={{
          minHeight: "100px",
          padding: "0.625rem 0.875rem",
          backgroundColor: "var(--bg-card)",
          border: "1px dashed var(--border)",
          borderRadius: "0.375rem",
          cursor: "text",
          fontSize: "0.875rem",
          color: c.notes ? "var(--text)" : "var(--text-muted)",
          whiteSpace: "pre-wrap",
          lineHeight: 1.6,
        }}
      >
        {c.notes || "Click to add notes…"}
      </div>
    );
  }

  const tabs: { id: TabId; label: string; hidden?: boolean }[] = [
    { id: "feats", label: "Feats" },
    { id: "inventory", label: "Inventory" },
    {
      id: "spellcasting",
      label: "Spellcasting",
      hidden: !isCaster && mySpells.length === 0,
    },
    { id: "notes", label: "Notes" },
  ];

  // FEATURE-01: Ref sidebar content
  const REF_SECTIONS = [
    {
      name: "Offensive",
      color: "var(--section-offensive)",
      subs: [
        {
          name: "Weapon",
          actions: [
            {
              n: "Quick Scrape",
              ap: "1 AP",
              d: "Hit: half weapon dmg. Bash w/ shield. Crit: full dmg, no mods.",
            },
            {
              n: "Strike",
              ap: "2 AP",
              d: "Hit: weapon dice + mods. Crit: +half max dmg. DW: two rolls, mod once.",
            },
            {
              n: "Power Strike",
              ap: "3 AP",
              d: "−5 to roll. Hit: double dice + mods. DW: one roll both weapons.",
            },
          ],
        },
        {
          name: "Magic",
          actions: [
            {
              n: "Cast a Spell",
              ap: "2 AP",
              d: "Prepared spell or cantrip. Crit/crit-fail: trigger crit effects; min half dmg.",
            },
            {
              n: "Charged Cantrip",
              ap: "3 AP",
              d: "Damaging cantrip. Hit: double dice + mods. Crit: +half max dmg.",
            },
          ],
        },
      ],
    },
    {
      name: "Maneuver",
      color: "var(--section-maneuver)",
      subs: [
        {
          name: "Movement",
          actions: [
            { n: "Dash", ap: "2 AP", d: "Move to adjacent zone." },
            {
              n: "Disengage",
              ap: "1 AP",
              d: "Break Engagement, regain movement.",
            },
            {
              n: "Flank",
              ap: "1 AP",
              d: "Give ally Resolve on next attack in Engagement.",
            },
            {
              n: "Go Prone / Stand",
              ap: "1 AP",
              d: "Toggle Prone / Standing.",
            },
          ],
        },
        {
          name: "Control",
          actions: [
            {
              n: "Shove",
              ap: "1 AP",
              d: "Push target out or into hazard. Body vs Body Def.",
            },
            { n: "Trip", ap: "2 AP", d: "Inflict Prone. Body vs Body Def." },
            {
              n: "Grapple",
              ap: "2 AP",
              d: "Inflict Restrained. Body vs Body Def.",
            },
          ],
        },
      ],
    },
    {
      name: "Utility",
      color: "var(--section-utility)",
      subs: [
        {
          name: "Preservation",
          actions: [
            {
              n: "Dodge",
              ap: "2 AP",
              d: "Gain Strain on incoming attacks until next turn.",
            },
            {
              n: "Hide",
              ap: "2 AP",
              d: "Stealth check. Combat: Obscured. Out of combat: Hidden.",
            },
            {
              n: "Cover",
              ap: "1 AP",
              d: "+2 Armor vs ranged or attacks from outside zone.",
            },
            {
              n: "Distract",
              ap: "1 AP",
              d: "Next attack vs chosen ally has Strain.",
            },
          ],
        },
        {
          name: "Interact",
          actions: [
            {
              n: "Assist / Aid",
              ap: "1 AP",
              d: "Remove Burning/Bleeding or grant skill bonus dice.",
            },
            {
              n: "Interact",
              ap: "0→1 AP",
              d: "Free first use; 1 AP each subsequent use per turn.",
            },
            {
              n: "Scan / Perception",
              ap: "1 AP",
              d: "Mind check to reveal Hidden / Obscured.",
            },
            {
              n: "Hold Action",
              ap: "Action-based",
              d: "Declare action + trigger. Act when trigger occurs.",
            },
            {
              n: "Alchemical Item",
              ap: "2 AP",
              d: "Use on self or target in range.",
            },
            {
              n: "Command",
              ap: "1→3 AP",
              d: "Command summoned creature/pet. Cost rises each use.",
            },
            {
              n: "Brace",
              ap: "1 AP",
              d: "+2 attack (weapon) or +2 Armor Def (shield/armor).",
            },
          ],
        },
      ],
    },
  ];

  return (
    <div style={{ maxWidth: "860px" }}>
      {/* FEATURE-01: Fixed Ref button */}
      <button
        onClick={() => setShowRefSidebar((v) => !v)}
        style={{
          position: "fixed",
          right: "1rem",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 70,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.2rem",
          padding: "0.5rem 0.4rem",
          backgroundColor: showRefSidebar ? "var(--primary)" : "var(--bg-card)",
          border: `1.5px solid ${showRefSidebar ? "var(--primary)" : "var(--border)"}`,
          borderRadius: "0.5rem",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          writingMode: "vertical-rl",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 800,
            fontSize: "0.72rem",
            color: showRefSidebar ? "#fff" : "var(--primary)",
            letterSpacing: "0.06em",
          }}
        >
          ❖ Ref
        </span>
      </button>

      {/* FEATURE-01: Ref sidebar overlay */}
      {showRefSidebar && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRefSidebar(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 65,
            backgroundColor: "rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              bottom: 0,
              width: "360px",
              maxWidth: "95vw",
              backgroundColor: "var(--bg-card)",
              borderLeft: "1px solid var(--border)",
              overflowY: "auto",
              padding: "1rem 1rem 2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "0.75rem",
                paddingBottom: "0.5rem",
                borderBottom: "2px solid var(--primary)",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  color: "var(--text)",
                }}
              >
                ❖ Action Reference
              </span>
              <button
                onClick={() => setShowRefSidebar(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1rem",
                  color: "var(--text-muted)",
                  padding: "0.1rem 0.3rem",
                }}
              >
                ✕
              </button>
            </div>
            {REF_SECTIONS.map((sec) => (
              <div key={sec.name} style={{ marginBottom: "1rem" }}>
                <div
                  style={{
                    padding: "0.3rem 0.625rem",
                    backgroundColor: sec.color,
                    borderRadius: "0.375rem",
                    fontFamily: "var(--font-heading)",
                    fontWeight: 700,
                    fontSize: "0.78rem",
                    color: "var(--text)",
                    marginBottom: "0.375rem",
                  }}
                >
                  {sec.name}
                </div>
                {sec.subs.map((sub) => (
                  <div
                    key={sub.name}
                    style={{ marginBottom: "0.5rem", paddingLeft: "0.375rem" }}
                  >
                    <div
                      style={{
                        fontSize: "0.58rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.07em",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-heading)",
                        marginBottom: "0.2rem",
                      }}
                    >
                      {sub.name}
                    </div>
                    {sub.actions.map((a) => (
                      <div
                        key={a.n}
                        style={{
                          display: "flex",
                          gap: "0.375rem",
                          alignItems: "flex-start",
                          marginBottom: "0.2rem",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: "var(--font-heading)",
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            color: "var(--primary)",
                            flexShrink: 0,
                            paddingTop: "0.05rem",
                          }}
                        >
                          ❖
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span
                            style={{
                              fontFamily: "var(--font-heading)",
                              fontWeight: 700,
                              fontSize: "0.75rem",
                              color: "var(--text)",
                            }}
                          >
                            {a.n}
                          </span>
                          <span
                            style={{
                              fontSize: "0.62rem",
                              color: "var(--accent)",
                              fontFamily: "var(--font-heading)",
                              fontWeight: 700,
                              marginLeft: "0.3rem",
                              padding: "0.05rem 0.3rem",
                              backgroundColor: "var(--accent-light)",
                              borderRadius: "9999px",
                            }}
                          >
                            {a.ap}
                          </span>
                          <div
                            style={{
                              fontSize: "0.7rem",
                              color: "var(--text-muted)",
                              lineHeight: 1.45,
                              marginTop: "0.05rem",
                            }}
                          >
                            {a.d}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
            {/* Complexity scale */}
            <div
              style={{
                marginTop: "0.5rem",
                paddingTop: "0.625rem",
                borderTop: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  color: "var(--text)",
                  marginBottom: "0.375rem",
                }}
              >
                When in Doubt
              </div>
              {[
                { l: "Simple / Easy", ap: "1 AP" },
                { l: "Advanced / Medium", ap: "2 AP" },
                { l: "Complex / Hard", ap: "3 AP" },
                { l: "Elaborate / Arduous", ap: "4 AP" },
              ].map((r) => (
                <div
                  key={r.l}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.2rem 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text)",
                      fontFamily: "var(--font-heading)",
                    }}
                  >
                    {r.l}
                  </span>
                  <span
                    style={{
                      fontSize: "0.65rem",
                      color: "var(--accent)",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 700,
                      padding: "0.05rem 0.35rem",
                      backgroundColor: "var(--accent-light)",
                      borderRadius: "9999px",
                    }}
                  >
                    {r.ap}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ──── HEADER ──── */}
      <div
        style={{
          backgroundColor: "var(--bg-nav)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "1rem 1.25rem",
          marginBottom: "1rem",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-heading)",
              fontStyle: "italic",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--text)",
              margin: 0,
              letterSpacing: "0.02em",
            }}
          >
            {c.name || "Unnamed Adventurer"}
          </h1>
          <div
            style={{
              fontSize: "0.7rem",
              color: "var(--primary)",
              letterSpacing: "0.08em",
              marginTop: "0.2rem",
              fontFamily: "var(--font-heading)",
              fontStyle: "italic",
            }}
          >
            {[
              c.professionName,
              c.originName &&
                `${c.originName}${c.vocationName ? ` (${c.vocationName})` : ""}`,
              `Tier ${effectiveTier}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
          {c.ambition && (
            <div
              style={{
                marginTop: "0.25rem",
                fontSize: "0.75rem",
                color: "var(--text-muted)",
                fontStyle: "italic",
              }}
            >
              {c.ambition}
            </div>
          )}
          <div style={{ marginTop: "0.375rem" }}>
            <Link
              href="/characters"
              style={{
                fontSize: "0.72rem",
                color: "var(--text-muted)",
                textDecoration: "none",
                fontFamily: "var(--font-heading)",
                fontWeight: 600,
              }}
            >
              ← All Characters
            </Link>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "0.6rem",
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Renown
            </div>
            <div
              style={{
                fontSize: "1.35rem",
                color: "var(--primary)",
                fontWeight: 700,
                fontFamily: "var(--font-heading)",
                lineHeight: 1,
              }}
            >
              {c.renown ?? 0}
            </div>
          </div>
          <button
            onClick={handleDelete}
            style={{
              padding: "0.25rem 0.5rem",
              border: "1px solid var(--border)",
              borderRadius: "0.375rem",
              backgroundColor: "transparent",
              cursor: "pointer",
              color: "var(--text-muted)",
              fontSize: "0.75rem",
              fontFamily: "var(--font-heading)",
            }}
          >
            Delete
          </button>
        </div>
      </div>

      {/* ──── VITALITY BAR ──── */}
      {(() => {
        const tempHp = c.tempHp ?? 0;
        const effectiveMax = derivedMaxVitality + tempHp;
        const vitPct =
          effectiveMax > 0
            ? Math.min(
                100,
                Math.round(((c.currentVitality ?? 0) / effectiveMax) * 100),
              )
            : 0;
        return (
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "0.875rem 1.25rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: "0.4rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.65rem",
                  letterSpacing: "0.12em",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-heading)",
                  fontStyle: "italic",
                  textTransform: "uppercase",
                }}
              >
                Vitality
              </span>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "0.25rem",
                }}
              >
                <span
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 700,
                    color: "var(--primary)",
                    fontFamily: "var(--font-heading)",
                  }}
                >
                  {c.currentVitality ?? 0}
                </span>
                <span
                  style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}
                >
                  / {effectiveMax}
                </span>
              </div>
            </div>
            <div
              style={{
                backgroundColor: "var(--border)",
                borderRadius: "6px",
                height: "8px",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  backgroundColor: "var(--primary)",
                  height: "100%",
                  width: `${vitPct}%`,
                  borderRadius: "6px",
                  transition: "width 0.2s ease",
                }}
              />
            </div>
            <div
              style={{
                display: "flex",
                gap: "1.25rem",
                marginTop: "0.5rem",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Wounds{" "}
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  {c.currentWounds ?? 0}/{maxWounds}
                </span>
              </span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Carry{" "}
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  {totalCarried}/{carryWeight} lb
                </span>
              </span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                Respites{" "}
                <span style={{ color: "var(--text)", fontWeight: 700 }}>
                  {currentRespites}/3
                </span>
              </span>
              {tempHp !== 0 && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--primary)",
                    fontWeight: 700,
                  }}
                >
                  {tempHp > 0 ? `+${tempHp}` : tempHp} Temp HP
                </span>
              )}
            </div>
          </div>
        );
      })()}

      {/* ──── VITALITY & DAMAGE MANAGEMENT (unified) ──── */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          overflow: "hidden",
          marginBottom: "1rem",
        }}
      >
        {/* Unified header */}
        <div
          style={{
            padding: "0.625rem 1rem",
            borderBottom: "1px solid var(--border)",
            backgroundColor: "var(--bg-nav)",
          }}
        >
          <span
            style={{
              fontSize: "0.65rem",
              fontFamily: "var(--font-heading)",
              fontStyle: "italic",
              letterSpacing: "0.12em",
              color: "var(--text-muted)",
              textTransform: "uppercase",
            }}
          >
            Vitality & Damage
          </span>
        </div>
        {/* Inner 2-col layout */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          }}
        >
          {/* Left: HP + Wounds + Temp HP */}
          <div
            style={{
              padding: "0.875rem 1rem",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {(() => {
              const tempHp = c.tempHp ?? 0;
              const effectiveMax = derivedMaxVitality + tempHp;
              return (
                <>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "0.625rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <DeltaNumber
                      label={`HP / ${derivedMaxVitality}${tempHp !== 0 ? (tempHp > 0 ? ` +${tempHp}` : ` ${tempHp}`) : ""}`}
                      value={c.currentVitality ?? 0}
                      min={0}
                      max={effectiveMax || undefined}
                      onChange={(v) => persist({ currentVitality: v })}
                    />
                    <EditableNumber
                      label={`Wounds / ${maxWounds}`}
                      value={c.currentWounds ?? 0}
                      min={0}
                      max={maxWounds}
                      onChange={(v) => persist({ currentWounds: v })}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.375rem",
                      padding: "0.25rem 0.5rem",
                      backgroundColor: "var(--bg-nav)",
                      border: "1px solid var(--border)",
                      borderRadius: "0.375rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 600,
                      }}
                    >
                      Temp HP
                    </span>
                    <button
                      onClick={() => {
                        const next = tempHp - 1;
                        const newMax = derivedMaxVitality + next;
                        const patch: Partial<typeof c> = { tempHp: next };
                        if ((c.currentVitality ?? 0) > newMax)
                          patch.currentVitality = Math.max(0, newMax);
                        persist(patch);
                      }}
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--bg-card)",
                        cursor: "pointer",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        color: "var(--text)",
                        minWidth: "24px",
                        textAlign: "center",
                      }}
                    >
                      {tempHp}
                    </span>
                    <button
                      onClick={() => persist({ tempHp: tempHp + 1 })}
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--bg-card)",
                        cursor: "pointer",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        fontSize: "0.75rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      +
                    </button>
                    {tempHp !== 0 && (
                      <button
                        onClick={() => {
                          const patch: Partial<typeof c> = { tempHp: 0 };
                          if ((c.currentVitality ?? 0) > derivedMaxVitality)
                            patch.currentVitality = Math.max(
                              0,
                              derivedMaxVitality,
                            );
                          persist(patch);
                        }}
                        style={{
                          fontSize: "0.6rem",
                          color: "var(--text-muted)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontFamily: "var(--font-heading)",
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Right: Apply Damage + pool tracker */}
          {(() => {
            const spellPool = c.spellReductionPool ?? 0;
            const featPool = c.featReductionPool ?? 0;
            const shieldPool = equippedShield?.reductionPoolCurrent ?? null;
            const shieldPoolMax = equippedShield?.reductionPoolMax ?? null;
            const hasAnyPool =
              spellPool > 0 || featPool > 0 || shieldPool != null;
            return (
              <div
                style={{
                  padding: "0.875rem 1rem",
                }}
              >
                <span
                  style={{
                    fontSize: "1rem",
                    color: "var(--text-muted)",
                  }}
                >
                  Reduction Pool
                </span>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.5rem",
                  }}
                >
                  <input
                    type="number"
                    min={1}
                    value={damageInput}
                    onChange={(e) => setDamageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const n = parseInt(damageInput);
                        if (n > 0) {
                          applyDamage(n);
                          setDamageInput("");
                        }
                      }
                    }}
                    placeholder="0"
                    style={{
                      ...inputStyle,
                      width: "60px",
                      textAlign: "center",
                    }}
                  />
                  <button
                    onClick={() => {
                      const n = parseInt(damageInput);
                      if (n > 0) {
                        applyDamage(n);
                        setDamageInput("");
                      }
                    }}
                    style={{
                      padding: "0.3rem 0.75rem",
                      border: "none",
                      borderRadius: "0.375rem",
                      backgroundColor: "#EF4444",
                      color: "#fff",
                      cursor: "pointer",
                      fontFamily: "var(--font-heading)",
                      fontWeight: 700,
                      fontSize: "0.8rem",
                    }}
                  >
                    Hit
                  </button>
                  <span
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-muted)",
                      fontStyle: "italic",
                    }}
                  >
                    Spell → Feat → Shield → HP
                  </span>
                </div>
                <div
                  style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}
                >
                  {spellPool > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.2rem 0.5rem",
                        backgroundColor: "var(--primary-light)",
                        border: "1px solid var(--primary)",
                        borderRadius: "9999px",
                        fontSize: "0.62rem",
                        fontFamily: "var(--font-heading)",
                        color: "var(--primary)",
                        fontWeight: 700,
                      }}
                    >
                      ✦ Spell: {spellPool}
                      <button
                        onClick={() =>
                          persist({
                            spellReductionPool: Math.max(0, spellPool - 1),
                          })
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.6rem",
                          color: "var(--primary)",
                          padding: 0,
                        }}
                      >
                        −
                      </button>
                      <button
                        onClick={() =>
                          persist({ spellReductionPool: spellPool + 1 })
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.6rem",
                          color: "var(--primary)",
                          padding: 0,
                        }}
                      >
                        +
                      </button>
                      <button
                        onClick={() => persist({ spellReductionPool: 0 })}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.55rem",
                          color: "var(--text-muted)",
                          padding: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {featPool > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.2rem 0.5rem",
                        backgroundColor: "var(--accent-light)",
                        border: "1px solid var(--accent)",
                        borderRadius: "9999px",
                        fontSize: "0.62rem",
                        fontFamily: "var(--font-heading)",
                        color: "var(--accent)",
                        fontWeight: 700,
                      }}
                    >
                      ✦ Feat: {featPool}
                      <button
                        onClick={() =>
                          persist({
                            featReductionPool: Math.max(0, featPool - 1),
                          })
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.6rem",
                          color: "var(--accent)",
                          padding: 0,
                        }}
                      >
                        −
                      </button>
                      <button
                        onClick={() =>
                          persist({ featReductionPool: featPool + 1 })
                        }
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.6rem",
                          color: "var(--accent)",
                          padding: 0,
                        }}
                      >
                        +
                      </button>
                      <button
                        onClick={() => persist({ featReductionPool: 0 })}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.55rem",
                          color: "var(--text-muted)",
                          padding: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {shieldPool != null && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.2rem 0.5rem",
                        backgroundColor:
                          shieldPool === 0
                            ? "var(--section-alert-bg)"
                            : "var(--bg-nav)",
                        border: `1px solid ${shieldPool === 0 ? "#ff7979" : "var(--border)"}`,
                        borderRadius: "9999px",
                        fontSize: "0.62rem",
                        fontFamily: "var(--font-heading)",
                        color:
                          shieldPool === 0 ? "#ff7979" : "var(--text-muted)",
                        fontWeight: 700,
                      }}
                    >
                      🛡 {shieldPool}/{shieldPoolMax}
                      {shieldPool === 0 && " (broken)"}
                    </div>
                  )}
                  {!hasAnyPool && (
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      <button
                        onClick={() => persist({ spellReductionPool: 1 })}
                        style={{
                          fontSize: "0.6rem",
                          padding: "0.15rem 0.4rem",
                          border: "1px dashed var(--border)",
                          borderRadius: "9999px",
                          backgroundColor: "transparent",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-heading)",
                        }}
                      >
                        + Spell Pool
                      </button>
                      <button
                        onClick={() => persist({ featReductionPool: 1 })}
                        style={{
                          fontSize: "0.6rem",
                          padding: "0.15rem 0.4rem",
                          border: "1px dashed var(--border)",
                          borderRadius: "9999px",
                          backgroundColor: "transparent",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-heading)",
                        }}
                      >
                        + Feat Pool
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ──── ATTRS | DEFENCE TWO-COLUMN ──── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        {/* Left: Attributes bar display */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0.5rem 1rem",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-nav)",
            }}
          >
            <span
              style={{
                fontSize: "0.65rem",
                fontFamily: "var(--font-heading)",
                fontStyle: "italic",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
              }}
            >
              Attributes
            </span>
          </div>
          <div
            style={{
              padding: "0.875rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.875rem",
            }}
          >
            {(() => {
              const totalAvailableBase = Math.min(
                12,
                4 + (c.featsPurchased ?? 0),
              );
              const currentTotalBase =
                c.baseAttributes.body +
                c.baseAttributes.mind +
                c.baseAttributes.will;
              const dynamicUnspent = totalAvailableBase - currentTotalBase;

              return (
                <>
                  {dynamicUnspent > 0 && (
                    <div
                      style={{
                        padding: "0.375rem 0.625rem",
                        backgroundColor: "var(--accent-light)",
                        border: "1px solid var(--accent)",
                        borderRadius: "0.375rem",
                        fontSize: "0.75rem",
                        color: "var(--text)",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 700,
                      }}
                    >
                      ⚠ {dynamicUnspent} unspent attr pt
                      {dynamicUnspent !== 1 ? "s" : ""}
                      <span style={{ fontWeight: 400, marginLeft: "0.35rem" }}>
                        ({currentTotalBase} / {totalAvailableBase})
                      </span>
                    </div>
                  )}
                  {(["body", "mind", "will"] as const).map((key) => {
                    const val = attrs[key];
                    const base = c.baseAttributes[key];
                    const voc =
                      c.vocationAttributeBonus.attribute === key
                        ? c.vocationAttributeBonus.value
                        : 0;
                    const isHighest =
                      val === Math.max(attrs.body, attrs.mind, attrs.will);
                    const barPct = Math.min(
                      100,
                      Math.max(0, Math.round((Math.max(0, val) / 12) * 100)),
                    );
                    const canIncrease = dynamicUnspent > 0;
                    const canDecrease = base > 0;
                    function adjustAttr(delta: number) {
                      const newBase = base + delta;
                      if (newBase < 0) return;
                      if (delta > 0 && !canIncrease) return;
                      persist({
                        baseAttributes: {
                          ...c.baseAttributes,
                          [key]: newBase,
                        },
                        unspentAttributePoints: Math.max(
                          0,
                          dynamicUnspent - delta,
                        ),
                      });
                    }
                    return (
                      <div key={key}>
                        {/* Label + total value */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "3px",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: isHighest
                                ? "var(--primary)"
                                : "var(--text-muted)",
                              letterSpacing: "0.04em",
                              textTransform: "capitalize",
                            }}
                          >
                            {key}
                          </span>
                          <span
                            style={{
                              fontSize: "1.15rem",
                              fontWeight: 700,
                              color: "var(--primary)",
                              fontFamily: "var(--font-heading)",
                              lineHeight: 1,
                            }}
                          >
                            {fmtAttr(val)}
                          </span>
                        </div>
                        {/* Bar */}
                        <div
                          style={{
                            backgroundColor: "var(--border)",
                            borderRadius: "4px",
                            height: "4px",
                            overflow: "hidden",
                            marginBottom: "0.4rem",
                          }}
                        >
                          <div
                            style={{
                              backgroundColor: "var(--primary)",
                              height: "100%",
                              width: `${barPct}%`,
                              opacity: isHighest ? 1 : 0.5,
                              borderRadius: "4px",
                            }}
                          />
                        </div>
                        {/* Allocator controls */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                          }}
                        >
                          <button
                            onClick={() => adjustAttr(-1)}
                            disabled={!canDecrease}
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              border: "1px solid var(--border)",
                              backgroundColor: "var(--bg-card)",
                              cursor: canDecrease ? "pointer" : "not-allowed",
                              fontWeight: 700,
                              color: "var(--text-muted)",
                              fontSize: "0.85rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            −
                          </button>
                          <span
                            style={{
                              fontFamily: "var(--font-heading)",
                              fontSize: "0.78rem",
                              fontWeight: 600,
                              color: "var(--text-muted)",
                              minWidth: "20px",
                              textAlign: "center",
                            }}
                          >
                            {fmtAttr(base)}
                          </span>
                          <button
                            onClick={() => adjustAttr(1)}
                            disabled={!canIncrease}
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "50%",
                              border: "1px solid var(--border)",
                              backgroundColor: "var(--bg-card)",
                              cursor: canIncrease ? "pointer" : "not-allowed",
                              fontWeight: 700,
                              color: "var(--text-muted)",
                              fontSize: "0.85rem",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            +
                          </button>
                          <span
                            style={{
                              fontSize: "0.62rem",
                              color: "var(--text-muted)",
                              marginLeft: "0.15rem",
                            }}
                          >
                            base{voc > 0 ? ` + ${voc} (${c.vocationName})` : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>

        {/* Right: Defence 2×2 grid */}
        <div
          style={{
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "0.5rem 1rem",
              borderBottom: "1px solid var(--border)",
              backgroundColor: "var(--bg-nav)",
            }}
          >
            <span
              style={{
                fontSize: "0.65rem",
                fontFamily: "var(--font-heading)",
                fontStyle: "italic",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
                textTransform: "uppercase",
              }}
            >
              Defence
            </span>
          </div>
          <div
            style={{
              padding: "0.875rem 1rem",
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "0.5rem",
            }}
          >
            {(() => {
              const tempAD = c.tempArmorDef ?? 0;
              const totalAD = armorDefense + tempAD;
              const spellArmorOn = !!(c.spellArmorActive && isCaster);
              const subLabel = spellArmorOn
                ? `Spell (11+${modKey})`
                : hasUnarmoredDefense && !equippedBody
                  ? "Unarmored"
                  : hasAgile &&
                      !equippedShield &&
                      (!equippedBody ||
                        equippedBody.armorCategory === "Light" ||
                        !equippedBody.armorCategory)
                    ? "Agile"
                    : equippedBody
                      ? `${equippedBody.name} +${equippedBody.armorBonus}`
                      : "Base";
              return (
                <div
                  style={{
                    textAlign: "center",
                    padding: "0.5rem 0.35rem",
                    backgroundColor: spellArmorOn
                      ? "var(--primary-light)"
                      : "var(--bg-nav)",
                    border: `1px solid ${spellArmorOn ? "var(--primary)" : "var(--border)"}`,
                    borderRadius: "8px",
                  }}
                >
                  <div
                    style={{
                      fontSize: "0.6rem",
                      letterSpacing: "0.07em",
                      color: "var(--text-muted)",
                      marginBottom: "2px",
                    }}
                  >
                    Armor Def
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontWeight: 700,
                      fontSize: "1.25rem",
                      color: "var(--primary)",
                      lineHeight: 1,
                    }}
                  >
                    {totalAD}
                    {tempAD !== 0 && (
                      <span
                        style={{
                          fontSize: "0.7rem",
                          color:
                            tempAD > 0 ? "var(--primary)" : "var(--text-muted)",
                          marginLeft: "0.1rem",
                        }}
                      >
                        {tempAD > 0 ? `+${tempAD}` : tempAD}
                      </span>
                    )}
                  </div>
                  {subLabel && (
                    <div
                      style={{
                        fontSize: "0.52rem",
                        color: spellArmorOn
                          ? "var(--primary)"
                          : "var(--text-muted)",
                        marginTop: "0.1rem",
                        marginBottom: "0.15rem",
                      }}
                    >
                      {subLabel}
                    </div>
                  )}
                  {isCaster && (
                    <button
                      onClick={() =>
                        persist({ spellArmorActive: !c.spellArmorActive })
                      }
                      style={{
                        fontSize: "0.5rem",
                        fontFamily: "var(--font-heading)",
                        fontWeight: 700,
                        padding: "0.1rem 0.3rem",
                        borderRadius: "0.25rem",
                        border: `1px solid ${spellArmorOn ? "var(--primary)" : "var(--border)"}`,
                        backgroundColor: spellArmorOn
                          ? "var(--primary)"
                          : "var(--bg-card)",
                        color: spellArmorOn ? "#fff" : "var(--text-muted)",
                        cursor: "pointer",
                        marginBottom: "0.15rem",
                      }}
                    >
                      {spellArmorOn ? "Spell Armor ON" : "Spell Armor"}
                    </button>
                  )}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.2rem",
                    }}
                  >
                    <button
                      onClick={() => persist({ tempArmorDef: tempAD - 1 })}
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--bg-card)",
                        cursor: "pointer",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        fontSize: "0.7rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontSize: "0.6rem",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-heading)",
                        minWidth: "14px",
                        textAlign: "center",
                      }}
                    >
                      {tempAD === 0 ? "tmp" : tempAD}
                    </span>
                    <button
                      onClick={() => persist({ tempArmorDef: tempAD + 1 })}
                      style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        border: "1px solid var(--border)",
                        backgroundColor: "var(--bg-card)",
                        cursor: "pointer",
                        fontWeight: 700,
                        color: "var(--text-muted)",
                        fontSize: "0.7rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      +
                    </button>
                    {tempAD !== 0 && (
                      <button
                        onClick={() => persist({ tempArmorDef: 0 })}
                        style={{
                          fontSize: "0.55rem",
                          color: "var(--text-muted)",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
            <StatCard label="Body Def" value={bodyDef} />
            <StatCard label="Mind Def" value={mindDef} />
            <StatCard label="Will Def" value={willDef} />
          </div>
        </div>
      </div>

      {/* ──── RESOURCES STRIP ──── */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "0.875rem 1.25rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            fontSize: "0.65rem",
            letterSpacing: "0.12em",
            color: "var(--text-muted)",
            fontFamily: "var(--font-heading)",
            fontStyle: "italic",
            textTransform: "uppercase",
            marginBottom: "0.625rem",
          }}
        >
          Resources
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
            gap: "0.5rem",
          }}
        >
          {/* Renown */}
          <div
            style={{
              textAlign: "center",
              backgroundColor: "var(--bg-nav)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.4rem 0.25rem",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                marginBottom: "2px",
              }}
            >
              Renown
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.25rem",
              }}
            >
              <button
                onClick={() =>
                  persist({ renown: Math.max(0, (c.renown ?? 0) - 1) })
                }
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-card)",
                  cursor: "pointer",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                −
              </button>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "var(--primary)",
                }}
              >
                {c.renown ?? 0}
              </span>
              <button
                onClick={() => persist({ renown: (c.renown ?? 0) + 1 })}
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-card)",
                  cursor: "pointer",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Ambition */}
          <div
            style={{
              textAlign: "center",
              backgroundColor: "var(--bg-nav)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.4rem 0.25rem",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                marginBottom: "2px",
              }}
            >
              Ambition
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.25rem",
              }}
            >
              <button
                onClick={() =>
                  persist({
                    currentAmbition: Math.max(0, (c.currentAmbition ?? 0) - 1),
                  })
                }
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-card)",
                  cursor: "pointer",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                −
              </button>
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "var(--primary)",
                }}
              >
                {c.currentAmbition ?? 0}
                <span
                  style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}
                >
                  /{maxAmbition}
                </span>
              </span>
              <button
                onClick={() =>
                  persist({
                    currentAmbition: Math.min(
                      maxAmbition,
                      (c.currentAmbition ?? 0) + 1,
                    ),
                  })
                }
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--bg-card)",
                  cursor: "pointer",
                  fontWeight: 700,
                  color: "var(--text-muted)",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                +
              </button>
            </div>
            <div
              style={{
                fontSize: "0.55rem",
                color: "var(--text-muted)",
                marginTop: "1px",
              }}
            >
              {ambitionDice}
            </div>
          </div>

          {/* Respites dots */}
          <div
            style={{
              textAlign: "center",
              backgroundColor: "var(--bg-nav)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "0.4rem 0.25rem",
            }}
          >
            <div
              style={{
                fontSize: "0.6rem",
                color: "var(--text-muted)",
                letterSpacing: "0.06em",
                marginBottom: "4px",
              }}
            >
              Respites
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "0.25rem",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  onClick={() =>
                    persist({
                      currentRespites: i < currentRespites ? i : i + 1,
                    })
                  }
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: `2px solid ${i < currentRespites ? "var(--primary)" : "var(--border)"}`,
                    backgroundColor:
                      i < currentRespites ? "var(--primary)" : "transparent",
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                fontSize: "0.55rem",
                color: "var(--text-muted)",
                marginTop: "2px",
              }}
            >
              {currentRespites}/3
            </div>
          </div>

          {/* Carry */}
          <StatCard
            label="Carry"
            value={`${totalCarried}/${carryWeight}`}
            sub="lb"
          />

          {/* Caster stats */}
          {isCaster && (
            <div
              style={{
                textAlign: "center",
                backgroundColor: "var(--bg-nav)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "0.4rem 0.25rem",
              }}
            >
              <div
                style={{
                  fontSize: "0.6rem",
                  color: "var(--text-muted)",
                  letterSpacing: "0.06em",
                  marginBottom: "2px",
                }}
              >
                Reservoir
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.25rem",
                }}
              >
                <button
                  onClick={() =>
                    persist({
                      currentReservoir: Math.max(0, currentReservoir - 1),
                    })
                  }
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-card)",
                    cursor: "pointer",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  −
                </button>
                <span
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    color: "var(--primary)",
                  }}
                >
                  {currentReservoir}
                  <span
                    style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}
                  >
                    /{maxReservoir}
                  </span>
                </span>
                <button
                  onClick={() =>
                    persist({
                      currentReservoir: Math.min(
                        maxReservoir,
                        currentReservoir + 1,
                      ),
                    })
                  }
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "1px solid var(--border)",
                    backgroundColor: "var(--bg-card)",
                    cursor: "pointer",
                    fontWeight: 700,
                    color: "var(--text-muted)",
                    fontSize: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  +
                </button>
              </div>
              {casterInfo?.casterSource && (
                <div
                  style={{
                    fontSize: "0.52rem",
                    color: "var(--text-muted)",
                    marginTop: "1px",
                  }}
                >
                  {casterInfo.casterSource}
                </div>
              )}
            </div>
          )}
          {isCaster && <StatCard label="Spell DC" value={spellDC ?? "—"} />}
          {isCaster && (
            <StatCard
              label="Known"
              value={`${c.knownSpellIds.length}/${knownSpellsMax}`}
            />
          )}
          {isCaster && <StatCard label="Prepared" value={preparedSpellsMax} />}
        </div>
      </div>

      {/* ──── PROFESSION CLASS RESOURCE ──── */}
      {(() => {
        const isDuelist = c.professionName === "Duelist";
        const isFighter = c.professionName === "Fighter";
        const isEidolon = c.professionName === "Eidolon";
        const isStygian = c.professionName === "Stygian";
        if (!isDuelist && !isFighter && !isEidolon && !isStygian) return null;
        const maxAdrenaline = attrs.body + effectiveTier;
        const maxSoulTokens = 3;
        const btnStyle: React.CSSProperties = {
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          border: "1px solid var(--border)",
          backgroundColor: "var(--bg-card)",
          cursor: "pointer",
          fontWeight: 700,
          color: "var(--text-muted)",
          fontSize: "0.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        };
        const cellStyle: React.CSSProperties = {
          textAlign: "center",
          backgroundColor: "var(--bg-nav)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "0.4rem 0.25rem",
        };
        return (
          <div
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "0.875rem 1.25rem",
              marginBottom: "1rem",
            }}
          >
            <div
              style={{
                fontSize: "0.65rem",
                letterSpacing: "0.12em",
                color: "var(--text-muted)",
                fontFamily: "var(--font-heading)",
                fontStyle: "italic",
                textTransform: "uppercase",
                marginBottom: "0.625rem",
              }}
            >
              Class Resource
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                gap: "0.5rem",
              }}
            >
              {isDuelist && (
                <div style={cellStyle}>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-muted)",
                      letterSpacing: "0.06em",
                      marginBottom: "2px",
                    }}
                  >
                    Cadence
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <button
                      onClick={() =>
                        persist({
                          currentCadence: Math.max(
                            0,
                            (c.currentCadence ?? effectiveTier) - 1,
                          ),
                        })
                      }
                      style={btnStyle}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        color: "var(--primary)",
                      }}
                    >
                      {c.currentCadence ?? effectiveTier}
                    </span>
                    <button
                      onClick={() =>
                        persist({
                          currentCadence:
                            (c.currentCadence ?? effectiveTier) + 1,
                        })
                      }
                      style={btnStyle}
                    >
                      +
                    </button>
                  </div>
                  <div
                    style={{
                      fontSize: "0.52rem",
                      color: "var(--text-muted)",
                      marginTop: "1px",
                    }}
                  >
                    Starting: Tier
                  </div>
                </div>
              )}
              {isFighter && (
                <div style={cellStyle}>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-muted)",
                      letterSpacing: "0.06em",
                      marginBottom: "2px",
                    }}
                  >
                    Adrenaline
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <button
                      onClick={() =>
                        persist({
                          currentAdrenaline: Math.max(
                            0,
                            (c.currentAdrenaline ?? maxAdrenaline) - 1,
                          ),
                        })
                      }
                      style={btnStyle}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        color: "var(--primary)",
                      }}
                    >
                      {c.currentAdrenaline ?? maxAdrenaline}
                      <span
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        /{maxAdrenaline}
                      </span>
                    </span>
                    <button
                      onClick={() =>
                        persist({
                          currentAdrenaline: Math.min(
                            maxAdrenaline,
                            (c.currentAdrenaline ?? maxAdrenaline) + 1,
                          ),
                        })
                      }
                      style={btnStyle}
                    >
                      +
                    </button>
                  </div>
                  <div
                    style={{
                      fontSize: "0.52rem",
                      color: "var(--text-muted)",
                      marginTop: "1px",
                    }}
                  >
                    Max: Body + Tier
                  </div>
                </div>
              )}
              {isEidolon && (
                <div style={cellStyle}>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-muted)",
                      letterSpacing: "0.06em",
                      marginBottom: "2px",
                    }}
                  >
                    Resonance
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <button
                      onClick={() =>
                        persist({
                          currentResonance: Math.max(
                            0,
                            (c.currentResonance ?? spellThreshold) - 1,
                          ),
                        })
                      }
                      style={btnStyle}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        color: "var(--primary)",
                      }}
                    >
                      {c.currentResonance ?? spellThreshold}
                    </span>
                    <button
                      onClick={() =>
                        persist({
                          currentResonance:
                            (c.currentResonance ?? spellThreshold) + 1,
                        })
                      }
                      style={btnStyle}
                    >
                      +
                    </button>
                  </div>
                  <div
                    style={{
                      fontSize: "0.52rem",
                      color: "var(--text-muted)",
                      marginTop: "1px",
                    }}
                  >
                    Spell Threshold
                  </div>
                </div>
              )}
              {isStygian && (
                <div style={cellStyle}>
                  <div
                    style={{
                      fontSize: "0.6rem",
                      color: "var(--text-muted)",
                      letterSpacing: "0.06em",
                      marginBottom: "2px",
                    }}
                  >
                    Soul Tokens
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <button
                      onClick={() =>
                        persist({
                          currentSoulTokens: Math.max(
                            0,
                            (c.currentSoulTokens ?? 1) - 1,
                          ),
                        })
                      }
                      style={btnStyle}
                    >
                      −
                    </button>
                    <span
                      style={{
                        fontFamily: "var(--font-heading)",
                        fontWeight: 700,
                        fontSize: "1.1rem",
                        color: "var(--primary)",
                      }}
                    >
                      {c.currentSoulTokens ?? 1}
                      <span
                        style={{
                          fontSize: "0.65rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        /{maxSoulTokens}
                      </span>
                    </span>
                    <button
                      onClick={() =>
                        persist({
                          currentSoulTokens: Math.min(
                            maxSoulTokens,
                            (c.currentSoulTokens ?? 1) + 1,
                          ),
                        })
                      }
                      style={btnStyle}
                    >
                      +
                    </button>
                  </div>
                  <div
                    style={{
                      fontSize: "0.52rem",
                      color: "var(--text-muted)",
                      marginTop: "1px",
                    }}
                  >
                    Max: 3
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ──── REST ACTIONS ──── */}
      <div
        style={{
          backgroundColor: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "0.875rem 1.25rem",
          marginBottom: "1rem",
        }}
      >
        <div
          style={{
            fontSize: "0.65rem",
            letterSpacing: "0.12em",
            color: "var(--text-muted)",
            fontFamily: "var(--font-heading)",
            fontStyle: "italic",
            textTransform: "uppercase",
            marginBottom: "0.625rem",
          }}
        >
          Rest
        </div>
        <div style={{ display: "flex", gap: "0.625rem", flexWrap: "wrap" }}>
          <button
            onClick={takeRespite}
            disabled={currentRespites <= 0}
            style={{
              padding: "0.5rem 1rem",
              border: "none",
              borderRadius: "0.5rem",
              backgroundColor:
                currentRespites > 0 ? "var(--primary)" : "var(--border)",
              color: "var(--text-on-primary)",
              cursor: currentRespites > 0 ? "pointer" : "not-allowed",
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: "0.825rem",
            }}
          >
            Respite{" "}
            <span style={{ fontSize: "0.7rem", fontWeight: 400 }}>
              ({Math.max(4, attrs.body * 2)} Vit, {Math.max(4, attrs.will)} Amb)
            </span>
          </button>
          <button
            onClick={takeLongRest}
            style={{
              padding: "0.5rem 1rem",
              border: "1.5px solid var(--primary)",
              borderRadius: "0.5rem",
              backgroundColor: "transparent",
              color: "var(--primary)",
              cursor: "pointer",
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: "0.825rem",
            }}
          >
            Long Rest{" "}
            <span style={{ fontSize: "0.7rem", fontWeight: 400 }}>
              ({Math.max(10, attrs.body * 3)} Vit, +1 Resp)
            </span>
          </button>
          <button
            onClick={takeFullRest}
            style={{
              padding: "0.5rem 1rem",
              border: "1.5px solid var(--text-muted)",
              borderRadius: "0.5rem",
              backgroundColor: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontFamily: "var(--font-heading)",
              fontWeight: 700,
              fontSize: "0.825rem",
            }}
          >
            Full Rest{" "}
            <span style={{ fontSize: "0.7rem", fontWeight: 400 }}>
              (full recovery, safe location)
            </span>
          </button>
        </div>
      </div>

      {/* ──── PROFICIENCIES (skills with badge design + armaments) ──── */}
      <Section title="Proficiencies">
        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {/* Armor penalty warning */}
          {!isArmorProficient && (
            <div
              style={{
                padding: "0.4rem 0.75rem",
                backgroundColor: "var(--section-alert-bg)",
                border: "1px solid #ff7979",
                borderRadius: "0.375rem",
                fontSize: "0.78rem",
                color: "#cc2222",
                fontFamily: "var(--font-heading)",
                fontWeight: 700,
              }}
            >
              ⚠ Armor Penalty active — all skill dice reduced one step (min d4)
            </div>
          )}

          {/* Unspent skill points notice */}
          {(() => {
            const totalAvailableSkill =
              4 + 2 * Math.floor((c.featsPurchased ?? 0) / 2);
            const totalSpentSkill = Object.values(c.skillPoints ?? {}).reduce(
              (s, v) => s + v,
              0,
            );
            const dynUnspentSkill = totalAvailableSkill - totalSpentSkill;
            return dynUnspentSkill > 0 ? (
              <div
                style={{
                  padding: "0.4rem 0.75rem",
                  backgroundColor: "var(--accent-light)",
                  border: "1px solid #FCD34D",
                  borderRadius: "0.375rem",
                  fontSize: "0.8rem",
                  color: "(#92400E)",
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                }}
              >
                ✦ {dynUnspentSkill} unspent Skill Point
                {dynUnspentSkill !== 1 ? "s" : ""} — allocate below
                <span style={{ fontWeight: 400, marginLeft: "0.5rem" }}>
                  ({totalSpentSkill} / {totalAvailableSkill} spent)
                </span>
              </div>
            ) : null;
          })()}

          {/* V.I.T.A.L.S. skills — 2-col badge grid */}
          <div>
            <div
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
                fontFamily: "var(--font-heading)",
                marginBottom: "0.5rem",
              }}
            >
              V.I.T.A.L.S.
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.3rem",
              }}
            >
              {[
                "Vigor",
                "Intuition",
                "Talent",
                "Awareness",
                "Lore",
                "Social",
              ].map((skill) => {
                const pool = calcSkillPool(
                  skill,
                  attrs,
                  c.vitalsProficiencies,
                  c.vitalsExpertiseBumps ?? {},
                  c.skillPoints ?? {},
                );
                const invested = c.skillPoints?.[skill] ?? 0;
                const totalAvailableSkill =
                  4 + 2 * Math.floor((c.featsPurchased ?? 0) / 2);
                const totalSpentSkill = Object.values(
                  c.skillPoints ?? {},
                ).reduce((s, v) => s + v, 0);
                const dynUnspentSkill = totalAvailableSkill - totalSpentSkill;
                const canAdd = dynUnspentSkill > 0 && invested < 12;
                const canRemove = invested > 0;
                const RANK_COLORS: Record<string, string> = {
                  Untrained: "var(--text-muted)",
                  Trained: "var(--primary)",
                  Expert: "var(--accent)",
                  Master: "#7C3AED",
                };
                const DIE_STEP = [4, 6, 8, 10, 12] as const;
                function stepDown(faces: number): number {
                  const i = DIE_STEP.indexOf(
                    faces as (typeof DIE_STEP)[number],
                  );
                  return i > 0 ? DIE_STEP[i - 1] : 4;
                }
                const penalizedDisplay = (() => {
                  if (pool.profDieFaces !== null) {
                    return `${pool.baseDiceCount + pool.skillDiceCount}d${stepDown(pool.profDieFaces)}`;
                  }
                  const baseFaces = calcBaseDiceFromAttr(
                    calcSkillAttrValue(skill, attrs),
                  );
                  return `${pool.baseDiceCount + pool.skillDiceCount}d${stepDown(baseFaces)}`;
                })();

                // Badge color by die size
                const dieFaces =
                  pool.profDieFaces ??
                  calcBaseDiceFromAttr(calcSkillAttrValue(skill, attrs));
                const badgeStyle: React.CSSProperties =
                  dieFaces >= 10
                    ? {
                        backgroundColor: "var(--primary)",
                        color: "var(--text-on-primary)",
                      }
                    : dieFaces === 8
                      ? {
                          backgroundColor: "var(--primary-light)",
                          color: "var(--primary)",
                          border: "1px solid var(--primary)",
                        }
                      : dieFaces === 6
                        ? {
                            backgroundColor: "var(--bg-nav)",
                            color: "var(--text-muted)",
                            border: "1px solid var(--border)",
                          }
                        : {
                            backgroundColor: "var(--bg-nav)",
                            color: "var(--text-muted)",
                            border: "1px solid var(--border)",
                          };

                return (
                  <div
                    key={skill}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      backgroundColor: "var(--bg-nav)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      padding: "0.375rem 0.625rem",
                    }}
                  >
                    {/* Skill name */}
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "var(--text)",
                        flex: 1,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {skill}
                    </span>
                    {/* Rank badge (non-untrained only) */}
                    {pool.rank !== "Untrained" && (
                      <span
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-heading)",
                          padding: "0.1rem 0.35rem",
                          borderRadius: "9999px",
                          border: `1px solid ${RANK_COLORS[pool.rank]}`,
                          color: RANK_COLORS[pool.rank],
                        }}
                      >
                        {pool.rank}
                      </span>
                    )}
                    {/* Die badge */}
                    {isArmorProficient ? (
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-heading)",
                          padding: "1px 7px",
                          borderRadius: "5px",
                          ...badgeStyle,
                        }}
                      >
                        {pool.display}
                      </span>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          gap: "0.2rem",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontFamily: "var(--font-heading)",
                            color: "var(--text-muted)",
                            textDecoration: "line-through",
                          }}
                        >
                          {pool.display}
                        </span>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            fontFamily: "var(--font-heading)",
                            padding: "1px 7px",
                            borderRadius: "5px",
                            backgroundColor: "var(--bg-nav)",
                            color: "#cc2222",
                            border: "1px solid #cc2222",
                          }}
                        >
                          {penalizedDisplay}
                        </span>
                      </div>
                    )}
                    {/* Invest +/− */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.2rem",
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => {
                          if (!canRemove) return;
                          const newSkillPts = {
                            ...(c.skillPoints ?? {}),
                            [skill]: invested - 1,
                          };
                          const newTotalSpent = totalSpentSkill - 1;
                          persist({
                            skillPoints: newSkillPts,
                            unspentSkillPoints:
                              totalAvailableSkill - newTotalSpent,
                          });
                        }}
                        disabled={!canRemove}
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--bg-card)",
                          cursor: canRemove ? "pointer" : "not-allowed",
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        −
                      </button>
                      <span
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontWeight: 700,
                          fontSize: "0.75rem",
                          minWidth: "14px",
                          textAlign: "center",
                          color: "var(--primary)",
                        }}
                      >
                        {invested}
                      </span>
                      <button
                        onClick={() => {
                          if (!canAdd) return;
                          const newSkillPts = {
                            ...(c.skillPoints ?? {}),
                            [skill]: invested + 1,
                          };
                          const newTotalSpent = totalSpentSkill + 1;
                          persist({
                            skillPoints: newSkillPts,
                            unspentSkillPoints:
                              totalAvailableSkill - newTotalSpent,
                          });
                        }}
                        disabled={!canAdd}
                        style={{
                          width: "18px",
                          height: "18px",
                          borderRadius: "50%",
                          border: "1px solid var(--border)",
                          backgroundColor: "var(--bg-card)",
                          cursor: canAdd ? "pointer" : "not-allowed",
                          fontWeight: 700,
                          color: "var(--text-muted)",
                          fontSize: "0.75rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Armaments / Protection / Tool Kits */}
          {[
            { label: "Armaments", items: prof?.armaments ?? [] },
            { label: "Protection", items: prof?.protection ?? [] },
            {
              label: "Tool Kits",
              items: (prof?.toolKits ?? []).filter((t) => t !== "-"),
            },
          ]
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.label}>
                <div
                  style={{
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    fontFamily: "var(--font-heading)",
                    marginBottom: "0.375rem",
                  }}
                >
                  {group.label}
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.35rem",
                  }}
                >
                  {group.items.map((item) => (
                    <div
                      key={item}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.625rem",
                        padding: "0.45rem 0.75rem",
                        backgroundColor: "var(--bg-nav)",
                        border: "1px solid var(--border)",
                        borderRadius: "0.375rem",
                      }}
                    >
                      <span
                        style={{
                          fontFamily: "var(--font-heading)",
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          color: "var(--text)",
                          flex: 1,
                        }}
                      >
                        {item}
                      </span>
                      <span
                        style={{
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-heading)",
                          padding: "0.1rem 0.35rem",
                          borderRadius: "9999px",
                          border: "1px solid var(--primary)",
                          color: "var(--primary)",
                        }}
                      >
                        Proficient
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </Section>

      {/* ──── TABBED SECTION ──── */}
      <div>
        <div style={{ marginBottom: "4rem" }}>
          {activeTab === "feats" && renderFeatsTab()}
          {activeTab === "inventory" && renderInventoryTab()}
          {activeTab === "spellcasting" && renderSpellcastingTab()}
          {activeTab === "notes" && renderNotesTab()}
        </div>
        {/* Bottom sticky tab bar */}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            backgroundColor: "var(--bg-nav)",
            borderTop: "1px solid var(--border)",
            display: "grid",
            gridTemplateColumns: `repeat(${tabs.filter((t) => !t.hidden).length}, 1fr)`,
            zIndex: 10,
          }}
        >
          {tabs
            .filter((t) => !t.hidden)
            .map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: "0.625rem 0.5rem",
                    border: "none",
                    cursor: "pointer",
                    backgroundColor: "transparent",
                    fontFamily: "var(--font-heading)",
                    fontStyle: "italic",
                    fontWeight: 700,
                    fontSize: "0.75rem",
                    letterSpacing: "0.05em",
                    color: active ? "var(--primary)" : "var(--text-muted)",
                    borderTop: active
                      ? "2px solid var(--primary)"
                      : "2px solid transparent",
                    transition: "color 0.12s",
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
        </div>
      </div>
    </div>
  );
}

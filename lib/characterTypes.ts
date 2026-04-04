export type AttributeKey = 'body' | 'mind' | 'will';

export interface CharacterAttributes {
  body: number;
  mind: number;
  will: number;
}

export interface Character {
  id: string;
  createdAt: string;
  updatedAt: string;

  // Step 1
  name: string;
  tier: number; // 1–5
  featAllowance: number; // 0/3/6/8/10 by tier

  // Step 2: Profession
  professionId: string;
  professionName: string;

  // Step 3: Origin + Vocation
  originId: string;
  originName: string;
  vocationId: string;
  vocationName: string;
  vocationAttributeBonus: { attribute: AttributeKey; value: number };
  vocationCaster: BuilderVocationCaster | null;

  // Step 5: Attributes (base points — vocation bonus applied on top)
  baseAttributes: CharacterAttributes;

  // Step 4 (proficiencies): V.I.T.A.L.S. proficiency choices
  vitalsProficiencies: string[];

  // Spellcasting modifier (for "Mind or Will" professions; user picks)
  spellcastingModifier: AttributeKey | null;

  // Step 6: Feats
  selectedFeatIds: string[];

  // Step 7: Known Spells (captured in Summary step for casters)
  knownSpellIds: string[];

  // Summary step
  ambition: string;
  inventoryNotes: string;
  currency: string;
  notes: string;

  // Play tracking (updated on character sheet)
  currentVitality: number;
  maxVitality: number | null;
  currentWounds: number;
  renown: number;
  featsPurchased: number;
}

// ─── Builder data shapes (passed from server to client) ──────────────────────

export interface BuilderVocationCaster {
  casterType: 'full' | 'half' | 'limited';
  casterSource: string;
  casterModifierOptions: AttributeKey[];
}

export interface BuilderStartingPack {
  weapons: string[];
  armor: string[];
  kit: string[];
  inventory: string[];
  currency: string | null;
}

export interface BuilderOriginPackCategory {
  label: string;
  items: string[];
}

export interface BuilderProfession {
  id: string;
  name: string;
  role: string;
  flavor: string;
  startingVitality: string;
  vitalityPerTier: string;
  pathOptions: string[];
  vitalsChoiceCount: number;
  vitalsOptions: string[];
  armaments: string[];
  protection: string[];
  toolKits: string[];
  casterType: 'full' | 'half' | 'limited' | null;
  casterSource: string | null;
  casterModifierOptions: AttributeKey[];
  startingPack: BuilderStartingPack;
}

export interface BuilderVocation {
  id: string;
  name: string;
  attributeBonus: { attribute: AttributeKey; value: number };
  flavor: string;
  caster: BuilderVocationCaster | null;
}

export interface BuilderOrigin {
  id: string;
  name: string;
  flavor: string;
  vocations: BuilderVocation[];
  originPack: { name: string; categories: BuilderOriginPackCategory[] } | null;
}

export interface BuilderFeat {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  ownerType: 'profession' | 'origin';
  tier: number;
  tag: string | null;
  required: string | null;
  pathInvestment: string | null;
  descriptionMarkdown: string;
  traits: string[];
  activationRaw: string | null;
  casterInfo: BuilderVocationCaster | null;
}

export interface BuilderSpell {
  id: string;
  name: string;
  slug: string;
  tier: number;
  isCantrip: boolean;
  school: string;
  sources: string[];
  range: string;
  duration: string;
  descriptionMarkdown: string;
}

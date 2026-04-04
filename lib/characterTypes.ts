export type AttributeKey = 'body' | 'mind' | 'will';

export type InventoryCategory = 'Weapon' | 'Armor' | 'Shield' | 'Kit' | 'Consumable' | 'Misc';
export type InventorySlot = 'Main Hand' | 'Off Hand' | 'Two Hands' | 'Body' | null;

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  weight: number;
  notes: string;
  source: 'creation' | 'manual' | 'catalog';
  slot: InventorySlot;
  equipped: boolean;
  traits: string[];
  catalogItemId: string | null;
  // Armor fields
  armorBonus: number;
  armorCategory: 'Light' | 'Medium' | 'Heavy' | null;
  // Weapon fields
  modifierStat: 'Body' | 'Mind' | 'Will' | null;
  isRanged: boolean;
  damageDiceCount: number;
  damageDiceSize: number;
  damageTypes: string[];
  // Masterwork
  masterworkBonus: number;
  // Equippable
  equippable: boolean;
}

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
  // Spells toggled on in the active spell feed (subset of knownSpellIds)
  activeFeedSpellIds: string[];

  // Summary step
  ambition: string;
  inventoryNotes: string;
  currency: string;
  notes: string;

  // Inventory (structured table)
  inventory: InventoryItem[];

  // Ambition
  maxAmbition: number;
  ambitionDice: string;
  currentAmbition: number;

  // Spellcasting play tracking
  currentReservoir: number;

  // Rest tracking
  currentRespites: number;

  // Choice selections: key = "EntityName__FeatureName", value = selected option names
  choiceSelections: Record<string, string[]>;

  // Play tracking (updated on character sheet)
  currentVitality: number;
  maxVitality: number | null;
  currentWounds: number;
  renown: number;
  featsPurchased: number;
}

// ─── Choice feature resolution ────────────────────────────────────────────────

export interface ChoiceFeatureOption {
  name: string;
  effect_text: string;
}

export interface ChoiceFeature {
  entity_type: string;
  entity_name: string;
  source_kind: string;
  feature_name: string;
  tier: number | null;
  path: string | null;
  choice_type: string;
  selection_rule: 'single' | 'fixed_count';
  min_choices: number;
  max_choices: number;
  selection_timing: 'on_gain' | 'on_rest' | 'on_use' | 'on_activation';
  branches_from_feature: string | null;
  notes: string | null;
  options: ChoiceFeatureOption[];
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

export interface BuilderFeatureEntry {
  id: string;
  name: string;
  descriptionMarkdown: string;
  traits: string[];
  activationRaw: string | null;
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
  baseFeatures: BuilderFeatureEntry[];
}

export interface BuilderVocation {
  id: string;
  name: string;
  attributeBonus: { attribute: AttributeKey; value: number };
  flavor: string;
  caster: BuilderVocationCaster | null;
  features: BuilderFeatureEntry[];
}

export interface BuilderOrigin {
  id: string;
  name: string;
  flavor: string;
  vocations: BuilderVocation[];
  originPack: { name: string; categories: BuilderOriginPackCategory[] } | null;
  baseFeatures: BuilderFeatureEntry[];
  caster: BuilderVocationCaster | null;
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
  amps: Array<{ cost: string; effect: string }>;
}

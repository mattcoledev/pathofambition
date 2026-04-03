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

  // Step 2: Profession
  professionId: string;
  professionName: string;

  // Step 3: Origin + Vocation
  originId: string;
  originName: string;
  vocationId: string;
  vocationName: string;
  vocationAttributeBonus: { attribute: AttributeKey; value: number };

  // Step 4: Path
  pathChoice: string;

  // Step 5: Attributes (base points — vocation bonus applied on top)
  baseAttributes: CharacterAttributes;

  // Step 6: V.I.T.A.L.S. proficiency choices
  vitalsProficiencies: string[];

  // Spellcasting modifier (for "Mind or Will" professions; user picks)
  spellcastingModifier: AttributeKey | null;

  // Step 7: Feats
  selectedFeatIds: string[];

  // Step 8: Known Spells
  knownSpellIds: string[];

  // Step 9: Finishing details
  ambition: string;
  inventoryNotes: string;
  currency: string;
  notes: string;

  // Play tracking (updated on character sheet)
  currentVitality: number;
  maxVitality: number | null; // null = not yet set (user rolls at session 0)
  currentWounds: number;
  renown: number;
  featsPurchased: number;
}

// ─── Builder data shapes (passed from server to client) ──────────────────────

export interface BuilderProfession {
  id: string;
  name: string;
  role: string;
  flavor: string;
  startingVitality: string;   // e.g. "12 + Body"
  vitalityPerTier: string;    // e.g. "2d12"
  pathOptions: string[];
  vitalsChoiceCount: number;  // how many V.I.T.A.L.S. to pick
  vitalsOptions: string[];    // which V.I.T.A.L.S. are available
  armaments: string[];
  protection: string[];
  toolKits: string[];
  casterType: 'full' | 'half' | 'limited' | null;
  casterSource: string | null;
  casterModifierOptions: AttributeKey[]; // e.g. ['will'] or ['mind','will']
}

export interface BuilderVocation {
  id: string;
  name: string;
  attributeBonus: { attribute: AttributeKey; value: number };
  flavor: string;
}

export interface BuilderOrigin {
  id: string;
  name: string;
  flavor: string;
  vocations: BuilderVocation[];
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

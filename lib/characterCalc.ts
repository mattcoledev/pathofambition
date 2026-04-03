import type { Character, CharacterAttributes, AttributeKey, BuilderProfession } from './characterTypes';

export function getTotalAttributes(char: Character): CharacterAttributes {
  const b = char.vocationAttributeBonus;
  return {
    body: char.baseAttributes.body + (b.attribute === 'body' ? b.value : 0),
    mind: char.baseAttributes.mind + (b.attribute === 'mind' ? b.value : 0),
    will: char.baseAttributes.will + (b.attribute === 'will' ? b.value : 0),
  };
}

/** Parse "12 + Body" → { base: 12, attribute: 'body' } */
export function parseStartingVitality(formula: string): { base: number; attribute: AttributeKey } {
  const m = formula.match(/(\d+)\s*\+\s*(Body|Mind|Will)/i);
  if (!m) return { base: 10, attribute: 'body' };
  return {
    base: parseInt(m[1], 10),
    attribute: m[2].toLowerCase() as AttributeKey,
  };
}

export function calcStartingVitality(prof: BuilderProfession, attrs: CharacterAttributes): number {
  const { base, attribute } = parseStartingVitality(prof.startingVitality);
  return base + attrs[attribute];
}

export function calcBodyDefense(attrs: CharacterAttributes): number {
  return 10 + attrs.body;
}

export function calcMindDefense(attrs: CharacterAttributes): number {
  return 10 + attrs.mind;
}

export function calcWillDefense(attrs: CharacterAttributes): number {
  return 10 + attrs.will;
}

export function calcMaxWounds(attrs: CharacterAttributes, tier: number): number {
  return Math.floor(attrs.body / 2) + tier;
}

export function calcCarryWeight(attrs: CharacterAttributes, tier: number): number {
  return 5 + attrs.body + tier;
}

export function calcReservoir(
  casterType: 'full' | 'half' | 'limited' | null,
  tier: number,
  modifierValue: number,
): number | null {
  if (!casterType) return null;
  if (casterType === 'full') return 2 * tier + modifierValue;
  if (casterType === 'half') return tier + modifierValue;
  if (casterType === 'limited') return Math.ceil(tier / 2) + modifierValue;
  return null;
}

export function calcSpellDC(tier: number, modifierValue: number): number {
  return 10 + tier + modifierValue;
}

/** Tier progression thresholds — cumulative feats to reach each tier. */
export const TIER_THRESHOLDS = [0, 3, 6, 8, 10]; // index = tier-1 needed feats
export const TIER_TOTAL_SLOTS = [4, 8, 11, 13, 16];

export function currentTierFromFeats(purchased: number): number {
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (purchased >= TIER_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

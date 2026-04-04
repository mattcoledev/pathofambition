import type { Character, CharacterAttributes, AttributeKey, BuilderProfession, BuilderFeat } from './characterTypes';

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

/** Parse "+X maximum Vitality" bonus from a feat description. Returns 0 if none. */
export function parseFeatVitalityBonus(feat: BuilderFeat): number {
  const md = feat.descriptionMarkdown;
  const match = md.match(/\+\s*(\d+)\s*(?:maximum|[Mm]ax(?:imum)?)?[^a-z\n]*?\**[Vv]itality\**/i) ||
                md.match(/\**\+(\d+)\s*[Mm]ax(?:imum)?\s*[Vv]itality\**/i);
  return match ? parseInt(match[1], 10) : 0;
}

/** Sum all vitality bonuses from the feats whose IDs are in selectedFeatIds. */
export function calcFeatVitalityBonus(selectedFeatIds: string[], allFeats: BuilderFeat[]): number {
  return selectedFeatIds.reduce((sum, id) => {
    const feat = allFeats.find((f) => f.id === id);
    return sum + (feat ? parseFeatVitalityBonus(feat) : 0);
  }, 0);
}

export function calcBodyDefense(attrs: CharacterAttributes): number { return 10 + attrs.body; }
export function calcMindDefense(attrs: CharacterAttributes): number { return 10 + attrs.mind; }
export function calcWillDefense(attrs: CharacterAttributes): number { return 10 + attrs.will; }
export function calcMaxWounds(attrs: CharacterAttributes, tier: number): number { return Math.floor(attrs.body / 2) + tier; }
export function calcCarryWeight(attrs: CharacterAttributes, tier: number): number { return 5 + attrs.body + tier; }

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

export const FEAT_ALLOWANCE: Record<number, number> = { 1: 0, 2: 3, 3: 6, 4: 8, 5: 10 };

export const TIER_TOTAL_SLOTS = [4, 8, 11, 13, 16];

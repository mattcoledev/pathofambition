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

export function calcArmorDefense(
  equippedArmor: { armorBonus?: number; armorCategory?: string | null; masterworkBonus?: number } | null,
  equippedShield: { armorBonus?: number; armorCategory?: string | null; masterworkBonus?: number } | null,
  attrs: CharacterAttributes,
  hasAgile: boolean,
  hasUnarmoredDefense?: boolean,
  tier?: number,
): number {
  // Berserker: Unarmored Defense applies when no armor is equipped
  if (hasUnarmoredDefense && !equippedArmor) {
    return 10 + attrs.body + (tier ?? 1);
  }
  const armorBonus = (equippedArmor?.armorBonus ?? 0) + (equippedArmor?.masterworkBonus ?? 0);
  const shieldBonus = (equippedShield?.armorBonus ?? 0) + (equippedShield?.masterworkBonus ?? 0);
  const armorCategory = equippedArmor?.armorCategory ?? null;
  // Agile applies with no armor (or Light armor) and no Medium/Heavy shield
  const shieldBlocksAgile = equippedShield && equippedShield.armorCategory !== 'Light';
  if (
    hasAgile &&
    !shieldBlocksAgile &&
    (armorCategory === null || armorCategory === 'Light')
  ) {
    return 10 + armorBonus + shieldBonus + Math.max(attrs.body, attrs.mind);
  }
  return 10 + armorBonus + shieldBonus;
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

export function calcSpellDC(spellcastingTier: number, modifierValue: number): number {
  return 10 + spellcastingTier + modifierValue;
}

export const FEAT_ALLOWANCE: Record<number, number> = { 1: 0, 2: 3, 3: 6, 4: 8, 5: 10 };

export const TIER_TOTAL_SLOTS = [4, 8, 11, 13, 16];

/** Tier is determined by total feats purchased with Renown. */
export function calcTierFromFeatsPurchased(featsPurchased: number): number {
  if (featsPurchased >= 10) return 5;
  if (featsPurchased >= 8)  return 4;
  if (featsPurchased >= 6)  return 3;
  if (featsPurchased >= 3)  return 2;
  return 1;
}

/** Spellcasting Threshold from total feats purchased. */
export function calcSpellcastingThreshold(featsPurchased: number): number {
  if (featsPurchased >= 16) return 7;
  if (featsPurchased >= 14) return 6;
  if (featsPurchased >= 12) return 5;
  if (featsPurchased >= 10) return 4;
  if (featsPurchased >= 8)  return 3;
  if (featsPurchased >= 6)  return 2;
  if (featsPurchased >= 3)  return 1;
  return 0;
}

/** Spellcasting Tier from caster type and threshold. */
export function calcSpellcastingTier(casterType: 'full' | 'half' | 'limited', threshold: number): number {
  if (casterType === 'full')    return Math.min(threshold, 6);
  if (casterType === 'half')    return Math.min(Math.floor(threshold / 2), 5);
  /* limited */                 return Math.min(Math.floor(threshold / 2), 4);
}

/** Known Spells from caster type and threshold. */
export function calcKnownSpells(casterType: 'full' | 'half' | 'limited', threshold: number): number {
  if (casterType === 'full')  return 4 + 3 * threshold;
  if (casterType === 'half')  return 3 + 2 * threshold;
  /* limited */               return 2 + threshold;
}

/** Prepared Spells = Spell Modifier Attribute + Tier. */
export function calcPreparedSpells(modifierValue: number, characterTier: number): number {
  return modifierValue + characterTier;
}

/** Returns the Ambition dice type and max pool.
 *  Die is the higher of the Will-based or Tier-based die (spec: take higher when both apply). */
export function calcAmbition(will: number, tier: number = 1): { dice: string; max: number } {
  const DICE = ['d4', 'd6', 'd8', 'd10', 'd12'] as const;
  // Will-based die index
  let willIdx = 0;
  if (will >= 12)     willIdx = 4;
  else if (will >= 10) willIdx = 3;
  else if (will >= 8)  willIdx = 2;
  else if (will >= 4)  willIdx = 1;
  // Tier-based die index (Tier 1 → d4, Tier 2–3 → d6, Tier 4–5 → d8)
  const tierIdx = tier >= 4 ? 2 : tier >= 2 ? 1 : 0;
  return { dice: DICE[Math.max(willIdx, tierIdx)], max: Math.max(5, will) };
}

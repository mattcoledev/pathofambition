import type { Character } from './characterTypes';

const STORAGE_KEY = 'poa_characters';

function generateId(): string {
  return `char_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function loadCharacters(): Character[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Character[]) : [];
  } catch {
    return [];
  }
}

export function saveCharacter(char: Omit<Character, 'id' | 'createdAt' | 'updatedAt'>): Character {
  const all = loadCharacters();
  const now = new Date().toISOString();
  const saved: Character = { ...char, id: generateId(), createdAt: now, updatedAt: now };
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...all, saved]));
  return saved;
}

export function updateCharacter(id: string, updates: Partial<Character>): Character | null {
  const all = loadCharacters();
  const idx = all.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...updates, updatedAt: new Date().toISOString() };
  all[idx] = updated;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return updated;
}

export function deleteCharacter(id: string): void {
  const all = loadCharacters().filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getCharacter(id: string): Character | null {
  const found = loadCharacters().find((c) => c.id === id) ?? null;
  if (!found) return null;
  // Backfill fields added after initial release
  if (!found.inventory) (found as Character).inventory = [];
  if (found.currentAmbition === undefined) (found as Character).currentAmbition = 0;
  if (found.maxAmbition === undefined) (found as Character).maxAmbition = 4;
  if (found.ambitionDice === undefined) (found as Character).ambitionDice = 'd4';
  if (found.currentReservoir === undefined) (found as Character).currentReservoir = 0;
  if (found.currentRespites === undefined) (found as Character).currentRespites = 3;
  if (!found.choiceSelections) (found as Character).choiceSelections = {};
  if (!found.activeFeedSpellIds) (found as Character).activeFeedSpellIds = (found as Character).knownSpellIds ?? [];
  if (!found.armamentProficiencyTags) (found as Character).armamentProficiencyTags = [];
  // Backfill slot/equipped/traits on inventory items
  (found as Character).inventory = ((found as Character).inventory ?? []).map((item) => {
    // Parse legacy damageDice string (e.g. "2d6") into count/size
    const rawItem = item as unknown as Record<string, unknown>;
    const rawDice = (rawItem.damageDice as string) ?? '';
    const rawType = (rawItem.damageType as string) ?? '';
    const diceMatch = rawDice.match(/^(\d+)d(\d+)$/i);
    // Normalise legacy modifierStat (Title-case → lower-case AttributeKey)
    const rawModStat = (item.modifierStat ?? rawItem.modifierStat ?? null) as string | null;
    const modStatNorm = rawModStat ? rawModStat.toLowerCase() as 'body' | 'mind' | 'will' : null;
    // Normalise legacy damageTypes free-text to damageTypeTags enum values
    const legacyTypes = (rawItem.damageTypes as string[] | undefined) ?? [];
    const rawDamTypeTags = (rawItem.damageTypeTags as string[] | undefined);
    const damTypeTagsNorm = rawDamTypeTags ?? legacyTypes.map((t) => t.toLowerCase()).filter((t): t is 'puncture' | 'slash' | 'blunt' => ['puncture', 'slash', 'blunt'].includes(t));
    // Backfill equipSlots from legacy slot field
    const slotToTag: Record<string, string> = { 'Main Hand': 'main_hand', 'Off Hand': 'off_hand', 'Two Hands': 'two_hands', 'Body': 'body' };
    const equipSlotsNorm = (rawItem.equipSlots as string[] | undefined) ?? (item.slot ? [slotToTag[item.slot] ?? ''].filter(Boolean) : []);
    return {
      ...item,
      slot: item.slot ?? null,
      equipped: item.equipped ?? false,
      traits: item.traits ?? [],
      catalogItemId: item.catalogItemId ?? null,
      armorBonus: item.armorBonus ?? 0,
      armorCategory: item.armorCategory ?? null,
      armamentTags: (rawItem.armamentTags as string[] | undefined) ?? [],
      modifierStat: modStatNorm,
      isRanged: item.isRanged ?? false,
      damageDiceCount: item.damageDiceCount ?? (diceMatch ? parseInt(diceMatch[1]) : 0),
      damageDiceSize: item.damageDiceSize ?? (diceMatch ? parseInt(diceMatch[2]) : 6),
      damageTypeTags: damTypeTagsNorm,
      equipSlots: equipSlotsNorm,
      masterworkBonus: item.masterworkBonus ?? 0,
      equippable: item.equippable ?? (item.slot !== null),
    };
  });
  return found;
}

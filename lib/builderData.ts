import { readFileSync } from 'fs';
import path from 'path';
import type {
  BuilderProfession, BuilderOrigin, BuilderFeat, BuilderSpell, BuilderFeatureEntry,
  AttributeKey, BuilderVocationCaster, BuilderStartingPack, BuilderOriginPackCategory,
  ChoiceFeature,
} from './characterTypes';

function readJSON<T>(filename: string): T {
  const filePath = path.join(process.cwd(), 'content', filename);
  return JSON.parse(readFileSync(filePath, 'utf-8')) as T;
}

const ALL_VITALS = ['Vigor', 'Intuition', 'Talent', 'Awareness', 'Lore', 'Social'];

function parseVitalsChoice(skills: string[]): { count: number; options: string[] } {
  if (!skills?.length) return { count: 0, options: [] };
  const first = skills[0].toLowerCase();
  const count = first.includes('two') ? 2 : 1;
  if (first.includes('any')) return { count, options: ALL_VITALS };

  const options: string[] = [];
  const dash = skills[0].match(/[—\-]\s*([A-Z][a-z]+)/);
  if (dash) options.push(dash[1]);
  skills.slice(1).forEach((s) => {
    const clean = s.replace(/^or\s+/i, '').replace(/[,.]$/, '').trim();
    if (clean && ALL_VITALS.includes(clean)) options.push(clean);
  });
  return { count, options };
}

// ─── Caster detection — requires "You are a **X-caster**" to avoid false positives ─

interface CasterInfo {
  casterType: 'full' | 'half' | 'limited' | null;
  casterSource: string | null;
  casterModifierOptions: AttributeKey[];
}

function detectCasterFromMarkdown(md: string): CasterInfo {
  // Normalize non-breaking spaces before matching
  const normalized = md.replace(/\u00a0/g, ' ');
  // Strict match: must say "You are a **X-caster**" or "You're a **X-caster**"
  const typeMatch = normalized.match(/You(?:'re| are) a \*\*(Full|Half|Limited)-[Cc]aster\*\*/i);
  if (!typeMatch) return { casterType: null, casterSource: null, casterModifierOptions: [] };

  const casterType = typeMatch[1].toLowerCase() as 'full' | 'half' | 'limited';

  const sourceMatch = normalized.match(/\*\*[Ss]ource\*\*\s+is\s+\*\*(.*?)\*\*/i) ||
                      normalized.match(/\*\*[Ss]ource\*\*:\s*_?(.*?)_?\n/i) ||
                      normalized.match(/[Ss]ource\*\*[^*\n]+\*\*(.*?)\*\*/i) ||
                      normalized.match(/\*\*source\*\* is \*\*(.*?)\*\*/i) ||
                      normalized.match(/source\*\* is \*\*(.*?)\*\*/i);
  const casterSource = sourceMatch ? sourceMatch[1].trim() : null;

  const modMatch = normalized.match(/Spellcasting Modifier\*\*\s+is\s+\*\*(.*?)\*\*/i) ||
                   normalized.match(/Spellcasting Modifier\*\*:\s*_?(.*?)_?[\n.]/i) ||
                   normalized.match(/spell casting modifier\*\* is \*\*(.*?)\*\*/i) ||
                   normalized.match(/spellcasting modifier\*\* is \*\*(.*?)\*\*/i);
  const modRaw = modMatch ? modMatch[1].trim() : '';

  const casterModifierOptions: AttributeKey[] = [];
  if (/mind/i.test(modRaw)) casterModifierOptions.push('mind');
  if (/will/i.test(modRaw)) casterModifierOptions.push('will');
  if (/body/i.test(modRaw)) casterModifierOptions.push('body');
  if (casterModifierOptions.length === 0 && modRaw) {
    // fallback: try lower-cased
    const lower = modRaw.toLowerCase();
    if (lower.includes('mind')) casterModifierOptions.push('mind');
    else if (lower.includes('will')) casterModifierOptions.push('will');
    else if (lower.includes('body')) casterModifierOptions.push('body');
  }

  return { casterType, casterSource, casterModifierOptions };
}

function detectCasterFromFeatures(features: Array<{ description_markdown?: string }>): CasterInfo {
  for (const f of features ?? []) {
    const info = detectCasterFromMarkdown(f.description_markdown ?? '');
    if (info.casterType) return info;
  }
  return { casterType: null, casterSource: null, casterModifierOptions: [] };
}

// ─── Starting pack helpers ────────────────────────────────────────────────────

function extractProfessionPack(rawPack: Record<string, unknown>): BuilderStartingPack {
  function items(key: string): string[] {
    const section = rawPack[key] as { items?: string[] } | undefined;
    return section?.items?.filter((i) => i && i.toLowerCase() !== 'none') ?? [];
  }
  return {
    weapons: items('weapons'),
    armor: items('armor'),
    kit: items('kit'),
    inventory: items('inventory'),
    currency: (rawPack.starting_currency as string | null) ?? null,
  };
}

function extractOriginPack(rawPack: Record<string, unknown> | undefined, packName: string): { name: string; categories: BuilderOriginPackCategory[] } | null {
  if (!rawPack?.parsed) return null;
  const parsed = rawPack.parsed as Record<string, { items?: string[] }>;
  const categories: BuilderOriginPackCategory[] = Object.entries(parsed)
    .map(([key, val]) => ({
      label: key.charAt(0).toUpperCase() + key.slice(1),
      items: val.items ?? [],
    }))
    .filter((cat) => cat.items.length > 0);
  if (categories.length === 0) return null;
  return { name: packName ?? 'Origin Pack', categories };
}

// ─── Exported loaders ─────────────────────────────────────────────────────────

export function getBuilderProfessions(): BuilderProfession[] {
  const data = readJSON<{ professions: Record<string, unknown>[] }>('professions.normalized.json');
  return data.professions.map((p) => {
    const prof = p as {
      id: string; name: string; role: string; flavor: string;
      starting_vitality: string; vitality_gained_per_tier: string;
      path_options: string[];
      proficiencies: { vitals_skills: string[]; armaments: string[]; protection: string[]; tool_kits: string[] };
      features: Array<{ id?: string; name?: string; description_markdown?: string; traits?: string[]; activation?: { raw?: string } }>;
      starting_pack: Record<string, unknown>;
    };

    const { count, options } = parseVitalsChoice(prof.proficiencies?.vitals_skills ?? []);
    const caster = detectCasterFromFeatures(prof.features ?? []);

    return {
      id: prof.id,
      name: prof.name,
      role: prof.role ?? '',
      flavor: prof.flavor ?? '',
      startingVitality: prof.starting_vitality ?? '10 + Body',
      vitalityPerTier: prof.vitality_gained_per_tier ?? '2d8',
      pathOptions: prof.path_options ?? [],
      vitalsChoiceCount: count,
      vitalsOptions: options,
      armaments: prof.proficiencies?.armaments ?? [],
      protection: prof.proficiencies?.protection ?? [],
      toolKits: prof.proficiencies?.tool_kits ?? [],
      ...caster,
      startingPack: extractProfessionPack(prof.starting_pack ?? {}),
      baseFeatures: (prof.features ?? []).map((f) => ({
        id: f.id ?? '',
        name: f.name ?? '',
        descriptionMarkdown: f.description_markdown ?? '',
        traits: f.traits ?? [],
        activationRaw: f.activation?.raw ?? null,
      })),
    } satisfies BuilderProfession;
  });
}

export function getBuilderOrigins(): BuilderOrigin[] {
  const data = readJSON<{ origins: Record<string, unknown>[] }>('origins.normalized.json');
  return data.origins.map((o) => {
    const origin = o as {
      id: string; name: string; flavor: string; pack_name: string;
      origin_pack: Record<string, unknown>;
      origin_features: Array<{ id?: string; name?: string; description_markdown?: string; traits?: string[]; activation?: { raw?: string } }>;
      vocations: Array<{
        id: string; name: string; flavor: string;
        attribute_bonus: { attribute: string; value: number };
        features: Array<{ id?: string; name?: string; description_markdown?: string; traits?: string[]; activation?: { raw?: string } }>;
      }>;
    };

    const originFeatures = origin.origin_features ?? [];
    const originCasterInfo = detectCasterFromFeatures(originFeatures);
    const originCaster: BuilderVocationCaster | null = originCasterInfo.casterType
      ? { casterType: originCasterInfo.casterType, casterSource: originCasterInfo.casterSource ?? '', casterModifierOptions: originCasterInfo.casterModifierOptions }
      : null;

    return {
      id: origin.id,
      name: origin.name,
      flavor: origin.flavor ?? '',
      baseFeatures: originFeatures.map((f) => ({
        id: f.id ?? '',
        name: f.name ?? '',
        descriptionMarkdown: f.description_markdown ?? '',
        traits: f.traits ?? [],
        activationRaw: f.activation?.raw ?? null,
      })),
      caster: originCaster,
      vocations: (origin.vocations ?? []).map((v) => {
        const casterInfo = detectCasterFromFeatures(v.features ?? []);
        const vocationCaster: BuilderVocationCaster | null = casterInfo.casterType
          ? { casterType: casterInfo.casterType, casterSource: casterInfo.casterSource ?? '', casterModifierOptions: casterInfo.casterModifierOptions }
          : null;
        return {
          id: v.id,
          name: v.name,
          flavor: v.flavor ?? '',
          attributeBonus: {
            attribute: (v.attribute_bonus?.attribute ?? 'body') as AttributeKey,
            value: v.attribute_bonus?.value ?? 1,
          },
          caster: vocationCaster,
          features: (v.features ?? []).map((f) => ({
            id: f.id ?? '',
            name: f.name ?? '',
            descriptionMarkdown: f.description_markdown ?? '',
            traits: f.traits ?? [],
            activationRaw: f.activation?.raw ?? null,
          })),
        };
      }),
      originPack: extractOriginPack(origin.origin_pack, origin.pack_name),
    } satisfies BuilderOrigin;
  });
}

export function getBuilderFeats(): { professionFeats: BuilderFeat[]; originFeats: BuilderFeat[] } {
  const pf = readJSON<{ feats: Record<string, unknown>[] }>('profession_feats.normalized.json');
  const of_ = readJSON<{ feats: Record<string, unknown>[] }>('origin_feats.normalized.json');

  function mapFeat(f: Record<string, unknown>, ownerType: 'profession' | 'origin'): BuilderFeat {
    const md = (f.description_markdown as string) ?? '';
    const casterDetected = detectCasterFromMarkdown(md);
    const casterInfo: BuilderVocationCaster | null = casterDetected.casterType
      ? { casterType: casterDetected.casterType, casterSource: casterDetected.casterSource ?? '', casterModifierOptions: casterDetected.casterModifierOptions }
      : null;
    return {
      id: f.id as string,
      name: f.name as string,
      ownerId: f.owner_id as string,
      ownerName: f.owner_name as string,
      ownerType,
      tier: (f.tier as number) ?? 1,
      tag: (f.tag as string) ?? null,
      required: (f.required as string) ?? null,
      pathInvestment: (f.path_investment as string) ?? null,
      descriptionMarkdown: md,
      traits: (f.traits as string[]) ?? [],
      activationRaw: ((f.activation as { raw?: string })?.raw) ?? null,
      casterInfo,
    };
  }

  return {
    professionFeats: (pf.feats ?? []).map((f) => mapFeat(f, 'profession')),
    originFeats: (of_.feats ?? []).map((f) => mapFeat(f, 'origin')),
  };
}

export function getBuilderSpells(): BuilderSpell[] {
  const data = readJSON<{ spells: Record<string, unknown>[] }>('spells.normalized.json');
  return (data.spells ?? [])
    .filter((s) => !(s.reference_only as boolean))
    .map((s) => ({
      id: s.id as string,
      name: s.name as string,
      slug: s.slug as string,
      tier: (s.tier as number) ?? 0,
      isCantrip: (s.is_cantrip as boolean) ?? false,
      school: (s.school as string) ?? (s.school_display as string) ?? '',
      sources: (s.sources as string[]) ?? [],
      range: (s.range as string) ?? '',
      duration: (s.duration as string) ?? '',
      descriptionMarkdown: (s.description_markdown as string) ?? '',
    } satisfies BuilderSpell));
}

export function getChoiceFeatures(): ChoiceFeature[] {
  const data = readJSON<{ features: ChoiceFeature[] }>('choice_features_normalized.json');
  return data.features ?? [];
}

// ─── Item catalog ─────────────────────────────────────────────────────────────

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  weight: number;
  slot: string | null;
  traits: string[];
  damage?: string;
  armorBonus?: number;
  armorCategory?: string | null;
  equippable: boolean;
}

export function getItemCatalog(): CatalogItem[] {
  const data = readJSON<{ catalog: Record<string, unknown[]> }>('item_database.json');
  const items: CatalogItem[] = [];

  function mapItem(raw: Record<string, unknown>, cat: string): CatalogItem {
    const template = raw.inventory_template as Record<string, unknown> ?? {};
    const traits = (raw.traits as Array<{ name: string }> | string[] | undefined) ?? [];
    return {
      id: raw.id as string,
      name: raw.name as string,
      category: cat,
      weight: (raw.weight as number) ?? 1,
      slot: (template.slot as string) ?? null,
      traits: Array.isArray(traits) ? traits.map((t) => typeof t === 'string' ? t : (t as { name: string }).name) : [],
      damage: raw.damage as string | undefined,
      armorBonus: (raw.armor_bonus_range as { value?: number } | undefined)?.value,
      armorCategory: (raw.armor_type as string | undefined) ?? null,
      equippable: (raw.equippable as boolean) ?? false,
    };
  }

  for (const [rawCat, entries] of Object.entries(data.catalog ?? {})) {
    const cat = rawCat.charAt(0).toUpperCase() + rawCat.slice(1, -1); // "weapons" → "Weapon"
    const display = cat === 'Weapon' ? 'Weapon' : cat === 'Armor' ? 'Armor' : cat === 'Shield' ? 'Shield' : cat === 'Kit' ? 'Kit' : cat === 'Consumable' ? 'Consumable' : 'Misc';
    for (const entry of entries) {
      items.push(mapItem(entry as Record<string, unknown>, display));
    }
  }
  return items;
}

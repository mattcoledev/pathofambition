import { readFileSync } from 'fs';
import path from 'path';
import type {
  BuilderProfession, BuilderOrigin, BuilderFeat, BuilderSpell, AttributeKey,
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
  // Extract option from dash e.g. "Choose one — Intuition"
  const dash = skills[0].match(/[—\-]\s*([A-Z][a-z]+)/);
  if (dash) options.push(dash[1]);
  skills.slice(1).forEach((s) => {
    const clean = s.replace(/^or\s+/i, '').replace(/[,.]$/, '').trim();
    if (clean && ALL_VITALS.includes(clean)) options.push(clean);
  });
  return { count, options };
}

// ─── Caster detection ────────────────────────────────────────────────────────
interface CasterInfo {
  casterType: 'full' | 'half' | 'limited' | null;
  casterSource: string | null;
  casterModifierOptions: AttributeKey[];
}

function detectCaster(features: Array<{ description_markdown?: string }>): CasterInfo {
  const none: CasterInfo = { casterType: null, casterSource: null, casterModifierOptions: [] };
  if (!features) return none;

  for (const f of features) {
    const md = f.description_markdown ?? '';
    const typeMatch = md.match(/\*\*(Full|Half|Limited)-caster\*\*/i);
    if (!typeMatch) continue;

    const casterType = typeMatch[1].toLowerCase() as 'full' | 'half' | 'limited';
    const sourceMatch = md.match(/\*\*source\*\* is \*\*(.*?)\*\*/i) ||
                        md.match(/Your \*\*source\*\*[^*]+\*\*(.*?)\*\*/i);
    const casterSource = sourceMatch ? sourceMatch[1] : null;

    // Modifier: could be "Will", "Mind", or "Mind or Will"
    const modMatch = md.match(/Spellcasting Modifier\*\* is \*\*(.*?)\*\*/i);
    const modRaw = modMatch ? modMatch[1] : '';
    const casterModifierOptions: AttributeKey[] = [];
    if (modRaw.toLowerCase().includes('mind')) casterModifierOptions.push('mind');
    if (modRaw.toLowerCase().includes('will')) casterModifierOptions.push('will');
    if (modRaw.toLowerCase().includes('body')) casterModifierOptions.push('body');

    return { casterType, casterSource, casterModifierOptions };
  }
  return none;
}

// ─── Exported loaders ────────────────────────────────────────────────────────

export function getBuilderProfessions(): BuilderProfession[] {
  const data = readJSON<{ professions: Record<string, unknown>[] }>('professions.normalized.json');
  return data.professions.map((p) => {
    const prof = p as {
      id: string; name: string; role: string; flavor: string;
      starting_vitality: string; vitality_gained_per_tier: string;
      path_options: string[];
      proficiencies: { vitals_skills: string[]; armaments: string[]; protection: string[]; tool_kits: string[] };
      features: Array<{ description_markdown?: string }>;
    };

    const { count, options } = parseVitalsChoice(prof.proficiencies?.vitals_skills ?? []);
    const caster = detectCaster(prof.features ?? []);

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
    } satisfies BuilderProfession;
  });
}

export function getBuilderOrigins(): BuilderOrigin[] {
  const data = readJSON<{ origins: Record<string, unknown>[] }>('origins.normalized.json');
  return data.origins.map((o) => {
    const origin = o as {
      id: string; name: string; flavor: string;
      vocations: Array<{ id: string; name: string; flavor: string; attribute_bonus: { attribute: string; value: number } }>;
    };
    return {
      id: origin.id,
      name: origin.name,
      flavor: origin.flavor ?? '',
      vocations: (origin.vocations ?? []).map((v) => ({
        id: v.id,
        name: v.name,
        flavor: v.flavor ?? '',
        attributeBonus: {
          attribute: (v.attribute_bonus?.attribute ?? 'body') as AttributeKey,
          value: v.attribute_bonus?.value ?? 1,
        },
      })),
    } satisfies BuilderOrigin;
  });
}

export function getBuilderFeats(): { professionFeats: BuilderFeat[]; originFeats: BuilderFeat[] } {
  const pf = readJSON<{ feats: Record<string, unknown>[] }>('profession_feats.normalized.json');
  const of_ = readJSON<{ feats: Record<string, unknown>[] }>('origin_feats.normalized.json');

  function mapFeat(f: Record<string, unknown>, ownerType: 'profession' | 'origin'): BuilderFeat {
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
      descriptionMarkdown: (f.description_markdown as string) ?? '',
      traits: (f.traits as string[]) ?? [],
      activationRaw: ((f.activation as { raw?: string })?.raw) ?? null,
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

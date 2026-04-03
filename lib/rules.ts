import fs from 'fs';
import path from 'path';

export interface RulesBlock {
  type: 'paragraph' | 'list' | 'table' | 'stat_line' | 'entry_group' | 'subheading';
  text?: string;
  label?: string;
  value?: string;
  style?: string;
  items?: string[];
  columns?: string[];
  rows?: string[][];
  title?: string;
  entries?: Array<Record<string, unknown>>;
}

export interface RulesSection {
  id: string;
  title: string;
  slug: string;
  order: number;
  kind: 'section' | 'subsection';
  summary: string;
  tags: string[];
  blocks: RulesBlock[];
  children: RulesSection[];
}

export interface RulesData {
  sections: RulesSection[];
}

export function getRules(): RulesSection[] {
  const filePath = path.join(process.cwd(), 'content', 'rules_sections.json');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as RulesData;
  return data.sections.sort((a, b) => a.order - b.order);
}

// Only the sections relevant to the rules reference page
const RULES_PAGE_SECTION_IDS = [
  'playing-the-game',
  'proficiency-and-skills',
  'combat',
  'character-progression',
];

export function getRulesPageSections(): RulesSection[] {
  return getRules().filter((s) => RULES_PAGE_SECTION_IDS.includes(s.id));
}

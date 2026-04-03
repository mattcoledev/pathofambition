import Link from 'next/link';
import { getRulesPageSections } from '@/lib/rules';
import PageHeader from '@/components/PageHeader';
import type { RulesSection, RulesBlock } from '@/lib/rules';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Rules Reference' };

// ─── Block renderers ──────────────────────────────────────────────────────────

function Paragraph({ text }: { text: string }) {
  return <p style={{ fontSize: '0.925rem', color: 'var(--text)', lineHeight: 1.7, marginBottom: '0.875rem' }}>{text}</p>;
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', gap: '0.75rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--text)', minWidth: '120px', flexShrink: 0 }}>{label}</span>
      <span style={{ color: 'var(--text-muted)' }}>{value}</span>
    </div>
  );
}

function ListBlock({ items, style }: { items: string[]; style?: string }) {
  const Tag = style === 'ordered' ? 'ol' : 'ul';
  return (
    <Tag style={{ paddingLeft: '1.5rem', marginBottom: '0.875rem' }}>
      {items.map((item, i) => (
        <li key={i} style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.65, marginBottom: '0.25rem' }}>{item}</li>
      ))}
    </Tag>
  );
}

function TableBlock({ columns, rows, title }: { columns: string[]; rows: string[][]; title?: string }) {
  return (
    <div style={{ marginBottom: '1rem', overflowX: 'auto' }}>
      {title && (
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.4rem', fontFamily: 'var(--font-heading)' }}>
          {title}
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} style={{
                padding: '0.5rem 0.75rem', backgroundColor: 'var(--bg-nav)',
                borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-heading)',
                fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase',
                letterSpacing: '0.05em', color: 'var(--text-muted)', textAlign: 'left',
              }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-nav)' }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: '0.45rem 0.75rem', borderBottom: '1px solid var(--border)', color: j === 0 ? 'var(--text)' : 'var(--text-muted)' }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EntryGroup({ entries, title }: { entries: Array<Record<string, unknown>>; title?: string }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      {title && (
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
          {title}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {entries.map((entry, i) => {
          const name = entry.name as string;
          const text = entry.text as string | undefined;
          // Some entries have vocations/themes instead of text
          const extra = text ?? (entry.vocations ? (entry.vocations as string[]).join(', ') : null);
          return (
            <div key={i} style={{
              display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
              padding: '0.4rem 0.75rem', backgroundColor: 'var(--bg-nav)',
              borderRadius: '0.375rem', fontSize: '0.875rem',
            }}>
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, color: 'var(--text)', flexShrink: 0, minWidth: '120px' }}>
                {name}
              </span>
              {extra && <span style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>{extra}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Subheading({ text }: { text: string }) {
  return (
    <h3 style={{
      fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem',
      color: 'var(--text)', marginTop: '1.5rem', marginBottom: '0.625rem',
      paddingBottom: '0.25rem', borderBottom: '1px solid var(--border)',
    }}>
      {text}
    </h3>
  );
}

function Block({ block, sectionId }: { block: RulesBlock; sectionId: string }) {
  // Action Points block — special case: refer to Actions page instead of full list
  if (sectionId === 'combat' && block.type === 'entry_group' &&
    ['Offensive Actions', 'Maneuver Actions', 'Utility and General Actions'].includes(block.title ?? '')) {
    return (
      <div style={{ marginBottom: '0.75rem', padding: '0.75rem 1rem', backgroundColor: 'var(--primary-light)', border: '1px solid #99F6E4', borderRadius: '0.5rem', fontSize: '0.875rem' }}>
        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{block.title}: </span>
        <Link href="/actions" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
          See the full Actions reference →
        </Link>
      </div>
    );
  }

  switch (block.type) {
    case 'paragraph':
      return block.text ? <Paragraph text={block.text} /> : null;
    case 'subheading':
      return block.text ? <Subheading text={block.text} /> : null;
    case 'stat_line':
      return (block.label && block.value) ? <StatLine label={block.label} value={block.value} /> : null;
    case 'list':
      return block.items ? <ListBlock items={block.items} style={block.style} /> : null;
    case 'table':
      return (block.columns && block.rows) ? <TableBlock columns={block.columns} rows={block.rows} title={block.title} /> : null;
    case 'entry_group':
      return block.entries ? <EntryGroup entries={block.entries} title={block.title} /> : null;
    default:
      return null;
  }
}

function Section({ section }: { section: RulesSection }) {
  return (
    <section id={section.slug} style={{ marginBottom: '3rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem',
        color: 'var(--text)', marginBottom: '0.25rem',
        paddingBottom: '0.5rem', borderBottom: '2px solid var(--primary)',
        display: 'inline-block',
      }}>
        {section.title}
      </h2>
      {section.summary && (
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: '0.25rem' }}>
          {section.summary}
        </p>
      )}

      <div>
        {section.blocks.map((block, i) => (
          <Block key={i} block={block} sectionId={section.id} />
        ))}
      </div>

      {section.children.map((child) => (
        <div key={child.id} style={{ marginTop: '1.5rem' }}>
          <h3 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem',
            color: 'var(--text)', marginBottom: '0.75rem',
            paddingBottom: '0.25rem', borderBottom: '1px dashed var(--border)',
          }}>
            {child.title}
          </h3>
          {child.blocks.map((block, i) => (
            <Block key={i} block={block} sectionId={child.id} />
          ))}
        </div>
      ))}
    </section>
  );
}

export default function RulesPage() {
  const sections = getRulesPageSections();

  // Table of contents anchors
  const toc = sections.map((s) => ({ id: s.slug, title: s.title }));

  return (
    <div>
      <PageHeader
        title="Rules Reference"
        subtitle="Core mechanics — dice systems, skill checks, action points, stealth, and spellcasting."
      />

      {/* Table of contents */}
      <nav aria-label="Rules sections" style={{
        marginBottom: '2.5rem', padding: '1rem 1.25rem',
        backgroundColor: 'var(--bg-nav)', border: '1px solid var(--border)',
        borderRadius: '0.625rem',
      }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>
          On this page
        </div>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {toc.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                style={{
                  fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none',
                  fontFamily: 'var(--font-heading)', fontWeight: 500,
                  padding: '0.2rem 0.6rem', borderRadius: '0.375rem',
                  backgroundColor: 'var(--primary-light)',
                }}
              >
                {item.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {sections.map((section) => (
        <Section key={section.id} section={section} />
      ))}
    </div>
  );
}

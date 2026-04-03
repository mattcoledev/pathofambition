import Link from 'next/link';
import { getProfessions, getSpells, getOrigins, getProfessionFeats, getOriginFeats } from '@/lib/data';

const SECTIONS = [
  {
    href: '/professions',
    label: 'Professions',
    description: 'Classes and paths available to characters, with features and abilities.',
    iconBg: '#DBEAFE',
    iconColor: '#1D4ED8',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path d="M14.5 10.5L4 21M20 4l-5.5 5.5M9 9l6 6M15 4h5v5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/origins',
    label: 'Origins',
    description: 'Character backgrounds and vocations that shape who your character is.',
    iconBg: '#D1FAE5',
    iconColor: '#065F46',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/spells',
    label: 'Spells',
    description: 'Magical abilities organized by school, tier, and source tradition.',
    iconBg: '#F3E8FF',
    iconColor: '#7C3AED',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/feats',
    label: 'Feats',
    description: 'Special abilities earned through origins and profession advancement.',
    iconBg: '#FEF3C7',
    iconColor: '#B45309',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/actions',
    label: 'Actions',
    description: 'All available actions in combat and narrative scenes, grouped by type.',
    iconBg: '#FEE2E2',
    iconColor: '#B91C1C',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <polygon points="5,3 19,12 5,21" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/equipment',
    label: 'Equipment',
    description: 'Gear, weapons, armor, and recovery rules for adventurers.',
    iconBg: '#F5F5F4',
    iconColor: '#57534E',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const professions = getProfessions();
  const spells = getSpells();
  const origins = getOrigins();
  const { feats: profFeats } = getProfessionFeats();
  const { feats: originFeats } = getOriginFeats();

  const stats = [
    { label: 'Professions', value: professions.length },
    { label: 'Spells', value: spells.length },
    { label: 'Origins', value: origins.length },
    { label: 'Feats', value: profFeats.length + originFeats.length },
  ];

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '2.25rem', color: 'var(--text)', lineHeight: 1.15, marginBottom: '0.75rem' }}>
          Path of Ambition
        </h1>
        <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: '560px' }}>
          A player reference for the Path of Ambition tabletop RPG. Browse professions,
          spells, origins, feats, and more — all in one organized place.
        </p>
        <Link
          href="/search"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            marginTop: '1.25rem', padding: '0.6rem 1.25rem',
            backgroundColor: 'var(--primary)', color: '#fff',
            borderRadius: '0.5rem', fontFamily: 'var(--font-heading)',
            fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          Search all content
        </Link>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1px', backgroundColor: 'var(--border)',
        borderRadius: '0.75rem', overflow: 'hidden',
        marginBottom: '2.5rem', border: '1px solid var(--border)',
      }}>
        {stats.map((s) => (
          <div key={s.label} style={{ backgroundColor: 'var(--bg-card)', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.75rem', color: 'var(--primary)', lineHeight: 1, marginBottom: '0.2rem' }}>
              {s.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Section cards */}
      <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.875rem' }}>
        Browse by Category
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.875rem' }}>
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="hover-card"
            style={{
              display: 'block', padding: '1.25rem',
              backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '0.75rem', textDecoration: 'none',
            }}
          >
            <div style={{
              display: 'inline-flex', padding: '0.5rem', borderRadius: '0.5rem',
              backgroundColor: s.iconBg, color: s.iconColor, marginBottom: '0.75rem',
            }}>
              {s.icon}
            </div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1rem', color: 'var(--text)', marginBottom: '0.3rem' }}>
              {s.label}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {s.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

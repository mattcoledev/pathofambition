'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { loadCharacters, deleteCharacter } from '@/lib/characterStorage';
import type { Character } from '@/lib/characterTypes';

export default function CharacterList() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCharacters(loadCharacters());
    setMounted(true);
  }, []);

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    deleteCharacter(id);
    setCharacters(loadCharacters());
  }

  if (!mounted) return null;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link
          href="/characters/new"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            padding: '0.625rem 1.25rem', backgroundColor: 'var(--primary)',
            color: '#fff', borderRadius: '0.5rem', textDecoration: 'none',
            fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.9rem',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          New Character
        </Link>
      </div>

      {characters.length === 0 ? (
        <div style={{
          padding: '3rem 2rem', textAlign: 'center', backgroundColor: 'var(--bg-nav)',
          border: '1px solid var(--border)', borderRadius: '0.75rem',
        }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.3 }}>⚔</div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0 }}>
            No characters yet. Create your first adventurer.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {characters.map((char) => (
            <div
              key={char.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '1rem', padding: '1rem 1.25rem',
                backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '0.625rem', flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                    {char.name || 'Unnamed Adventurer'}
                  </span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--font-heading)',
                    padding: '0.1rem 0.5rem', borderRadius: '9999px',
                    backgroundColor: 'var(--primary-light)', color: 'var(--primary)',
                    border: '1px solid var(--primary)',
                  }}>
                    Tier {char.tier}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {[char.professionName, char.originName && `${char.originName}${char.vocationName ? ` (${char.vocationName})` : ''}`]
                    .filter(Boolean).join(' · ')}
                  {char.pathChoice && ` · ${char.pathChoice}`}
                </div>
                {char.currentVitality !== undefined && char.maxVitality && (
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    Vitality {char.currentVitality}/{char.maxVitality} · Renown {char.renown ?? 0}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <Link
                  href={`/characters/${char.id}`}
                  style={{
                    padding: '0.4rem 0.875rem', backgroundColor: 'var(--primary)',
                    color: '#fff', borderRadius: '0.375rem', textDecoration: 'none',
                    fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.8rem',
                  }}
                >
                  Open
                </Link>
                <button
                  onClick={() => handleDelete(char.id, char.name)}
                  style={{
                    padding: '0.4rem 0.625rem', backgroundColor: 'transparent',
                    color: 'var(--text-muted)', border: '1px solid var(--border)',
                    borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.8rem',
                  }}
                  aria-label={`Delete ${char.name}`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                    <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

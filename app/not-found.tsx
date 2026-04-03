import Link from 'next/link';

export default function NotFound() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <div style={{ fontSize: '3rem', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--border-hover)', marginBottom: '0.5rem' }}>
        404
      </div>
      <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '1.25rem', color: 'var(--text)', marginBottom: '0.5rem' }}>
        Page not found
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        That entry doesn&rsquo;t exist in the reference.
      </p>
      <Link href="/" style={{ color: 'var(--primary)', textDecoration: 'none', fontFamily: 'var(--font-heading)', fontWeight: 500 }}>
        ← Back to home
      </Link>
    </div>
  );
}

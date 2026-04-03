interface Props {
  title: string;
  subtitle?: string;
  count?: number;
  countLabel?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, count, countLabel, children }: Props) {
  return (
    <div
      style={{
        borderBottom: '1px solid var(--border)',
        paddingBottom: '1.25rem',
        marginBottom: '1.5rem',
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '1.75rem',
            color: 'var(--text)',
            lineHeight: 1.2,
          }}>
            {title}
          </h1>
          {subtitle && (
            <p style={{ color: 'var(--text-muted)', marginTop: '0.375rem', fontSize: '0.95rem' }}>
              {subtitle}
            </p>
          )}
        </div>
        {count !== undefined && (
          <span style={{
            backgroundColor: 'var(--bg-nav)',
            border: '1px solid var(--border)',
            borderRadius: '9999px',
            padding: '0.2rem 0.75rem',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-heading)',
            fontWeight: 500,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            alignSelf: 'flex-start',
            marginTop: '0.25rem',
          }}>
            {count} {countLabel ?? 'entries'}
          </span>
        )}
      </div>
      {children && <div style={{ marginTop: '1rem' }}>{children}</div>}
    </div>
  );
}

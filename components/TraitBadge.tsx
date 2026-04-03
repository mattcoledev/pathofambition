interface Props {
  trait: string;
  variant?: 'default' | 'accent' | 'muted';
}

export default function TraitBadge({ trait, variant = 'default' }: Props) {
  const styles: Record<string, React.CSSProperties> = {
    default: {
      backgroundColor: 'var(--primary-light)',
      color: 'var(--primary)',
      border: '1px solid #99F6E4',
    },
    accent: {
      backgroundColor: 'var(--accent-light)',
      color: 'var(--accent)',
      border: '1px solid #FCD34D',
    },
    muted: {
      backgroundColor: 'var(--bg-nav)',
      color: 'var(--text-muted)',
      border: '1px solid var(--border)',
    },
  };

  return (
    <span
      style={{
        ...styles[variant],
        fontSize: '0.7rem',
        fontWeight: 600,
        fontFamily: 'var(--font-heading)',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        padding: '0.15rem 0.45rem',
        borderRadius: '9999px',
        display: 'inline-block',
        lineHeight: 1.4,
      }}
    >
      {trait}
    </span>
  );
}

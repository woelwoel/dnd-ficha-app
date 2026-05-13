export default function DropCapFrame({ children, className = '' }) {
  return (
    <span
      className={className}
      style={{
        float: 'left',
        fontFamily: 'var(--font-display)',
        fontSize: '3.5em',
        lineHeight: 0.9,
        padding: '0.1em 0.15em 0 0',
        marginRight: '0.08em',
        color: 'var(--color-ink-500)',
      }}
    >
      {children}
    </span>
  );
}

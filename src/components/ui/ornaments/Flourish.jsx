export default function Flourish({ width = 200, className = '' }) {
  return (
    <svg
      width={width}
      height="24"
      viewBox="0 0 200 24"
      className={className}
      style={{ color: 'var(--color-gilt-500)' }}
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        d="M10 12 L80 12 Q90 12 92 8 Q95 4 100 12 Q105 20 108 8 Q110 12 120 12 L190 12"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="100" cy="12" r="2" fill="currentColor" />
      <path
        d="M85 12 Q80 6 75 12 M115 12 Q120 6 125 12"
        stroke="currentColor"
        strokeWidth="0.8"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
}

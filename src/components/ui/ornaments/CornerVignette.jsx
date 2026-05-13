export default function CornerVignette({ size = 48, className = '', rotate = 0 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
      style={{ transform: `rotate(${rotate}deg)`, color: 'var(--color-gilt-500)' }}
      aria-hidden="true"
    >
      <path
        d="M2 2 L2 14 M2 2 L14 2 M2 2 Q12 6 14 14 Q22 12 26 4 Q20 14 28 18 Q36 14 40 6"
        stroke="currentColor"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="14" cy="14" r="1.2" fill="currentColor" />
      <circle cx="26" cy="4" r="0.9" fill="currentColor" />
      <path
        d="M6 6 L10 10 M10 6 L6 10"
        stroke="currentColor"
        strokeWidth="0.8"
        opacity="0.5"
      />
    </svg>
  );
}

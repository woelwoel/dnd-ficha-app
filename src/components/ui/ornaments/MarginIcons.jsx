const baseProps = {
  width: 32,
  height: 32,
  viewBox: '0 0 32 32',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  style: { color: 'var(--color-gilt-500)' },
};

export const SwordIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M16 4 L16 22 M12 22 L20 22 M14 24 L18 24 M16 24 L16 28 M13 6 L19 6" />
  </svg>
);
export const ShieldIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M16 4 L26 8 L26 16 Q26 24 16 28 Q6 24 6 16 L6 8 Z M16 10 L16 22 M10 16 L22 16" />
  </svg>
);
export const SpellIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M16 4 L18 12 L26 14 L18 16 L16 24 L14 16 L6 14 L14 12 Z" />
    <circle cx="16" cy="14" r="2" />
  </svg>
);
export const DieIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M16 3 L28 10 L28 22 L16 29 L4 22 L4 10 Z M16 3 L16 16 M4 10 L16 16 L28 10" />
  </svg>
);
export const ChaliceIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M8 4 L24 4 L22 14 Q16 20 10 14 Z M16 14 L16 24 M10 28 L22 28 M16 24 L16 28" />
  </svg>
);
export const ScrollIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M6 8 Q6 4 10 4 L24 4 Q28 4 28 8 L28 24 Q28 28 24 28 L8 28 Q4 28 4 24 L4 20 L8 20" />
    <path d="M12 10 L22 10 M12 14 L22 14 M12 18 L20 18" />
  </svg>
);
export const RuneIcon = (p) => (
  <svg {...baseProps} {...p}>
    <circle cx="16" cy="16" r="11" />
    <path d="M12 10 L20 22 M20 10 L12 22 M10 16 L22 16" />
  </svg>
);
export const CrownIcon = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M4 22 L6 10 L12 16 L16 6 L20 16 L26 10 L28 22 Z M4 26 L28 26" />
    <circle cx="6" cy="10" r="1" />
    <circle cx="16" cy="6" r="1" />
    <circle cx="26" cy="10" r="1" />
  </svg>
);

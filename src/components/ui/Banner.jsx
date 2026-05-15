/**
 * Pergaminho-banner com duas fitas vermelhas laterais. Usado no topo
 * do mapa da CharacterList. SVG inline (sem assets externos).
 *
 * Acessível via role heading (h2).
 */
export function Banner({ children, className = '' }) {
  return (
    <div className={`relative inline-block ${className}`} style={{ filter: 'drop-shadow(var(--shadow-banner))' }}>
      <svg viewBox="0 0 280 50" className="block w-full h-auto" aria-hidden="true">
        <path d="M0,25 L18,12 L18,38 Z M280,25 L262,12 L262,38 Z" fill="#5a0000"/>
        <path d="M0,25 L18,18 L18,32 Z M280,25 L262,18 L262,32 Z" fill="#8b0000"/>
        <defs>
          <linearGradient id="bannerGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fcf3da"/>
            <stop offset="100%" stopColor="#e8dcc0"/>
          </linearGradient>
        </defs>
        <rect x="14" y="6" width="252" height="38" fill="url(#bannerGrad)" stroke="#5a4530" strokeWidth="1.5"/>
        <line x1="20" y1="11" x2="260" y2="11" stroke="#8b6f3a" strokeWidth="0.5"/>
        <line x1="20" y1="39" x2="260" y2="39" stroke="#8b6f3a" strokeWidth="0.5"/>
      </svg>
      <h2
        className="absolute inset-0 flex items-center justify-center text-[13px] font-bold tracking-[0.15em]"
        style={{
          fontFamily: 'IM Fell English SC, serif',
          color: 'var(--color-ink-on-map)',
        }}
      >
        {children}
      </h2>
    </div>
  )
}

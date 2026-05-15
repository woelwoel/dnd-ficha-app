/**
 * MapTooltip — exibe informações do personagem ao hover do token.
 * Placeholder para implementação futura.
 */
export function MapTooltip({ character }) {
  return (
    <div
      className="bg-stone-100 border border-stone-400 rounded px-2 py-1 text-xs whitespace-nowrap"
      style={{
        background: 'rgba(255,251,242,0.98)',
        border: '1px solid var(--color-shell-border)',
        color: 'var(--color-ink-on-map)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      {character.info?.name || 'Token'}
    </div>
  )
}

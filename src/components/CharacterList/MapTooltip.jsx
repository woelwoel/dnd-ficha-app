/**
 * Tooltip rico para tokens do mapa. Mostra:
 *  - nome (display)
 *  - raça · classe · subclasse (serif itálico)
 *  - HP atual/máx + CA (sans)
 *  - "última jogada: X" (sans itálico)
 *
 * Apenas conteúdo — o posicionamento é responsabilidade do CharacterToken.
 */
function relativeTime(epoch) {
  if (!epoch) return null
  const delta = Date.now() - epoch
  const min = Math.floor(delta / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d}d`
  const w = Math.floor(d / 7)
  if (w < 5) return `há ${w} sem`
  const mo = Math.floor(d / 30)
  return `há ${mo} mês${mo > 1 ? 'es' : ''}`
}

export function MapTooltip({ character }) {
  const c = character || {}
  const info = c.info || {}
  const combat = c.combat || {}
  const last = relativeTime(c.lastOpenedAt)

  return (
    <div
      role="tooltip"
      className="px-3 py-2 rounded border text-xs"
      style={{
        background: 'linear-gradient(180deg, var(--color-shell-800), var(--color-shell-900))',
        borderColor: 'var(--color-gold-400)',
        color: 'var(--color-ink-inverse)',
        fontFamily: 'var(--font-redesign-sans)',
        boxShadow: '0 6px 16px rgba(0,0,0,0.6)',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        className="font-bold"
        style={{
          fontFamily: 'IM Fell English SC, serif',
          color: 'var(--color-gold-400)',
          letterSpacing: '0.05em',
        }}
      >
        {info.name || '—'}
      </div>
      {(info.race || info.class) && (
        <div className="italic mt-0.5" style={{ color: 'var(--color-gold-500)', fontFamily: 'EB Garamond, serif' }}>
          {[info.race, info.class].filter(Boolean).join(' · ')}
          {info.level != null && <> · Nível {info.level}</>}
        </div>
      )}
      {(combat.maxHp != null || combat.armorClass != null) && (
        <div className="mt-1">
          {combat.maxHp != null && (
            <>HP {combat.currentHp ?? combat.maxHp}/{combat.maxHp}</>
          )}
          {combat.armorClass != null && (
            <> · CA {combat.armorClass}</>
          )}
        </div>
      )}
      {last && (
        <div className="italic mt-1" style={{ color: 'var(--color-gold-500)' }}>
          {last}
        </div>
      )}
    </div>
  )
}

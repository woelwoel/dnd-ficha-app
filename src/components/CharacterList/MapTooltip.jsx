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
      className="map-tooltip px-3 py-2 rounded border border-gold-400 bg-gradient-to-b from-shell-800 to-shell-900 text-ink-inverse font-redesign-sans text-xs whitespace-nowrap"
    >
      <div className="font-bold font-display tracking-[0.05em] text-gold-400">
        {info.name || '—'}
      </div>
      {(info.race || info.class) && (
        <div className="italic mt-0.5 text-gold-500 font-body">
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
        <div className="italic mt-1 text-gold-500">
          {last}
        </div>
      )}
    </div>
  )
}

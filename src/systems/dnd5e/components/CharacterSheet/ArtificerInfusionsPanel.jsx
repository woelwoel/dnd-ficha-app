import { getInfusionCaps, availableInfusions } from '../../domain/artificerInfusions'
import { SourceBadge } from '../SourceBadge'

/**
 * Painel controlado de Infusões do Artífice (conhecidas + itens infundidos
 * ativos). Sem acesso a contexto/dados — só props in, onChange out — pra
 * dar pra testar isolado. A integração com a ficha (B7) decide de onde vêm
 * catalog/inventoryItems/value e onde o onChange é salvo.
 *
 * value: { known: string[], active: [{ infusion: string, itemId: string }] }
 */
export function ArtificerInfusionsPanel({
  value,
  catalog,
  artificerLevel,
  activeSources,
  inventoryItems,
  onChange,
  readOnly = false,
}) {
  const caps = getInfusionCaps(artificerLevel)
  const offered = availableInfusions(catalog, artificerLevel, activeSources)
  const knownSet = new Set(value.known)

  function addKnown(idx) {
    onChange({ ...value, known: [...value.known, idx] })
  }

  function removeKnown(idx) {
    onChange({
      known: value.known.filter(k => k !== idx),
      active: value.active.filter(a => a.infusion !== idx),
    })
  }

  function setActiveItem(idx, itemId) {
    if (!itemId) {
      onChange({ known: value.known, active: value.active.filter(a => a.infusion !== idx) })
      return
    }
    const exists = value.active.some(a => a.infusion === idx)
    const nextActive = exists
      ? value.active.map(a => (a.infusion === idx ? { infusion: idx, itemId } : a))
      : [...value.active, { infusion: idx, itemId }]
    onChange({ known: value.known, active: nextActive })
  }

  return (
    <div className="rounded-lg border-2 border-parchment-600 bg-parchment-50 p-3 space-y-3">
      <section>
        <h3 className="text-sm font-display tracking-wide text-ink-500">
          Conhecidas <span className="text-xs ink-italic text-ink-300">{value.known.length} / {caps.known}</span>
        </h3>
        <ul className="mt-2 space-y-1">
          {offered.map(i => {
            const known = knownSet.has(i.index)
            const atCap = value.known.length >= caps.known
            return (
              <li key={i.index} className="flex items-start justify-between gap-2 text-[13px] px-2 py-1.5 rounded border border-parchment-600 bg-parchment-100/50">
                <div>
                  <span className="font-bold text-ink-500">{i.name}</span>{' '}
                  <SourceBadge source={i.source} />
                  <p className="text-ink-300">{i.desc}</p>
                </div>
                {known ? (
                  <button
                    type="button"
                    aria-label={`Remover ${i.name}`}
                    onClick={() => removeKnown(i.index)}
                    disabled={readOnly}
                    className="shrink-0 text-xs px-2 py-1 rounded border border-parchment-600 text-ink-500 disabled:opacity-50"
                  >
                    Remover
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label={`Adicionar ${i.name}`}
                    onClick={() => addKnown(i.index)}
                    disabled={readOnly || atCap}
                    className="shrink-0 text-xs px-2 py-1 rounded border border-parchment-600 text-ink-500 disabled:opacity-50"
                  >
                    Adicionar
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-display tracking-wide text-ink-500">
          Ativas (Itens Infundidos) <span className="text-xs ink-italic text-ink-300">{value.active.length} / {caps.active}</span>
        </h3>
        <ul className="mt-2 space-y-1">
          {value.known.map(idx => {
            const infusion = offered.find(i => i.index === idx) ?? catalog.find(i => i.index === idx)
            if (!infusion) return null
            const current = value.active.find(a => a.infusion === idx)
            const isActive = Boolean(current)
            const wouldExceedCap = !isActive && value.active.length >= caps.active
            return (
              <li key={idx} className="flex items-center justify-between gap-2 text-[13px] px-2 py-1.5 rounded border border-parchment-600 bg-parchment-100/50">
                <label className="font-bold text-ink-500" htmlFor={`infusion-active-${idx}`}>
                  {infusion.name}
                </label>
                <select
                  id={`infusion-active-${idx}`}
                  aria-label={`Item para ${infusion.name}`}
                  value={current?.itemId ?? ''}
                  onChange={e => setActiveItem(idx, e.target.value)}
                  disabled={readOnly || wouldExceedCap}
                  className="text-xs bg-parchment-50 border border-parchment-600 rounded px-2 py-1 text-ink-500"
                >
                  <option value="">—</option>
                  {inventoryItems.map(item => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

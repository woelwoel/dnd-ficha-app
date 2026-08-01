import { CONDITIONS, CONDITIONS_BY_ID } from '../../domain/conditions'

const DURACOES = [1, 2, 3, 5, 10]

/**
 * Liga e desliga condições e, só para monstro, marca por quantas rodadas ela
 * dura. O prazo do PJ ficou de fora de propósito: a condição dele mora no doc
 * da ficha, compartilhado com o próprio jogador, e expirá-la a partir da tela
 * do Mestre exigiria campo novo no bloco `combat`, na RPC e uma migration.
 *
 * @param {string[]} conditions — ids ligados agora
 * @param {object} [until] — { conditionId: rodadaAbsolutaDeExpiracao }
 * @param {number} round — rodada atual, pra mostrar quanto falta
 * @param {boolean} canSetDuration — false para PJ
 */
export function ConditionPalette({
  conditions = [], until = {}, round = 0, canSetDuration = true,
  onToggle, onSetDuration,
}) {
  const ativas = CONDITIONS.filter(c => conditions.includes(c.id))

  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xs font-display tracking-widest uppercase text-ink-500">Condições</h3>

      {ativas.length > 0 && canSetDuration && (
        <ul className="flex flex-col gap-1">
          {ativas.map(c => {
            const faltam = until?.[c.id] != null ? until[c.id] - round : null
            return (
              <li key={c.id} className="flex items-center gap-2 text-xs text-ink-500">
                <span className="flex-1">{c.icon} {c.label}</span>
                <label className="ink-italic text-ink-300">
                  <span className="sr-only">{`Duração de ${c.label}`}</span>
                  <select
                    aria-label={`Duração de ${c.label}`}
                    value={until?.[c.id] != null ? String(Math.max(0, faltam)) : '0'}
                    onChange={e => onSetDuration(c.id, Number(e.target.value))}
                    className="px-1 py-0.5 border-2 border-parchment-600 bg-parchment-50 rounded-sm text-ink-500"
                  >
                    <option value="0">sem prazo</option>
                    {DURACOES.map(d => (
                      <option key={d} value={d}>{d} rodada{d > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </label>
              </li>
            )
          })}
        </ul>
      )}

      <ul className="flex flex-wrap gap-1">
        {CONDITIONS.map(c => {
          const ligada = conditions.includes(c.id)
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onToggle(c.id)}
                aria-pressed={ligada}
                title={c.rule}
                className={`text-xs px-2 py-1 rounded-sm border-2 ${
                  ligada
                    ? 'border-ink-600 bg-ink-500 text-parchment-50'
                    : 'border-parchment-600 text-ink-500 hover:bg-parchment-200'
                }`}
              >
                {c.icon} {c.label}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Chips em modo leitura, com o prazo quando houver. */
export function ConditionChips({ conditions = [], until = {}, round = 0 }) {
  if (conditions.length === 0) return null
  return (
    <ul className="flex flex-wrap gap-1">
      {conditions.map(id => {
        const faltam = until?.[id] != null ? until[id] - round : null
        return (
          <li key={id} className="text-xs px-2 py-0.5 rounded-sm border border-parchment-600 bg-parchment-100 text-ink-500">
            {CONDITIONS_BY_ID[id]?.icon} {CONDITIONS_BY_ID[id]?.label ?? id}
            {faltam != null && faltam > 0 && (
              <span className="ink-italic text-ink-300"> · {faltam} rod.</span>
            )}
          </li>
        )
      })}
    </ul>
  )
}

import { Button } from '../../../../components/ui/Button'
import { halfDamage } from '../../domain/encounter'

/**
 * Bola de fogo em um gesto: um valor, vários alvos, e metade em quem passou na
 * salvaguarda. Antes eram seis operações manuais com a divisão feita de cabeça.
 *
 * Controlado: a seleção e o valor moram na tela, que é a única camada que
 * enxerga a lista inteira e as duas rotas de escrita (jsonb do encontro pro
 * monstro, RPC da ficha pro PJ).
 *
 * @param {Array} targets — combatentes marcados, na ordem de iniciativa
 * @param {Set<string>} saved — ids que passaram na salvaguarda
 */
export function AreaDamagePanel({
  amount, onAmountChange, targets, saved, onToggleSaved, onApply, onCancel, busy,
}) {
  const valor = Math.max(0, Math.floor(Number(amount) || 0))
  const podeAplicar = valor > 0 && targets.length > 0 && !busy

  return (
    <section
      aria-label="Dano em área"
      className="rounded-sm border-2 border-amber-700 bg-amber-50 p-3 flex flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-display tracking-widest uppercase text-ink-500">Dano em área</h3>
        <input
          type="number"
          min="0"
          autoFocus
          aria-label="Dano da área"
          value={amount}
          onChange={e => onAmountChange(e.target.value)}
          className="w-20 px-2 py-1 text-sm border-2 border-parchment-600 bg-parchment-50 rounded-sm"
        />
        <span className="text-xs ink-italic text-ink-300">
          marque os alvos na lista · quem passa leva {halfDamage(valor)}
        </span>
      </div>

      {targets.length === 0 ? (
        <p className="text-xs ink-italic text-ink-300">Nenhum alvo marcado ainda.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5">
          {targets.map(t => {
            const passou = saved.has(t.id)
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => onToggleSaved(t.id)}
                  aria-pressed={passou}
                  className={`text-xs px-2 py-1 rounded-sm border-2 ${
                    passou
                      ? 'border-green-800 bg-green-50 text-green-900'
                      : 'border-red-700 bg-parchment-50 text-red-700'
                  }`}
                >
                  {t.name} · {passou ? `passou (${halfDamage(valor)})` : `falhou (${valor})`}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex gap-2">
        <Button size="sm" disabled={!podeAplicar} onClick={onApply}>
          {busy ? 'Aplicando…' : `Aplicar em ${targets.length}`}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancelar</Button>
      </div>
    </section>
  )
}

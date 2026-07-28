import { useMemo, useState } from 'react'
import { summarizeEncounter } from '../../domain/encounterDifficulty'

const BAND_LABEL = {
  trivial: 'Trivial',
  easy: 'Fácil',
  medium: 'Médio',
  hard: 'Difícil',
  deadly: 'Mortal',
}

const BAND_CLASS = {
  trivial: 'border-parchment-600 text-ink-300',
  easy: 'border-green-800 text-green-800',
  medium: 'border-amber-700 text-amber-800',
  hard: 'border-orange-700 text-orange-800',
  deadly: 'border-red-700 text-red-700',
}

/** Média arredondada, só pra preencher o campo de nível do ajuste manual. */
function averageLevel(levels) {
  if (!levels?.length) return 1
  return Math.round(levels.reduce((s, l) => s + l, 0) / levels.length)
}

/**
 * Medidor de dificuldade. Começa com a companhia REAL (níveis vindos das
 * fichas) e deixa o Mestre mexer em quantidade e nível pra preparar uma sessão
 * que ainda não aconteceu — sem alterar ficha nenhuma.
 *
 * @param {number} monsterXpTotal — soma do XP dos monstros do encontro
 * @param {number} monsterCount — quantos monstros (define o multiplicador)
 * @param {number[]} levels — nível de cada personagem da mesa
 */
export function DifficultyMeter({ monsterXpTotal, monsterCount, levels }) {
  const [override, setOverride] = useState(null) // { size, level } | null

  const realSize = levels?.length ?? 0
  const realLevel = averageLevel(levels)
  const size = override?.size ?? realSize
  const level = override?.level ?? realLevel
  const manual = override !== null && (override.size !== realSize || override.level !== realLevel)

  const effectiveLevels = useMemo(
    () => (manual ? Array.from({ length: Math.max(0, size) }, () => level) : (levels ?? [])),
    [manual, size, level, levels],
  )

  const s = useMemo(
    () => summarizeEncounter({ monsterXpTotal, monsterCount, levels: effectiveLevels }),
    [monsterXpTotal, monsterCount, effectiveLevels],
  )

  function patch(field, raw) {
    const n = Math.max(0, Math.min(field === 'level' ? 20 : 12, Math.floor(Number(raw) || 0)))
    setOverride(prev => ({ size: prev?.size ?? realSize, level: prev?.level ?? realLevel, [field]: n }))
  }

  return (
    <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden">
      <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100">
        Dificuldade
      </h2>
      <div className="p-4 flex flex-col gap-3">
        {monsterCount === 0 ? (
          <p className="text-sm ink-italic text-ink-300">Sem monstros no encontro.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-ink-500">{s.raw} XP</span>
            <span className="text-xs ink-italic text-ink-300">×{s.multiplier}</span>
            <span className="text-sm text-ink-500">{s.adjusted} XP ajustado</span>
            {s.band ? (
              <span className={`text-xs px-2 py-0.5 rounded-sm border-2 font-display tracking-wide uppercase ${BAND_CLASS[s.band]}`}>
                {BAND_LABEL[s.band]}
              </span>
            ) : (
              <span className="text-xs ink-italic text-red-700">sem companhia — ajuste abaixo</span>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <label className="text-xs ink-italic text-ink-300 flex items-center gap-2">
            personagens
            <input
              type="number" min="0" max="12"
              aria-label="Quantidade de personagens"
              value={size}
              onChange={e => patch('size', e.target.value)}
              className="w-14 px-2 py-1 text-sm border-2 border-parchment-600 bg-parchment-50 rounded-sm"
            />
          </label>
          <label className="text-xs ink-italic text-ink-300 flex items-center gap-2">
            nível
            <input
              type="number" min="1" max="20"
              aria-label="Nível da companhia"
              value={level}
              onChange={e => patch('level', e.target.value)}
              className="w-14 px-2 py-1 text-sm border-2 border-parchment-600 bg-parchment-50 rounded-sm"
            />
          </label>
          {manual && (
            <>
              <span className="text-xs ink-italic text-amber-800">ajustado manualmente</span>
              <button
                type="button"
                onClick={() => setOverride(null)}
                className="text-xs text-ink-500 underline hover:text-ink-600"
              >
                usar a companhia da mesa
              </button>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

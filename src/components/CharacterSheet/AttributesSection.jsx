import { useMemo } from 'react'
import { AttributeBox } from './AttributeBox'
import {
  ABILITY_SCORES,
  STANDARD_ARRAY,
  POINT_BUY_COST,
  POINT_BUY_BUDGET,
} from '../../utils/calculations'

/**
 * Seção de atributos: método (manual/array/point-buy), bônus raciais
 * aplicados e seis caixas de atributo.
 */
export function AttributesSection({
  attributes,
  scoreMethod = 'manual',
  appliedRacialBonuses = {},
  onChangeMethod,
  onChangeAttribute,
  errors = {},
}) {
  const { baseValues, pbRemaining, saUsed, saValid, appliedList } = useMemo(() => {
    const base = Object.fromEntries(
      ABILITY_SCORES.map(({ key }) => [key, attributes[key] - (appliedRacialBonuses[key] ?? 0)])
    )
    const pbSpent = ABILITY_SCORES.reduce(
      (sum, { key }) => sum + (POINT_BUY_COST[Math.min(15, Math.max(8, base[key]))] ?? 0),
      0
    )
    const used = ABILITY_SCORES.map(({ key }) => base[key])
    const valid =
      STANDARD_ARRAY.every(v => used.includes(v)) && used.every(v => STANDARD_ARRAY.includes(v))
    const applied = Object.entries(appliedRacialBonuses)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `+${v} ${ABILITY_SCORES.find(a => a.key === k)?.abbr ?? k}`)

    return {
      baseValues: base,
      pbRemaining: POINT_BUY_BUDGET - pbSpent,
      saUsed: used,
      saValid: valid,
      appliedList: applied,
    }
  }, [attributes, appliedRacialBonuses])

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold text-amber-400 uppercase tracking-widest">Atributos</h2>
        <div className="flex gap-1 text-xs">
          {[
            { id: 'manual',         label: 'Manual'         },
            { id: 'standard-array', label: 'Array Padrão'   },
            { id: 'point-buy',      label: 'Compra de Ptos' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => onChangeMethod(m.id)}
              className={`px-2 py-1 rounded border transition-colors ${
                scoreMethod === m.id
                  ? 'bg-amber-700 border-amber-500 text-white'
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 space-y-1">
        {appliedList.length > 0 && (
          <p className="text-xs text-amber-500/80">
            ↑ Bônus racial aplicado automaticamente: {appliedList.join(', ')}
          </p>
        )}
        {scoreMethod === 'point-buy' && (
          <p
            className={`text-xs font-semibold ${
              pbRemaining < 0 ? 'text-red-400' : pbRemaining === 0 ? 'text-green-400' : 'text-sky-400'
            }`}
          >
            Compra de Pontos —{' '}
            {pbRemaining < 0
              ? `${Math.abs(pbRemaining)} pts acima do limite`
              : `${pbRemaining}/${POINT_BUY_BUDGET} pts restantes`}
          </p>
        )}
        {scoreMethod === 'standard-array' && !saValid && (
          <p className="text-xs text-amber-400">
            Array Padrão: atribua os valores [8, 10, 12, 13, 14, 15] uma vez cada.
          </p>
        )}
        {scoreMethod === 'standard-array' && saValid && (
          <p className="text-xs text-green-400">Array Padrão completo ✓</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
        {ABILITY_SCORES.map(({ key, abbr, name }) => {
          const racialBonus = appliedRacialBonuses[key] ?? 0
          const baseValue = baseValues[key]
          const availableSA = STANDARD_ARRAY.filter(v => v === baseValue || !saUsed.includes(v))
          return (
            <AttributeBox
              key={key}
              abbr={abbr}
              name={name}
              value={attributes[key]}
              baseValue={baseValue}
              racialBonus={racialBonus}
              mode={scoreMethod}
              availableSA={availableSA}
              pointsRemaining={pbRemaining}
              onChange={value => onChangeAttribute(key, value)}
              onChangeBase={newBase =>
                onChangeAttribute(key, Math.min(30, Math.max(1, newBase)) + racialBonus)
              }
              error={errors[`attr_${key}`]}
            />
          )
        })}
      </div>
    </section>
  )
}

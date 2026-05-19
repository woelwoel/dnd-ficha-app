import { useMemo } from 'react'
import { AttributeBox } from './AttributeBox'
import {
  ABILITY_SCORES,
  STANDARD_ARRAY,
  POINT_BUY_COST,
  POINT_BUY_BUDGET,
  ATTR_NAME_TO_KEY,
  formatModifier,
  calculateSavingThrow,
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
  // Dados pra fundir salvaguardas no card (opcional — quando ausentes, cards não mostram salva)
  profBonus,
  classData,
}) {
  // Quais atributos têm proficiência de salva (definidas pela classe)
  const saveProficientKeys = useMemo(() => {
    if (!classData?.saving_throws) return []
    return classData.saving_throws.map(n => ATTR_NAME_TO_KEY[n]).filter(Boolean)
  }, [classData])
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
        <h2 className="text-base font-display text-ink-500 uppercase tracking-widest border-b-2 border-parchment-600 pb-1 flex-1">Atributos</h2>
        <div className="flex gap-1 text-xs">
          {[
            { id: 'manual',         label: 'Manual'         },
            { id: 'standard-array', label: 'Array Padrão'   },
            { id: 'point-buy',      label: 'Compra de Ptos' },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => onChangeMethod(m.id)}
              className={`px-2 py-1 rounded border font-display tracking-wide transition-colors ${
                scoreMethod === m.id
                  ? 'bg-ink-500 border-ink-600 text-parchment-50'
                  : 'bg-parchment-100 border-parchment-600 text-ink-200 hover:text-ink-500 hover:bg-parchment-200'
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

      <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3 sm:justify-start">
        {ABILITY_SCORES.map(({ key, abbr, name }) => {
          const racialBonus = appliedRacialBonuses[key] ?? 0
          const baseValue = baseValues[key]
          const availableSA = STANDARD_ARRAY.filter(v => v === baseValue || !saUsed.includes(v))
          // Salvaguarda
          const saveProficient = saveProficientKeys.includes(key)
          const saveBonus = profBonus != null
            ? calculateSavingThrow(attributes[key], profBonus, saveProficient)
            : undefined
          const saveNotation = saveBonus !== undefined ? `1d20${formatModifier(saveBonus)}` : undefined
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
              saveProficient={saveProficient}
              saveBonus={saveBonus}
              saveNotation={saveNotation}
            />
          )
        })}
      </div>
    </section>
  )
}

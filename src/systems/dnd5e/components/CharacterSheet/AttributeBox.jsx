import { memo } from 'react'
import { getModifier, formatModifier, POINT_BUY_COST } from '../../utils/calculations'
import { FormFieldError } from '../../../../components/FormFieldError'
import { Tooltip } from '../../../../components/Tooltip'
import { RollButton } from '../../../../components/DiceRoller/RollButton'

function scoreColor() {
  return { border: 'border-parchment-600', text: 'text-ink-500', ring: 'border-ink-300' }
}

function AttributeBoxBase({
  abbr, name, value, onChange,
  mode = 'manual',
  racialBonus = 0,
  baseValue,
  availableSA = [],
  pointsRemaining = 27,
  onChangeBase,
  error,
  // Salvaguarda fundida no card (opcional — se ausente, o rodapé não renderiza)
  saveProficient = false,
  saveBonus,
  saveNotation,
}) {
  const base = baseValue ?? (value - racialBonus)
  const mod  = getModifier(value)
  const col  = scoreColor()

  const pbCost    = POINT_BUY_COST[base] ?? 0
  const pbNextCost = (POINT_BUY_COST[base + 1] ?? 99) - pbCost
  const canPBUp   = base < 15 && pbNextCost <= pointsRemaining
  const canPBDown = base > 8

  const fieldId = `field-attr-${abbr.toLowerCase()}`
  const errId   = `err-attr-${abbr.toLowerCase()}`

  function handleManualChange(v) {
    onChange?.(v)
  }
  function handleBaseChange(newBase) {
    const n = parseInt(newBase, 10)
    if (isNaN(n)) return
    onChangeBase?.(n)
  }

  return (
    <div className={`relative flex flex-col items-center bg-parchment-50 border-2 rounded p-2 sm:p-3 min-w-0 shadow-parchment-sm ${
      error ? 'border-ink-500' : col.border
    }`}>
      {/* Abreviação */}
      <span className="text-xs font-display text-ink-500 uppercase tracking-widest mb-1">{abbr}</span>

      {/* Badge de bônus racial */}
      {racialBonus > 0 && (
        <Tooltip content={`+${racialBonus} de raça (base: ${base})`} position="top">
          <span className="absolute top-1 right-1 text-[13px] font-bold text-ink-500 bg-parchment-200 border border-parchment-600 rounded-full px-1 cursor-help leading-tight">
            +{racialBonus}↑
          </span>
        </Tooltip>
      )}

      {/* Controle de valor — varia por modo */}
      <div className="flex items-center gap-1 my-0.5">
        {mode === 'standard-array' ? (
          /* Array Padrão: dropdown */
          <select
            value={base}
            onChange={e => handleBaseChange(e.target.value)}
            className="bg-parchment-100 border border-parchment-600 rounded px-1 py-0.5 text-center text-xl font-bold text-ink-500 focus:outline-none focus:border-ink-300 w-16"
          >
            {availableSA.map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
            {/* Garante que o valor atual sempre aparece mesmo se não for SA válido */}
            {!availableSA.includes(base) && (
              <option value={base}>{base} ⚠</option>
            )}
          </select>
        ) : mode === 'point-buy' ? (
          /* Compra de Pontos: +/- com range 8-15 */
          <>
            <button
              onClick={() => canPBDown && handleBaseChange(base - 1)}
              disabled={!canPBDown}
              className="w-6 h-6 rounded bg-parchment-200 hover:bg-parchment-300 border border-parchment-600 disabled:opacity-30 text-ink-500 font-bold text-sm flex items-center justify-center"
              aria-label={`Diminuir ${name}`}
            >−</button>
            <span className={`w-10 text-center text-2xl font-bold ${col.text}`}>{base}</span>
            <button
              onClick={() => canPBUp && handleBaseChange(base + 1)}
              disabled={!canPBUp}
              className="w-6 h-6 rounded bg-parchment-200 hover:bg-parchment-300 border border-parchment-600 disabled:opacity-30 text-ink-500 font-bold text-sm flex items-center justify-center"
              aria-label={`Aumentar ${name}`}
            >+</button>
          </>
        ) : (
          /* Manual: +/- no total */
          <>
            <button
              onClick={() => handleManualChange(Math.max(1, value - 1))}
              className="w-6 h-6 rounded bg-parchment-200 hover:bg-parchment-300 active:bg-parchment-400 border border-parchment-600 text-ink-500 font-bold text-sm flex items-center justify-center transition-colors"
              aria-label={`Diminuir ${name}`}
            >−</button>
            <input
              id={fieldId}
              type="number"
              min={1}
              max={30}
              value={value}
              onChange={e => handleManualChange(e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              aria-label={name}
              aria-describedby={error ? errId : undefined}
              className={`w-10 text-center text-2xl font-bold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                error ? 'text-ink-600' : col.text
              }`}
            />
            <button
              onClick={() => handleManualChange(Math.min(30, value + 1))}
              className="w-6 h-6 rounded bg-parchment-200 hover:bg-parchment-300 active:bg-parchment-400 border border-parchment-600 text-ink-500 font-bold text-sm flex items-center justify-center transition-colors"
              aria-label={`Aumentar ${name}`}
            >+</button>
          </>
        )}
      </div>

      {/* Total final (SA e PB mostram base → total) */}
      {(mode === 'standard-array' || mode === 'point-buy') && racialBonus > 0 && (
        <span className={`text-xs font-semibold ${col.text}`}>= {value} total</span>
      )}

      {/* Custo em pontos (PB) */}
      {mode === 'point-buy' && (
        <span className="text-xs ink-italic">{pbCost} pts</span>
      )}

      {/* Círculo de modificador */}
      <Tooltip content={`floor((${value} − 10) / 2) = ${formatModifier(mod)}`} position="bottom">
        <div className={`mt-2 w-10 h-10 flex items-center justify-center rounded-full border-2 bg-parchment-100 cursor-help ${
          error ? 'border-ink-500' : 'border-ink-300'
        }`}>
          <span className={`text-sm font-bold ${error ? 'text-ink-600' : 'text-ink-500'}`}>
            {formatModifier(mod)}
          </span>
        </div>
      </Tooltip>

      <span className="text-xs ink-italic mt-1">{name}</span>

      {error && (
        <p id={errId} role="alert" className="text-xs text-ink-500 mt-1 text-center leading-tight">3–20</p>
      )}

      {/* Rodapé de salvaguarda — fundido no card */}
      {saveBonus !== undefined && saveBonus !== null && (
        <div
          className={[
            'mt-2 -mx-2 sm:-mx-3 -mb-2 sm:-mb-3 px-2 py-1.5 rounded-b-sm w-[calc(100%+1rem)] sm:w-[calc(100%+1.5rem)] flex items-center justify-center gap-2 border-t',
            saveProficient
              ? 'bg-ink-500/10 border-ink-300/50'
              : 'bg-parchment-200/50 border-parchment-600/40',
          ].join(' ')}
          title={saveProficient
            ? `Salvaguarda de ${name} — proficiente (definida pela classe)`
            : `Salvaguarda de ${name} (não proficiente)`}
        >
          <span
            aria-hidden
            className={`text-xs leading-none ${saveProficient ? 'text-ink-500' : 'text-parchment-600'}`}
          >{saveProficient ? '◆' : '◇'}</span>
          <span className={[
            'text-[13px] font-display tracking-widest uppercase leading-none',
            saveProficient ? 'text-ink-500 font-semibold' : 'text-ink-300',
          ].join(' ')}>salva</span>
          <span className={`text-sm font-bold tabular-nums leading-none ${
            saveProficient ? 'text-ink-500' : 'text-ink-300'
          }`}>
            {formatModifier(saveBonus)}
          </span>
          {saveNotation && (
            <RollButton
              notation={saveNotation}
              label={`Salvaguarda — ${abbr}`}
              size="xs"
            />
          )}
        </div>
      )}
    </div>
  )
}

export const AttributeBox = memo(AttributeBoxBase)

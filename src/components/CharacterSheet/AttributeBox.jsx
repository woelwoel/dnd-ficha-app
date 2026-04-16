import { getModifier, formatModifier } from '../../utils/calculations'
import { FormFieldError } from '../FormFieldError'
import { Tooltip } from '../Tooltip'

const POINT_BUY_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 }

function scoreColor(value) {
  if (value <= 8)  return { border: 'border-red-700',   text: 'text-red-300',   ring: 'border-red-600'   }
  if (value <= 11) return { border: 'border-gray-600',  text: 'text-gray-100',  ring: 'border-gray-500'  }
  if (value <= 13) return { border: 'border-sky-700',   text: 'text-sky-200',   ring: 'border-sky-500'   }
  if (value <= 15) return { border: 'border-green-700', text: 'text-green-200', ring: 'border-green-500' }
  return              { border: 'border-amber-500',  text: 'text-amber-200', ring: 'border-amber-400' }
}

export function AttributeBox({
  abbr, name, value, onChange,
  mode = 'manual',
  racialBonus = 0,
  baseValue,
  availableSA = [],
  pointsRemaining = 27,
  onChangeBase,
  error,
}) {
  const base = baseValue ?? (value - racialBonus)
  const mod  = getModifier(value)
  const col  = scoreColor(value)

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
    <div className={`relative flex flex-col items-center bg-gray-800 border rounded-lg p-3 min-w-[90px] ${
      error ? 'border-red-500' : col.border
    }`}>
      {/* Abreviação */}
      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">{abbr}</span>

      {/* Badge de bônus racial */}
      {racialBonus > 0 && (
        <Tooltip content={`+${racialBonus} de raça (base: ${base})`} position="top">
          <span className="absolute top-1 right-1 text-[9px] font-bold text-amber-500 bg-amber-950/60 border border-amber-800 rounded-full px-1 cursor-help leading-tight">
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
            className="bg-gray-700 border border-gray-600 rounded px-1 py-0.5 text-center text-xl font-bold text-white focus:outline-none focus:border-amber-400 w-16"
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
              className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white font-bold text-sm flex items-center justify-center"
              aria-label={`Diminuir ${name}`}
            >−</button>
            <span className={`w-10 text-center text-2xl font-bold ${col.text}`}>{base}</span>
            <button
              onClick={() => canPBUp && handleBaseChange(base + 1)}
              disabled={!canPBUp}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-30 text-white font-bold text-sm flex items-center justify-center"
              aria-label={`Aumentar ${name}`}
            >+</button>
          </>
        ) : (
          /* Manual: +/- no total */
          <>
            <button
              onClick={() => handleManualChange(Math.max(1, value - 1))}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold text-sm flex items-center justify-center transition-colors"
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
              aria-describedby={error ? errId : undefined}
              className={`w-10 text-center text-2xl font-bold bg-transparent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                error ? 'text-red-300' : col.text
              }`}
            />
            <button
              onClick={() => handleManualChange(Math.min(30, value + 1))}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white font-bold text-sm flex items-center justify-center transition-colors"
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
        <span className="text-[10px] text-gray-500">{pbCost} pts</span>
      )}

      {/* Círculo de modificador */}
      <Tooltip content={`floor((${value} − 10) / 2) = ${formatModifier(mod)}`} position="bottom">
        <div className={`mt-2 w-10 h-10 flex items-center justify-center rounded-full border-2 bg-gray-900 cursor-help ${
          error ? 'border-red-500' : col.ring
        }`}>
          <span className={`text-sm font-bold ${error ? 'text-red-300' : 'text-amber-300'}`}>
            {formatModifier(mod)}
          </span>
        </div>
      </Tooltip>

      <span className="text-xs text-gray-400 mt-1">{name}</span>

      {error && (
        <p id={errId} role="alert" className="text-[10px] text-red-400 mt-1 text-center leading-tight">3–20</p>
      )}
    </div>
  )
}

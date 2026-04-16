import { getModifier, formatModifier } from '../../utils/calculations'
import { FormFieldError } from '../FormFieldError'
import { Tooltip } from '../Tooltip'

export function AttributeBox({ abbr, name, value, onChange, error }) {
  const mod = getModifier(value)
  const tooltipMod = `floor((${value} − 10) / 2) = ${formatModifier(mod)}`
  const fieldId = `field-attr-${abbr.toLowerCase()}`
  const errId   = `err-attr-${abbr.toLowerCase()}`

  return (
    <div className={`flex flex-col items-center bg-gray-800 border rounded-lg p-3 min-w-[90px] ${
      error ? 'border-red-500' : 'border-gray-600'
    }`}>
      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">{abbr}</span>
      <div className="relative">
        <input
          id={fieldId}
          type="number"
          min={1}
          max={30}
          value={value}
          onChange={e => onChange(e.target.value)}
          onWheel={e => e.currentTarget.blur()}
          aria-describedby={error ? errId : undefined}
          className={`w-16 text-center text-2xl font-bold bg-gray-700 border rounded text-white focus:outline-none focus:ring-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
            error
              ? 'border-red-500 focus:border-red-400 focus:ring-red-400'
              : 'border-gray-500 focus:border-amber-400 focus:ring-amber-400'
          }`}
        />
      </div>
      <Tooltip content={tooltipMod} position="bottom">
        <div className={`mt-2 w-10 h-10 flex items-center justify-center rounded-full border-2 bg-gray-900 cursor-help ${
          error ? 'border-red-500' : 'border-amber-400'
        }`}>
          <span className={`text-sm font-bold ${error ? 'text-red-300' : 'text-amber-300'}`}>
            {formatModifier(mod)}
          </span>
        </div>
      </Tooltip>
      <span className="text-xs text-gray-400 mt-1">{name}</span>
      {/* Mensagem de erro compacta abaixo do atributo */}
      {error && (
        <p id={errId} role="alert" className="text-[10px] text-red-400 mt-1 text-center leading-tight">
          3–20
        </p>
      )}
    </div>
  )
}

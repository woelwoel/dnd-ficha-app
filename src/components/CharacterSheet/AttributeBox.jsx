import { getModifier, formatModifier } from '../../utils/calculations'

export function AttributeBox({ abbr, name, value, onChange }) {
  const mod = getModifier(value)

  return (
    <div className="flex flex-col items-center bg-gray-800 border border-gray-600 rounded-lg p-3 min-w-[90px]">
      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-1">{abbr}</span>
      <div className="relative">
        <input
          type="number"
          min={1}
          max={30}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-16 text-center text-2xl font-bold bg-gray-700 border border-gray-500 rounded text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
      <div className="mt-2 w-10 h-10 flex items-center justify-center rounded-full border-2 border-amber-400 bg-gray-900">
        <span className="text-sm font-bold text-amber-300">{formatModifier(mod)}</span>
      </div>
      <span className="text-xs text-gray-400 mt-1">{name}</span>
    </div>
  )
}

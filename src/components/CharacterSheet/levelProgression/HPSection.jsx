// src/components/CharacterSheet/levelProgression/HPSection.jsx
import { useState } from 'react'
import { formatModifier } from '../../../utils/calculations'
import { calcHpAverage, calcHpMax, rollDie } from './helpers'

export function HPSection({ hitDie, conMod, hpGain, onHpChange }) {
  const avg  = calcHpAverage(hitDie, conMod)
  const max  = calcHpMax(hitDie, conMod)
  const [rolled, setRolled] = useState(null)

  function handleRoll() {
    const result = Math.max(1, rollDie(hitDie) + conMod)
    setRolled(result)
    onHpChange(result)
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">
        Dado de vida: <span className="text-amber-300 font-bold">d{hitDie}</span>
        {conMod !== 0 && <span className="ml-2">CON {formatModifier(conMod)}</span>}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => { setRolled(null); onHpChange(avg) }}
          className={`flex flex-col items-center px-4 py-2 rounded border-2 transition-all ${
            hpGain === avg && rolled === null
              ? 'border-amber-500 bg-amber-900/30 text-amber-200'
              : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
          }`}
        >
          <span className="text-xs text-gray-400">Média</span>
          <span className="text-xl font-black">+{avg}</span>
        </button>
        <button
          onClick={() => { setRolled(null); onHpChange(max) }}
          className={`flex flex-col items-center px-4 py-2 rounded border-2 transition-all ${
            hpGain === max && rolled === null
              ? 'border-amber-500 bg-amber-900/30 text-amber-200'
              : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
          }`}
        >
          <span className="text-xs text-gray-400">Máximo</span>
          <span className="text-xl font-black">+{max}</span>
        </button>
        <button
          onClick={handleRoll}
          className={`flex flex-col items-center px-4 py-2 rounded border-2 transition-all ${
            rolled !== null
              ? 'border-green-500 bg-green-900/20 text-green-200'
              : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
          }`}
        >
          <span className="text-xs text-gray-400">Rolar 1d{hitDie}</span>
          <span className="text-xl font-black">{rolled !== null ? `+${rolled}` : '🎲'}</span>
        </button>
      </div>
      {hpGain != null && (
        <p className="text-sm text-green-400 font-semibold">Ganho selecionado: +{hpGain} PV</p>
      )}
    </div>
  )
}

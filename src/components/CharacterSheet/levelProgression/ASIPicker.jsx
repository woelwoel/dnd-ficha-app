// src/components/CharacterSheet/levelProgression/ASIPicker.jsx
import { useState, useCallback } from 'react'
import { ABILITY_SCORES } from '../../../utils/calculations'

export function ASIPicker({ attributes, onBoostsChange }) {
  const [mode, setMode]   = useState('single')
  const [pick1, setPick1] = useState(null)
  const [pick2, setPick2] = useState(null)

  const finalize = useCallback((p1, p2, m) => {
    const boosts = {}
    if (m === 'single') {
      if (p1) boosts[p1] = 2
    } else {
      if (p1) boosts[p1] = (boosts[p1] || 0) + 1
      if (p2 && p2 !== p1) boosts[p2] = (boosts[p2] || 0) + 1
    }
    onBoostsChange(boosts)
  }, [onBoostsChange])

  function switchMode(m) {
    setMode(m); setPick1(null); setPick2(null); onBoostsChange({})
  }

  function selectSingle(key) {
    const v = pick1 === key ? null : key
    setPick1(v)
    finalize(v, null, 'single')
  }

  function selectSplit(slot, key) {
    const v = (slot === 0 ? pick1 : pick2) === key ? null : key
    const p1 = slot === 0 ? v : pick1
    const p2 = slot === 1 ? v : pick2
    setPick1(p1); setPick2(p2)
    finalize(p1, p2, 'split')
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {[['single', '+2 em um atributo'], ['split', '+1+1 em dois atributos']].map(([m, label]) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`text-xs px-3 py-1.5 rounded transition-colors ${
              mode === m ? 'bg-amber-700 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'single' && (
        <div className="flex flex-wrap gap-2">
          {ABILITY_SCORES.map(({ key, abbr }) => {
            const cur = attributes[key], atMax = cur >= 20, sel = pick1 === key
            return (
              <button key={key} disabled={atMax} onClick={() => selectSingle(key)}
                className={`flex flex-col items-center px-3 py-2 rounded border-2 text-xs transition-all min-w-[52px] ${
                  atMax ? 'opacity-30 cursor-not-allowed border-gray-700 bg-gray-800' :
                  sel ? 'border-amber-400 bg-amber-900/40 text-amber-200' :
                  'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-400'
                }`}>
                <span className="font-bold text-sm">{abbr}</span>
                <span className="text-gray-400">{cur}</span>
                {sel && <span className="text-green-400 font-bold">→ {Math.min(20, cur + 2)}</span>}
                {atMax && <span className="text-gray-500">máx</span>}
              </button>
            )
          })}
        </div>
      )}
      {mode === 'split' && (
        <div className="space-y-3">
          {[{ slot: 0, label: '1° +1', pick: pick1, other: pick2 },
            { slot: 1, label: '2° +1', pick: pick2, other: pick1 }].map(({ slot, label, pick, other }) => (
            <div key={slot}>
              <p className="text-xs text-gray-400 mb-1.5">{label}</p>
              <div className="flex flex-wrap gap-1.5">
                {ABILITY_SCORES.map(({ key, abbr }) => {
                  const cur = attributes[key], atMax = cur >= 20, taken = key === other, sel = pick === key
                  return (
                    <button key={key} disabled={atMax || taken} onClick={() => selectSplit(slot, key)}
                      className={`flex flex-col items-center px-2.5 py-1.5 rounded border text-[13px] transition-all ${
                        atMax || taken ? 'opacity-25 cursor-not-allowed border-gray-700 bg-gray-800' :
                        sel ? 'border-amber-400 bg-amber-900/40 text-amber-200' :
                        'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-400'
                      }`}>
                      <span className="font-bold">{abbr}</span>
                      {sel
                        ? <span className="text-green-400">{cur}→{Math.min(20, cur + 1)}</span>
                        : <span className="text-gray-400">{cur}</span>
                      }
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

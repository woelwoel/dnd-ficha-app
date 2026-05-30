// src/components/CharacterSheet/levelProgression/LevelTimeline.jsx
import { useEffect, useRef } from 'react'
import { isASIEntry } from './helpers'

export function LevelTimeline({ currentLevel, levels, onJump }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current?.querySelector(`[data-lvl="${currentLevel}"]`)
    el?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [currentLevel])

  return (
    <div className="relative">
      <div ref={scrollRef} className="flex gap-1.5 overflow-x-auto pb-1 pt-2 px-1">
        {Array.from({ length: 20 }, (_, i) => i + 1).map(lvl => {
          const entry     = levels?.find(l => l.level === lvl)
          const isASI     = isASIEntry(entry)
          const isCurrent = lvl === currentLevel
          const isPast    = lvl < currentLevel

          return (
            <button
              key={lvl}
              data-lvl={lvl}
              onClick={() => onJump(lvl)}
              title={`Nível ${lvl}${isASI ? ' · Aumento de Habilidade' : ''}`}
              className={`relative shrink-0 w-8 h-8 rounded-full text-xs font-bold border-2 transition-all ${
                isCurrent
                  ? 'bg-amber-600 border-amber-400 text-white scale-110 shadow-lg shadow-amber-900/40'
                  : isPast
                  ? 'bg-gray-700 border-gray-600 text-gray-400 hover:border-amber-600/50'
                  : 'bg-gray-900 border-gray-700 text-gray-600 hover:border-gray-500'
              }`}
            >
              {lvl}
              {isASI && (
                <span className="absolute -top-1.5 -right-1 text-[13px] text-amber-400 font-black leading-none">★</span>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-gray-600 mt-1">★ = Aumento de Habilidade disponível</p>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { DetailsModal } from '../DetailsModal'

const SPELL_LEVEL_LABELS = ['1°','2°','3°','4°','5°','6°','7°','8°','9°']

function SpellSlotsRow({ slots }) {
  if (!slots || slots.every(s => s === 0)) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {slots.map((n, i) =>
        n > 0 ? (
          <span key={i} className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
            {SPELL_LEVEL_LABELS[i]}: {n}
          </span>
        ) : null
      )}
    </div>
  )
}

function FeatureItem({ feature, onClick }) {
  return (
    <button
      onClick={() => onClick(feature)}
      className="text-left w-full group"
    >
      <span className="text-sm text-amber-300 group-hover:text-amber-200 underline decoration-dotted">
        {feature.name}
      </span>
    </button>
  )
}

function LevelRow({ entry, isCurrent, isPast, onFeatureClick, onLevelUp, onLevelDown }) {
  const { level, proficiency_bonus, features, spell_slots } = entry
  const hasFeatures = features?.length > 0
  const hasSlots = spell_slots?.some(s => s > 0)

  const rowClass = isCurrent
    ? 'bg-amber-900/30 border-amber-600'
    : isPast
    ? 'bg-gray-800/40 border-gray-700'
    : 'bg-gray-900/20 border-gray-800 opacity-60'

  return (
    <div className={`border rounded-lg p-3 ${rowClass} transition-all`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 shrink-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
            isCurrent
              ? 'bg-amber-600 border-amber-400 text-white'
              : isPast
              ? 'bg-gray-700 border-gray-500 text-gray-300'
              : 'bg-gray-800 border-gray-700 text-gray-500'
          }`}>
            {level}
          </div>
          <div>
            <span className="text-xs text-gray-400">Prof </span>
            <span className="text-xs font-bold text-gray-300">+{proficiency_bonus}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {hasFeatures ? (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5">
              {features.map((f, i) => (
                <FeatureItem key={i} feature={f} onClick={onFeatureClick} />
              ))}
            </div>
          ) : (
            <span className="text-xs text-gray-600 italic">Sem novas características</span>
          )}
          {hasSlots && <SpellSlotsRow slots={spell_slots} />}
        </div>

        {isCurrent && (
          <div className="flex gap-1 shrink-0">
            {level > 1 && (
              <button
                onClick={onLevelDown}
                className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 text-gray-400"
                title="Reduzir nível"
              >
                −
              </button>
            )}
            {level < 20 && (
              <button
                onClick={onLevelUp}
                className="text-xs px-2 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white font-bold"
                title="Subir de nível"
              >
                +
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function LevelProgression({ character, classes, onLevelChange }) {
  const [progression, setProgression] = useState(null)
  const [selectedFeature, setSelectedFeature] = useState(null)
  const [showAll, setShowAll] = useState(false)

  const classIndex = character.info.class
  const currentLevel = character.info.level

  useEffect(() => {
    fetch('/srd-data/phb-class-progression-pt.json')
      .then(r => r.json())
      .then(data => {
        if (data[classIndex]) setProgression(data[classIndex])
        else setProgression(null)
      })
      .catch(() => setProgression(null))
  }, [classIndex])

  if (!classIndex) {
    return (
      <div className="text-center py-12 text-gray-500">
        Selecione uma classe na aba Ficha para ver a progressão de nível.
      </div>
    )
  }

  if (!progression) {
    return <div className="text-center py-8 text-gray-500">Carregando progressão...</div>
  }

  const levels = progression.levels || []
  const visibleLevels = showAll
    ? levels
    : levels.filter(l => l.level >= Math.max(1, currentLevel - 2) && l.level <= Math.min(20, currentLevel + 5))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-amber-400">{progression.name}</h2>
          <p className="text-xs text-gray-400">
            Nível atual: <span className="text-white font-semibold">{currentLevel}</span>
            {currentLevel < 20 && (
              <button
                onClick={() => onLevelChange(currentLevel + 1)}
                className="ml-2 text-amber-500 hover:text-amber-300 font-medium"
              >
                → Subir para {currentLevel + 1}
              </button>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowAll(v => !v)}
          className="text-xs text-gray-400 hover:text-gray-200"
        >
          {showAll ? 'Mostrar resumo' : 'Ver todos os 20 níveis'}
        </button>
      </div>

      {/* Aviso de novidades no nível atual */}
      {(() => {
        const entry = levels.find(l => l.level === currentLevel)
        const newFeatures = entry?.features || []
        if (!newFeatures.length) return null
        return (
          <div className="bg-amber-900/20 border border-amber-700 rounded-lg p-3">
            <p className="text-xs text-amber-400 font-semibold mb-1">
              Características do seu nível atual (Nv {currentLevel}):
            </p>
            <div className="flex flex-wrap gap-2">
              {newFeatures.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedFeature(f)}
                  className="text-xs bg-amber-800/40 border border-amber-700 px-2 py-1 rounded text-amber-200 hover:bg-amber-700/40"
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Lista de níveis */}
      <div className="space-y-2">
        {visibleLevels.map(entry => (
          <LevelRow
            key={entry.level}
            entry={entry}
            isCurrent={entry.level === currentLevel}
            isPast={entry.level < currentLevel}
            onFeatureClick={setSelectedFeature}
            onLevelUp={() => onLevelChange(Math.min(20, currentLevel + 1))}
            onLevelDown={() => onLevelChange(Math.max(1, currentLevel - 1))}
          />
        ))}
      </div>

      {!showAll && (
        <p className="text-xs text-center text-gray-500">
          Mostrando níveis {Math.max(1, currentLevel - 2)}–{Math.min(20, currentLevel + 5)}.{' '}
          <button onClick={() => setShowAll(true)} className="text-amber-500 hover:text-amber-300">
            Ver todos
          </button>
        </p>
      )}

      {/* Modal de detalhe da feature */}
      <DetailsModal
        isOpen={!!selectedFeature}
        onClose={() => setSelectedFeature(null)}
        title={selectedFeature?.name || ''}
      >
        {selectedFeature && (
          <div>
            {selectedFeature.desc ? (
              <p className="text-sm text-gray-300 leading-relaxed">{selectedFeature.desc}</p>
            ) : (
              <p className="text-sm text-gray-500 italic">
                Consulte o Livro do Jogador para a descrição completa desta característica.
              </p>
            )}
          </div>
        )}
      </DetailsModal>
    </div>
  )
}

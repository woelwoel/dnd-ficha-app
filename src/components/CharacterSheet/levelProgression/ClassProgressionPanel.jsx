// src/components/CharacterSheet/levelProgression/ClassProgressionPanel.jsx
// Painel de progressão de UMA classe (primária ou multiclasse).
// Inclui: header com botão de subir nível, LevelUpPanel inline, Timeline,
// preview de nível focado, features adquiridas, tabela de progressão.
import { useState } from 'react'
import { DetailsModal } from '../../DetailsModal'
import { isASIEntry } from './helpers'
import { LevelTimeline } from './LevelTimeline'
import { LevelUpPanel } from './LevelUpPanel'
import { AcquiredFeatures } from './AcquiredFeatures'

export function ClassProgressionPanel({
  progression, currentLevel, hitDie, conMod, attributes, isMulticlass,
  onLevelChange, onApplyLevelUp, multiclassIndex,
  levelChoices, chosenFeatures, allowFeats = false,
}) {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [showAll,    setShowAll]    = useState(false)
  const [jumpLevel,  setJumpLevel]  = useState(null)
  const [selectedFeat, setSelectedFeat] = useState(null)

  const levels      = progression?.levels ?? []
  const currentEntry = levels.find(l => l.level === currentLevel)
  const nextEntry    = levels.find(l => l.level === currentLevel + 1)
  const focusEntry   = jumpLevel ? levels.find(l => l.level === jumpLevel) : null
  const focusLvl     = jumpLevel ?? currentLevel
  const visibleLevels = showAll
    ? levels
    : levels.filter(l => l.level >= Math.max(1, focusLvl - 1) && l.level <= Math.min(20, focusLvl + 6))

  function handleConfirmLevelUp(payload) {
    onApplyLevelUp?.({ ...payload, multiclassIndex: multiclassIndex ?? null })
    setWizardOpen(false)
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho da classe selecionada */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs text-gray-400 mt-0.5">
            Nível atual: <span className="text-white font-bold text-base">{currentLevel}</span>
            <span className="mx-2 text-gray-600">·</span>
            Proficiência: <span className="text-white font-semibold">+{currentEntry?.proficiency_bonus ?? Math.ceil(currentLevel / 4) + 1}</span>
          </p>
        </div>
        <div className="flex gap-2">
          {!isMulticlass && currentLevel > 1 && (
            <button
              onClick={() => onLevelChange?.(currentLevel - 1)}
              className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-400"
            >
              − Nível {currentLevel - 1}
            </button>
          )}
          {currentLevel < 20 && !wizardOpen && (
            <button
              onClick={() => setWizardOpen(true)}
              className="text-xs px-4 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold"
            >
              Subir para Nível {currentLevel + 1} →
            </button>
          )}
        </div>
      </div>

      {/* Wizard de Level Up */}
      {wizardOpen && nextEntry && (
        <LevelUpPanel
          nextLevel={currentLevel + 1}
          nextEntry={nextEntry}
          hitDie={hitDie}
          conMod={conMod}
          attributes={attributes}
          levelChoices={levelChoices}
          currentChosenFeatures={chosenFeatures}
          onConfirm={handleConfirmLevelUp}
          onCancel={() => setWizardOpen(false)}
          allowFeats={allowFeats}
        />
      )}

      {/* Timeline */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Linha do Tempo</p>
        <LevelTimeline
          currentLevel={currentLevel}
          levels={levels}
          onJump={lvl => { setJumpLevel(lvl === jumpLevel ? null : lvl); setShowAll(false) }}
        />
      </div>

      {/* Preview do nível focado */}
      {focusEntry && focusEntry.level !== currentLevel && (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-amber-300">
              Nível {focusEntry.level}
              {focusEntry.level > currentLevel && <span className="text-gray-500 text-xs ml-2">(futuro)</span>}
              {focusEntry.level < currentLevel && <span className="text-gray-500 text-xs ml-2">(passado)</span>}
            </p>
            <button onClick={() => setJumpLevel(null)} className="text-xs text-gray-500 hover:text-gray-300">✕ fechar</button>
          </div>
          {focusEntry.features?.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {focusEntry.features.map((f, i) => (
                <button key={i} onClick={() => setSelectedFeat(f)}
                  className="text-xs bg-gray-700 border border-gray-600 hover:border-amber-600 px-2.5 py-1 rounded text-amber-200">
                  {f.name}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 italic">Sem novas características neste nível.</p>
          )}
          {focusEntry.spell_slots?.some(s => s > 0) && (
            <div className="flex flex-wrap gap-1">
              {focusEntry.spell_slots.map((n, i) =>
                n > 0 ? (
                  <span key={i} className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                    {i + 1}°: {n}
                  </span>
                ) : null
              )}
            </div>
          )}
        </div>
      )}

      {/* Features adquiridas */}
      <AcquiredFeatures levels={levels} currentLevel={currentLevel} onFeatureClick={setSelectedFeat} />

      {/* Tabela de progressão */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Progressão Completa</p>
          <button onClick={() => setShowAll(v => !v)} className="text-xs text-amber-500 hover:text-amber-300">
            {showAll ? 'Mostrar resumo' : 'Ver todos os 20 níveis'}
          </button>
        </div>
        <div className="divide-y divide-gray-700">
          {visibleLevels.map(entry => {
            const isCurrent = entry.level === currentLevel
            const isPast    = entry.level < currentLevel
            const isASI     = isASIEntry(entry)
            return (
              <div
                key={entry.level}
                className={`flex items-start gap-3 px-4 py-2.5 transition-colors ${
                  isCurrent ? 'bg-amber-900/20 border-l-2 border-amber-500' : isPast ? 'opacity-60' : ''
                }`}
              >
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border ${
                  isCurrent ? 'bg-amber-600 border-amber-400 text-white'
                  : isPast ? 'bg-gray-700 border-gray-600 text-gray-400'
                  : 'bg-gray-800 border-gray-700 text-gray-500'
                }`}>
                  {entry.level}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                    <span className="text-xs text-gray-500">Prof +{entry.proficiency_bonus}</span>
                    {isASI && <span className="text-xs text-amber-400">★ Aumento de Habilidade</span>}
                    {entry.features?.filter(f => !f.name?.includes('Aumento')).map((f, i) => (
                      <button key={i} onClick={() => setSelectedFeat(f)}
                        className="text-xs text-amber-300 hover:text-amber-200 underline decoration-dotted">
                        {f.name}
                      </button>
                    ))}
                    {!entry.features?.length && !isASI && <span className="text-xs text-gray-600 italic">—</span>}
                  </div>
                  {entry.spell_slots?.some(s => s > 0) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {entry.spell_slots.map((n, i) =>
                        n > 0 ? (
                          <span key={i} className="text-xs bg-gray-700 px-1.5 py-0.5 rounded text-gray-400">
                            {i + 1}°:{n}
                          </span>
                        ) : null
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        {!showAll && (
          <p className="text-xs text-center text-gray-600 py-2 border-t border-gray-700">
            Exibindo níveis próximos ao atual.{' '}
            <button onClick={() => setShowAll(true)} className="text-amber-600 hover:text-amber-400">Ver todos</button>
          </p>
        )}
      </div>

      <DetailsModal isOpen={!!selectedFeat} onClose={() => setSelectedFeat(null)} title={selectedFeat?.name || ''}>
        {selectedFeat && (
          <p className="text-sm text-gray-300 leading-relaxed">
            {selectedFeat.desc || 'Consulte o Livro do Jogador para a descrição completa desta característica.'}
          </p>
        )}
      </DetailsModal>
    </div>
  )
}

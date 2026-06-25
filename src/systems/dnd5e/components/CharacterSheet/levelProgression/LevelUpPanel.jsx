// src/components/CharacterSheet/levelProgression/LevelUpPanel.jsx
// Wizard de subida de nível. Orquestra HP, escolhas de feature, ASI/Talento,
// cantrips bônus e confirma o patch de level-up para o pai.
import { useMemo, useState } from 'react'
import { DetailsModal } from '../../DetailsModal'
import { useLazySrdDataset } from '../../../data/SrdProvider'
import { filterCatalogBySources, filterChoiceBySources } from '../../../domain/sources'
import { isASIEntry } from './helpers'
import { HPSection } from './HPSection'
import { ASIPicker } from './ASIPicker'
import { LevelUpChoicePicker } from './LevelUpChoicePicker'
import { FeatPicker } from './FeatPicker'

export function LevelUpPanel({
  nextLevel, nextEntry, hitDie, conMod, attributes,
  onConfirm, onCancel, levelChoices, currentChosenFeatures, allowFeats = false,
  activeSources,
}) {
  const [hpGain,              setHpGain]              = useState(null)
  const [boosts,              setBoosts]              = useState({})
  const [newChoices,          setNewChoices]          = useState({})
  const [bonusCantripsChosen, setBonusCantripsChosen] = useState([])
  const [featModal,           setFeatModal]           = useState(null)
  const [infoModal,           setInfoModal]           = useState(null)
  // Modo ASI vs Talento
  const [asiMode,             setAsiMode]             = useState('asi') // 'asi' | 'feat'
  const [selectedFeatIdx,     setSelectedFeatIdx]     = useState(null)
  const [featChosenAttr,      setFeatChosenAttr]      = useState(null)
  const [featSearch,          setFeatSearch]          = useState('')
  // Feats vêm sob demanda — só usados aqui no fluxo de level-up.
  // Filtrados pelas fontes ativas da ficha: o FeatPicker só pode OFERECER
  // talentos de fontes que a ficha tem habilitadas (PHB sempre incluso).
  const rawFeats = useLazySrdDataset('feats')
  const feats = useMemo(
    () => filterCatalogBySources(rawFeats ?? [], activeSources ?? ['phb']),
    [rawFeats, activeSources],
  )

  const newFeatures = nextEntry?.features?.filter(f => !f.name?.includes('Aumento') && !f.name?.includes('Melhoria')) ?? []
  const hasASI      = isASIEntry(nextEntry)

  const chosenFeat  = selectedFeatIdx !== null ? feats[selectedFeatIdx] : null

  // Se o talento tem attrBonus com múltiplas escolhas, exige que o usuário escolha
  const featNeedsAttrPick = chosenFeat?.attrBonus && (chosenFeat.attrBonus.choices?.length ?? 0) > 1
  const featAttrReady     = !featNeedsAttrPick || featChosenAttr !== null

  // ASI pronto: se modo ASI precisam boosts; se modo talento precisa talento + atributo (se aplicável)
  const asiReady    = !hasASI || (asiMode === 'asi' ? Object.keys(boosts).length > 0 : chosenFeat !== null && featAttrReady)

  const choicesForLevel = (levelChoices ?? [])
    .filter(c => c.level === nextLevel)
    .map(c => filterChoiceBySources(c, currentChosenFeatures, activeSources))
    .filter(c => (c.options?.length ?? 0) > 0)
  const choicesReady = choicesForLevel.every(c => {
    if ((c.multiSelect ?? 0) > 1) {
      const val = newChoices[c.id] ?? currentChosenFeatures?.[c.id] ?? ''
      const selected = val ? String(val).split(',').filter(Boolean) : []
      return selected.length >= c.multiSelect
    }
    return !!(newChoices[c.id] ?? currentChosenFeatures?.[c.id])
  })

  // Soma cantrips bônus necessários de todas as choices selecionadas neste nível
  const bonusCantripsNeeded = choicesForLevel.reduce((sum, choice) => {
    const val = newChoices[choice.id] ?? currentChosenFeatures?.[choice.id] ?? ''
    const opt = choice.options.find(o => o.value === val)
    return sum + (opt?.grants?.bonusCantrips ?? 0)
  }, 0)
  const bonusCantripsReady = bonusCantripsChosen.length >= bonusCantripsNeeded

  const canCommit = hpGain != null && asiReady && choicesReady && bonusCantripsReady

  const newProfBonus = nextEntry?.proficiency_bonus
  const oldProfBonus = Math.ceil((nextLevel - 1) / 4) + 1

  return (
    <div className="bg-gray-800 border border-amber-700 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-amber-400">Subindo para Nível {nextLevel}!</h3>
          {newProfBonus > oldProfBonus && (
            <p className="text-xs text-green-400 mt-0.5">
              Bônus de proficiência: +{oldProfBonus} → +{newProfBonus}
            </p>
          )}
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:text-gray-300 text-xl leading-none">✕</button>
      </div>

      {/* Pontos de Vida */}
      <div>
        <h4 className="text-sm font-bold text-amber-300 mb-2">❤️ Pontos de Vida</h4>
        <HPSection hitDie={hitDie} conMod={conMod} hpGain={hpGain} onHpChange={setHpGain} />
      </div>

      {/* Escolhas de características */}
      {choicesForLevel.map(choice => (
        <LevelUpChoicePicker
          key={choice.id}
          choice={choice}
          currentChosenFeatures={currentChosenFeatures}
          newChoices={newChoices}
          setNewChoices={setNewChoices}
          bonusCantripsNeeded={bonusCantripsNeeded}
          bonusCantripsChosen={bonusCantripsChosen}
          setBonusCantripsChosen={setBonusCantripsChosen}
          onOptionInfo={setInfoModal}
        />
      ))}

      {/* Modal de descrição da opção */}
      <DetailsModal isOpen={!!infoModal} onClose={() => setInfoModal(null)} title={infoModal?.name ?? ''}>
        {infoModal && (
          <div className="space-y-3">
            <p className="text-sm text-gray-300 leading-relaxed">{infoModal.desc}</p>
            {infoModal.grants?.bonusCantrips > 0 && (
              <p className="text-xs bg-blue-900/30 border border-blue-700/40 text-blue-300 px-3 py-2 rounded-lg">
                Concede: +{infoModal.grants.bonusCantrips} truques à sua escolha de qualquer lista de magias.
              </p>
            )}
            {infoModal.grants?.spells?.length > 0 && (
              <p className="text-xs bg-green-900/30 border border-green-700/40 text-green-300 px-3 py-2 rounded-lg">
                Concede automaticamente: {infoModal.grants.spells.join(', ')}
              </p>
            )}
          </div>
        )}
      </DetailsModal>

      {/* Novas Características */}
      {newFeatures.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-amber-300 mb-2">✨ Novas Características</h4>
          <div className="flex flex-wrap gap-2">
            {newFeatures.map((f, i) => (
              <button
                key={i}
                onClick={() => setFeatModal(f)}
                className="text-xs bg-gray-700 border border-gray-600 hover:border-amber-600 px-3 py-1.5 rounded text-amber-200 transition-colors"
              >
                {f.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ASI / Talento */}
      {hasASI && (
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-amber-300">⬆️ Melhoria de Atributo{allowFeats ? ' ou Talento' : ''}</h4>

          {/* Toggle ASI vs Talento */}
          {allowFeats && (
            <div className="flex gap-2">
              {[['asi', '📈 Melhorar Atributos'], ['feat', '🌟 Escolher Talento']].map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => { setAsiMode(mode); setBoosts({}); setSelectedFeatIdx(null); setFeatChosenAttr(null) }}
                  className={`text-xs px-3 py-1.5 rounded font-semibold transition-colors ${
                    asiMode === mode
                      ? 'bg-amber-700 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Modo ASI */}
          {(!allowFeats || asiMode === 'asi') && (
            <ASIPicker attributes={attributes} onBoostsChange={setBoosts} />
          )}

          {/* Modo Talento */}
          {allowFeats && asiMode === 'feat' && (
            <FeatPicker
              feats={feats}
              attributes={attributes}
              featSearch={featSearch}
              setFeatSearch={setFeatSearch}
              selectedFeatIdx={selectedFeatIdx}
              setSelectedFeatIdx={setSelectedFeatIdx}
              featChosenAttr={featChosenAttr}
              setFeatChosenAttr={setFeatChosenAttr}
              onFeatInfo={setFeatModal}
            />
          )}
        </div>
      )}

      {/* Modal de descrição do talento */}
      <DetailsModal isOpen={!!featModal && featModal !== featModal?.features} onClose={() => setFeatModal(null)} title={featModal?.name ?? ''}>
        {featModal && (
          <p className="text-sm text-gray-300 leading-relaxed">{featModal.desc}</p>
        )}
      </DetailsModal>

      {/* Spell slots */}
      {nextEntry?.spell_slots?.some(s => s > 0) && (
        <div>
          <h4 className="text-sm font-bold text-amber-300 mb-1.5">🔮 Espaços de Magia</h4>
          <div className="flex flex-wrap gap-1.5">
            {nextEntry.spell_slots.map((n, i) =>
              n > 0 ? (
                <span key={i} className="text-xs bg-gray-700 border border-gray-600 px-2 py-0.5 rounded text-gray-300">
                  {i + 1}°: {n}
                </span>
              ) : null
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm">
          Cancelar
        </button>
        <button
          disabled={!canCommit}
          onClick={() => canCommit && onConfirm({
            newLevel: nextLevel,
            hpIncrease: hpGain,
            attrBoosts: asiMode === 'asi' ? boosts : {},
            newChoices,
            bonusSpells: bonusCantripsChosen,
            chosenFeat: asiMode === 'feat' ? chosenFeat : null,
            featChosenAttr: asiMode === 'feat' ? (featChosenAttr ?? (chosenFeat?.attrBonus?.choices?.[0] ?? null)) : null,
          })}
          className={`flex-1 py-2 rounded text-sm font-bold transition-all ${
            canCommit
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : 'bg-gray-700 text-gray-500 cursor-not-allowed'
          }`}
        >
          {!canCommit
            ? (!hpGain ? 'Escolha o ganho de PV'
              : !choicesReady ? 'Escolha sua característica'
              : !bonusCantripsReady ? `Escolha ${bonusCantripsNeeded - bonusCantripsChosen.length} truque(s) bônus`
              : asiMode === 'feat' && !chosenFeat ? 'Escolha um talento'
              : asiMode === 'feat' && !featAttrReady ? 'Escolha o atributo do talento'
              : 'Escolha a melhoria de atributo')
            : `Confirmar Subida para Nível ${nextLevel}`
          }
        </button>
      </div>
    </div>
  )
}

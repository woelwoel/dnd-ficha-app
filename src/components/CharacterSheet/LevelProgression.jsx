import { useState, useEffect } from 'react'
import { DetailsModal } from '../DetailsModal'
import { getModifier } from '../../utils/calculations'
import { abbrOfKey } from '../../domain/attributes'
import { calculateMulticlassSpellSlots } from '../../utils/spellcasting'
import { useSrd } from '../../providers/SrdProvider'
import { getClericDomainSpellIndices } from '../../domain/rules'
import { isASIEntry } from './levelProgression/helpers'
import { LevelTimeline } from './levelProgression/LevelTimeline'
import { AcquiredFeatures } from './levelProgression/AcquiredFeatures'
import { LevelUpPanel } from './levelProgression/LevelUpPanel'


/* ── Painel de progressão por classe ────────────────────────────────── */
function ClassProgressionPanel({
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
                          <span key={i} className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-400">
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
          <p className="text-[10px] text-center text-gray-600 py-2 border-t border-gray-700">
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

/* ═══════════════════════════════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════════════════════════════ */
export function LevelProgression({ character, classData, classes, onLevelChange, onApplyLevelUp, onAddMulticlass, onRemoveMulticlass, onNavigateToSpells, allowMulticlass = true, allowFeats = false }) {
  const [allProgressions, setAllProgressions] = useState(null)
  const [classChoices,    setClassChoices]    = useState({})
  const [mcRules,         setMcRules]         = useState({})
  const [activeTab,       setActiveTab]       = useState('primary')
  const [showAddMC,       setShowAddMC]       = useState(false)
  const [addMCClass,      setAddMCClass]      = useState('')

  const classIndex   = character.info.class
  const currentLevel = character.info.level
  const multiclasses = character.info.multiclasses ?? []
  const chosenFeatures = character.info.chosenFeatures ?? {}
  const conMod       = getModifier(character.attributes.con)
  const hitDie       = classData?.hit_die ?? 8

  // Spells do SRD para resolução de magias de domínio do Clérigo
  const { spells: srdSpells } = useSrd()

  const totalLevel = currentLevel + multiclasses.reduce((s, m) => s + (m.level ?? 0), 0)

  useEffect(() => {
    fetch('/srd-data/phb-class-progression-pt.json')
      .then(r => r.json()).then(setAllProgressions).catch(() => setAllProgressions({}))
    fetch('/srd-data/phb-class-choices-pt.json')
      .then(r => r.json()).then(setClassChoices).catch(() => setClassChoices({}))
    fetch('/srd-data/phb-multiclass-pt.json')
      .then(r => r.json()).then(setMcRules).catch(() => setMcRules({}))
  }, [])

  if (!classIndex) {
    return <div className="text-center py-16 text-gray-500">Selecione uma classe na aba Ficha para ver a progressão de nível.</div>
  }
  if (!allProgressions) {
    return <div className="text-center py-10 text-gray-500">Carregando progressão...</div>
  }

  const progression = allProgressions[classIndex] ?? null
  if (!progression) {
    return <div className="text-center py-10 text-gray-500">Dados de progressão não encontrados para esta classe.</div>
  }

  const usedClasses     = new Set([classIndex, ...multiclasses.map(m => m.class)])
  const availableForMC  = (classes ?? []).filter(c => !usedClasses.has(c.index))
  const fusedSlots      = multiclasses.length > 0
    ? calculateMulticlassSpellSlots(classIndex, currentLevel, multiclasses)
    : null

  // Pré-requisitos para a classe de MC selecionada no picker
  const addMCReqs = addMCClass ? mcRules[addMCClass]?.prerequisites ?? {} : {}
  const addMCProfs = addMCClass ? mcRules[addMCClass]?.proficiencies ?? {} : {}
  const reqWarnings = Object.entries(addMCReqs)
    .filter(([k]) => k !== 'or')
    .map(([attr, val]) => {
      const actual = character.attributes[attr] ?? 10
      return { attr, val, met: actual >= val }
    })
  const orAttr = addMCReqs.or
  const orMet = orAttr ? (character.attributes[orAttr] ?? 10) >= (addMCReqs[orAttr] ?? 13) : true
  // Bloqueio rígido dos pré-requisitos de multiclasse (PHB p.163).
  // Confirmação só é liberada quando TODOS os requisitos fixos E a cláusula "or" estão atendidos.
  const allPrereqsMet = addMCClass
    ? reqWarnings.every(r => r.met) && orMet
    : false

  // Enriquece o patch de level-up com magias de domínio do Clérigo
  function enrichedApplyLevelUp(patch) {
    let enrichedPatch = patch
    // Somente classe primária (multiclassIndex === null) e quando é Clérigo
    if (patch.multiclassIndex == null && classIndex === 'clerigo') {
      const DOMAIN_LEVELS = [1, 3, 5, 7, 9]
      if (DOMAIN_LEVELS.includes(patch.newLevel)) {
        const domain = patch.newChoices?.divine_domain ?? chosenFeatures?.divine_domain
        if (domain) {
          const indices = getClericDomainSpellIndices(domain, patch.newLevel)
          const domainSpells = indices
            .map(idx => srdSpells?.find(s => s.index === idx))
            .filter(Boolean)
            .map(s => ({
              index: s.index,
              name:  s.name,
              level: s.level,
              school: typeof s.school === 'object' ? (s.school?.name ?? '') : (s.school ?? ''),
              castingTime: s.casting_time ?? '',
              range:       s.range ?? '',
              duration:    s.duration ?? '',
              concentration: s.concentration ?? false,
              components:  Array.isArray(s.components) ? s.components.join(', ') : (s.components ?? ''),
              desc:        s.desc ?? '',
              ritual:      s.ritual ?? false,
              source:      'domain',
            }))
          if (domainSpells.length > 0) {
            enrichedPatch = {
              ...patch,
              bonusSpells: [...(patch.bonusSpells ?? []), ...domainSpells],
            }
          }
        }
      }
    }
    onApplyLevelUp?.(enrichedPatch)
  }

  function handleConfirmAddMC() {
    if (!addMCClass || !allPrereqsMet) return
    const mcProfs = mcRules[addMCClass]?.proficiencies ?? {}
    onAddMulticlass?.({ classIndex: addMCClass, proficiencies: mcProfs })
    setAddMCClass('')
    setShowAddMC(false)
    setActiveTab(multiclasses.length) // switch to the new mc tab
  }

  // Determine se active tab ainda existe
  const tabExists = activeTab === 'primary' || (typeof activeTab === 'number' && activeTab < multiclasses.length)
  const safeTab = tabExists ? activeTab : 'primary'

  return (
    <div className="space-y-5">

      {/* ── Nível Total em destaque ── */}
      {multiclasses.length > 0 && (
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl px-5 py-3 flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-[10px] text-amber-600 uppercase tracking-widest font-semibold">Nível Total</p>
            <p className="text-3xl font-black text-amber-300">{totalLevel}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <p className="text-[10px] text-gray-500 uppercase">Classe Principal</p>
              <p className="text-sm font-bold text-white">
                {(classes ?? []).find(c => c.index === classIndex)?.name ?? progression.name}{' '}
                <span className="text-amber-400">{currentLevel}</span>
              </p>
            </div>
            {multiclasses.map((mc, idx) => {
              const mcName = (classes ?? []).find(c => c.index === mc.class)?.name ?? mc.class
              return (
                <div key={idx}>
                  <p className="text-[10px] text-gray-500 uppercase">Multiclasse {idx + 1}</p>
                  <p className="text-sm font-bold text-white">{mcName} <span className="text-amber-400">{mc.level}</span></p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Abas por classe ── */}
      <div className="flex items-center gap-1 overflow-x-auto">
        {/* Aba classe primária */}
        <button
          onClick={() => setActiveTab('primary')}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-sm font-semibold border-b-2 transition-colors ${
            safeTab === 'primary'
              ? 'border-amber-500 text-amber-300 bg-amber-900/20'
              : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
          }`}
        >
          <span>{(classes ?? []).find(c => c.index === classIndex)?.name ?? progression.name}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
            safeTab === 'primary' ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'
          }`}>{currentLevel}</span>
        </button>

        {/* Abas de multiclasses */}
        {multiclasses.map((mc, idx) => {
          const mcClassName = (classes ?? []).find(c => c.index === mc.class)?.name ?? mc.class
          const isActive = safeTab === idx
          return (
            <div key={idx} className="relative shrink-0 flex items-center">
              <button
                onClick={() => setActiveTab(idx)}
                className={`flex items-center gap-1.5 px-3 pr-7 py-2 rounded-t-lg text-sm font-semibold border-b-2 transition-colors ${
                  isActive
                    ? 'border-amber-500 text-amber-300 bg-amber-900/20'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                }`}
              >
                <span>{mcClassName}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}>{mc.level}</span>
              </button>
              <button
                onClick={() => { onRemoveMulticlass?.(idx); if (isActive) setActiveTab('primary') }}
                className="absolute right-1 text-gray-500 hover:text-red-400 transition-colors text-xs w-5 h-5 flex items-center justify-center"
                aria-label={`Remover ${mcClassName}`}
                title="Remover multiclasse"
              >×</button>
            </div>
          )
        })}

        {/* Aba "+" para adicionar multiclasse — só aparece quando permitido pela campanha */}
        {allowMulticlass && currentLevel >= 3 && multiclasses.length < 3 && (
          <button
            onClick={() => { setShowAddMC(v => !v); setActiveTab('primary') }}
            className="shrink-0 px-3 py-2 rounded-t-lg text-sm text-amber-500 hover:text-amber-300 font-bold border-b-2 border-transparent hover:bg-gray-800/50 transition-colors"
            title="Adicionar multiclasse"
          >
            ＋
          </button>
        )}
      </div>

      {/* ── Picker de nova multiclasse ── */}
      {showAddMC && (
        <div className="bg-gray-800 border border-amber-700/50 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-400">Adicionar Multiclasse</h3>
            <button onClick={() => { setShowAddMC(false); setAddMCClass('') }} className="text-gray-500 hover:text-gray-300 text-lg">✕</button>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1.5">Escolha a classe:</label>
            <select
              value={addMCClass}
              onChange={e => setAddMCClass(e.target.value)}
              className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-600"
            >
              <option value="">— Selecione —</option>
              {availableForMC.map(c => (
                <option key={c.index} value={c.index}>{c.name}</option>
              ))}
            </select>
          </div>

          {addMCClass && (
            <>
              {/* Pré-requisitos */}
              {reqWarnings.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Pré-requisitos (LdJ Cap. 6)</p>
                  <div className="flex flex-wrap gap-2">
                    {reqWarnings.map(({ attr, val, met }) => (
                      <div key={attr} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                        met ? 'border-green-700 bg-green-900/20 text-green-300' : 'border-yellow-700 bg-yellow-900/20 text-yellow-300'
                      }`}>
                        {met ? '✓' : '⚠'} {abbrOfKey(attr) ?? attr.toUpperCase()} {val}+
                        <span className="text-gray-500">({character.attributes[attr] ?? 10})</span>
                      </div>
                    ))}
                    {orAttr && (
                      <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                        orMet ? 'border-green-700 bg-green-900/20 text-green-300' : 'border-yellow-700 bg-yellow-900/20 text-yellow-300'
                      }`}>
                        {orMet ? '✓' : '⚠'} ou {abbrOfKey(orAttr) ?? orAttr.toUpperCase()} 13+
                        <span className="text-gray-500">({character.attributes[orAttr] ?? 10})</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Proficiências ganhas */}
              {(addMCProfs.armor?.length > 0 || addMCProfs.weapons?.length > 0 || addMCProfs.tools?.length > 0 || addMCProfs.skills > 0) && (
                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 space-y-2">
                  <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Proficiências ganhas ao entrar nessa classe</p>
                  <div className="flex flex-wrap gap-1.5">
                    {addMCProfs.armor?.map((a, i) => (
                      <span key={i} className="text-xs bg-blue-900/30 border border-blue-700/50 text-blue-300 px-2 py-0.5 rounded-full">
                        Armadura: {a}
                      </span>
                    ))}
                    {addMCProfs.weapons?.map((w, i) => (
                      <span key={i} className="text-xs bg-orange-900/30 border border-orange-700/50 text-orange-300 px-2 py-0.5 rounded-full">
                        Arma: {w}
                      </span>
                    ))}
                    {addMCProfs.tools?.map((t, i) => (
                      <span key={i} className="text-xs bg-purple-900/30 border border-purple-700/50 text-purple-300 px-2 py-0.5 rounded-full">
                        Ferramenta: {t}
                      </span>
                    ))}
                    {addMCProfs.skills > 0 && (
                      <span className="text-xs bg-green-900/30 border border-green-700/50 text-green-300 px-2 py-0.5 rounded-full">
                        +{addMCProfs.skills} perícia(s)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => { setShowAddMC(false); setAddMCClass('') }}
              className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm"
            >
              Cancelar
            </button>
            <button
              disabled={!addMCClass || !allPrereqsMet}
              onClick={handleConfirmAddMC}
              title={!allPrereqsMet && addMCClass ? 'Pré-requisitos de atributo não atendidos (PHB p.163)' : undefined}
              className="flex-1 px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {addMCClass && !allPrereqsMet
                ? 'Pré-requisitos não atendidos'
                : `Confirmar — ganhar proficiências e adicionar ${addMCClass ? (classes ?? []).find(c => c.index === addMCClass)?.name ?? addMCClass : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* ── Conteúdo da aba ativa ── */}
      {safeTab === 'primary' && !showAddMC && (
        <ClassProgressionPanel
          progression={progression}
          currentLevel={currentLevel}
          hitDie={hitDie}
          conMod={conMod}
          attributes={character.attributes}
          isMulticlass={false}
          onLevelChange={onLevelChange}
          onApplyLevelUp={enrichedApplyLevelUp}
          multiclassIndex={null}
          levelChoices={classChoices[classIndex]?.choices ?? []}
          chosenFeatures={chosenFeatures}
          allowFeats={allowFeats}
        />
      )}

      {typeof safeTab === 'number' && !showAddMC && (() => {
        const mc = multiclasses[safeTab]
        if (!mc) return null
        const mcProg   = allProgressions[mc.class] ?? null
        const mcClass  = (classes ?? []).find(c => c.index === mc.class)
        const mcHitDie = mcClass?.hit_die ?? 8
        return (
          <ClassProgressionPanel
            progression={mcProg}
            currentLevel={mc.level}
            hitDie={mcHitDie}
            conMod={conMod}
            attributes={character.attributes}
            isMulticlass={true}
            onApplyLevelUp={enrichedApplyLevelUp}
            multiclassIndex={safeTab}
            levelChoices={classChoices[mc.class]?.choices ?? []}
            chosenFeatures={chosenFeatures}
            allowFeats={allowFeats}
          />
        )
      })()}

      {/* ── Slots de magia fundidos ── */}
      {fusedSlots && !showAddMC && (
        <div className="bg-gray-800 border border-blue-900/50 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-semibold text-blue-300">Espaços de Magia Fundidos (Multiclasse D&D 5e)</p>
            {onNavigateToSpells && (
              <button
                onClick={onNavigateToSpells}
                className="text-xs px-3 py-1.5 rounded bg-blue-900/40 hover:bg-blue-800/50 border border-blue-700/50 text-blue-300 font-semibold transition-colors"
              >
                ✨ Adicionar / Gerenciar Magias →
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(fusedSlots).map(([lvl, qty]) => (
              <div key={lvl} className="bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-xs text-center">
                <span className="text-gray-400">Nível {lvl}: </span>
                <span className="text-blue-300 font-bold">{qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

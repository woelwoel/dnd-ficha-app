// src/components/CharacterSheet/LevelProgression.jsx
// Componente de progressão de nível — orquestrador.
// Sub-componentes vivem em ./levelProgression/.
import { useState } from 'react'
import { getModifier } from '../../utils/calculations'
import { getSpellSlots } from '../../utils/spellcasting'
import { useSrd } from '../../data/SrdProvider'
import { useClassProgressionData } from './levelProgression/useClassProgressionData'
import { enrichWithSubclassSpells } from '../../domain/subclassSpells'
import { enrichWithFeatSpells } from '../../domain/featSpells'
import { TotalLevelHeader } from './levelProgression/TotalLevelHeader'
import { MulticlassTabs } from './levelProgression/MulticlassTabs'
import { AddMulticlassPicker } from './levelProgression/AddMulticlassPicker'
import { ClassProgressionPanel } from './levelProgression/ClassProgressionPanel'
import { FusedSpellSlots } from './levelProgression/FusedSpellSlots'

export function LevelProgression({
  character, classData, classes,
  onLevelChange, onApplyLevelUp, onAddMulticlass, onRemoveMulticlass,
  onNavigateToSpells, allowMulticlass = true, allowFeats = false,
}) {
  const [activeTab, setActiveTab] = useState('primary')
  const [showAddMC, setShowAddMC] = useState(false)

  const { allProgressions, classChoices, mcRules } = useClassProgressionData()
  const { spells: srdSpells } = useSrd()

  const classIndex     = character.info.class
  const currentLevel   = character.info.level
  const multiclasses   = character.info.multiclasses ?? []
  const chosenFeatures = character.info.chosenFeatures ?? {}
  const conMod         = getModifier(character.attributes.con)
  const hitDie         = classData?.hit_die ?? 8
  // Fontes ativas da ficha: usadas pra filtrar o que o FeatPicker do level-up
  // pode OFERECER (PHB sempre incluso). Ficha já tem o default aplicado pelo
  // schema (ver characterSchema.js), mas o fallback aqui cobre objetos crus
  // (ex.: em testes) que não passaram por safeParseCharacter.
  const activeSources  = character.meta?.settings?.sources ?? ['phb']
  const totalLevel     = currentLevel + multiclasses.reduce((s, m) => s + (m.level ?? 0), 0)

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

  const usedClasses    = new Set([classIndex, ...multiclasses.map(m => m.class)])
  const availableForMC = (classes ?? []).filter(c => !usedClasses.has(c.index))
  const fusedSlots     = multiclasses.length > 0
    ? getSpellSlots(classIndex, currentLevel, multiclasses, chosenFeatures)
    : null

  // Wrapper para o onApplyLevelUp: injeta magias de subclasse automaticamente
  // (Cleric domain, Paladin oath, Druid land circle, Warlock patron) quando o
  // nível dispara concessão da tabela apropriada.
  function enrichedApplyLevelUp(patch) {
    const enriched = enrichWithSubclassSpells({
      patch, classIndex, chosenFeatures, srdSpells,
    })
    // Talentos com magia (spec 2026-07-15): roda também em level-up de
    // multiclasse — o guard de multiclassIndex é só do enrich de subclasse.
    onApplyLevelUp?.(enrichWithFeatSpells({ patch: enriched, character, srdSpells }))
  }

  function handleConfirmAddMC({ classIndex: mcIndex, proficiencies, chosenSkills }) {
    onAddMulticlass?.({ classIndex: mcIndex, proficiencies, chosenSkills })
    setShowAddMC(false)
    setActiveTab(multiclasses.length) // switch to the new mc tab
  }

  // Perícias já proficientes (não podem ser escolhidas de novo na multiclasse).
  const ownedSkills = [
    ...(character.proficiencies?.skills ?? []),
    ...(character.proficiencies?.backgroundSkills ?? []),
  ]

  // Determine se active tab ainda existe
  const tabExists = activeTab === 'primary' || (typeof activeTab === 'number' && activeTab < multiclasses.length)
  const safeTab   = tabExists ? activeTab : 'primary'

  const primaryClassName = (classes ?? []).find(c => c.index === classIndex)?.name ?? progression.name

  return (
    <div className="space-y-5">

      {multiclasses.length > 0 && (
        <TotalLevelHeader
          totalLevel={totalLevel}
          primaryClassName={primaryClassName}
          currentLevel={currentLevel}
          multiclasses={multiclasses}
          classes={classes}
        />
      )}

      <MulticlassTabs
        classes={classes}
        primaryClassName={primaryClassName}
        primaryClassIndex={classIndex}
        currentLevel={currentLevel}
        multiclasses={multiclasses}
        safeTab={safeTab}
        onSelectTab={setActiveTab}
        onRemoveMulticlass={onRemoveMulticlass}
        allowMulticlass={allowMulticlass}
        canAddMore={multiclasses.length < 3}
        onAddClick={() => { setShowAddMC(v => !v); setActiveTab('primary') }}
      />

      {showAddMC && (
        <AddMulticlassPicker
          availableClasses={availableForMC}
          classes={classes}
          mcRules={mcRules}
          characterAttributes={character.attributes}
          ownedSkills={ownedSkills}
          onCancel={() => setShowAddMC(false)}
          onConfirm={handleConfirmAddMC}
        />
      )}

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
          activeSources={activeSources}
          raceInfo={{ race: character.info?.race, subrace: character.info?.subrace }}
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
            activeSources={activeSources}
            raceInfo={{ race: character.info?.race, subrace: character.info?.subrace }}
          />
        )
      })()}

      {fusedSlots && !showAddMC && (
        <FusedSpellSlots fusedSlots={fusedSlots} onNavigateToSpells={onNavigateToSpells} />
      )}
    </div>
  )
}

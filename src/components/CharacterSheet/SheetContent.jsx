import { CharacterInfo } from './CharacterInfo'
import { CombatStats } from './CombatStats'
import { SavingThrows } from './SavingThrows'
import { SkillsList } from './SkillsList'
import { Inventory } from './Inventory'
import { Spells } from './Spells'
import { Notes } from './Notes'
import { CharacterView } from './CharacterView'
import { AttributesSection } from './AttributesSection'

/**
 * Renderiza a aba ativa. Mantém o switch concentrado num único lugar,
 * sem lógica de negócio.
 */
export function SheetContent({
  activeTab,
  character,
  calc,
  classData,
  races,
  classes,
  backgrounds,
  fichaErrors,
  updaters,
  handlers,
  onNavigateToSpells,
}) {
  const {
    updateInfo, updateTraits, updateAttribute, updateCombat,
    toggleSkillProficiency, toggleExpertiseSkill,
    updateCurrency, addItem, removeItem,
    updateSpellcasting, addSpell, removeSpell, toggleSlot,
    toggleLanguage,
  } = updaters

  const {
    handleRaceChange, handleSubraceChange, handleBackgroundChange,
    handleClassChange, handleApplyLevelUp, handleAddMulticlass,
    handleRemoveMulticlass, handleChosenFeaturesChange,
  } = handlers

  if (activeTab === 'ficha') {
    return (
      <div className="space-y-6">
        <section>
          <CharacterInfo
            info={{ ...character.info, languages: character.proficiencies.languages ?? [] }}
            onUpdate={updateInfo}
            races={races}
            classes={classes}
            backgrounds={backgrounds}
            errors={fichaErrors}
            onRaceChange={handleRaceChange}
            onSubraceChange={handleSubraceChange}
            onBackgroundChange={handleBackgroundChange}
            onClassChange={handleClassChange}
            onToggleLanguage={toggleLanguage}
          />
        </section>

        <AttributesSection
          attributes={character.attributes}
          scoreMethod={character.info.scoreMethod ?? 'manual'}
          appliedRacialBonuses={character.appliedRacialBonuses ?? {}}
          onChangeMethod={m => updateInfo('scoreMethod', m)}
          onChangeAttribute={updateAttribute}
          errors={fichaErrors}
        />

        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CombatStats
            combat={character.combat}
            attributes={character.attributes}
            profBonus={calc.profBonus}
            onUpdateCombat={updateCombat}
            suggestedAC={calc.suggestedAC}
            suggestedMaxHp={calc.suggestedMaxHp}
            passivePerception={calc.passivePerception}
            errors={fichaErrors}
          />
          <SavingThrows
            attributes={character.attributes}
            profBonus={calc.profBonus}
            classData={classData}
          />
        </section>
      </div>
    )
  }

  if (activeTab === 'percias') {
    return (
      <SkillsList
        attributes={character.attributes}
        proficiencies={character.proficiencies}
        profBonus={calc.profBonus}
        onToggle={toggleSkillProficiency}
        onToggleExpertise={toggleExpertiseSkill}
        classData={classData}
      />
    )
  }

  if (activeTab === 'magias') {
    return (
      <Spells
        character={character}
        attributes={character.attributes}
        level={character.info.level}
        profBonus={calc.profBonus}
        classData={classData}
        onUpdateSpellcasting={updateSpellcasting}
        onAddSpell={addSpell}
        onRemoveSpell={removeSpell}
        onToggleSlot={toggleSlot}
      />
    )
  }

  if (activeTab === 'inventario') {
    return (
      <Inventory
        inventory={character.inventory}
        onUpdateCurrency={updateCurrency}
        onAddItem={addItem}
        onRemoveItem={removeItem}
      />
    )
  }

  if (activeTab === 'notas') {
    return (
      <Notes
        traits={character.traits}
        onUpdate={updateTraits}
        background={backgrounds.find(b => b.index === character.info.background) ?? null}
      />
    )
  }

  if (activeTab === 'visualizar') {
    return (
      <CharacterView
        character={character}
        races={races}
        classes={classes}
        backgrounds={backgrounds}
        classData={classData}
        onApplyLevelUp={handleApplyLevelUp}
        onLevelChange={lvl => updateInfo('level', lvl)}
        onAddMulticlass={handleAddMulticlass}
        onRemoveMulticlass={handleRemoveMulticlass}
        onChosenFeaturesChange={handleChosenFeaturesChange}
        onNavigateToSpells={onNavigateToSpells}
        allowMulticlass={character.meta?.settings?.allowMulticlass ?? true}
        allowFeats={character.meta?.settings?.allowFeats ?? false}
      />
    )
  }

  return null
}

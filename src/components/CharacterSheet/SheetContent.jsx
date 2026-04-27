import { CharacterInfo } from './CharacterInfo'
import { CombatStats } from './CombatStats'
import { SavingThrows } from './SavingThrows'
import { SkillsList } from './SkillsList'
import { Inventory } from './Inventory'
import { Spells } from './Spells'
import { Notes } from './Notes'
import { LevelProgression } from './LevelProgression'
import { ActionsTab } from './ActionsTab'
import { HabilitiesTab } from './HabilitiesTab'
import { AttributesSection } from './AttributesSection'
import { RestActions } from './RestActions'
import { Attacks } from './Attacks'

/**
 * Wrapper com role="tabpanel" + ids/aria-labelledby casando com SheetTabs.
 * tabIndex=0 para permitir foco programático via "pular para os erros".
 */
function TabPanel({ id, children }) {
  return (
    <div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className="focus:outline-none"
    >
      {children}
    </div>
  )
}

/**
 * Renderiza a aba ativa. Mantém o switch concentrado num único lugar,
 * sem lógica de negócio.
 */
export function SheetContent({
  activeTab,
  character,
  setCharacter,
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
    updateCurrency, addItem, removeItem, updateItem,
    updateSpellcasting, addSpell, removeSpell, toggleSlot,
    setConcentration,
    toggleLanguage,
    addAttack, removeAttack, updateAttack,
    spendFeatureUse, regainFeatureUse,
  } = updaters

  const {
    handleRaceChange, handleSubraceChange, handleBackgroundChange,
    handleClassChange, handleApplyLevelUp, handleAddMulticlass,
    handleRemoveMulticlass, handleChosenFeaturesChange,
  } = handlers

  const featureUses = character.combat?.classFeatureUses ?? []

  if (activeTab === 'ficha') {
    return (
      <TabPanel id="ficha">
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

          <Attacks
            attacks={character.combat?.attacks ?? []}
            attributes={character.attributes}
            profBonus={calc.profBonus}
            onAdd={addAttack}
            onRemove={removeAttack}
            onUpdate={updateAttack}
          />

          <RestActions character={character} onApply={setCharacter} />
        </div>
      </TabPanel>
    )
  }

  if (activeTab === 'percias') {
    return (
      <TabPanel id="percias">
        <SkillsList
          attributes={character.attributes}
          proficiencies={character.proficiencies}
          profBonus={calc.profBonus}
          onToggle={toggleSkillProficiency}
          onToggleExpertise={toggleExpertiseSkill}
          classData={classData}
        />
      </TabPanel>
    )
  }

  if (activeTab === 'magias') {
    return (
      <TabPanel id="magias">
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
          onSetConcentration={setConcentration}
        />
      </TabPanel>
    )
  }

  if (activeTab === 'inventario') {
    return (
      <TabPanel id="inventario">
        <Inventory
          inventory={character.inventory}
          onUpdateCurrency={updateCurrency}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
        />
      </TabPanel>
    )
  }

  if (activeTab === 'notas') {
    return (
      <TabPanel id="notas">
        <Notes
          traits={character.traits}
          onUpdate={updateTraits}
          background={backgrounds.find(b => b.index === character.info.background) ?? null}
        />
      </TabPanel>
    )
  }

  if (activeTab === 'progressao') {
    return (
      <TabPanel id="progressao">
        <LevelProgression
          character={character}
          classData={classData}
          classes={classes}
          onLevelChange={lvl => updateInfo('level', lvl)}
          onApplyLevelUp={handleApplyLevelUp}
          onAddMulticlass={handleAddMulticlass}
          onRemoveMulticlass={handleRemoveMulticlass}
          onChosenFeaturesChange={handleChosenFeaturesChange}
          onNavigateToSpells={onNavigateToSpells}
          allowMulticlass={character.meta?.settings?.allowMulticlass ?? true}
          allowFeats={character.meta?.settings?.allowFeats ?? false}
        />
      </TabPanel>
    )
  }

  if (activeTab === 'acoes') {
    return (
      <TabPanel id="acoes">
        <ActionsTab
          character={character}
          featureUses={featureUses}
          onSpend={spendFeatureUse}
          onRegain={regainFeatureUse}
        />
      </TabPanel>
    )
  }

  if (activeTab === 'habilidades') {
    return (
      <TabPanel id="habilidades">
        <HabilitiesTab
          character={character}
          featureUses={featureUses}
          onSpend={spendFeatureUse}
          onRegain={regainFeatureUse}
        />
      </TabPanel>
    )
  }

  return null
}

import { useState } from 'react'
import { CharacterInfo } from './CharacterInfo'
import { CombatStats } from './CombatStats'
import { SavingThrows } from './SavingThrows'
import { SkillsList } from './SkillsList'
import { Inventory } from './Inventory'
import { Spells } from './Spells'
import { Notes } from './Notes'
import { LevelProgression } from './LevelProgression'
import { FeaturesTab } from './FeaturesTab'
import { AttributesSection } from './AttributesSection'
import { RestActions } from './RestActions'
import { Attacks } from './Attacks'

/* ── Wrapper de painel de aba ─────────────────────────────── */
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

/* ── Seção recolhível (ex: Identidade do personagem) ─────── */
function CollapsibleSection({ title, summary, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-gray-700/60 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 bg-gray-800/50 hover:bg-gray-800/80 transition-colors text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-bold text-amber-400 font-display tracking-widest uppercase shrink-0">
            {title}
          </span>
          {!open && summary && (
            <span className="text-xs text-gray-500 truncate">{summary}</span>
          )}
        </div>
        <span
          className={`text-gray-500 text-xs transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {open && (
        <div className="border-t border-gray-700/40">
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Componente principal ─────────────────────────────────── */
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
    updateDeathSaves, toggleCondition, setInspiration, setExhaustion,
  } = updaters

  const {
    handleRaceChange, handleSubraceChange, handleBackgroundChange,
    handleClassChange, handleApplyLevelUp, handleAddMulticlass,
    handleRemoveMulticlass, handleChosenFeaturesChange,
  } = handlers

  const featureUses = character.combat?.classFeatureUses ?? []

  /* ── Aba: Ficha ─────────────────────────────────────────── */
  if (activeTab === 'ficha') {
    // Resumo compacto para o header recolhido
    const identitySummary = [
      character.info.name || '—',
      character.info.class
        ? `${character.info.class} Nível ${character.info.level ?? 1}`
        : null,
      character.info.race || null,
    ].filter(Boolean).join(' · ')

    return (
      <TabPanel id="ficha">
        <div className="space-y-4">

          {/* ①  Identidade — recolhível */}
          <CollapsibleSection title="Identidade" summary={identitySummary}>
            <div className="p-4">
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
            </div>
          </CollapsibleSection>

          {/* ②  Atributos + Salvaguardas  |  Combate */}
          <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,310px)_1fr] gap-4 items-start">

            {/* Coluna esquerda */}
            <div className="space-y-4">
              <AttributesSection
                attributes={character.attributes}
                scoreMethod={character.info.scoreMethod ?? 'manual'}
                appliedRacialBonuses={character.appliedRacialBonuses ?? {}}
                onChangeMethod={m => updateInfo('scoreMethod', m)}
                onChangeAttribute={updateAttribute}
                errors={fichaErrors}
              />
              <SavingThrows
                attributes={character.attributes}
                profBonus={calc.profBonus}
                classData={classData}
              />
            </div>

            {/* Coluna direita: Combate */}
            <CombatStats
              combat={character.combat}
              attributes={character.attributes}
              profBonus={calc.profBonus}
              onUpdateCombat={updateCombat}
              suggestedAC={calc.suggestedAC}
              suggestedMaxHp={calc.suggestedMaxHp}
              passivePerception={calc.passivePerception}
              featSpeedBonus={calc.featSpeedBonus}
              errors={fichaErrors}
              onUpdateDeathSaves={updateDeathSaves}
              onToggleCondition={toggleCondition}
              onSetInspiration={setInspiration}
              onSetExhaustion={setExhaustion}
            />
          </div>

          {/* ③  Perícias — largura total, 3 colunas no desktop */}
          <SkillsList
            attributes={character.attributes}
            proficiencies={character.proficiencies}
            profBonus={calc.profBonus}
            onToggle={toggleSkillProficiency}
            onToggleExpertise={toggleExpertiseSkill}
            classData={classData}
          />

          {/* ④  Ataques */}
          <Attacks
            attacks={character.combat?.attacks ?? []}
            attributes={character.attributes}
            profBonus={calc.profBonus}
            onAdd={addAttack}
            onRemove={removeAttack}
            onUpdate={updateAttack}
          />

          {/* ⑤  Descansos */}
          <RestActions character={character} onApply={setCharacter} />
        </div>
      </TabPanel>
    )
  }

  /* ── Aba: Magias ────────────────────────────────────────── */
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

  /* ── Aba: Poderes (Ações + Habilidades fundidos) ────────── */
  if (activeTab === 'acoes') {
    return (
      <TabPanel id="acoes">
        <FeaturesTab
          character={character}
          featureUses={featureUses}
          onSpend={spendFeatureUse}
          onRegain={regainFeatureUse}
        />
      </TabPanel>
    )
  }

  /* ── Aba: Inventário ────────────────────────────────────── */
  if (activeTab === 'inventario') {
    return (
      <TabPanel id="inventario">
        <Inventory
          inventory={character.inventory}
          attributes={character.attributes}
          onUpdateCurrency={updateCurrency}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
        />
      </TabPanel>
    )
  }

  /* ── Aba: Progressão ────────────────────────────────────── */
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

  /* ── Aba: Notas ─────────────────────────────────────────── */
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

  return null
}

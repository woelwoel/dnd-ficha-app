import { useState } from 'react'
import { CharacterInfo } from './CharacterInfo'
import { CombatStats } from './CombatStats'
import { SkillsList } from './SkillsList'
import { Inventory } from './Inventory'
import { Spells } from './Spells'
import { Notes } from './Notes'
import { LevelProgression } from './LevelProgression'
import { FeaturesTab } from './FeaturesTab'
import { AttributesSection } from './AttributesSection'
import { RestActions } from './RestActions'
import { Attacks } from './Attacks'
import { ManeuversPanel } from './ManeuversPanel'
import { PreparedSpellsList } from './PreparedSpellsList'
import { CombatClassActions } from './CombatClassActions'
import { ArtificerInfusionsPanel } from './ArtificerInfusionsPanel'
import { SourcePicker } from '../SourcePicker'
import { useCharacterContext } from './CharacterContext'
import { useLazySrdDataset } from '../../data/SrdProvider'
import { baseSpeedMeters } from '../../domain/rules'
import { artificerLevelOf, pruneOrphanActive, getMaxAttunement } from '../../domain/artificerInfusions'

/* ── Wrapper de painel de aba ─────────────────────────────── */
function TabPanel({ id, readOnly, children }) {
  // `<fieldset disabled>` desabilita nativamente todos os <input>/<button>/
  // <select>/<textarea> aninhados — usado quando DM está vendo ficha de jogador.
  // `min-w-0` mantém o comportamento de grid (children podem encolher); sem
  // ele, o fieldset força largura mínima do conteúdo.
  return (
    <fieldset
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      disabled={readOnly}
      className={`focus:outline-none border-0 m-0 p-0 min-w-0 ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
    >
      {children}
    </fieldset>
  )
}

/* ── Seção recolhível (ex: Identidade do personagem) ─────── */
function CollapsibleSection({ title, summary, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="border border-parchment-600 rounded-lg overflow-hidden bg-parchment-100 shadow-parchment-sm">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-start justify-between gap-3 px-4 py-2 bg-parchment-200 hover:bg-parchment-300 transition-colors text-left"
        aria-expanded={open}
      >
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-xs font-bold text-ink-500 font-display tracking-widest uppercase">
            {title}
          </span>
          {!open && summary && (
            <span className="text-[13px] ink-italic text-ink-300 leading-snug">{summary}</span>
          )}
        </div>
        <span
          className={`text-ink-200 text-xs transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {open && (
        <div className="border-t border-parchment-600">
          {children}
        </div>
      )}
    </div>
  )
}

/* ── Componente principal ─────────────────────────────────── */
export function SheetContent({ activeTab }) {
  const {
    character, setCharacter, calc, classData,
    races, classes, backgrounds,
    updaters, handlers, fichaErrors, featureUses, onNavigateToSpells,
    focusSpellId, clearFocusSpell, readOnly,
  } = useCharacterContext()

  const {
    updateInfo, updateTraits, updateAttribute, updateCombat,
    toggleSkillProficiency, toggleExpertiseSkill,
    updateCurrency, addItem, removeItem, updateItem,
    updateSpellcasting, addSpell, removeSpell, togglePrepared, toggleSlot,
    spendPactSlot, regainPactSlot,
    setConcentration,
    addActiveEffect,
    toggleLanguage,
    addAttack, removeAttack, updateAttack,
    setChosenFeature,
    spendFeatureUse, regainFeatureUse,
    updateDeathSaves, toggleCondition, setInspiration, setExhaustion, setRageActive, setWildShape,
    toggleKnownBeast,
    setRangerCompanion, updatePortent,
    // Sistema de dano/cura/testes de morte
    applyDamage, applyHealing, stabilize, rollDeathSave,
    lastDamageEvent, clearLastDamageEvent, consumeInspiration,
  } = updaters

  const {
    handleRaceChange, handleSubraceChange, handleBackgroundChange,
    handleClassChange, handleApplyLevelUp, handleAddMulticlass,
    handleRemoveMulticlass, handleChosenFeaturesChange,
  } = handlers

  // Hook precisa rodar sempre (Rules of Hooks) — SheetContent retorna antecipado
  // por aba, então o carregamento lazy do catálogo de infusões fica aqui no topo,
  // antes de qualquer early return. Custo é baixo: é só leitura de cache lazy.
  const infusionsCatalog = useLazySrdDataset('infusions')

  /* ── Aba: Ficha ─────────────────────────────────────────── */
  if (activeTab === 'ficha') {
    const artLevel = artificerLevelOf(character)
    const infusionItems = (character.inventory?.items ?? []).map(i => ({ id: i.id, name: i.name }))
    const storedInfusions = character.combat?.artificerInfusions ?? { known: [], active: [] }
    const infusionsValue = {
      known: storedInfusions.known ?? [],
      active: pruneOrphanActive(storedInfusions.active ?? [], infusionItems.map(i => i.id)),
    }
    // Resumo enriquecido pro header recolhido — substitui a necessidade de
    // expandir só pra ler os dados básicos do personagem.
    const identitySummary = [
      character.info.race
        ? `${character.info.race}${character.info.subrace ? ` (${character.info.subrace})` : ''}`
        : null,
      character.info.class
        ? `${character.info.class} N${character.info.level ?? 1}`
        : null,
      character.info.background || null,
      character.info.alignment || null,
    ].filter(Boolean).join(' · ')

    return (
      <TabPanel id="ficha" readOnly={readOnly}>
        {/* Layout 2 colunas no desktop (60% esquerda, 40% direita); empilha no mobile.
            ESQUERDA = "o que você rola" (Atributos, Perícias, Ataques)
            DIREITA  = "contexto e ajustes" (Identidade, Recursos, Descansos, Manutenção) */}
        <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 items-start">

          {/* ── COLUNA ESQUERDA ───────────────────────────────────── */}
          <div className="space-y-4 min-w-0">
            <AttributesSection
              attributes={character.attributes}
              scoreMethod={character.info.scoreMethod ?? 'manual'}
              appliedRacialBonuses={character.appliedRacialBonuses ?? {}}
              onChangeMethod={m => updateInfo('scoreMethod', m)}
              onChangeAttribute={updateAttribute}
              errors={fichaErrors}
              profBonus={calc.profBonus}
              classData={classData}
              hideMethodSelector
            />

            <SkillsList
              attributes={character.attributes}
              proficiencies={character.proficiencies}
              profBonus={calc.profBonus}
              onToggle={toggleSkillProficiency}
              onToggleExpertise={toggleExpertiseSkill}
              classData={classData}
            />

            <Attacks
              attacks={character.combat?.attacks ?? []}
              attributes={character.attributes}
              profBonus={calc.profBonus}
              inventoryItems={character.inventory?.items ?? []}
              onAdd={addAttack}
              onRemove={removeAttack}
              onUpdate={updateAttack}
              onUpdateItem={updateItem}
            />

            <ManeuversPanel
              character={character}
              featureUses={featureUses}
              onSpend={(id) => spendFeatureUse(id, featureUses)}
            />

            <PreparedSpellsList />
          </div>

          {/* ── COLUNA DIREITA ────────────────────────────────────── */}
          <div className="space-y-4 min-w-0">
            <CollapsibleSection title="Identidade" summary={identitySummary} defaultOpen={false}>
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

            <CombatClassActions
              character={character}
              featureUses={featureUses}
              onToggleRage={setRageActive}
              onSpendFeatureUse={(id) => spendFeatureUse(id, featureUses)}
              onRegainFeatureUse={(id) => regainFeatureUse(id, featureUses)}
              onToggleSlot={toggleSlot}
              onSetWildShape={setWildShape}
              onApplyDamage={applyDamage}
              onToggleKnownBeast={toggleKnownBeast}
              onSetRangerCompanion={setRangerCompanion}
              onUpdatePortent={updatePortent}
            />

            <RestActions character={character} onApply={setCharacter} />

            {/* Manutenção: PV Máx/Temp, Inspiração, Exaustão, Death Saves, Condições. */}
            <CombatStats
              compact
              combat={character.combat}
              attributes={character.attributes}
              profBonus={calc.profBonus}
              onUpdateCombat={updateCombat}
              suggestedAC={calc.suggestedAC}
              suggestedMaxHp={calc.suggestedMaxHp}
              suggestedSpeed={baseSpeedMeters(character, races.find(r => r.index === character.info?.race)?.speed) + (calc.featSpeedBonus ?? 0)}
              passivePerception={calc.passivePerception}
              featSpeedBonus={calc.featSpeedBonus}
              errors={fichaErrors}
              onUpdateDeathSaves={updateDeathSaves}
              onToggleCondition={toggleCondition}
              onSetInspiration={setInspiration}
              onSetExhaustion={setExhaustion}
              onApplyDamage={applyDamage}
              onApplyHealing={applyHealing}
              onRollDeathSave={() => {
                const result = rollDeathSave()
                if (result?.blocked) return
              }}
              onStabilize={stabilize}
              lastDamageEvent={lastDamageEvent}
              onClearDamageEvent={clearLastDamageEvent}
              onBreakConcentration={() => setConcentration(null)}
              onConsumeInspiration={consumeInspiration}
            />

            {/* Fontes de conteúdo: quais livros esta ficha usa (gateia o que é
                oferecido nos pickers). Persiste em meta.settings.sources. */}
            <CollapsibleSection title="Fontes de conteúdo" defaultOpen={false}>
              <div className="p-4">
                <SourcePicker
                  value={character.meta?.settings?.sources ?? ['phb']}
                  onChange={readOnly ? () => {} : (next) => setCharacter({
                    ...character,
                    meta: {
                      ...character.meta,
                      settings: { ...character.meta?.settings, sources: next },
                    },
                  })}
                />
              </div>
            </CollapsibleSection>

            {/* Infusões do Artífice: só aparece a partir do nível 2 na classe
                (primária ou multiclasse). Persiste em combat.artificerInfusions. */}
            {artLevel >= 2 && (
              <CollapsibleSection title="Infusões de Artífice" defaultOpen={false}>
                <div className="p-4">
                  <ArtificerInfusionsPanel
                    value={infusionsValue}
                    catalog={infusionsCatalog ?? []}
                    artificerLevel={artLevel}
                    activeSources={character.meta?.settings?.sources ?? ['phb']}
                    inventoryItems={infusionItems}
                    readOnly={readOnly}
                    onChange={(next) => updateCombat('artificerInfusions', next)}
                  />
                </div>
              </CollapsibleSection>
            )}
          </div>
        </div>
      </TabPanel>
    )
  }

  /* ── Aba: Magias ────────────────────────────────────────── */
  if (activeTab === 'magias') {
    return (
      <TabPanel id="magias" readOnly={readOnly}>
        <Spells
          character={character}
          attributes={character.attributes}
          level={character.info.level}
          profBonus={calc.profBonus}
          classData={classData}
          onUpdateSpellcasting={updateSpellcasting}
          onAddSpell={addSpell}
          onRemoveSpell={removeSpell}
          onTogglePrepared={togglePrepared}
          onToggleSlot={toggleSlot}
          onSpendPactSlot={spendPactSlot}
          onRegainPactSlot={regainPactSlot}
          onSetConcentration={setConcentration}
          onApplyHealing={applyHealing}
          onAddActiveEffect={addActiveEffect}
          focusSpellId={focusSpellId}
          onClearFocusSpell={clearFocusSpell}
        />
      </TabPanel>
    )
  }

  /* ── Aba: Poderes (Ações + Habilidades fundidos) ────────── */
  if (activeTab === 'acoes') {
    return (
      <TabPanel id="acoes" readOnly={readOnly}>
        <FeaturesTab
          character={character}
          featureUses={featureUses}
          onSpend={(id) => spendFeatureUse(id, featureUses)}
          onRegain={(id) => regainFeatureUse(id, featureUses)}
          onSetChosenFeature={setChosenFeature}
        />
      </TabPanel>
    )
  }

  /* ── Aba: Inventário ────────────────────────────────────── */
  if (activeTab === 'inventario') {
    return (
      <TabPanel id="inventario" readOnly={readOnly}>
        <Inventory
          inventory={character.inventory}
          attributes={character.attributes}
          maxAttunement={getMaxAttunement(character)}
          activeSources={character.meta?.settings?.sources ?? ['phb']}
          onUpdateCurrency={updateCurrency}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onUpdateItem={updateItem}
          onAddAttack={addAttack}
          onRemoveAttack={removeAttack}
        />
      </TabPanel>
    )
  }

  /* ── Aba: Progressão ────────────────────────────────────── */
  if (activeTab === 'progressao') {
    return (
      <TabPanel id="progressao" readOnly={readOnly}>
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
      <TabPanel id="notas" readOnly={readOnly}>
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

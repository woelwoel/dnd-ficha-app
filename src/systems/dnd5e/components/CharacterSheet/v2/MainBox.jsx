import { useEffect, useState } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { useLazySrdDataset } from '../../../data/SrdProvider'
import { Attacks } from '../Attacks'
import { CombatClassActions } from '../CombatClassActions'
import { ManeuversPanel } from '../ManeuversPanel'
import { Spells } from '../Spells'
import { Inventory } from '../Inventory'
import { FeaturesTab } from '../FeaturesTab'
import { Notes } from '../Notes'
import { ArtificerInfusionsPanel } from '../ArtificerInfusionsPanel'
import { artificerLevelOf, pruneOrphanActive, getMaxAttunement } from '../../../domain/artificerInfusions'

export const MAIN_TABS = [
  { id: 'acoes', label: 'Ações' },
  { id: 'magias', label: 'Magias' },
  { id: 'inventario', label: 'Inventário' },
  { id: 'caracteristicas', label: 'Características' },
  { id: 'notas', label: 'Notas' },
]

export function MainBox() {
  const {
    character, calc, classData, backgrounds,
    updaters, featureUses, readOnly, focusSpellId, clearFocusSpell,
  } = useCharacterContext()
  const [tab, setTab] = useState('acoes')

  useEffect(() => {
    if (focusSpellId != null) setTab('magias')
  }, [focusSpellId])

  const infusionsCatalog = useLazySrdDataset('infusions')
  const artLevel = artificerLevelOf(character)
  const infusionItems = (character.inventory?.items ?? []).map(i => ({ id: i.id, name: i.name }))
  const storedInfusions = character.combat?.artificerInfusions ?? { known: [], active: [] }
  const infusionsValue = {
    known: storedInfusions.known ?? [],
    active: pruneOrphanActive(storedInfusions.active ?? [], infusionItems.map(i => i.id)),
  }

  const {
    updateTraits, updateCombat,
    updateCurrency, addItem, removeItem, updateItem,
    updateSpellcasting, addSpell, removeSpell, togglePrepared, toggleSlot,
    spendPactSlot, regainPactSlot, setConcentration,
    addAttack, removeAttack, updateAttack,
    setChosenFeature, spendFeatureUse, regainFeatureUse,
    setRageActive, setWildShape, applyDamage, toggleKnownBeast,
    setRangerCompanion, updatePortent,
  } = updaters

  return (
    <section className="v2-panel" style={{ padding: 0 }}>
      <div role="tablist" aria-label="Conteúdo da ficha" style={{ display: 'flex', gap: 2, flexWrap: 'wrap', padding: 8, borderBottom: '1px solid var(--v2-border)' }}>
        {MAIN_TABS.map(t => (
          <button
            key={t.id}
            id={`v2-tab-${t.id}`}
            role="tab"
            type="button"
            className="v2-tab"
            aria-selected={tab === t.id}
            aria-controls={`v2-tabpanel-${t.id}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <fieldset
        role="tabpanel"
        id={`v2-tabpanel-${tab}`}
        aria-labelledby={`v2-tab-${tab}`}
        disabled={readOnly}
        style={{ border: 0, margin: 0, minWidth: 0, padding: 12 }}
        className={readOnly ? 'opacity-70' : ''}
      >
        {tab === 'acoes' && (
          <div className="space-y-4">
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
            <CombatClassActions
              character={character}
              featureUses={featureUses}
              onToggleRage={setRageActive}
              onSpendFeatureUse={id => spendFeatureUse(id, featureUses)}
              onRegainFeatureUse={id => regainFeatureUse(id, featureUses)}
              onToggleSlot={toggleSlot}
              onSetWildShape={setWildShape}
              onApplyDamage={applyDamage}
              onToggleKnownBeast={toggleKnownBeast}
              onSetRangerCompanion={setRangerCompanion}
              onUpdatePortent={updatePortent}
            />
            <ManeuversPanel
              character={character}
              featureUses={featureUses}
              onSpend={id => spendFeatureUse(id, featureUses)}
            />
          </div>
        )}

        {tab === 'magias' && (
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
            focusSpellId={focusSpellId}
            onClearFocusSpell={clearFocusSpell}
          />
        )}

        {tab === 'inventario' && (
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
        )}

        {tab === 'caracteristicas' && (
          <div className="space-y-4">
            <FeaturesTab
              character={character}
              featureUses={featureUses}
              onSpend={id => spendFeatureUse(id, featureUses)}
              onRegain={id => regainFeatureUse(id, featureUses)}
              onSetChosenFeature={setChosenFeature}
            />
            {artLevel >= 2 && (
              <ArtificerInfusionsPanel
                value={infusionsValue}
                catalog={infusionsCatalog ?? []}
                artificerLevel={artLevel}
                activeSources={character.meta?.settings?.sources ?? ['phb']}
                inventoryItems={infusionItems}
                readOnly={readOnly}
                onChange={next => updateCombat('artificerInfusions', next)}
              />
            )}
          </div>
        )}

        {tab === 'notas' && (
          <Notes
            traits={character.traits}
            onUpdate={updateTraits}
            background={backgrounds.find(b => b.index === character.info.background) ?? null}
          />
        )}
      </fieldset>
    </section>
  )
}

/* eslint-disable react-refresh/only-export-components */
import { useEffect, useRef, useState } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { useLazySrdDataset } from '../../../data/SrdProvider'
import { ActionsTab } from './ActionsTab'
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

  const tabRefs = useRef({})

  function focusTabAt(i) {
    const target = MAIN_TABS[(i + MAIN_TABS.length) % MAIN_TABS.length]
    setTab(target.id)
    queueMicrotask(() => tabRefs.current[target.id]?.focus())
  }

  function onTablistKeyDown(e) {
    const idx = MAIN_TABS.findIndex(t => t.id === tab)
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault(); focusTabAt(idx + 1); break
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault(); focusTabAt(idx - 1); break
      case 'Home':
        e.preventDefault(); focusTabAt(0); break
      case 'End':
        e.preventDefault(); focusTabAt(MAIN_TABS.length - 1); break
      default:
    }
  }

  // Sinal one-shot vindo do contexto (ex.: clicar num chip de magia preparada):
  // ao chegar um focusSpellId, salta pra aba Magias. Precisa de efeito porque é
  // reação a um sinal externo — não dá pra derivar `tab` (o usuário navega depois).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    addAttack, removeAttack,
    setChosenFeature, spendFeatureUse, regainFeatureUse,
  } = updaters

  return (
    <section className="v2-panel" style={{ padding: 0 }}>
      <div role="tablist" aria-label="Conteúdo da ficha" onKeyDown={onTablistKeyDown} style={{ display: 'flex', gap: 2, flexWrap: 'wrap', padding: 8, borderBottom: '1px solid var(--v2-border)' }}>
        {MAIN_TABS.map(t => (
          <button
            key={t.id}
            ref={el => { tabRefs.current[t.id] = el }}
            id={`v2-tab-${t.id}`}
            role="tab"
            type="button"
            className="v2-tab"
            aria-selected={tab === t.id}
            aria-controls={`v2-tabpanel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
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
        {tab === 'acoes' && <ActionsTab />}

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

import { useEffect, useMemo, useState } from 'react'
import { useCharacter } from '../../hooks/useCharacter'
import { useCharacterCalculations } from '../../hooks/useCharacterCalculations'
import { useTabValidation } from '../../hooks/useTabValidation'
import { useAutoSave } from '../../hooks/useAutoSave'
import { useSrd, useClassDataMap } from '../../providers/SrdProvider'
import { loadCharacterById } from '../../utils/storage'
import { SheetHeader } from './SheetHeader'
import { SheetTabs, TABS, NavBlockedBanner, ImportErrorBanner } from './SheetTabs'
import { SheetContent } from './SheetContent'
import { useSheetHandlers } from './useSheetHandlers'

/**
 * Orquestrador da ficha.
 *
 * Layout: header fixo + sidebar de navegação (desktop) + área de conteúdo scrollável.
 */
export function CharacterSheet({ characterId, onBack }) {
  const { races, classes, backgrounds } = useSrd()
  const classDataMap = useClassDataMap()

  const [activeTab, setActiveTab] = useState('ficha')
  const [navBlocked, setNavBlocked] = useState(false)
  const [importError, setImportError] = useState(null)

  const initialCharacter = useMemo(() => {
    if (!characterId || characterId === 'new') return null
    return loadCharacterById(characterId)
  }, [characterId])

  const { character, setCharacter, ...updaters } = useCharacter(initialCharacter)

  const { saved, error: saveError } = useAutoSave(character)

  const classData = useMemo(
    () => classes.find(c => c.index === character.info.class) ?? null,
    [classes, character.info.class],
  )

  const calc = useCharacterCalculations(character, classData, classDataMap)

  const validationDeps = useMemo(() => ({ races }), [races])
  const { getTabErrors, markTouched, hasErrors, focusFirstError } = useTabValidation(character, validationDeps)

  const handlers = useSheetHandlers({ setCharacter, races, classes, backgrounds })

  // Título do navegador
  useEffect(() => {
    const name = character.info.name?.trim()
    document.title = name ? `${name} — D&D 5e` : 'Grimório de Personagens — D&D 5e'
    return () => { document.title = 'Grimório de Personagens — D&D 5e' }
  }, [character.info.name])

  function handleTabChange(newTabId) {
    const currentIdx = TABS.findIndex(t => t.id === activeTab)
    const newIdx = TABS.findIndex(t => t.id === newTabId)
    const isForward = newIdx > currentIdx

    if (isForward && hasErrors(activeTab)) {
      markTouched(activeTab)
      setNavBlocked(true)
      return
    }
    setNavBlocked(false)
    setActiveTab(newTabId)
  }

  function handleExport() {
    const json = JSON.stringify(character, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${character.info.name || 'personagem'}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImport(parsed) {
    setCharacter(parsed)
    setImportError(null)
  }

  const fichaErrors = getTabErrors('ficha')

  // Quick stats para o header
  const quickStats = {
    currentHp:  character.combat.currentHp,
    maxHp:      character.combat.maxHp,
    armorClass: character.combat.armorClass,
    initiative: calc.initiative,
    hpPercent:  calc.hpPercent,
    hpColor:    calc.hpColor,
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── Header fixo ──────────────────────────────────────── */}
      <SheetHeader
        characterName={character.info.name}
        saved={saved}
        saveError={saveError}
        onBack={onBack}
        onExport={handleExport}
        onImport={handleImport}
        onImportError={setImportError}
        onPrint={() => window.print()}
        showPrint={false}
        quickStats={quickStats}
      />

      {/* ── Corpo: sidebar + conteúdo ────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Sidebar de navegação (embutida em SheetTabs) */}
        <SheetTabs activeTab={activeTab} onChange={handleTabChange} />

        {/* Área de conteúdo scrollável */}
        <main className="flex-1 overflow-y-auto min-w-0">
          <div className="max-w-4xl mx-auto px-4 py-4 lg:px-6 lg:py-6 space-y-4">

            {importError && (
              <ImportErrorBanner
                message={importError}
                onDismiss={() => setImportError(null)}
              />
            )}

            {navBlocked && (
              <NavBlockedBanner
                onReview={() => focusFirstError(activeTab)}
                onDismiss={() => setNavBlocked(false)}
              />
            )}

            <SheetContent
              activeTab={activeTab}
              character={character}
              setCharacter={setCharacter}
              calc={calc}
              classData={classData}
              races={races}
              classes={classes}
              backgrounds={backgrounds}
              fichaErrors={fichaErrors}
              updaters={updaters}
              handlers={handlers}
              onNavigateToSpells={() => setActiveTab('magias')}
            />
          </div>
        </main>
      </div>
    </div>
  )
}

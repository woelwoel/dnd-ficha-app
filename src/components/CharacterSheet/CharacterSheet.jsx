import { useEffect, useState, useMemo, useRef } from 'react'
import { useCharacter } from '../../hooks/useCharacter'
import { useCharacterCalculations } from '../../hooks/useCharacterCalculations'
import { useTabValidation } from '../../hooks/useTabValidation'
import { AttributeBox } from './AttributeBox'
import { CharacterInfo } from './CharacterInfo'
import { CombatStats } from './CombatStats'
import { SavingThrows } from './SavingThrows'
import { SkillsList } from './SkillsList'
import { Inventory } from './Inventory'
import { Spells } from './Spells'
import { Notes } from './Notes'
import { CharacterView } from './CharacterView'
import { LevelProgression } from './LevelProgression'
import { ABILITY_SCORES } from '../../utils/calculations'

const TABS = [
  { id: 'ficha',       label: 'Ficha'       },
  { id: 'percias',     label: 'Perícias'    },
  { id: 'magias',      label: 'Magias'      },
  { id: 'inventario',  label: 'Inventário'  },
  { id: 'notas',       label: 'Notas'       },
  { id: 'progressao',  label: 'Progressão'  },
  { id: 'visualizar',  label: 'Visualizar'  },
]

export function CharacterSheet({ characterId, onBack }) {
  const [races, setRaces] = useState([])
  const [classes, setClasses] = useState([])
  const [backgrounds, setBackgrounds] = useState([])
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('ficha')
  // Controla se o banner de "erros bloqueando avanço" está visível
  const [navBlocked, setNavBlocked] = useState(false)
  const importRef = useRef(null)

  const initialCharacter = useMemo(() => {
    if (!characterId || characterId === 'new') return null
    const stored = JSON.parse(localStorage.getItem('dnd-app-characters') || '[]')
    return stored.find(c => c.id === characterId) || null
  }, [characterId])

  const {
    character,
    setCharacter,
    updateInfo,
    updateTraits,
    updateAttribute,
    updateCombat,
    toggleSaveProficiency,
    toggleSkillProficiency,
    updateCurrency,
    addItem,
    removeItem,
    updateSpellcasting,
    addSpell,
    removeSpell,
    toggleSlot,
  } = useCharacter(initialCharacter)

  // classData é necessário para o cálculo de HP sugerido pelo hook
  const classData = useMemo(
    () => classes.find(c => c.index === character.info.class) ?? null,
    [classes, character.info.class]
  )
  const calc = useCharacterCalculations(character, classData)
  // deps de validação — races para checar sub-raça obrigatória
  const validationDeps = useMemo(() => ({ races }), [races])
  const { validateTab, getTabErrors, markTouched, hasErrors, focusFirstError } = useTabValidation(character, validationDeps)

  useEffect(() => {
    fetch('/srd-data/phb-races-pt.json')
      .then(r => r.json()).then(setRaces)
      .catch(() => fetch('/srd-data/5e-SRD-Races.json').then(r => r.json()).then(setRaces).catch(() => {}))
    fetch('/srd-data/phb-classes-pt.json')
      .then(r => r.json()).then(setClasses)
      .catch(() => fetch('/srd-data/5e-SRD-Classes.json').then(r => r.json()).then(setClasses).catch(() => {}))
    fetch('/srd-data/phb-backgrounds-pt.json')
      .then(r => r.json()).then(setBackgrounds)
      .catch(() => fetch('/srd-data/5e-SRD-Backgrounds.json').then(r => r.json()).then(setBackgrounds).catch(() => {}))
  }, [])

  // Auto-save
  useEffect(() => {
    if (!character.id) return
    const stored = JSON.parse(localStorage.getItem('dnd-app-characters') || '[]')
    const idx = stored.findIndex(c => c.id === character.id)
    if (idx >= 0) stored[idx] = character
    else stored.push(character)
    localStorage.setItem('dnd-app-characters', JSON.stringify(stored))
    setSaved(true)
    const timer = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(timer)
  }, [character])

  // Navega entre abas — valida a aba atual se for avanço
  function handleTabChange(newTabId) {
    const currentIdx = TABS.findIndex(t => t.id === activeTab)
    const newIdx     = TABS.findIndex(t => t.id === newTabId)
    const isForward  = newIdx > currentIdx

    if (isForward && hasErrors(activeTab)) {
      // Marca como tocada para exibir erros inline
      markTouched(activeTab)
      setNavBlocked(true)
      return
    }

    setNavBlocked(false)
    setActiveTab(newTabId)
  }

  // Export character as JSON
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

  // Import character from JSON file
  function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result)
        if (!imported.id || !imported.info) throw new Error('Formato inválido')
        setCharacter(imported)
        e.target.value = ''
      } catch {
        alert('Arquivo inválido. Certifique-se de importar uma ficha exportada pelo app.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-amber-400 transition-colors text-sm"
            >
              ← Personagens
            </button>
          )}
          <h1 className="text-xl font-bold text-amber-400 truncate max-w-[200px] sm:max-w-none">
            {character.info.name || 'Ficha de Personagem'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs transition-opacity mr-1 ${saved ? 'opacity-100 text-green-400' : 'opacity-0'}`}>
            ✓ Salvo
          </span>
          <button
            onClick={handleExport}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium"
            title="Exportar como JSON"
          >
            Exportar
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium"
            title="Importar de JSON"
          >
            Importar
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'text-amber-400 border-b-2 border-amber-400 -mb-px'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Banner de erros — aparece quando a navegação é bloqueada */}
      {navBlocked && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-2 text-red-300">
            <svg aria-hidden="true" className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Corrija os erros antes de avançar para a próxima aba.
          </div>
          <button
            onClick={() => focusFirstError(activeTab)}
            className="text-xs text-red-300 hover:text-white underline whitespace-nowrap"
          >
            Revisar erros
          </button>
        </div>
      )}

      {/* Tab: Ficha principal */}
      {activeTab === 'ficha' && (() => {
        // Erros visíveis só após o usuário tentar sair da aba
        const fichaErrors = getTabErrors('ficha')
        return (
        <div className="space-y-6">
          <section>
            <CharacterInfo
              info={character.info}
              onUpdate={updateInfo}
              races={races}
              classes={classes}
              backgrounds={backgrounds}
              errors={fichaErrors}
            />
          </section>

          <section>
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">Atributos</h2>
            <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
              {ABILITY_SCORES.map(({ key, abbr, name }) => (
                <AttributeBox
                  key={key}
                  abbr={abbr}
                  name={name}
                  value={character.attributes[key]}
                  onChange={value => updateAttribute(key, value)}
                  error={fichaErrors[`attr_${key}`]}
                />
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CombatStats
              combat={character.combat}
              attributes={character.attributes}
              level={character.info.level}
              onUpdateCombat={updateCombat}
              suggestedAC={calc.suggestedAC}
              suggestedMaxHp={calc.suggestedMaxHp}
              errors={fichaErrors}
            />
            <SavingThrows
              attributes={character.attributes}
              proficiencies={character.proficiencies}
              level={character.info.level}
              onToggle={toggleSaveProficiency}
            />
          </section>
        </div>
        )
      })()}

      {/* Tab: Perícias */}
      {activeTab === 'percias' && (
        <SkillsList
          attributes={character.attributes}
          proficiencies={character.proficiencies}
          level={character.info.level}
          onToggle={toggleSkillProficiency}
        />
      )}

      {/* Tab: Magias */}
      {activeTab === 'magias' && (
        <Spells
          character={character}
          attributes={character.attributes}
          level={character.info.level}
          onUpdateSpellcasting={updateSpellcasting}
          onAddSpell={addSpell}
          onRemoveSpell={removeSpell}
          onToggleSlot={toggleSlot}
        />
      )}

      {/* Tab: Inventário */}
      {activeTab === 'inventario' && (
        <Inventory
          inventory={character.inventory}
          onUpdateCurrency={updateCurrency}
          onAddItem={addItem}
          onRemoveItem={removeItem}
        />
      )}

      {/* Tab: Notas */}
      {activeTab === 'notas' && (
        <Notes
          traits={character.traits}
          onUpdate={updateTraits}
        />
      )}

      {/* Tab: Progressão de Nível */}
      {activeTab === 'progressao' && (
        <LevelProgression
          character={character}
          classes={classes}
          onLevelChange={lvl => updateInfo('level', lvl)}
        />
      )}

      {/* Tab: Visualizar ficha */}
      {activeTab === 'visualizar' && (
        <CharacterView
          character={character}
          races={races}
          classes={classes}
          backgrounds={backgrounds}
        />
      )}
    </div>
  )
}

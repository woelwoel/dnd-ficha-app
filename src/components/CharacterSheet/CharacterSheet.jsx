import { useEffect, useState, useMemo } from 'react'
import { useCharacter } from '../../hooks/useCharacter'
import { AttributeBox } from './AttributeBox'
import { CharacterInfo } from './CharacterInfo'
import { CombatStats } from './CombatStats'
import { SavingThrows } from './SavingThrows'
import { SkillsList } from './SkillsList'
import { Inventory } from './Inventory'
import { ABILITY_SCORES } from '../../utils/calculations'

const TABS = [
  { id: 'ficha',      label: 'Ficha'      },
  { id: 'percias',    label: 'Perícias'   },
  { id: 'inventario', label: 'Inventário' },
]

export function CharacterSheet({ characterId, onBack }) {
  const [races, setRaces] = useState([])
  const [classes, setClasses] = useState([])
  const [backgrounds, setBackgrounds] = useState([])
  const [saved, setSaved] = useState(false)
  const [activeTab, setActiveTab] = useState('ficha')

  // Load existing character from localStorage if an ID was provided
  const initialCharacter = useMemo(() => {
    if (!characterId || characterId === 'new') return null
    const stored = JSON.parse(localStorage.getItem('dnd-app-characters') || '[]')
    return stored.find(c => c.id === characterId) || null
  }, [characterId])

  const {
    character,
    updateInfo,
    updateTraits,
    updateAttribute,
    updateCombat,
    toggleSaveProficiency,
    toggleSkillProficiency,
    updateCurrency,
    addItem,
    removeItem,
  } = useCharacter(initialCharacter)

  // Load SRD data
  useEffect(() => {
    fetch('/srd-data/5e-SRD-Races.json').then(r => r.json()).then(setRaces).catch(() => {})
    fetch('/srd-data/5e-SRD-Classes.json').then(r => r.json()).then(setClasses).catch(() => {})
    fetch('/srd-data/5e-SRD-Backgrounds.json').then(r => r.json()).then(setBackgrounds).catch(() => {})
  }, [])

  // Auto-save to localStorage on every change
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

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-400 hover:text-amber-400 transition-colors text-sm"
            >
              ← Personagens
            </button>
          )}
          <h1 className="text-2xl font-bold text-amber-400">Ficha de Personagem</h1>
        </div>
        <span className={`text-xs transition-opacity ${saved ? 'opacity-100 text-green-400' : 'opacity-0'}`}>
          ✓ Salvo
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-700">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-amber-400 border-b-2 border-amber-400 -mb-px'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Ficha principal */}
      {activeTab === 'ficha' && (
        <div className="space-y-6">
          <section>
            <CharacterInfo
              info={character.info}
              onUpdate={updateInfo}
              races={races}
              classes={classes}
              backgrounds={backgrounds}
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
            />
            <SavingThrows
              attributes={character.attributes}
              proficiencies={character.proficiencies}
              level={character.info.level}
              onToggle={toggleSaveProficiency}
            />
          </section>

          <section className="bg-gray-800 border border-gray-600 rounded-lg p-4">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">Traços & Notas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { field: 'personalityTraits', label: 'Traços de Personalidade' },
                { field: 'ideals',            label: 'Ideais'                  },
                { field: 'bonds',             label: 'Vínculos'                },
                { field: 'flaws',             label: 'Defeitos'                },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-400 mb-1">{label}</label>
                  <textarea
                    value={character.traits[field]}
                    onChange={e => updateTraits(field, e.target.value)}
                    rows={3}
                    className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-amber-400"
                  />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Tab: Perícias */}
      {activeTab === 'percias' && (
        <SkillsList
          attributes={character.attributes}
          proficiencies={character.proficiencies}
          level={character.info.level}
          onToggle={toggleSkillProficiency}
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
    </div>
  )
}

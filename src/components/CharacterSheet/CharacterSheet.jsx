import { useEffect, useState } from 'react'
import { useCharacter } from '../../hooks/useCharacter'
import { AttributeBox } from './AttributeBox'
import { CharacterInfo } from './CharacterInfo'
import { CombatStats } from './CombatStats'
import { SavingThrows } from './SavingThrows'
import { ABILITY_SCORES } from '../../utils/calculations'

export function CharacterSheet({ characterId, onSave }) {
  const [races, setRaces] = useState([])
  const [classes, setClasses] = useState([])
  const [backgrounds, setBackgrounds] = useState([])
  const [saved, setSaved] = useState(false)

  const {
    character,
    updateInfo,
    updateAttribute,
    updateCombat,
    toggleSaveProficiency,
  } = useCharacter()

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
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-amber-400">🐉 Ficha de Personagem</h1>
        <span className={`text-xs transition-opacity ${saved ? 'opacity-100 text-green-400' : 'opacity-0'}`}>
          ✓ Salvo
        </span>
      </div>

      {/* Character Info */}
      <section>
        <CharacterInfo
          info={character.info}
          onUpdate={updateInfo}
          races={races}
          classes={classes}
          backgrounds={backgrounds}
        />
      </section>

      {/* Attributes */}
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

      {/* Combat + Saving Throws side by side */}
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

      {/* Traits */}
      <section className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">Traços & Notas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { field: 'personalityTraits', label: 'Traços de Personalidade' },
            { field: 'ideals', label: 'Ideais' },
            { field: 'bonds', label: 'Vínculos' },
            { field: 'flaws', label: 'Defeitos' },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="block text-xs text-gray-400 mb-1">{label}</label>
              <textarea
                value={character.traits[field]}
                onChange={e => updateInfo(field, e.target.value)}
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-amber-400"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

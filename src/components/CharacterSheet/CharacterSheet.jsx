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
import { ABILITY_SCORES, SKILLS, ABBR_TO_KEY, ATTR_NAME_TO_KEY, SPELL_ABILITY_PT_TO_KEY, STANDARD_ARRAY, POINT_BUY_COST, parseBackgroundEquipment } from '../../utils/calculations'
import { fetchSrd } from '../../utils/fetchSrd'
import { generateId } from '../../hooks/useCharacter'

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
    toggleSkillProficiency,
    toggleExpertiseSkill,
    updateCurrency,
    addItem,
    removeItem,
    updateSpellcasting,
    addSpell,
    removeSpell,
    toggleSlot,
    toggleLanguage,
  } = useCharacter(initialCharacter)

  // classData é necessário para o cálculo de HP sugerido pelo hook
  const classData = useMemo(
    () => classes.find(c => c.index === character.info.class) ?? null,
    [classes, character.info.class]
  )
  const calc = useCharacterCalculations(character, classData)
  // deps de validação — races para checar sub-raça obrigatória
  const validationDeps = useMemo(() => ({ races }), [races])
  const { getTabErrors, markTouched, hasErrors, focusFirstError } = useTabValidation(character, validationDeps)

  useEffect(() => {
    fetchSrd('phb-races-pt.json',       '5e-SRD-Races.json'      ).then(setRaces).catch(() => {})
    fetchSrd('phb-classes-pt.json',     '5e-SRD-Classes.json'    ).then(setClasses).catch(() => {})
    fetchSrd('phb-backgrounds-pt.json', '5e-SRD-Backgrounds.json').then(setBackgrounds).catch(() => {})
  }, [])

  // Atualiza título da página com nome do personagem
  useEffect(() => {
    const name = character.info.name?.trim()
    document.title = name ? `${name} — D&D 5e` : 'Grimório de Personagens — D&D 5e'
    return () => { document.title = 'Grimório de Personagens — D&D 5e' }
  }, [character.info.name])

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

  // Aplica subida de nível atomicamente (PV + atributos + nível)
  function handleApplyLevelUp({ newLevel, hpIncrease, attrBoosts }) {
    setCharacter(prev => {
      const newAttrs = { ...prev.attributes }
      for (const [key, boost] of Object.entries(attrBoosts)) {
        if (boost) newAttrs[key] = Math.min(20, newAttrs[key] + boost)
      }
      return {
        ...prev,
        info:    { ...prev.info, level: newLevel },
        attributes: newAttrs,
        combat:  {
          ...prev.combat,
          maxHp:     prev.combat.maxHp + hpIncrease,
          currentHp: prev.combat.currentHp + hpIncrease,
        },
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
    })
  }

  // Muda classe e aplica automaticamente: salvaguardas, atributo de magia e dado de vida
  function handleClassChange(newClassIndex) {
    const cls = classes.find(c => c.index === newClassIndex) ?? null
    const saveKeys    = (cls?.saving_throws ?? []).map(n => ATTR_NAME_TO_KEY[n]).filter(Boolean)
    const spellKey    = cls?.spellcasting_ability ? (SPELL_ABILITY_PT_TO_KEY[cls.spellcasting_ability] ?? null) : null
    const hitDice     = cls?.hit_die ? `1d${cls.hit_die}` : character.combat.hitDice
    setCharacter(prev => ({
      ...prev,
      info:          { ...prev.info, class: newClassIndex },
      proficiencies: { ...prev.proficiencies, savingThrows: saveKeys },
      spellcasting:  { ...prev.spellcasting, ability: spellKey },
      combat:        { ...prev.combat, hitDice },
      meta:          { ...prev.meta, updatedAt: new Date().toISOString() },
    }))
  }

  // Calcula bônus combinados (raça + sub-raça) retornando { str: N, dex: N, ... }
  function computeRacialBonuses(raceIndex, subraceIndex) {
    const race    = races.find(r => r.index === raceIndex)
    const subrace = race?.subraces?.find(sr => sr.index === subraceIndex)
    const map = {}
    for (const b of [...(race?.ability_bonuses ?? []), ...(subrace?.ability_bonuses ?? [])]) {
      const key = ABBR_TO_KEY[b.ability]
      if (key) map[key] = (map[key] ?? 0) + b.bonus
    }
    return map
  }

  // Re-aplica bônus raciais: reverte os antigos, soma os novos e atualiza info
  function applyRacialChange(infoPatch, raceIndex, subraceIndex) {
    setCharacter(prev => {
      const oldApplied = prev.appliedRacialBonuses ?? {}
      const newBonuses = computeRacialBonuses(raceIndex, subraceIndex)
      const attrs = { ...prev.attributes }
      for (const [k, v] of Object.entries(oldApplied)) attrs[k] = Math.max(1, attrs[k] - v)
      for (const [k, v] of Object.entries(newBonuses)) attrs[k] = Math.min(30, attrs[k] + v)
      return {
        ...prev,
        info: { ...prev.info, ...infoPatch },
        attributes: attrs,
        appliedRacialBonuses: newBonuses,
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
    })
  }

  const handleRaceChange    = idx => applyRacialChange({ race: idx, subrace: '' }, idx, '')
  const handleSubraceChange = idx => applyRacialChange({ subrace: idx }, character.info.race, idx)

  // Troca antecedente: perícias automáticas + itens de equipamento no inventário
  function handleBackgroundChange(newBgIndex) {
    const bg = backgrounds.find(b => b.index === newBgIndex)
    const bgSkillKeys = (bg?.skill_proficiencies ?? [])
      .map(name => SKILLS.find(s => s.name === name)?.key)
      .filter(Boolean)
    const { items: bgItems, gold: bgGold } = parseBackgroundEquipment(bg?.equipment)
    setCharacter(prev => {
      const keepItems = prev.inventory.items.filter(i => i.source !== 'background')
      const newItems = [...keepItems, ...bgItems.map(i => ({ ...i, id: generateId() }))]
      const newGp = prev.inventory.currency.gp + (newBgIndex ? bgGold : 0)
      return {
        ...prev,
        info: { ...prev.info, background: newBgIndex },
        proficiencies: { ...prev.proficiencies, backgroundSkills: bgSkillKeys },
        inventory: {
          ...prev.inventory,
          items: newItems,
          currency: { ...prev.inventory.currency, gp: newGp },
        },
        meta: { ...prev.meta, updatedAt: new Date().toISOString() },
      }
    })
  }

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

  // Erros da aba Ficha — visíveis só após o usuário tentar sair da aba
  const fichaErrors = getTabErrors('ficha')

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              onClick={onBack}
              className="text-gray-500 hover:text-amber-400 transition-colors text-sm shrink-0"
            >
              ← Personagens
            </button>
          )}
          <h1 className="text-xl font-bold text-amber-400 font-display truncate">
            {character.info.name || 'Ficha de Personagem'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <span className={`text-xs transition-opacity mr-1 ${saved ? 'opacity-100 text-green-400' : 'opacity-0'}`}>
            ✓ Salvo
          </span>
          <button
            onClick={handleExport}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="Exportar como JSON"
          >
            Exportar
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
            title="Importar de JSON"
          >
            Importar
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          {activeTab === 'visualizar' && (
            <button
              onClick={() => window.print()}
              className="text-xs px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-amber-100 transition-colors"
              title="Imprimir / Exportar PDF"
            >
              Imprimir
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-gray-700 overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-3 py-2 text-xs font-display tracking-wide whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'text-amber-400 border-b-2 border-amber-500 -mb-px bg-amber-950/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
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
      {activeTab === 'ficha' && (
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

          <section>
            {/* Cabeçalho + seletor de método */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-sm font-bold text-amber-400 uppercase tracking-widest">Atributos</h2>
              <div className="flex gap-1 text-xs">
                {[
                  { id: 'manual',         label: 'Manual'         },
                  { id: 'standard-array', label: 'Array Padrão'   },
                  { id: 'point-buy',      label: 'Compra de Ptos' },
                ].map(m => (
                  <button
                    key={m.id}
                    onClick={() => updateInfo('scoreMethod', m.id)}
                    className={`px-2 py-1 rounded border transition-colors ${
                      (character.info.scoreMethod ?? 'manual') === m.id
                        ? 'bg-amber-700 border-amber-500 text-white'
                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {(() => {
              const method = character.info.scoreMethod ?? 'manual'
              const racialBonuses = character.appliedRacialBonuses ?? {}
              const baseValues = Object.fromEntries(
                ABILITY_SCORES.map(({ key }) => [key, character.attributes[key] - (racialBonuses[key] ?? 0)])
              )
              const pbSpent = ABILITY_SCORES.reduce((sum, { key }) =>
                sum + (POINT_BUY_COST[Math.min(15, Math.max(8, baseValues[key]))] ?? 0), 0)
              const pbRemaining = 27 - pbSpent

              const appliedList = Object.entries(racialBonuses)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => `+${v} ${ABILITY_SCORES.find(a => a.key === k)?.abbr ?? k}`)

              const saUsed  = ABILITY_SCORES.map(({ key }) => baseValues[key])
              const saValid = STANDARD_ARRAY.every(v => saUsed.includes(v)) && saUsed.every(v => STANDARD_ARRAY.includes(v))

              return (
                <>
                  <div className="mb-3 space-y-1">
                    {appliedList.length > 0 && (
                      <p className="text-xs text-amber-500/80">
                        ↑ Bônus racial aplicado automaticamente: {appliedList.join(', ')}
                      </p>
                    )}
                    {method === 'point-buy' && (
                      <p className={`text-xs font-semibold ${pbRemaining < 0 ? 'text-red-400' : pbRemaining === 0 ? 'text-green-400' : 'text-sky-400'}`}>
                        Compra de Pontos — {pbRemaining < 0 ? `${Math.abs(pbRemaining)} pts acima do limite` : `${pbRemaining}/27 pts restantes`}
                      </p>
                    )}
                    {method === 'standard-array' && !saValid && (
                      <p className="text-xs text-amber-400">
                        Array Padrão: atribua os valores [8, 10, 12, 13, 14, 15] uma vez cada.
                      </p>
                    )}
                    {method === 'standard-array' && saValid && (
                      <p className="text-xs text-green-400">Array Padrão completo ✓</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                    {ABILITY_SCORES.map(({ key, abbr, name }) => {
                      const racialBonus = racialBonuses[key] ?? 0
                      const baseValue   = baseValues[key]
                      const availableSA = STANDARD_ARRAY.filter(v =>
                        v === baseValue || !saUsed.includes(v)
                      )
                      return (
                        <AttributeBox
                          key={key}
                          abbr={abbr}
                          name={name}
                          value={character.attributes[key]}
                          baseValue={baseValue}
                          racialBonus={racialBonus}
                          mode={method}
                          availableSA={availableSA}
                          pointsRemaining={pbRemaining}
                          onChange={value => updateAttribute(key, value)}
                          onChangeBase={newBase => updateAttribute(key, Math.min(30, Math.max(1, newBase)) + racialBonus)}
                          error={fichaErrors[`attr_${key}`]}
                        />
                      )
                    })}
                  </div>
                </>
              )
            })()}
          </section>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CombatStats
              combat={character.combat}
              attributes={character.attributes}
              level={character.info.level}
              onUpdateCombat={updateCombat}
              suggestedAC={calc.suggestedAC}
              suggestedMaxHp={calc.suggestedMaxHp}
              passivePerception={calc.passivePerception}
              errors={fichaErrors}
            />
            <SavingThrows
              attributes={character.attributes}
              level={character.info.level}
              classData={classData}
            />
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
          onToggleExpertise={toggleExpertiseSkill}
          classData={classData}
        />
      )}

      {/* Tab: Magias */}
      {activeTab === 'magias' && (
        <Spells
          character={character}
          attributes={character.attributes}
          level={character.info.level}
          classData={classData}
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
          background={backgrounds.find(b => b.index === character.info.background) ?? null}
        />
      )}

      {/* Tab: Progressão de Nível */}
      {activeTab === 'progressao' && (
        <LevelProgression
          character={character}
          classData={classData}
          onLevelChange={lvl => updateInfo('level', lvl)}
          onApplyLevelUp={handleApplyLevelUp}
        />
      )}

      {/* Tab: Visualizar ficha */}
      {activeTab === 'visualizar' && (
        <div id="print-character-view" className="overflow-x-auto">
          <div style={{ minWidth: '560px' }}>
            <CharacterView
              character={character}
              races={races}
              classes={classes}
              backgrounds={backgrounds}
            />
          </div>
        </div>
      )}
    </div>
  )
}

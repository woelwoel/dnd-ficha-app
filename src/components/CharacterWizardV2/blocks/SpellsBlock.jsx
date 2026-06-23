// src/components/CharacterWizardV2/blocks/SpellsBlock.jsx
import { useState, useMemo } from 'react'
import {
  SCHOOL_ABBR, SPELL_ABILITY_PT_TO_KEY,
  getProficiencyBonus, formatModifier,
  calculateSpellSaveDC, calculateSpellAttackBonus,
} from '../../../utils/calculations'
import { abbrOfKey, nameOfKey } from '../../../systems/dnd5e/domain/attributes'
import { useClassSpells } from '../../../hooks/useClassSpells'
import { getSpellcastingRules } from '../../../utils/spellcasting'
import { generateId } from '../../../hooks/useCharacter'
import { SpellDetailModal } from '../../SpellDetailModal'

export function SpellsBlock({ draft, updateDraft, classData }) {
  const [activeTab, setActiveTab] = useState(0)
  const [search, setSearch] = useState('')
  const [detailSpell, setDetailSpell] = useState(null)

  const spellAbilityKey = draft.spellcastingAbility ?? SPELL_ABILITY_PT_TO_KEY[classData?.spellcasting_ability]

  const finalAttrs = {}
  for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    const base = draft.baseAttributes?.[key] ?? 10
    const bonus = draft.racialBonuses?.[key] ?? 0
    finalAttrs[key] = base > 0 ? base + bonus : 10
  }

  // CD/ataque mágico usam o bônus de proficiência do nível TOTAL (PHB p.164).
  const totalLevel = (draft.level ?? 1)
    + (draft.multiclasses ?? []).reduce((s, mc) => s + (mc.level ?? 0), 0)
  const profBonus = getProficiencyBonus(totalLevel)
  const spellScore = finalAttrs[spellAbilityKey] ?? 10
  const spellSaveDC = spellAbilityKey ? calculateSpellSaveDC(spellScore, profBonus) : null
  const spellAttackBonus = spellAbilityKey ? calculateSpellAttackBonus(spellScore, profBonus) : null

  const { classSpells, levelData, slotLevels, availableTabs } =
    useClassSpells(draft.class, draft.level ?? 1)

  const rules = getSpellcastingRules(draft.class, draft.level ?? 1, finalAttrs, levelData)
  const { type: castType, spellsLimit, cantripsLimit, spellsLabel } = rules

  const chosenSpells = draft.spells ?? []
  const chosenCantrips = chosenSpells.filter(s => s.level === 0)
  const chosenLeveled = chosenSpells.filter(s => s.level > 0)
  const chosenIds = new Set(chosenSpells.map(s => s.index))

  const filteredSpells = useMemo(() => {
    const base = classSpells.filter(s => s.level === activeTab)
    if (!search.trim()) return base
    const q = search.toLowerCase()
    return base.filter(s => s.name.toLowerCase().includes(q) || (s.school || '').toLowerCase().includes(q))
  }, [classSpells, activeTab, search])

  const atCantripLimit = activeTab === 0 && cantripsLimit != null && chosenCantrips.length >= cantripsLimit
  const atSpellLimit = activeTab > 0 && spellsLimit != null && chosenLeveled.length >= spellsLimit

  function addSpell(spell) {
    if (chosenIds.has(spell.index)) return
    updateDraft({ spells: [...chosenSpells, {
      id: generateId(), index: spell.index, name: spell.name, level: spell.level,
      school: spell.school || '', castingTime: spell.casting_time, range: spell.range,
      duration: spell.duration, concentration: spell.concentration,
      components: Array.isArray(spell.components) ? spell.components.join(', ') : (spell.components || ''),
      desc: spell.desc || '', higherLevel: spell.higher_level || '',
      ritual: spell.ritual || false, source: spell.source || 'PHB-PT',
    }]})
  }

  function removeSpell(index) {
    updateDraft({ spells: chosenSpells.filter(s => s.index !== index) })
  }

  return (
    <div className="flex flex-col gap-4">
      {spellAbilityKey && (
        <div className="grid grid-cols-3 gap-2">
          <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-3 text-center">
            <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-1">Habilidade</p>
            <p className="text-lg font-display text-ink-500">{abbrOfKey(spellAbilityKey) ?? spellAbilityKey.toUpperCase()}</p>
            <p className="text-xs italic text-ink-200">{nameOfKey(spellAbilityKey) ?? ''}</p>
          </div>
          <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-3 text-center">
            <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-1">CD de Magia</p>
            <p className="text-lg font-display text-ink-500">{spellSaveDC ?? '—'}</p>
          </div>
          <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-3 text-center">
            <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-1">Atk Magia</p>
            <p className="text-lg font-display text-ink-500">{spellAttackBonus !== null ? formatModifier(spellAttackBonus) : '—'}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        {cantripsLimit != null && (
          <span className="text-ink-300">
            Truques: <span className="font-display text-ink-500">{chosenCantrips.length}/{cantripsLimit}</span>
          </span>
        )}
        {spellsLimit != null && (
          <span className="text-ink-300">
            {spellsLabel}: <span className="font-display text-ink-500">{chosenLeveled.length}/{spellsLimit}</span>
          </span>
        )}
      </div>

      {chosenSpells.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-display tracking-widest uppercase text-ink-300">Selecionadas</p>
          <div className="flex flex-wrap gap-2">
            {chosenSpells.map(spell => (
              <div key={spell.index} className="flex items-center gap-1 border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-1 text-xs">
                <span className="font-display text-ink-500">{spell.name}</span>
                {spell.level === 0 && <span className="text-ink-200">·T</span>}
                {spell.concentration && <span className="text-blue-700 ml-0.5">⊙</span>}
                {spell.ritual && <span className="text-emerald-700 ml-0.5">📿</span>}
                <button onClick={() => removeSpell(spell.index)} className="ml-1 text-ink-200 hover:text-red-700">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {availableTabs.length > 0 && (
        <div className="border-2 border-parchment-600 bg-parchment-50 rounded-sm overflow-hidden">
          <div className="flex overflow-x-auto border-b-2 border-parchment-600 bg-parchment-100">
            {availableTabs.map(lvl => (
              <button
                key={lvl}
                type="button"
                onClick={() => { setActiveTab(lvl); setSearch('') }}
                className={[
                  'flex-shrink-0 px-3 py-2 text-xs font-display tracking-wide transition-colors',
                  activeTab === lvl
                    ? 'bg-parchment-200 text-ink-500 border-b-2 border-ink-500'
                    : 'text-ink-300 hover:text-ink-500',
                ].join(' ')}
              >
                {lvl === 0 ? 'Truques' : `Nv ${lvl}`}
              </button>
            ))}
          </div>

          <div className="p-3 border-b-2 border-parchment-600">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar magia..."
              className="w-full px-3 py-1.5 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-sm text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
            />
            {(atCantripLimit || atSpellLimit) && (
              <p className="text-xs text-amber-700 mt-1.5">
                ⚠ Limite de {activeTab === 0 ? 'truques' : 'magias'} atingido
              </p>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-parchment-600/40">
            {filteredSpells.length === 0 && (
              <p className="text-xs italic text-ink-200 p-4 text-center">Nenhuma magia encontrada.</p>
            )}
            {filteredSpells.map(spell => {
              const chosen = chosenIds.has(spell.index)
              const blocked = !chosen && (atCantripLimit || atSpellLimit)
              const school = SCHOOL_ABBR[(spell.school || '').toLowerCase()] || ''
              return (
                <div
                  key={spell.index}
                  className={[
                    'flex items-center gap-2 px-3 py-2 transition-colors',
                    chosen ? 'opacity-40' : blocked ? 'opacity-50' : 'hover:bg-parchment-100',
                  ].join(' ')}
                >
                  <button onClick={() => setDetailSpell(spell)} className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-display text-ink-500 hover:text-ink-600">{spell.name}</span>
                      {spell.ritual && <span className="text-emerald-700 text-xs">📿</span>}
                      {spell.concentration && <span className="text-blue-700 text-xs">⊙</span>}
                      <span className="text-xs text-ink-200">{school}</span>
                    </div>
                    <p className="text-xs italic text-ink-200 mt-0.5">{spell.casting_time} · {spell.range}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => !chosen && !blocked && addSpell(spell)}
                    disabled={chosen || blocked}
                    className={[
                      'flex-shrink-0 text-xs px-2 py-1 rounded-sm font-display transition-colors',
                      chosen ? 'text-ink-200 cursor-default' :
                      blocked ? 'text-ink-200 cursor-not-allowed' :
                                'text-ink-500 hover:bg-parchment-200',
                    ].join(' ')}
                  >
                    {chosen ? '✓' : '+'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {slotLevels.length > 0 && levelData && (
        <div>
          <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-2">Espaços de magia (Nível {draft.level}):</p>
          <div className="flex flex-wrap gap-2">
            {slotLevels.map(lvl => (
              <div key={lvl} className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-1.5 text-xs">
                <span className="text-ink-300">Nv {lvl}: </span>
                <span className="font-display text-ink-500">{levelData[`spell_slots_level_${lvl}`]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {detailSpell && <SpellDetailModal spell={detailSpell} onClose={() => setDetailSpell(null)} />}
    </div>
  )
}

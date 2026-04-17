// Passo 7 — Magias: seleção por aba de nível + busca + limites
import { useState, useMemo } from 'react'
import { ABILITY_SCORES, SCHOOL_ABBR, SPELL_ABILITY_PT_TO_KEY, getProficiencyBonus, formatModifier, calculateSpellSaveDC, calculateSpellAttackBonus } from '../../../utils/calculations'
import { useClassSpells } from '../../../hooks/useClassSpells'
import { getSpellcastingRules } from '../../../utils/spellcasting'
import { generateId } from '../../../hooks/useCharacter'
import { SpellDetailModal } from '../../SpellDetailModal'

const KEY_TO_ABBR = Object.fromEntries(ABILITY_SCORES.map(a => [a.key, a.abbr]))
const KEY_TO_NAME = Object.fromEntries(ABILITY_SCORES.map(a => [a.key, a.name]))

export function Step7Spells({ draft, updateDraft, classData }) {
  const [activeTab, setActiveTab] = useState(0)
  const [search, setSearch] = useState('')
  const [detailSpell, setDetailSpell] = useState(null)

  const spellAbilityKey = draft.spellcastingAbility ?? SPELL_ABILITY_PT_TO_KEY[classData?.spellcasting_ability]

  // Atributos finais com bônus raciais
  const finalAttrs = {}
  for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    const base  = draft.baseAttributes[key] ?? 10
    const bonus = draft.racialBonuses?.[key] ?? 0
    finalAttrs[key] = base > 0 ? base + bonus : 10
  }

  const profBonus        = getProficiencyBonus(draft.level)
  const spellScore       = finalAttrs[spellAbilityKey] ?? 10
  const spellSaveDC      = spellAbilityKey ? calculateSpellSaveDC(spellScore, profBonus) : null
  const spellAttackBonus = spellAbilityKey ? calculateSpellAttackBonus(spellScore, profBonus) : null

  const { classSpells, levelData, slotLevels, availableTabs } =
    useClassSpells(draft.class, draft.level)

  const rules = getSpellcastingRules(draft.class, draft.level, finalAttrs, levelData)
  const { type: castType, spellsLimit, cantripsLimit, spellsLabel } = rules

  // Magias escolhidas no draft
  const chosenSpells = draft.spells ?? []
  const chosenCantrips = chosenSpells.filter(s => s.level === 0)
  const chosenLeveled  = chosenSpells.filter(s => s.level > 0)
  const chosenIds = new Set(chosenSpells.map(s => s.index))

  // Picker filtrado por tab + busca
  const filteredSpells = useMemo(() => {
    const base = classSpells.filter(s => s.level === activeTab)
    if (!search.trim()) return base
    const q = search.toLowerCase()
    return base.filter(s => s.name.toLowerCase().includes(q) || (s.school || '').toLowerCase().includes(q))
  }, [classSpells, activeTab, search])

  const atCantripLimit = activeTab === 0 && cantripsLimit != null && chosenCantrips.length >= cantripsLimit
  const atSpellLimit   = activeTab > 0 && spellsLimit != null && chosenLeveled.length >= spellsLimit

  function addSpell(spell) {
    if (chosenIds.has(spell.index)) return
    const newSpell = {
      id: generateId(),
      index: spell.index,
      name: spell.name,
      level: spell.level,
      school: spell.school || '',
      castingTime: spell.casting_time,
      range: spell.range,
      duration: spell.duration,
      concentration: spell.concentration,
      components: Array.isArray(spell.components) ? spell.components.join(', ') : (spell.components || ''),
      desc: spell.desc || '',
      higherLevel: spell.higher_level || '',
      ritual: spell.ritual || false,
      source: spell.source || 'PHB-PT',
    }
    updateDraft({ spells: [...chosenSpells, newSpell] })
  }

  function removeSpell(index) {
    updateDraft({ spells: chosenSpells.filter(s => s.index !== index) })
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-amber-400 mb-1">Magias</h2>
        <p className="text-sm text-gray-400">Escolha seus truques e magias iniciais.</p>
      </div>

      {/* Stats de magia */}
      {spellAbilityKey && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-center">
            <p className="text-[11px] text-gray-500 mb-1">Habilidade</p>
            <p className="text-lg font-bold text-amber-300">{KEY_TO_ABBR[spellAbilityKey] ?? spellAbilityKey.toUpperCase()}</p>
            <p className="text-[11px] text-gray-600">{KEY_TO_NAME[spellAbilityKey] ?? ''}</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-center">
            <p className="text-[11px] text-gray-500 mb-1">CD de Magia</p>
            <p className="text-lg font-bold text-amber-300">{spellSaveDC ?? '—'}</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-center">
            <p className="text-[11px] text-gray-500 mb-1">Ataque de Magia</p>
            <p className="text-lg font-bold text-amber-300">{spellAttackBonus !== null ? formatModifier(spellAttackBonus) : '—'}</p>
          </div>
        </div>
      )}

      {/* Contadores de limites */}
      <div className="flex flex-wrap gap-4 text-sm">
        {cantripsLimit != null && (
          <span className="text-gray-400">
            Truques: <span className={chosenCantrips.length > cantripsLimit ? 'text-red-400 font-bold' : 'text-amber-300 font-semibold'}>
              {chosenCantrips.length}/{cantripsLimit}
            </span>
          </span>
        )}
        {spellsLimit != null && (
          <span className="text-gray-400">
            {spellsLabel}: <span className={chosenLeveled.length > spellsLimit ? 'text-red-400 font-bold' : 'text-amber-300 font-semibold'}>
              {chosenLeveled.length}/{spellsLimit}
            </span>
          </span>
        )}
        {castType === 'prepared' && <span className="text-gray-600 italic text-xs">({rules.ability?.toUpperCase()} mod + nível)</span>}
      </div>

      {/* Magias escolhidas */}
      {chosenSpells.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Selecionadas</p>
          <div className="flex flex-wrap gap-2">
            {chosenSpells.map(spell => (
              <div key={spell.index} className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-full px-3 py-1 text-xs">
                <span className="text-gray-200">{spell.name}</span>
                {spell.level === 0 && <span className="text-gray-600">·T</span>}
                {spell.concentration && <span className="text-blue-400 ml-0.5">⊙</span>}
                {spell.ritual && <span className="text-green-400 ml-0.5">📿</span>}
                <button onClick={() => removeSpell(spell.index)} className="ml-1 text-gray-600 hover:text-red-400 transition-colors">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Picker: abas por nível + busca */}
      {availableTabs.length > 0 && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          {/* Abas */}
          <div className="flex overflow-x-auto border-b border-gray-700 bg-gray-900">
            {availableTabs.map(lvl => (
              <button
                key={lvl}
                onClick={() => { setActiveTab(lvl); setSearch('') }}
                className={`flex-shrink-0 px-3 py-2 text-xs font-semibold transition-colors ${
                  activeTab === lvl
                    ? 'bg-amber-900/40 text-amber-300 border-b-2 border-amber-500'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {lvl === 0 ? 'Truques' : `Nv ${lvl}`}
              </button>
            ))}
          </div>

          {/* Busca */}
          <div className="p-3 border-b border-gray-700">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar magia..."
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-600"
            />
            {(atCantripLimit || atSpellLimit) && (
              <p className="text-xs text-amber-500 mt-1.5">
                ⚠ Limite de {activeTab === 0 ? 'truques' : 'magias'} atingido
              </p>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-700/50">
            {filteredSpells.length === 0 && (
              <p className="text-xs text-gray-600 p-4 text-center">Nenhuma magia encontrada.</p>
            )}
            {filteredSpells.map(spell => {
              const chosen  = chosenIds.has(spell.index)
              const blocked = !chosen && (atCantripLimit || atSpellLimit)
              const school  = SCHOOL_ABBR[(spell.school || '').toLowerCase()] || ''
              return (
                <div
                  key={spell.index}
                  className={`flex items-center gap-2 px-3 py-2 transition-colors ${chosen ? 'opacity-40' : blocked ? 'opacity-50' : 'hover:bg-gray-700/50'}`}
                >
                  {/* Nome clicável → abre descrição */}
                  <button
                    onClick={() => setDetailSpell(spell)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-white hover:text-amber-300 transition-colors">{spell.name}</span>
                      {spell.ritual && <span className="text-green-400 text-xs">📿</span>}
                      {spell.concentration && <span className="text-blue-400 text-xs">⊙</span>}
                      <span className="text-xs text-gray-500">{school}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{spell.casting_time} · {spell.range}</p>
                  </button>
                  {/* Botão info */}
                  <button
                    onClick={() => setDetailSpell(spell)}
                    className="flex-shrink-0 text-gray-600 hover:text-amber-400 text-xs px-1 transition-colors"
                    title="Ver descrição"
                  >
                    ℹ
                  </button>
                  {/* Botão adicionar */}
                  <button
                    onClick={() => !chosen && !blocked && addSpell(spell)}
                    disabled={chosen || blocked}
                    className={`flex-shrink-0 text-xs px-2 py-1 rounded font-bold transition-colors ${
                      chosen  ? 'text-gray-600 cursor-default' :
                      blocked ? 'text-gray-600 cursor-not-allowed' :
                                'text-amber-400 hover:text-amber-300 hover:bg-amber-900/30'
                    }`}
                  >
                    {chosen ? '✓' : '+'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Slots de preview */}
      {slotLevels.length > 0 && levelData && (
        <div>
          <p className="text-xs text-gray-500 mb-2">Espaços de magia no nível {draft.level}:</p>
          <div className="flex flex-wrap gap-2">
            {slotLevels.map(lvl => (
              <div key={lvl} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-center">
                <span className="text-gray-400">Nível {lvl}: </span>
                <span className="text-amber-300 font-bold">{levelData[`spell_slots_level_${lvl}`]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal de detalhes */}
      {detailSpell && <SpellDetailModal spell={detailSpell} onClose={() => setDetailSpell(null)} />}
    </div>
  )
}

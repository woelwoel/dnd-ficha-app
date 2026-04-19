import { useState, useMemo } from 'react'
import { ABILITY_SCORES, SCHOOL_ABBR, SPELL_ABILITY_PT_TO_KEY, formatModifier, calculateSpellSaveDC, calculateSpellAttackBonus, getProficiencyBonus } from '../../utils/calculations'
import { getSpellcastingRules } from '../../utils/spellcasting'
import { useClassSpells } from '../../hooks/useClassSpells'
import { SpellDetailModal } from '../SpellDetailModal'

const KEY_TO_ABBR = Object.fromEntries(ABILITY_SCORES.map(a => [a.key, a.abbr]))

export function Spells({ character, attributes, level, profBonus: profBonusProp, classData, onUpdateSpellcasting, onAddSpell, onRemoveSpell, onToggleSlot }) {
  const [activeTab, setActiveTab] = useState(0)
  const [search, setSearch] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [detailSpell, setDetailSpell] = useState(null)

  const classIndex   = character.info?.class || ''
  const classAbility = classData?.spellcasting_ability
    ? (SPELL_ABILITY_PT_TO_KEY[classData.spellcasting_ability] ?? null)
    : null
  const isSpellcaster = classAbility !== null
  const spellAbility  = character.spellcasting.ability ?? classAbility
  // Usa profBonus passado pelo pai (nível total); fallback calcula pelo nível total internamente
  const mcs        = character.info?.multiclasses ?? []
  const totalLevel = level + mcs.reduce((s, m) => s + (m.level ?? 0), 0)
  const profBonus  = profBonusProp ?? getProficiencyBonus(totalLevel)
  const abilityScore  = spellAbility ? attributes[spellAbility] : 10
  const spellSaveDC   = calculateSpellSaveDC(abilityScore, profBonus)
  const spellAttack   = calculateSpellAttackBonus(abilityScore, profBonus)

  const { classSpells, levelData, slotLevels, availableTabs } =
    useClassSpells(classIndex, level)

  const rules = useMemo(
    () => getSpellcastingRules(classIndex, level, attributes, levelData),
    [classIndex, level, attributes, levelData]
  )
  const { type: castType, spellsLimit, cantripsLimit, spellsLabel } = rules

  const usedSlots   = character.spellcasting.usedSlots || {}
  const mySpells    = character.spellcasting.spells || []
  const myCantrips  = mySpells.filter(s => s.level === 0)
  const myLeveled   = mySpells.filter(s => s.level > 0)

  // Picker filtrado
  const filteredPicker = useMemo(() => {
    const base = classSpells.filter(s => s.level === activeTab)
    if (!search.trim()) return base
    const q = search.toLowerCase()
    return base.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.school || '').toLowerCase().includes(q) ||
      (s.casting_time || '').toLowerCase().includes(q)
    )
  }, [classSpells, activeTab, search])

  const mySpellIds = new Set(mySpells.map(s => s.index))

  function addSpell(spell) {
    if (mySpellIds.has(spell.index)) return
    onAddSpell({
      index: spell.index,
      name: spell.name,
      level: spell.level,
      school: spell.school?.name || spell.school || '',
      castingTime: spell.casting_time,
      range: spell.range,
      duration: spell.duration,
      concentration: spell.concentration,
      components: Array.isArray(spell.components) ? spell.components.join(', ') : (spell.components || ''),
      desc: spell.desc,
      higherLevel: spell.higher_level,
      ritual: spell.ritual || false,
      source: spell.source || 'PHB-PT',
    })
  }

  return (
    <div className="space-y-4">
      {/* Stats de conjuração */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">Conjuração</h3>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'CD de Magia', value: spellAbility ? spellSaveDC : '—' },
            { label: 'Ataque', value: spellAbility ? formatModifier(spellAttack) : '—' },
            { label: 'Atributo', value: spellAbility ? KEY_TO_ABBR[spellAbility] : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center bg-gray-900 rounded p-2">
              <span className="text-xs text-gray-400 mb-1">{label}</span>
              <span className="text-xl font-bold text-white">{value}</span>
            </div>
          ))}
        </div>

        {/* Contadores */}
        {isSpellcaster && (
          <div className="flex flex-wrap gap-4 text-xs text-gray-400 mb-3">
            {cantripsLimit != null && (
              <span>
                Truques: <span className={myCantrips.length > cantripsLimit ? 'text-red-400 font-bold' : 'text-amber-300 font-semibold'}>
                  {myCantrips.length}/{cantripsLimit}
                </span>
              </span>
            )}
            {spellsLimit != null && (
              <span>
                {spellsLabel}: <span className={myLeveled.length > spellsLimit ? 'text-red-400 font-bold' : 'text-amber-300 font-semibold'}>
                  {myLeveled.length}/{spellsLimit}
                </span>
              </span>
            )}
            {castType === 'prepared' && (
              <span className="text-gray-600 italic">
                Escolha entre a lista da classe ({rules.ability.toUpperCase()} mod + nível)
              </span>
            )}
          </div>
        )}

        {/* Tracker de slots */}
        {slotLevels.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Espaços de Magia</span>
              <button onClick={() => onUpdateSpellcasting('usedSlots', {})} className="text-xs text-amber-600 hover:text-amber-400">
                Descanso Longo
              </button>
            </div>
            <div className="space-y-1.5">
              {slotLevels.map(sl => {
                const max = levelData[`spell_slots_level_${sl}`]
                const used = usedSlots[sl] || 0
                return (
                  <div key={sl} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-14">Nível {sl}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: max }, (_, i) => {
                        const isUsed = i < used
                        return (
                          <button
                            key={i}
                            onClick={() => onToggleSlot(sl, isUsed ? used - 1 : used + 1)}
                            className={`w-5 h-5 rounded-full border-2 transition-colors ${isUsed ? 'bg-gray-700 border-gray-600' : 'bg-amber-400 border-amber-400'}`}
                            title={isUsed ? 'Recuperar espaço' : 'Gastar espaço'}
                          />
                        )
                      })}
                    </div>
                    <span className="text-xs text-gray-500">{max - used}/{max}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {classIndex && !isSpellcaster && (
          <p className="text-xs text-gray-500">{classData?.name ?? classIndex} não possui conjuração.</p>
        )}
        {!classIndex && (
          <p className="text-xs text-gray-500">Selecione uma classe para ver espaços de magia.</p>
        )}
      </div>

      {/* Magias da ficha agrupadas por nível */}
      {[0, 1,2,3,4,5,6,7,8,9].map(lvl => {
        const group = mySpells.filter(s => s.level === lvl)
        if (group.length === 0) return null
        const label = lvl === 0 ? 'Truques' : `Nível ${lvl}`
        return (
          <div key={lvl} className="bg-gray-800 border border-gray-600 rounded-lg p-4">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">
              {label}
              <span className="ml-2 text-gray-500 font-normal normal-case text-xs">{group.length}</span>
            </h3>
            <div className="space-y-2">
              {group.map(spell => (
                <SpellRow
                  key={spell.id}
                  spell={spell}
                  onDetail={() => setDetailSpell(spell)}
                  onRemove={() => onRemoveSpell(spell.id)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Botão para abrir picker */}
      {isSpellcaster && (
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          className="w-full py-2.5 rounded-lg border-2 border-dashed border-gray-600 hover:border-amber-600 text-gray-500 hover:text-amber-400 text-sm font-medium transition-colors"
        >
          {pickerOpen ? '− Fechar catálogo' : '+ Adicionar magia'}
        </button>
      )}

      {/* Picker integrado */}
      {pickerOpen && isSpellcaster && (
        <SpellPicker
          tabs={availableTabs}
          activeTab={activeTab}
          onTabChange={t => { setActiveTab(t); setSearch('') }}
          search={search}
          onSearch={setSearch}
          spells={filteredPicker}
          mySpellIds={mySpellIds}
          onAdd={addSpell}
          onDetail={setDetailSpell}
          classIndex={classIndex}
          cantripsLimit={cantripsLimit}
          spellsLimit={spellsLimit}
          spellsLabel={spellsLabel}
          myCantripsCount={myCantrips.length}
          myLeveledCount={myLeveled.length}
        />
      )}

      {/* Modal de detalhes da magia */}
      {detailSpell && <SpellDetailModal spell={detailSpell} onClose={() => setDetailSpell(null)} />}
    </div>
  )
}

function SpellRow({ spell, onDetail, onRemove }) {
  const schoolAbbr = SCHOOL_ABBR[(spell.school || '').toLowerCase()] || (spell.school || '').slice(0, 3)
  return (
    <div className="bg-gray-900 rounded-lg flex items-center gap-2 px-3 py-2 hover:bg-gray-800 transition-colors">
      <button
        onClick={onDetail}
        className="text-sm font-medium text-white flex-1 text-left hover:text-amber-300 transition-colors"
      >
        {spell.name}
      </button>
      <div className="flex items-center gap-1.5 text-xs flex-shrink-0">
        {spell.ritual && <span className="text-green-400" title="Ritual">📿</span>}
        {spell.concentration && <span className="text-blue-400" title="Concentração">⊙</span>}
        <span className="text-gray-600">{schoolAbbr}</span>
        <span className="text-gray-600 text-[10px]">{spell.castingTime || ''}</span>
      </div>
      <button
        onClick={onDetail}
        className="text-gray-600 hover:text-amber-400 text-xs px-1 transition-colors flex-shrink-0"
        title="Ver descrição"
      >
        ℹ
      </button>
      <button
        onClick={onRemove}
        className="text-red-500 hover:text-red-400 text-lg leading-none flex-shrink-0"
      >
        ×
      </button>
    </div>
  )
}

function SpellPicker({ tabs, activeTab, onTabChange, search, onSearch, spells, mySpellIds, onAdd, onDetail, cantripsLimit, spellsLimit, spellsLabel, myCantripsCount, myLeveledCount }) {
  const atCantripLimit = cantripsLimit != null && myCantripsCount >= cantripsLimit && activeTab === 0
  const atSpellLimit   = spellsLimit   != null && myLeveledCount >= spellsLimit   && activeTab > 0

  return (
    <div className="bg-gray-800 border border-amber-700/40 rounded-lg overflow-hidden">
      {/* Abas por nível */}
      <div className="flex overflow-x-auto border-b border-gray-700 bg-gray-900">
        {tabs.map(lvl => (
          <button
            key={lvl}
            onClick={() => onTabChange(lvl)}
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
          onChange={e => onSearch(e.target.value)}
          placeholder="Buscar magia..."
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-600"
        />
        {(atCantripLimit || atSpellLimit) && (
          <p className="text-xs text-amber-500 mt-1.5">
            ⚠ Limite atingido {activeTab === 0
              ? `(${myCantripsCount}/${cantripsLimit} truques)`
              : `(${myLeveledCount}/${spellsLimit} ${spellsLabel?.toLowerCase() ?? 'magias'})`}
            . Remova uma magia para adicionar outra.
          </p>
        )}
      </div>

      {/* Lista de magias */}
      <div className="max-h-72 overflow-y-auto divide-y divide-gray-700/50">
        {spells.length === 0 && (
          <p className="text-xs text-gray-600 p-4 text-center">Nenhuma magia encontrada.</p>
        )}
        {spells.map(spell => {
          const alreadyHas = mySpellIds.has(spell.index)
          const blocked    = !alreadyHas && (atCantripLimit || atSpellLimit)
          const schoolAbbr = SCHOOL_ABBR[(spell.school || '').toLowerCase()] || ''
          return (
            <div
              key={spell.index}
              className={`flex items-center gap-2 px-3 py-2 transition-colors ${alreadyHas ? 'opacity-40' : blocked ? 'opacity-50' : 'hover:bg-gray-700/50'}`}
            >
              {/* Nome clicável → abre descrição */}
              <div className="flex-1 min-w-0">
                <button
                  onClick={() => onDetail(spell)}
                  className="text-left w-full"
                >
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-white hover:text-amber-300 transition-colors">{spell.name}</span>
                    {spell.ritual && <span className="text-green-400 text-xs" title="Ritual">📿</span>}
                    {spell.concentration && <span className="text-blue-400 text-xs" title="Concentração">⊙</span>}
                    <span className="text-xs text-gray-500">{schoolAbbr}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">{spell.casting_time} · {spell.range}</div>
                </button>
              </div>
              {/* Botão info */}
              <button
                onClick={() => onDetail(spell)}
                className="flex-shrink-0 text-gray-600 hover:text-amber-400 text-xs px-1 transition-colors"
                title="Ver descrição"
              >
                ℹ
              </button>
              {/* Botão adicionar */}
              <button
                onClick={() => !alreadyHas && !blocked && onAdd(spell)}
                disabled={alreadyHas || blocked}
                className={`flex-shrink-0 text-xs px-2 py-1 rounded font-bold transition-colors ${
                  alreadyHas
                    ? 'text-gray-600 cursor-default'
                    : blocked
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-amber-400 hover:text-amber-300 hover:bg-amber-900/30'
                }`}
              >
                {alreadyHas ? '✓' : '+'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

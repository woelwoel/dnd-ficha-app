import { useState, useEffect } from 'react'
import { SrdSearchModal } from '../SrdSearchModal'
import { formatModifier, calculateSpellSaveDC, calculateSpellAttackBonus, getProficiencyBonus } from '../../utils/calculations'

// Mapeia nome completo PT-BR do atributo para a chave usada no estado
const SPELL_ABILITY_PT_TO_KEY = {
  'Inteligência': 'int', 'Sabedoria': 'wis', 'Carisma': 'cha',
}
// Abreviações PT-BR para exibição
const KEY_TO_ABBR_PT = { int: 'INT', wis: 'SAB', cha: 'CAR', str: 'FOR', dex: 'DES', con: 'CON' }
// Mapeia índice PT-BR da classe para o índice inglês usado no 5e-SRD-Levels.json
const PT_CLASS_TO_EN = {
  barbaro: 'barbarian', bardo: 'bard', bruxo: 'warlock', clerigo: 'cleric',
  druida: 'druid', feiticeiro: 'sorcerer', guerreiro: 'fighter', ladino: 'rogue',
  mago: 'wizard', monge: 'monk', paladino: 'paladin', patrulheiro: 'ranger',
}

const SCHOOL_ABBR = {
  // inglês (SRD)
  abjuration: 'Abj', conjuration: 'Con', divination: 'Div',
  enchantment: 'Enc', evocation: 'Evo', illusion: 'Ilu',
  necromancy: 'Nec', transmutation: 'Tra',
  // português (PHB-PT)
  abjuração: 'Abj', conjuração: 'Con', adivinhação: 'Adv',
  encantamento: 'Enc', evocação: 'Evo', ilusão: 'Ilu',
  necromancia: 'Nec', transmutação: 'Tra',
}

function normalizeSpell(s) {
  return {
    ...s,
    desc: Array.isArray(s.desc) ? s.desc.join(' ') : (s.desc || ''),
    higher_level: Array.isArray(s.higher_level) ? s.higher_level.join(' ') : (s.higher_level || ''),
    casting_time: s.casting_time || s.castingTime || '',
    concentration: s.concentration || (typeof s.duration === 'string' && s.duration.toLowerCase().includes('concentra')),
  }
}

export function Spells({ character, attributes, level, classData, onUpdateSpellcasting, onAddSpell, onRemoveSpell, onToggleSlot }) {
  const [srdSpells, setSrdSpells] = useState([])
  const [levelSlots, setLevelSlots] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [expandedSpell, setExpandedSpell] = useState(null)

  const classIndex    = character.info?.class || ''
  // Atributo de magia vem da classe (via classData) — armazenado no estado pelo handleClassChange
  const classAbility  = classData?.spellcasting_ability
    ? (SPELL_ABILITY_PT_TO_KEY[classData.spellcasting_ability] ?? null)
    : null
  const isSpellcaster = classAbility !== null
  const spellAbility  = character.spellcasting.ability ?? classAbility

  const profBonus = getProficiencyBonus(level)
  const abilityScore = spellAbility ? attributes[spellAbility] : 10
  const spellSaveDC = calculateSpellSaveDC(abilityScore, profBonus)
  const spellAttack = calculateSpellAttackBonus(abilityScore, profBonus)

  // Carregar magias PHB-PT (primário) com fallback para SRD inglês
  useEffect(() => {
    fetch('/srd-data/phb-spells-pt.json')
      .then(r => r.json())
      .then(data => setSrdSpells(data.map(normalizeSpell)))
      .catch(() => {
        // fallback para SRD em inglês
        fetch('/srd-data/5e-SRD-Spells.json')
          .then(r => r.json())
          .then(data => setSrdSpells(data.map(normalizeSpell)))
          .catch(() => {})
      })
  }, [])

  // Load spell slots for this class+level from SRD (usa índice inglês para busca)
  const classIndexEn = PT_CLASS_TO_EN[classIndex] ?? classIndex
  useEffect(() => {
    if (!classIndexEn) return
    fetch('/srd-data/5e-SRD-Levels.json')
      .then(r => r.json())
      .then(data => {
        const entry = data.find(l => l.class?.index === classIndexEn && l.level === level)
        if (entry?.spellcasting) setLevelSlots(entry.spellcasting)
        else setLevelSlots(null)
      })
      .catch(() => {})
  }, [classIndexEn, level])

  const usedSlots = character.spellcasting.usedSlots || {}
  const spells = character.spellcasting.spells || []
  const cantrips = spells.filter(s => s.level === 0)
  const knownSpells = spells.filter(s => s.level > 0)

  // Spell slots available this level
  const slotLevels = levelSlots
    ? [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(l => (levelSlots[`spell_slots_level_${l}`] || 0) > 0)
    : []

  return (
    <div className="space-y-4">
      {/* Spellcasting stats */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">Conjuração</h3>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="flex flex-col items-center bg-gray-900 rounded p-2">
            <span className="text-xs text-gray-400 mb-1">CD de Magia</span>
            <span className="text-xl font-bold text-white">{spellAbility ? spellSaveDC : '—'}</span>
          </div>
          <div className="flex flex-col items-center bg-gray-900 rounded p-2">
            <span className="text-xs text-gray-400 mb-1">Ataque</span>
            <span className="text-xl font-bold text-white">{spellAbility ? formatModifier(spellAttack) : '—'}</span>
          </div>
          <div className="flex flex-col items-center bg-gray-900 rounded p-2">
            <span className="text-xs text-gray-400 mb-1">Atributo</span>
            <span className="text-white font-bold text-xl leading-none mt-0.5">
              {spellAbility ? KEY_TO_ABBR_PT[spellAbility] : '—'}
            </span>
            {classData?.spellcasting_ability && (
              <span className="text-[10px] text-gray-600 mt-0.5 leading-none">{classData.spellcasting_ability}</span>
            )}
          </div>
        </div>

        {/* Slot tracker */}
        {slotLevels.length > 0 ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Espaços de Magia</span>
              <button
                onClick={() => onUpdateSpellcasting('usedSlots', {})}
                className="text-xs text-amber-600 hover:text-amber-400"
              >
                Descanso Longo
              </button>
            </div>
            <div className="space-y-1.5">
              {slotLevels.map(sl => {
                const max = levelSlots[`spell_slots_level_${sl}`]
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
                            className={`w-5 h-5 rounded-full border-2 transition-colors ${
                              isUsed
                                ? 'bg-gray-700 border-gray-600'
                                : 'bg-amber-400 border-amber-400'
                            }`}
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
        ) : classIndex && !isSpellcaster ? (
          <p className="text-xs text-gray-500">
            {classData?.name ?? classIndex} não possui conjuração.
          </p>
        ) : !classIndex ? (
          <p className="text-xs text-gray-500">Selecione uma classe na aba Ficha para ver os espaços.</p>
        ) : null}
      </div>

      {/* Cantrips */}
      <SpellGroup
        title="Truques"
        spells={cantrips}
        expandedSpell={expandedSpell}
        onExpand={setExpandedSpell}
        onRemove={onRemoveSpell}
      />

      {/* Known spells */}
      <SpellGroup
        title="Magias Conhecidas"
        spells={knownSpells}
        expandedSpell={expandedSpell}
        onExpand={setExpandedSpell}
        onRemove={onRemoveSpell}
      />

      {/* Add spell button */}
      <button
        onClick={() => setSearchOpen(true)}
        className="w-full py-2.5 rounded-lg border-2 border-dashed border-gray-600 hover:border-amber-600 text-gray-500 hover:text-amber-400 text-sm font-medium transition-colors"
      >
        + Adicionar magia do SRD
      </button>

      {/* SRD spell search modal */}
      <SrdSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        title="Buscar Magia (SRD)"
        items={srdSpells}
        onSelect={spell => onAddSpell({
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
          source: spell.source || 'SRD',
        })}
        renderItem={spell => (
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-white">{spell.name}</span>
              <span className="text-xs text-gray-500">
                {spell.level === 0 ? 'Truque' : `Nível ${spell.level}`}
              </span>
              {spell.ritual && <span className="text-xs text-green-400">Ritual</span>}
              {spell.concentration && <span className="text-xs text-blue-400">Conc.</span>}
              {spell.source === 'PHB-PT' && (
                <span className="text-xs text-amber-600">PHB</span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {spell.school?.name || spell.school} · {spell.casting_time} · {spell.range}
            </div>
          </div>
        )}
      />
    </div>
  )
}

function SpellGroup({ title, spells, expandedSpell, onExpand, onRemove }) {
  if (spells.length === 0) return null

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
      <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">
        {title}
        <span className="ml-2 text-gray-500 font-normal normal-case text-xs">
          {spells.length} magia{spells.length !== 1 ? 's' : ''}
        </span>
      </h3>
      <div className="space-y-2">
        {spells.map(spell => (
          <div key={spell.id} className="bg-gray-900 rounded-lg overflow-hidden">
            <div
              className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-800 transition-colors"
              onClick={() => onExpand(expandedSpell === spell.id ? null : spell.id)}
            >
              <span className="text-sm font-medium text-white flex-1">{spell.name}</span>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                {spell.school && (
                  <span className="text-gray-500">{SCHOOL_ABBR[spell.school.toLowerCase()] || spell.school.slice(0, 3)}</span>
                )}
                {spell.concentration && <span className="text-blue-400">C</span>}
                <span className="text-gray-600">{expandedSpell === spell.id ? '▲' : '▼'}</span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); onRemove(spell.id) }}
                className="text-red-500 hover:text-red-400 text-lg leading-none ml-1"
              >
                ×
              </button>
            </div>
            {expandedSpell === spell.id && (
              <div className="px-3 pb-3 text-xs text-gray-300 space-y-1 border-t border-gray-700 pt-2">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-400 mb-2">
                  {spell.castingTime && <span>Tempo: <span className="text-gray-300">{spell.castingTime}</span></span>}
                  {spell.range && <span>Alcance: <span className="text-gray-300">{spell.range}</span></span>}
                  {spell.duration && <span>Duração: <span className="text-gray-300">{spell.duration}</span></span>}
                  {spell.components && <span>Comp.: <span className="text-gray-300">{spell.components}</span></span>}
                </div>
                {spell.desc && <p className="leading-relaxed">{spell.desc.slice(0, 300)}{spell.desc.length > 300 ? '…' : ''}</p>}
                {spell.higherLevel && (
                  <p className="text-gray-400 italic">Em nível maior: {spell.higherLevel.slice(0, 200)}{spell.higherLevel.length > 200 ? '…' : ''}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

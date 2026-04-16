// Passo 7 — Magias (apenas para conjuradores)
import { SPELL_ABILITY_PT_TO_KEY, getProficiencyBonus, getModifier, formatModifier, calculateSpellSaveDC, calculateSpellAttackBonus } from '../../../utils/calculations'

const KEY_TO_ABBR = { int: 'INT', wis: 'SAB', cha: 'CAR' }
const KEY_TO_NAME = { int: 'Inteligência', wis: 'Sabedoria', cha: 'Carisma' }

export function Step7Spells({ draft, classData }) {
  const spellAbilityKey = draft.spellcastingAbility
    ?? SPELL_ABILITY_PT_TO_KEY[classData?.spellcasting_ability]

  // Atributos finais (base + racial)
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

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-amber-400 mb-1">Magias</h2>
        <p className="text-sm text-gray-400">
          Seu personagem é um conjurador. Veja os stats de magia calculados.
        </p>
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
            <p className="text-[11px] text-gray-600">8 + prof + mod</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-3 text-center">
            <p className="text-[11px] text-gray-500 mb-1">Ataque de Magia</p>
            <p className="text-lg font-bold text-amber-300">{spellAttackBonus !== null ? formatModifier(spellAttackBonus) : '—'}</p>
            <p className="text-[11px] text-gray-600">prof + mod</p>
          </div>
        </div>
      )}

      {/* Slots */}
      {classData && (
        <SpellSlotsPreview classData={classData} level={draft.level} />
      )}

      {/* Aviso sobre configuração completa */}
      <div className="bg-blue-900/20 border border-blue-700/40 rounded-lg p-4 text-sm text-blue-300">
        <p className="font-semibold mb-1">Configuração completa na ficha</p>
        <p className="text-blue-400 text-xs leading-relaxed">
          Após criar o personagem, use a aba <strong>Magias</strong> para adicionar truques,
          magias conhecidas e gerenciar slots durante o jogo.
        </p>
      </div>
    </div>
  )
}

function SpellSlotsPreview({ classData, level }) {
  // Tenta ler slots do classData (pre-calculados) para o nível atual
  const progression = classData?.spell_slot_progression
  if (!progression) return null

  const slots = progression[level] ?? progression[String(level)]
  if (!slots) return null

  const slotEntries = Object.entries(slots).filter(([, v]) => v > 0)
  if (slotEntries.length === 0) return null

  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">Espaços de magia no nível {level}:</p>
      <div className="flex flex-wrap gap-2">
        {slotEntries.map(([lvl, count]) => (
          <div key={lvl} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-center">
            <span className="text-gray-400">Nível {lvl}: </span>
            <span className="text-amber-300 font-bold">{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

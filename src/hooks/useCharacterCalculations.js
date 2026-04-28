import { useMemo } from 'react'
import {
  getModifier,
  formatModifier,
  getProficiencyBonus,
  calculateSpellSaveDC,
  calculateSpellAttackBonus,
  calculatePassivePerception,
  calculateInitiative,
} from '../utils/calculations'
import { calculateMaxHpMulticlass, listSpellcastingClasses } from '../domain/rules'
import { calculateArmorClass, getEquippedArmor } from '../domain/equipment'
import { keyFromAbbr } from '../domain/attributes'
import {
  getSpellSlots,
  clampUsedSlots,
  clampPactSlotsUsed,
  getClassSpellMath,
  getWarlockPactSlots,
} from '../utils/spellcasting'

/**
 * Hook de cálculos reativos da ficha.
 *
 * Consome as APIs refatoradas (CA com avisos, slots unificados single/multi,
 * matemática por classe para multiclasse híbrida, feats Alert/Observant).
 *
 * @param {object} character - objeto completo do personagem
 * @param {object|null} classData - dados da classe primária do SRD
 * @param {object} classDataMap - mapa classIndex → classData (para multiclasse)
 * @returns {object} valores derivados memoizados
 */
export function useCharacterCalculations(character, classData = null, classDataMap = {}) {
  const { attributes, info, spellcasting, proficiencies, combat, inventory } = character

  const level             = info?.level ?? 1
  const multiclasses      = info?.multiclasses
  const classIndex        = info?.class ?? ''
  const feats             = info?.feats
  const spellAbilityLabel = spellcasting?.ability ?? null
  const usedSlots         = spellcasting?.usedSlots
  const pactSlotsUsed     = spellcasting?.pactSlotsUsed ?? 0
  const saves             = proficiencies?.savingThrows
  const skills            = proficiencies?.skills
  const expertiseSkills   = proficiencies?.expertiseSkills
  const armorProfs        = proficiencies?.armor
  const currentHp         = combat?.currentHp ?? 0
  const maxHp             = combat?.maxHp ?? 0
  const items             = inventory?.items
  const { str = 10, dex = 10, con = 10, int: intel = 10, wis = 10, cha = 10 } = attributes ?? {}

  return useMemo(() => {
    const mcs = multiclasses ?? []
    const totalLevel = level + mcs.reduce((s, m) => s + (m.level ?? 0), 0)
    const profBonus = getProficiencyBonus(totalLevel)

    const mods = {
      str: getModifier(str),
      dex: getModifier(dex),
      con: getModifier(con),
      int: getModifier(intel),
      wis: getModifier(wis),
      cha: getModifier(cha),
    }

    // CA sugerida (PHB p.144–145) — agora retorna objeto rico com avisos.
    const { armor, hasShield } = getEquippedArmor(items)
    const acResult = calculateArmorClass({
      mods,
      attributes,
      classIndex,
      armor,
      hasShield,
      armorProficiencies: armorProfs ?? [],
    })
    const suggestedAC   = acResult.ac
    const acWarnings    = acResult.warnings
    const speedPenalty  = acResult.speedPenalty
    const acNoProf      = acResult.noProficiency

    // HP sugerido: multiclasse correto quando há multiclasses
    const fullClassMap = classData
      ? { ...classDataMap, [classIndex]: classData }
      : classDataMap
    const suggestedMaxHp = classData
      ? calculateMaxHpMulticlass(character, fullClassMap)
      : null

    // Iniciativa com Alert (+5) via feats.
    const initiative = calculateInitiative(dex, { feats })

    // Atributo de magia (compat: classe primária)
    const spellAbilityKey = spellAbilityLabel ? keyFromAbbr(spellAbilityLabel) : null
    const spellScore = spellAbilityKey ? (attributes?.[spellAbilityKey] ?? 10) : 10

    const spellSaveDC = spellAbilityKey
      ? calculateSpellSaveDC(spellScore, profBonus)
      : null

    const spellAttackBonus = spellAbilityKey
      ? calculateSpellAttackBonus(spellScore, profBonus)
      : null

    // Slots unificados (single ou multiclasse) — sempre passa pelo mesmo caminho.
    // `getSpellSlots` espera (primaryClass, primaryLevel, multiclasses) e
    // devolve null para single-class não-conjurador / só-bruxo.
    const maxSlots = getSpellSlots(classIndex, level, mcs) ?? {}
    const safeUsedSlots = clampUsedSlots(usedSlots ?? {}, maxSlots)

    // Pact Magic (Bruxo) — slots separados; precisa do nível de bruxo agregado.
    const warlockLevel =
      (classIndex === 'bruxo' ? level : 0) +
      mcs.filter(m => m?.class === 'bruxo')
         .reduce((s, m) => s + (m.level ?? 0), 0)
    const pactSlots = warlockLevel > 0 ? getWarlockPactSlots(warlockLevel) : null
    const safePactUsed = clampPactSlotsUsed(pactSlotsUsed, warlockLevel)

    // Matemática de magia por classe (DC/ataque por classe em multiclasse híbrida).
    const spellcastingClasses = listSpellcastingClasses(character) ?? []
    const spellMathByClass = {}
    for (const cls of spellcastingClasses) {
      spellMathByClass[cls] = getClassSpellMath(cls, profBonus, attributes)
    }

    const savingThrows = {}
    for (const key of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
      const isProficient = saves?.includes(key) ?? false
      savingThrows[key] = mods[key] + (isProficient ? profBonus : 0)
    }

    const isPerceptionProficient = skills?.includes('perception') ?? false
    const isPerceptionExpert     = expertiseSkills?.includes('perception') ?? false
    const passivePerception = calculatePassivePerception(
      wis, profBonus, isPerceptionProficient, isPerceptionExpert, { feats }
    )

    const hpPercent = maxHp > 0
      ? Math.min(100, Math.round((currentHp / maxHp) * 100))
      : 0

    const hpColor = hpPercent > 50 ? '#22c55e' : hpPercent > 25 ? '#f59e0b' : '#ef4444'

    // Talento Mobilidade: +10ft de velocidade (PHB p.168)
    const hasMobilidade = (feats ?? []).some(f => f.index === 'mobilidade')
    const featSpeedBonus = hasMobilidade ? 10 : 0

    return {
      profBonus,
      mods,
      suggestedAC,
      acWarnings,
      speedPenalty,
      acNoProficiency: acNoProf,
      suggestedMaxHp,
      featSpeedBonus,
      initiative,
      spellSaveDC,
      spellAttackBonus,
      spellMathByClass,
      maxSlots,
      safeUsedSlots,
      pactSlots,
      safePactUsed,
      savingThrows,
      passivePerception,
      hpPercent,
      hpColor,
      spellAbilityKey,
      fmt: formatModifier,
    }
  }, [
    // NOTA: `attributes` e `character` estão aqui para compatibilidade com o
    // React Compiler (que faz análise de dependências). Os primitivos
    // str/dex/con/intel/wis/cha cobrem `attributes` conceitualmente.
    character, attributes,
    level, multiclasses, classIndex, feats,
    str, dex, con, intel, wis, cha,
    spellAbilityLabel, usedSlots, pactSlotsUsed,
    saves, skills, expertiseSkills, armorProfs,
    currentHp, maxHp, classData, classDataMap,
    // inventory.items muda a CA sugerida (armadura/escudo equipados).
    items,
  ])
}

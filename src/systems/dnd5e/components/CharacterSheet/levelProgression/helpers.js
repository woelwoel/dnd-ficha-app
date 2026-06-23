// src/components/CharacterSheet/levelProgression/helpers.js
// Helpers puros do fluxo de level-up. Mantidos fora dos componentes para
// permitir testes unitários e reutilização.

export function isASIEntry(entry) {
  return entry?.features?.some(f => f.name?.includes('Aumento') || f.name?.includes('Melhoria'))
}

export function calcHpAverage(hitDie, conMod) {
  return Math.max(1, Math.floor(hitDie / 2) + 1 + conMod)
}

export function calcHpMax(hitDie, conMod) {
  return Math.max(1, hitDie + conMod)
}

export function rollDie(sides) {
  return Math.ceil(Math.random() * sides)
}

/**
 * Features "reais" de um entry — exclui ASI/Melhoria, que têm tratamento próprio.
 */
export function realFeaturesOf(entry) {
  return (entry?.features ?? []).filter(
    f => !f.name?.includes('Aumento') && !f.name?.includes('Melhoria'),
  )
}

/**
 * Detecta nova categoria de magia (slot que passou de 0→>0 vs nível anterior).
 * Retorna o nível da magia (1–9) ou null.
 */
export function newSpellTierOf(entry, prevEntry) {
  if (!entry?.spell_slots || !prevEntry?.spell_slots) return null
  for (let idx = 0; idx < entry.spell_slots.length; idx++) {
    const before = prevEntry.spell_slots[idx] ?? 0
    const after  = entry.spell_slots[idx] ?? 0
    if (before === 0 && after > 0) return idx + 1
  }
  return null
}

/**
 * Um nível é "marcante" se ganha feature, ASI, ou nova categoria de magia.
 * Subir de PV ou de proficiência sozinho NÃO é marcante — é automático.
 * Usado pra filtrar a lista de "O que vem por aí".
 */
export function isMilestoneLevel(entry, prevEntry) {
  if (!entry) return false
  if (isASIEntry(entry)) return true
  if (realFeaturesOf(entry).length > 0) return true
  if (newSpellTierOf(entry, prevEntry) != null) return true
  return false
}

/**
 * Próximo marco relevante após o nível atual.
 * Retorna { level, kind, label } ou null se já está no nível 20.
 *  kind ∈ 'asi' | 'feature' | 'spell-tier' | 'multi'
 */
export function getNextMilestone(currentLevel, levels) {
  if (!levels?.length) return null
  for (let i = 0; i < levels.length; i++) {
    const entry = levels[i]
    if (entry.level <= currentLevel) continue
    if (entry.level > 20) break

    const isASI = isASIEntry(entry)
    const realFeatures = realFeaturesOf(entry)
    const prev = levels[i - 1]
    const newSpellTier = newSpellTierOf(entry, prev)

    if (isASI || realFeatures.length > 0 || newSpellTier != null) {
      const parts = []
      if (isASI) parts.push('Aumento de Habilidade')
      realFeatures.forEach(f => parts.push(f.name))
      if (newSpellTier != null) parts.push(`Magias de ${newSpellTier}º nível`)
      const kind = parts.length > 1 ? 'multi'
                 : isASI            ? 'asi'
                 : newSpellTier     ? 'spell-tier'
                 : 'feature'
      return { level: entry.level, kind, label: parts.join(' · ') }
    }
  }
  return null
}

/**
 * Dado entry com spell_slots, retorna array { level, count } só dos slots > 0.
 */
export function formatSlotsCompact(entry) {
  const slots = entry?.spell_slots
  if (!slots?.length || !slots.some(s => s > 0)) return null
  let lastNonZero = -1
  for (let i = slots.length - 1; i >= 0; i--) {
    if (slots[i] > 0) { lastNonZero = i; break }
  }
  if (lastNonZero < 0) return null
  return slots.slice(0, lastNonZero + 1)
    .map((n, i) => ({ level: i + 1, count: n }))
    .filter(s => s.count > 0)
}

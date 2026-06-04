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
 * Tiers de jogo D&D 5e (não-oficiais mas convencionais).
 * Dão ritmo narrativo à progressão — jogador entende onde está
 * na curva épica sem precisar memorizar os 20 níveis.
 *
 * Ref: DMG p.36 (Tiers of Play), PHB p.15.
 */
export const TIERS = [
  { id: 1, label: 'Aventureiros locais',  range: [1,  4],  roman: 'I'   },
  { id: 2, label: 'Heróis do reino',      range: [5,  10], roman: 'II'  },
  { id: 3, label: 'Mestres do reino',     range: [11, 16], roman: 'III' },
  { id: 4, label: 'Mestres do mundo',     range: [17, 20], roman: 'IV'  },
]

export function getTierForLevel(level) {
  return TIERS.find(t => level >= t.range[0] && level <= t.range[1]) ?? TIERS[0]
}

/**
 * Próxima "conquista" relevante após o nível atual. Considera:
 *  - features novas (nome de feature qualquer)
 *  - ASI / Talento (entry.features inclui Aumento de Habilidade)
 *  - nova categoria de magia (entry.spell_slots ganha um slot num nv novo)
 *
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
    // Filtra features que não são ASI (ASI tem label próprio)
    const realFeatures = (entry.features ?? []).filter(
      f => !f.name?.includes('Aumento') && !f.name?.includes('Melhoria'),
    )

    // Novo tier de magia: comparamos contra o nível anterior. Se algum
    // slot[idx] passou de 0 → >0, ganha categoria de magia nova.
    const prev = levels[i - 1]
    const newSpellTier = (() => {
      if (!entry.spell_slots || !prev?.spell_slots) return null
      for (let idx = 0; idx < entry.spell_slots.length; idx++) {
        const before = prev.spell_slots[idx] ?? 0
        const after  = entry.spell_slots[idx] ?? 0
        if (before === 0 && after > 0) return idx + 1 // nível da magia
      }
      return null
    })()

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
 * Dado entry com spell_slots, retorna texto resumido tipo "4/2/—/—/…"
 * pros 9 níveis de magia. Filtra zeros à direita pra ficar conciso.
 */
export function formatSlotsCompact(entry) {
  const slots = entry?.spell_slots
  if (!slots?.length || !slots.some(s => s > 0)) return null
  // Pega só até o último não-zero
  let lastNonZero = -1
  for (let i = slots.length - 1; i >= 0; i--) {
    if (slots[i] > 0) { lastNonZero = i; break }
  }
  if (lastNonZero < 0) return null
  return slots.slice(0, lastNonZero + 1)
    .map((n, i) => ({ level: i + 1, count: n }))
    .filter(s => s.count > 0)
}

/**
 * Categoriza entry pelo que ganha visualmente:
 *  - 'asi'         → Aumento de Habilidade
 *  - 'feature'     → feature de classe/subclasse
 *  - 'spell-tier'  → primeiro nível com slots de uma categoria nova
 *  - 'empty'       → nada que valha menção (Prof bonus não conta)
 */
export function categorizeLevel(entry, prevEntry) {
  if (!entry) return 'empty'
  const isASI = isASIEntry(entry)
  const realFeatures = (entry.features ?? []).filter(
    f => !f.name?.includes('Aumento') && !f.name?.includes('Melhoria'),
  )
  let newSpellTier = false
  if (entry.spell_slots && prevEntry?.spell_slots) {
    for (let idx = 0; idx < entry.spell_slots.length; idx++) {
      const before = prevEntry.spell_slots[idx] ?? 0
      const after  = entry.spell_slots[idx] ?? 0
      if (before === 0 && after > 0) { newSpellTier = true; break }
    }
  }
  if (realFeatures.length > 0) return 'feature'
  if (isASI) return 'asi'
  if (newSpellTier) return 'spell-tier'
  return 'empty'
}

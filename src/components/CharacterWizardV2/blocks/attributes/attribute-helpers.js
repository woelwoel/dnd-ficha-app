// src/components/CharacterWizardV2/blocks/attributes/attribute-helpers.js
import { STANDARD_ARRAY } from '../../../../utils/calculations'

export function rollFourD6Drop() {
  const dice = Array.from({ length: 4 }, () => Math.ceil(Math.random() * 6))
  return dice.reduce((a, b) => a + b, 0) - Math.min(...dice)
}

export function rollFourD6DropSix() {
  return Array.from({ length: 6 }, () => rollFourD6Drop())
}

export function finalScore(base, racialBonus) {
  return base > 0 ? base + (racialBonus ?? 0) : 0
}

export function availableStandardArray(baseAttrs, currentKey) {
  const otherUsed = Object.entries(baseAttrs)
    .filter(([k]) => k !== currentKey)
    .map(([, v]) => v)
    .filter(v => v > 0)
  return STANDARD_ARRAY.filter(v => !otherUsed.includes(v))
}

export function availableRolled(rolled, baseAttrs, currentKey) {
  const pool = [...rolled]
  for (const [k, v] of Object.entries(baseAttrs)) {
    if (k !== currentKey && v > 0) {
      const idx = pool.indexOf(v)
      if (idx !== -1) pool.splice(idx, 1)
    }
  }
  return pool
}

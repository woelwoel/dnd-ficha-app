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

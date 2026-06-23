// src/systems/dnd5e/core.js
// Adaptador FINO entre o contrato System e o domínio D&D existente.
// As entranhas (domain/*) não conhecem este arquivo — só ele conhece o contrato.
import { safeParseCharacter, migrateCharacter } from './domain/characterSchema'

export const id = 'dnd5e'
export const name = 'D&D 5e'

/** Carimba o sistema num seed de ficha. O Wizard monta o resto. */
export function createCharacter(seed = {}) {
  return { ...seed, system: id }
}

export function parseCharacter(raw) {
  return safeParseCharacter(raw)
}

export function migrate(raw) {
  return migrateCharacter(raw)
}

/** Resumo agnóstico pra a CharacterList renderizar sem conhecer regras de D&D. */
export function summarize(character) {
  const info = character?.info ?? {}
  return {
    title: info.name || 'Sem nome',
    subtitle: [info.race, info.class].filter(Boolean).join(' · ') || '—',
    badges: info.level != null ? [`Nv ${info.level}`] : [],
    icon: info.class ?? null, // chave usada pelo ClassIcon
  }
}

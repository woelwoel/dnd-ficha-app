// src/systems/index.js
import * as dnd5e from './dnd5e/core'

// Registry de módulos `core` (lógica pura, sem React). Síncrono e leve — pode
// ser importado pelo storage.js sem arrastar a árvore React.
// Adicionar um sistema = importar seu core e adicionar uma entrada aqui.
const CORES = {
  [dnd5e.id]: dnd5e,
}

export function getSystemCore(id) {
  return CORES[id] ?? null
}

export function listSystems() {
  return Object.values(CORES).map(c => ({ id: c.id, name: c.name }))
}

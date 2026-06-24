// src/systems/ui-registry.js
import { lazyWithReload } from '../utils/lazyWithReload'

// Loaders dinâmicos do módulo `ui` de cada sistema (Wizard/Sheet/DataProvider
// são pesados → lazy). Adicionar sistema = uma entrada aqui.
const UI_LOADERS = {
  dnd5e: () => import('./dnd5e/ui'),
}

// Memoiza os React.lazy por (sistema, parte) — lazy precisa ser estável entre
// renders, senão remonta a árvore a cada render.
const cache = new Map()

function getLazy(systemId, key) {
  const loader = UI_LOADERS[systemId]
  if (!loader) return null
  const cacheKey = `${systemId}:${key}`
  if (cache.has(cacheKey)) return cache.get(cacheKey)
  const Comp = lazyWithReload(() => loader().then(m => ({ default: m[key] })))
  cache.set(cacheKey, Comp)
  return Comp
}

export const getLazyWizard = (systemId) => getLazy(systemId, 'Wizard')
export const getLazySheet = (systemId) => getLazy(systemId, 'Sheet')

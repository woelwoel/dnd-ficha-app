/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

/**
 * Cache de módulo para datasets SRD. Persiste entre remounts e tabs do
 * mesmo document. Cada promise é iniciada só uma vez por chave.
 */
const moduleCache = new Map()

const DATASETS = {
  races:           { pt: 'phb-races-pt.json',            fallback: '5e-SRD-Races.json',       lazy: false },
  classes:         { pt: 'phb-classes-pt.json',          fallback: '5e-SRD-Classes.json',     lazy: false },
  backgrounds:     { pt: 'phb-backgrounds-pt.json',      fallback: '5e-SRD-Backgrounds.json', lazy: false },
  spells:          { pt: 'phb-spells-pt.json',           fallback: null,                      lazy: false },
  levels:          { pt: '5e-SRD-Levels.json',           fallback: null,                      lazy: false },
  progression:     { pt: 'phb-class-progression-pt.json', fallback: null,                     lazy: false },
  classChoices:    { pt: 'phb-class-choices-pt.json',    fallback: null,                      lazy: false },
  // Lazy: só são acessados em telas específicas (Wizard, level-up flow).
  // Carregados sob demanda via `requestDataset(name)` ou `useLazySrdDataset(name)`.
  classEquipment:  { pt: 'phb-class-equipment-pt.json',  fallback: null,                      lazy: true },
  weaponsArmor:    { pt: 'phb-weapons-pt.json',          fallback: null,                      lazy: true },
  multiclass:      { pt: 'phb-multiclass-pt.json',       fallback: null,                      lazy: true },
  feats:           { pt: 'phb-feats-pt.json',            fallback: null,                      lazy: true },
}

function loadDataset(name, { pt, fallback }) {
  if (moduleCache.has(name)) return moduleCache.get(name)
  // Sem AbortController: SW pode cancelar em transições; queremos que essas
  // promises terminem normalmente e populem o cache. Resultados vazios NÃO são
  // cacheados (próxima chamada retenta).
  const promise = fetch(`/srd-data/${pt}`)
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .catch(() =>
      fallback
        ? fetch(`/srd-data/${fallback}`).then(r => (r.ok ? r.json() : []))
        : []
    )
    .catch(() => [])
    .then(data => {
      // Não cacheia resultado vazio — assim, em caso de aborto/falha, próximo
      // mount tem chance de buscar de novo.
      const isEmpty = Array.isArray(data) ? data.length === 0
        : data && typeof data === 'object' ? Object.keys(data).length === 0
        : true
      if (isEmpty) moduleCache.delete(name)
      return data
    })
  moduleCache.set(name, promise)
  return promise
}

const EMPTY_DEFAULTS = {
  races: [], classes: [], backgrounds: [], spells: [], levels: [],
  progression: {}, classChoices: {}, classEquipment: {}, weaponsArmor: {}, multiclass: {}, feats: [],
}

const SrdContext = createContext(null)

export function SrdProvider({ children }) {
  const [data, setData] = useState(() => ({ ...EMPTY_DEFAULTS, ready: false }))

  // Carrega o core (não-lazy) e libera `ready` assim que todos terminam.
  useEffect(() => {
    let cancelled = false

    const coreEntries = Object.entries(DATASETS).filter(([, def]) => !def.lazy)
    Promise.all(
      coreEntries.map(async ([name, def]) => [name, await loadDataset(name, def)])
    ).then(entries => {
      if (cancelled) return
      setData(prev => ({ ...prev, ...Object.fromEntries(entries), ready: true }))
    })

    return () => { cancelled = true }
  }, [])

  // Permite que telas específicas (Wizard, level-up) puxem datasets sob demanda.
  const requestDataset = useCallback((name) => {
    const def = DATASETS[name]
    if (!def) return Promise.resolve(null)
    // Se já está em memória local (não é o default vazio), retorna.
    // Caso contrário, dispara o fetch e popula state quando chegar.
    return loadDataset(name, def).then(value => {
      setData(prev => {
        // Não sobrescreve se o valor atual já tem conteúdo (evita re-render à toa).
        const current = prev[name]
        if (current === value) return prev
        return { ...prev, [name]: value }
      })
      return value
    })
  }, [])

  return (
    <SrdContext.Provider value={{ ...data, requestDataset }}>
      {children}
    </SrdContext.Provider>
  )
}

export function useSrd() {
  const ctx = useContext(SrdContext)
  if (ctx == null) throw new Error('useSrd deve estar dentro de <SrdProvider>')
  return ctx
}

/** Hook derivado: mapa classIndex → classData para O(1) lookups. */
export function useClassDataMap() {
  const { classes } = useSrd()
  return Object.fromEntries((classes ?? []).map(c => [c.index, c]))
}

/**
 * Dispara o carregamento de um dataset lazy e devolve o valor atual.
 * Antes do fetch terminar, retorna o default vazio do dataset
 * (array ou objeto). Usar em telas específicas, evitando pagar o
 * custo de carregar tudo no boot.
 */
export function useLazySrdDataset(name) {
  const ctx = useSrd()
  const { requestDataset } = ctx
  useEffect(() => {
    requestDataset(name)
  }, [name, requestDataset])
  return ctx[name]
}

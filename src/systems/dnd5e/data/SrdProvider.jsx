/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { tagSource } from '../domain/sources'
import { mergeClassChoices } from '../domain/mergeClassChoices'

/**
 * Cache de módulo para datasets SRD. Persiste entre remounts e tabs do
 * mesmo document. Cada promise é iniciada só uma vez por chave.
 */
const moduleCache = new Map()

const DATASETS = {
  races:             { pt: 'phb-races-pt.json',            fallback: '5e-SRD-Races.json',       lazy: false },
  classes:           { pt: 'phb-classes-pt.json',          fallback: '5e-SRD-Classes.json',     lazy: false },
  classesTasha:      { pt: 'tasha-classes-pt.json',        fallback: null,                      lazy: false },
  backgrounds:       { pt: 'phb-backgrounds-pt.json',      fallback: '5e-SRD-Backgrounds.json', lazy: false },
  spells:            { pt: 'phb-spells-pt.json',           fallback: null,                      lazy: false },
  spellsTasha:       { pt: 'tasha-spells-pt.json',         fallback: null,                      lazy: false },
  spellsXanathar:    { pt: 'xanathar-spells-pt.json',      fallback: null,                      lazy: false },
  levels:            { pt: '5e-SRD-Levels.json',           fallback: null,                      lazy: false },
  progression:       { pt: 'phb-class-progression-pt.json', fallback: null,                     lazy: false },
  progressionTasha:  { pt: 'tasha-class-progression-pt.json', fallback: null,                    lazy: false },
  classChoices:      { pt: 'phb-class-choices-pt.json',    fallback: null,                      lazy: false },
  classChoicesTasha: { pt: 'tasha-class-choices-pt.json',  fallback: null,                      lazy: false },
  classChoicesXanathar: { pt: 'xanathar-class-choices-pt.json', fallback: null,                 lazy: false },
  // Lazy: só são acessados em telas específicas (Wizard, level-up flow).
  // Carregados sob demanda via `requestDataset(name)` ou `useLazySrdDataset(name)`.
  classEquipment:  { pt: 'phb-class-equipment-pt.json',  fallback: null,                      lazy: true },
  weaponsArmor:    { pt: 'phb-weapons-pt.json',          fallback: null,                      lazy: true },
  multiclass:      { pt: 'phb-multiclass-pt.json',       fallback: null,                      lazy: true },
  feats:           { pt: 'phb-feats-pt.json',            fallback: null,                      lazy: true },
  featsTasha:      { pt: 'tasha-feats-pt.json',          fallback: null,                      lazy: true },
  featsXanathar:   { pt: 'xanathar-feats-pt.json',       fallback: null,                      lazy: true },
  infusionsTasha:  { pt: 'tasha-infusions-pt.json',      fallback: null,                      lazy: true },
  magicItems:      { pt: 'phb-magic-items-pt.json',      fallback: null,                      lazy: true },
  magicItemsTasha: { pt: 'tasha-magic-items-pt.json',    fallback: null,                      lazy: true },
  magicItemsXanathar: { pt: 'xanathar-magic-items-pt.json', fallback: null,                   lazy: true },
  spellMechanics:  { pt: 'spell-mechanics-pt.json',      fallback: null,                      lazy: true },
}

// Datasets lógicos compostos por partes carimbadas por fonte.
// chave lógica → { strategy: 'array' (concat + tagSource) | 'object' (merge raso por chave), parts: [[parteKey, sourceCode], ...] }
const COMPOSED = {
  feats:        { strategy: 'array',  parts: [['feats', 'phb'], ['featsTasha', 'tasha'], ['featsXanathar', 'xanathar']] },
  classes:      { strategy: 'array',  parts: [['classes', 'phb'], ['classesTasha', 'tasha']] },
  spells:       { strategy: 'array',  parts: [['spells', 'phb'], ['spellsTasha', 'tasha'], ['spellsXanathar', 'xanathar']] },
  classChoices: { strategy: 'classChoices', parts: [['classChoices', 'phb'], ['classChoicesTasha', 'tasha'], ['classChoicesXanathar', 'xanathar']] },
  progression:  { strategy: 'object', parts: [['progression', 'phb'], ['progressionTasha', 'tasha']] },
  infusions:    { strategy: 'array',  parts: [['infusionsTasha', 'tasha']] },
  magicItems:   { strategy: 'array',  parts: [['magicItems', 'phb'], ['magicItemsTasha', 'tasha'], ['magicItemsXanathar', 'xanathar']] },
}

// Chaves lógicas não-lazy carregadas no boot. Partes de composição (ex.:
// classesTasha, progressionTasha) não entram aqui — são puxadas internamente
// por `loadComposed` e nunca expostas como chave de state própria.
const CORE_LOGICAL = ['races', 'classes', 'backgrounds', 'spells', 'levels', 'progression', 'classChoices']

async function loadComposed(name) {
  const def = COMPOSED[name]
  if (!def) return null
  const loaded = await Promise.all(
    def.parts.map(async ([key, code]) => [code, await loadDataset(key, DATASETS[key])])
  )
  if (def.strategy === 'array') {
    return loaded.flatMap(([code, data]) => tagSource(Array.isArray(data) ? data : [], code))
  }
  if (def.strategy === 'classChoices') {
    // Base (1ª parte, phb) + suplementos encadeados na ordem das parts.
    const [[, base], ...rest] = loaded
    return rest.reduce((acc, [code, data]) => mergeClassChoices(acc, data, code), base ?? {})
  }
  return Object.assign({}, ...loaded.map(([, data]) => (data && typeof data === 'object' && !Array.isArray(data) ? data : {})))
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
  infusions: [], magicItems: [], spellMechanics: {},
}

const SrdContext = createContext(null)

export function SrdProvider({ children }) {
  const [data, setData] = useState(() => ({ ...EMPTY_DEFAULTS, ready: false }))

  // Carrega o core (não-lazy) e libera `ready` assim que todos terminam.
  // Chaves LÓGICAS: partes de composição (ex.: classesTasha) não entram aqui
  // como chave de state própria — só o resultado composto (ex.: classes).
  useEffect(() => {
    let cancelled = false

    Promise.all(
      CORE_LOGICAL.map(async (name) => {
        const value = COMPOSED[name] ? await loadComposed(name) : await loadDataset(name, DATASETS[name])
        return [name, value]
      })
    ).then(entries => {
      if (cancelled) return
      setData(prev => ({ ...prev, ...Object.fromEntries(entries), ready: true }))
    })

    return () => { cancelled = true }
  }, [])

  // Permite que telas específicas (Wizard, level-up) puxem datasets sob demanda.
  const requestDataset = useCallback((name) => {
    if (COMPOSED[name]) {
      return loadComposed(name).then(value => {
        setData(prev => {
          const current = prev[name]
          if (current === value) return prev
          return { ...prev, [name]: value }
        })
        return value
      })
    }
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

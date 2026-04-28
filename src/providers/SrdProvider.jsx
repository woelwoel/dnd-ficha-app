/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'

/**
 * Cache de módulo para datasets SRD. Persiste entre remounts e tabs do
 * mesmo document. Cada promise é iniciada só uma vez por chave.
 */
const moduleCache = new Map()

const DATASETS = {
  races:        { pt: 'phb-races-pt.json',                 fallback: '5e-SRD-Races.json' },
  classes:      { pt: 'phb-classes-pt.json',               fallback: '5e-SRD-Classes.json' },
  backgrounds:  { pt: 'phb-backgrounds-pt.json',           fallback: '5e-SRD-Backgrounds.json' },
  spells:       { pt: 'phb-spells-pt.json',                fallback: null },
  levels:       { pt: '5e-SRD-Levels.json',                fallback: null },
  progression:  { pt: 'phb-class-progression-pt.json',     fallback: null },
  classChoices:    { pt: 'phb-class-choices-pt.json',       fallback: null },
  classEquipment:  { pt: 'phb-class-equipment-pt.json',    fallback: null },
  multiclass:      { pt: 'phb-multiclass-pt.json',         fallback: null },
  feats:           { pt: 'phb-feats-pt.json',              fallback: null },
}

function loadDataset(name, { pt, fallback }, signal) {
  if (moduleCache.has(name)) return moduleCache.get(name)
  const promise = fetch(`/srd-data/${pt}`, { signal })
    .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
    .catch(() =>
      fallback
        ? fetch(`/srd-data/${fallback}`, { signal }).then(r => (r.ok ? r.json() : []))
        : []
    )
    .catch(() => [])
  moduleCache.set(name, promise)
  return promise
}

const SrdContext = createContext(null)

export function SrdProvider({ children }) {
  const [data, setData] = useState(() => ({
    races: [], classes: [], backgrounds: [], spells: [], levels: [],
    progression: {}, classChoices: {}, classEquipment: {}, multiclass: {}, feats: [],
    ready: false,
  }))

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false

    Promise.all(
      Object.entries(DATASETS).map(async ([name, def]) => [
        name,
        await loadDataset(name, def, controller.signal),
      ])
    ).then(entries => {
      if (cancelled) return
      setData({ ...Object.fromEntries(entries), ready: true })
    })

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [])

  return <SrdContext.Provider value={data}>{children}</SrdContext.Provider>
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

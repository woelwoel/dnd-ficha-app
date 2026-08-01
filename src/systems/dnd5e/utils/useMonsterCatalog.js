import { useEffect, useMemo, useState } from 'react'
import { useLazySrdDataset } from '../data/SrdProvider'
import { useLanguage } from '../../../utils/useLanguage'
import { indexOverrides, mergeMonster } from './monsters-i18n'

/**
 * Catálogo de monstros já no idioma escolhido, indexado por `index`.
 *
 * O `BestiaryModal` faz a mesma junção com fetch próprio; aqui a base vem do
 * dataset preguiçoso do provider (que a tela de encontros já pede) e só os
 * overrides PT são buscados à parte — são ~60 KB contra 1,3 MB da base.
 *
 * `loading` distingue "ainda chegando" de "chegou vazio": o provider inicia o
 * dataset como `[]`, então comprimento zero sozinho não diz nada.
 */
export function useMonsterCatalog() {
  const base = useLazySrdDataset('monsters')
  const { lang } = useLanguage()
  const [overrides, setOverrides] = useState(null)

  useEffect(() => {
    if (lang !== 'pt' || overrides !== null) return
    const ctrl = new AbortController()
    fetch('/srd-data/5e-SRD-Monsters-pt.json', { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => setOverrides(indexOverrides(data)))
      .catch(err => {
        if (err.name === 'AbortError') return
        console.error('Falha ao carregar traduções PT do bestiário:', err)
        setOverrides(new Map())
      })
    return () => ctrl.abort()
  }, [lang, overrides])

  const byIndex = useMemo(() => {
    const m = new Map()
    const traduz = lang === 'pt' && overrides && overrides.size > 0
    for (const mon of base ?? []) {
      m.set(mon.index, traduz ? mergeMonster(mon, overrides.get(mon.index)) : mon)
    }
    return m
  }, [base, overrides, lang])

  return { byIndex, loading: (base ?? []).length === 0 }
}

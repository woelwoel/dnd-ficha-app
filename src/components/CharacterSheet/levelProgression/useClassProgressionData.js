// src/components/CharacterSheet/levelProgression/useClassProgressionData.js
// Hook que carrega as 3 fontes de dados JSON necessárias para a progressão
// de classes: progressões 1-20, escolhas de feature por nível e regras de
// multiclasse (pré-requisitos + proficiências ganhas).
import { useState, useEffect } from 'react'

export function useClassProgressionData() {
  const [allProgressions, setAllProgressions] = useState(null)
  const [classChoices,    setClassChoices]    = useState({})
  const [mcRules,         setMcRules]         = useState({})

  useEffect(() => {
    const ctrl = new AbortController()
    const handle = (label, setter, fallback) => err => {
      if (err.name === 'AbortError') return
      console.error(`Falha ao carregar ${label}:`, err)
      setter(fallback)
    }
    fetch('/srd-data/phb-class-progression-pt.json', { signal: ctrl.signal })
      .then(r => r.json()).then(setAllProgressions).catch(handle('progressão', setAllProgressions, {}))
    fetch('/srd-data/phb-class-choices-pt.json', { signal: ctrl.signal })
      .then(r => r.json()).then(setClassChoices).catch(handle('escolhas de classe', setClassChoices, {}))
    fetch('/srd-data/phb-multiclass-pt.json', { signal: ctrl.signal })
      .then(r => r.json()).then(setMcRules).catch(handle('regras de multiclasse', setMcRules, {}))
    return () => ctrl.abort()
  }, [])

  return { allProgressions, classChoices, mcRules }
}

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
    fetch('/srd-data/phb-class-progression-pt.json')
      .then(r => r.json()).then(setAllProgressions).catch(() => setAllProgressions({}))
    fetch('/srd-data/phb-class-choices-pt.json')
      .then(r => r.json()).then(setClassChoices).catch(() => setClassChoices({}))
    fetch('/srd-data/phb-multiclass-pt.json')
      .then(r => r.json()).then(setMcRules).catch(() => setMcRules({}))
  }, [])

  return { allProgressions, classChoices, mcRules }
}

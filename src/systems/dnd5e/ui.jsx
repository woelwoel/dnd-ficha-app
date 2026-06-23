// src/systems/dnd5e/ui.jsx
// UI do sistema D&D 5e. Cada superfície self-wrap no SrdProvider (o provider de
// dados de D&D), pra que a casca não precise carregar dados de D&D na raiz.
import { SrdProvider } from './data/SrdProvider'
import { CharacterWizardV2 } from './components/CharacterWizardV2'
import { CharacterSheet as RawSheet } from './components/CharacterSheet/CharacterSheet'

export function Wizard(props) {
  return (
    <SrdProvider>
      <CharacterWizardV2 {...props} />
    </SrdProvider>
  )
}

export function Sheet(props) {
  return (
    <SrdProvider>
      <RawSheet {...props} />
    </SrdProvider>
  )
}

export { SrdProvider as DataProvider }

// src/systems/dnd5e/ui.jsx
// UI do sistema D&D 5e. Cada superfície self-wrap no SrdProvider (o provider de
// dados de D&D), pra que a casca não precise carregar dados de D&D na raiz.
import { SrdProvider } from './data/SrdProvider'
import { CharacterWizardV2 } from './components/CharacterWizardV2'
import { CharacterSheet as RawSheet } from './components/CharacterSheet/CharacterSheet'
import { BestiaryButton } from './components/Bestiary/BestiaryButton'

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

/** Widgets globais do sistema, montados pela casca fora de Wizard/Sheet
 *  (via getLazyGlobalWidgets do ui-registry). O cache do SrdProvider é de
 *  módulo, então não há refetch duplicado com as outras superfícies. */
export function GlobalWidgets() {
  return (
    <SrdProvider>
      <BestiaryButton />
    </SrdProvider>
  )
}

export { SrdProvider as DataProvider }

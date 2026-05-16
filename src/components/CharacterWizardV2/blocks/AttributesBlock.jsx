// src/components/CharacterWizardV2/blocks/AttributesBlock.jsx
import { StandardArrayUI } from './attributes/StandardArrayUI'
import { PointBuyUI } from './attributes/PointBuyUI'
import { ManualUI } from './attributes/ManualUI'
import { FourD6UI } from './attributes/FourD6UI'

export function AttributesBlock({ draft, updateDraft }) {
  const method = draft.settings?.abilityScoreMethod ?? 'standard-array'
  const sharedProps = { draft, updateDraft }

  return (
    <div className="flex flex-col gap-4">
      {method === 'standard-array' && <StandardArrayUI {...sharedProps} />}
      {method === 'point-buy' && <PointBuyUI {...sharedProps} />}
      {method === 'manual' && <ManualUI {...sharedProps} />}
      {(method === 'roll' || method === '4d6drop') && <FourD6UI {...sharedProps} />}
    </div>
  )
}

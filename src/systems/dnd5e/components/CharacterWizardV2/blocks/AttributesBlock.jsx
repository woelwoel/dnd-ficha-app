// src/components/CharacterWizardV2/blocks/AttributesBlock.jsx
import { StandardArrayUI } from './attributes/StandardArrayUI'
import { PointBuyUI } from './attributes/PointBuyUI'
import { ManualUI } from './attributes/ManualUI'
import { FourD6UI } from './attributes/FourD6UI'
import {
  totalAttributes, meetsPrereqs, formatPrereqs,
} from './class/multiclass-helpers'

function MulticlassPrereqWarning({ draft, multiclassData, classes }) {
  const mcs = draft.multiclasses ?? []
  if (mcs.length === 0 || !multiclassData) return null
  const attrs = totalAttributes(draft)
  const failing = mcs
    .map(mc => ({
      name: classes.find(c => c.index === mc.class)?.name ?? mc.class,
      prereqs: multiclassData[mc.class]?.prerequisites,
    }))
    .filter(({ prereqs }) => prereqs && !meetsPrereqs(prereqs, attrs))
  if (failing.length === 0) return null
  return (
    <div className="border-2 border-amber-700 bg-amber-50 rounded-sm px-3 py-2 text-xs text-amber-700">
      ⚠ Multiclasse(s) sem pré-requisito atendido:
      <ul className="mt-1 ml-4 list-disc">
        {failing.map((f, i) => (
          <li key={i}>
            <span className="font-display">{f.name}</span> — requer {formatPrereqs(f.prereqs)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AttributesBlock({ draft, updateDraft, multiclassData = {}, classes = [] }) {
  const method = draft.settings?.abilityScoreMethod ?? 'standard-array'
  const sharedProps = { draft, updateDraft }

  return (
    <div className="flex flex-col gap-4">
      <MulticlassPrereqWarning draft={draft} multiclassData={multiclassData} classes={classes} />
      {method === 'standard-array' && <StandardArrayUI {...sharedProps} />}
      {method === 'point-buy' && <PointBuyUI {...sharedProps} />}
      {method === 'manual' && <ManualUI {...sharedProps} />}
      {(method === 'roll' || method === '4d6drop') && <FourD6UI {...sharedProps} />}
    </div>
  )
}

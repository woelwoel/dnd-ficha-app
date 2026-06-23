// src/components/CharacterWizardV2/blocks/class/EquipmentChoiceGroup.jsx
import { WeaponPicker } from './WeaponPicker'

export function EquipmentChoiceGroup({ choice, selected, picks, weaponsArmor, onSelectOption, onPick }) {
  return (
    <fieldset className={[
      'border-2 rounded-sm p-3 flex flex-col gap-2',
      selected ? 'border-emerald-700 bg-emerald-50/30' : 'border-amber-700 bg-amber-50/30',
    ].join(' ')}>
      <legend className="px-2 text-[13px] font-display tracking-widest uppercase text-ink-500">
        {choice.prompt}{!selected && <span className="text-red-700 ml-1">*</span>}
      </legend>

      <div className="flex flex-col gap-1.5">
        {choice.options.map(opt => {
          const isSelected = selected === opt.value
          return (
            <div key={opt.value}>
              <button
                type="button"
                aria-label={`Opção: ${opt.label}`}
                onClick={() => onSelectOption(choice.id, opt.value)}
                className={[
                  'w-full flex items-start gap-2 text-left px-3 py-2 rounded-sm border-2 text-xs transition-colors',
                  isSelected
                    ? 'border-ink-500 bg-parchment-200 text-ink-500'
                    : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
                ].join(' ')}
              >
                <span className={[
                  'w-3 h-3 rounded-full border-2 shrink-0 mt-0.5',
                  isSelected ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
                ].join(' ')} />
                <span className="flex-1 flex flex-col gap-0.5">
                  <span className="font-display">{opt.label}</span>
                  <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {opt.items.map((item, idx) => (
                      <span key={idx} className="text-xs text-ink-200 italic">
                        {item.pick
                          ? <>📌 {item.pickLabel ?? item.name} (à escolher)</>
                          : <>{item.qty > 1 ? `${item.qty}× ` : ''}{item.name}{item.desc && ` · ${item.desc}`}</>
                        }
                      </span>
                    ))}
                  </span>
                </span>
              </button>

              {isSelected && opt.items.map((item, itemIdx) => {
                if (!item.pick) return null
                const pickKey = `${choice.id}:${opt.value}:${itemIdx}`
                const pickedValue = picks?.[pickKey] ?? ''
                return (
                  <div key={`pick-${itemIdx}`} className="mt-1.5 ml-5">
                    <p className="text-xs font-display text-ink-500 mb-1">
                      📌 {item.pickLabel ?? item.name}
                      {!pickedValue && <span className="text-red-700 ml-1">*</span>}
                      {pickedValue && <span className="text-emerald-700 ml-2">→ {pickedValue}</span>}
                    </p>
                    <WeaponPicker
                      category={item.pick}
                      pickKey={pickKey}
                      currentValue={pickedValue}
                      weaponsArmor={weaponsArmor}
                      onPick={onPick}
                    />
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}

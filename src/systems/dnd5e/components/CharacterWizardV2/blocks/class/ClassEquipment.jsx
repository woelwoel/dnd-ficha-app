import { EquipmentChoiceGroup } from './EquipmentChoiceGroup'
import { WeaponPicker } from './WeaponPicker'
import {
  rollGoldFormula, allPicksDone, computePreviewItems,
} from './equipment-helpers'

export function ClassEquipment({ draft, updateDraft, selectedClass, classEquipmentData, weaponsArmor }) {
  const isEquipment = (draft.classEquipmentChoice ?? 'equipment') !== 'gold'
  const choices = draft.classEquipmentChoices ?? {}
  const picks = draft.classEquipmentPicks ?? {}

  function setOptionChoice(choiceId, value) {
    const newPicks = { ...picks }
    Object.keys(newPicks).forEach(k => { if (k.startsWith(`${choiceId}:`)) delete newPicks[k] })
    updateDraft({
      classEquipmentChoices: { ...choices, [choiceId]: value },
      classEquipmentPicks: newPicks,
    })
  }

  function setPick(pickKey, weaponName) {
    updateDraft({ classEquipmentPicks: { ...picks, [pickKey]: weaponName } })
  }

  const totalChoices = classEquipmentData?.choices?.length ?? 0
  const doneChoices = (classEquipmentData?.choices ?? []).filter(c => !!choices[c.id]).length
  const picksOk = allPicksDone(classEquipmentData, choices, picks)
  const allDone = doneChoices === totalChoices && picksOk
  const preview = isEquipment ? computePreviewItems(classEquipmentData, choices, picks) : []

  const bgItems = draft.backgroundItems ?? []
  const bgGold = draft.backgroundGold ?? 0

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-display tracking-widest uppercase text-ink-500">Equipamento Inicial</p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => updateDraft({ classEquipmentChoice: 'equipment', classStartingGold: 0 })}
          className={[
            'flex-1 px-3 py-2 text-xs rounded-sm border-2 font-display tracking-wide transition-colors',
            isEquipment
              ? 'bg-parchment-200 border-ink-500 text-ink-500'
              : 'bg-parchment-50 border-parchment-600 text-ink-300 hover:border-ink-300',
          ].join(' ')}
        >
          🎒 Equipamento da Classe
        </button>
        <button
          type="button"
          onClick={() => updateDraft({ classEquipmentChoice: 'gold' })}
          className={[
            'flex-1 px-3 py-2 text-xs rounded-sm border-2 font-display tracking-wide transition-colors',
            !isEquipment
              ? 'bg-parchment-200 border-ink-500 text-ink-500'
              : 'bg-parchment-50 border-parchment-600 text-ink-300 hover:border-ink-300',
          ].join(' ')}
        >
          🪙 Ouro Inicial {selectedClass?.gold_formula ? `(${selectedClass.gold_formula} PO)` : ''}
        </button>
      </div>

      {isEquipment && classEquipmentData && (
        <div className="flex flex-col gap-2">
          {totalChoices > 0 && (
            <div className={[
              'px-2 py-1 rounded-sm text-[13px] font-display border-2',
              allDone
                ? 'bg-emerald-50 border-emerald-700 text-emerald-700'
                : 'bg-amber-50 border-amber-700 text-amber-700',
            ].join(' ')}>
              {allDone ? '✓ Todas as escolhas feitas' : `⚠ ${doneChoices}/${totalChoices} escolha${totalChoices > 1 ? 's' : ''}`}
            </div>
          )}

          {(classEquipmentData.choices ?? []).map(choice => (
            <EquipmentChoiceGroup
              key={choice.id}
              choice={choice}
              selected={choices[choice.id] ?? ''}
              picks={picks}
              weaponsArmor={weaponsArmor}
              onSelectOption={setOptionChoice}
              onPick={setPick}
            />
          ))}

          {(classEquipmentData.fixed ?? []).length > 0 && (
            <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3 flex flex-col gap-2">
              <p className="text-xs font-display tracking-widest uppercase text-ink-300">Incluído automaticamente</p>
              <div className="flex flex-col gap-1.5">
                {classEquipmentData.fixed.filter(i => !i.pick).map((item, i) => (
                  <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded-sm bg-parchment-50 border border-parchment-600">
                    <span className="text-ink-300 text-[13px] mt-0.5 shrink-0">✦</span>
                    <div className="min-w-0">
                      <span className="text-xs font-display text-ink-500">
                        {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                      </span>
                      {item.desc && (
                        <p className="text-xs italic text-ink-200 mt-0.5 leading-snug">{item.desc}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {classEquipmentData.fixed.filter(i => i.pick).map((item, fixIdx) => {
                const pickKey = `fixed:${item.name}`
                const pickedValue = picks[pickKey] ?? ''
                return (
                  <div key={`fixed-pick-${fixIdx}`}>
                    <p className="text-xs font-display text-ink-500 mb-1">
                      📌 {item.pickLabel ?? item.name} (à escolher)
                      {!pickedValue && <span className="text-red-700 ml-1">*</span>}
                      {pickedValue && <span className="text-emerald-700 ml-2">→ {pickedValue}</span>}
                    </p>
                    <WeaponPicker
                      category={item.pick}
                      pickKey={pickKey}
                      currentValue={pickedValue}
                      weaponsArmor={weaponsArmor}
                      onPick={setPick}
                    />
                  </div>
                )
              })}
            </div>
          )}

          {allDone && preview.length > 0 && (
            <div className="border-2 border-parchment-600 bg-parchment-50 rounded-sm p-3">
              <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-1.5">Equipamento final</p>
              <div className="flex flex-wrap gap-1.5">
                {preview.map((item, i) => (
                  <span key={i} className="text-xs font-display bg-parchment-100 border-2 border-parchment-600 px-2 py-0.5 rounded-sm text-ink-500">
                    {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!isEquipment && (
        <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-[13px] italic text-ink-300">Fórmula de ouro inicial:</p>
            <p className="text-sm font-display text-ink-500">{selectedClass?.gold_formula ?? '5d4 × 10'} PO</p>
            {bgGold > 0 && (
              <p className="text-[13px] italic text-ink-300 mt-0.5">+{bgGold} PO do antecedente</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => updateDraft({ classStartingGold: rollGoldFormula(selectedClass?.gold_formula ?? '5d4 × 10') })}
            className="px-3 py-1.5 bg-ink-500 hover:bg-ink-600 text-parchment-50 text-xs font-display rounded-sm transition-colors"
          >
            🎲 Rolar
          </button>
          {(draft.classStartingGold ?? 0) > 0 && (
            <span className="text-ink-500 font-display text-lg">{draft.classStartingGold} PO</span>
          )}
        </div>
      )}

      {bgItems.length > 0 && (
        <div className="border-2 border-dashed border-parchment-600 bg-parchment-50 rounded-sm p-3">
          <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-1.5">Itens do antecedente</p>
          <div className="flex flex-wrap gap-1.5">
            {bgItems.map((item, i) => (
              <span key={i} className="text-xs italic bg-parchment-100 border border-parchment-600 px-2 py-0.5 rounded-sm text-ink-300">
                {item.qty > 1 ? `${item.qty}× ` : ''}{item.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

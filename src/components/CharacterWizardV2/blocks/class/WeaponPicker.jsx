// src/components/CharacterWizardV2/blocks/class/WeaponPicker.jsx
export function WeaponPicker({ category, pickKey, currentValue, weaponsArmor, onPick }) {
  const allWeapons = weaponsArmor?.weapons ?? []
  const allInstruments = weaponsArmor?.instruments ?? []

  const list = category === 'instrument'
    ? allInstruments
    : allWeapons.filter(w => {
        if (category === 'simple')  return w.category === 'simple-melee'  || w.category === 'simple-ranged'
        if (category === 'martial') return w.category === 'martial-melee' || w.category === 'martial-ranged'
        return w.category === category
      })

  if (list.length === 0) return null

  return (
    <div className="mt-2 border-2 border-parchment-600 bg-parchment-50 rounded-sm overflow-hidden">
      <div className="max-h-48 overflow-y-auto divide-y divide-parchment-600/40">
        {list.map(item => {
          const isSelected = currentValue === item.name
          const stats = item.damage
            ? `${item.damage}${item.props?.length ? ' · ' + item.props.join(', ') : ''}`
            : null
          return (
            <button
              key={item.index}
              type="button"
              onClick={() => onPick(pickKey, item.name)}
              className={[
                'w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors',
                isSelected
                  ? 'bg-parchment-200 text-ink-500'
                  : 'hover:bg-parchment-100 text-ink-300',
              ].join(' ')}
            >
              <span className={[
                'w-2.5 h-2.5 rounded-full border-2 shrink-0',
                isSelected ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
              ].join(' ')} />
              <span className="font-display flex-1">{item.name}</span>
              {stats && <span className="text-ink-200 text-[10px] shrink-0 italic">{stats}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

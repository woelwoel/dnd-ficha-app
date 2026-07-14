import { SOURCES } from '../domain/sources'

/**
 * Liga/desliga fontes de conteúdo da ficha. PHB é sempre ativo e travado.
 * value: string[] (ex.: ['phb','tasha']). onChange recebe o novo array, sempre
 * começando por 'phb'.
 */
export function SourcePicker({ value = ['phb'], onChange }) {
  const active = new Set(value)
  function toggle(code) {
    if (code === 'phb') return
    const next = new Set(active)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    onChange(['phb', ...[...next].filter(c => c !== 'phb')])
  }
  return (
    <fieldset className="source-picker flex flex-col gap-2">
      <legend className="text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
        Fontes
      </legend>
      {Object.values(SOURCES).map(s => {
        const locked = s.code === 'phb'
        const checked = locked ? true : active.has(s.code)
        return (
          <label
            key={s.code}
            className={[
              'flex items-center gap-3 py-2 px-3 rounded-sm border-2 transition-all',
              locked ? 'cursor-default' : 'cursor-pointer',
              checked
                ? 'border-ink-500 bg-parchment-100'
                : 'border-parchment-600/50 hover:border-parchment-600 hover:bg-parchment-100/60',
            ].join(' ')}
          >
            <input
              type="checkbox"
              checked={checked}
              disabled={locked}
              onChange={() => toggle(s.code)}
              className="w-4 h-4 shrink-0 accent-ink-500 disabled:opacity-70"
            />
            <span className="flex-1 text-sm font-semibold font-display tracking-wide text-ink-500">
              {s.label}
            </span>
            <span className="shrink-0 text-[10px] font-display tracking-widest uppercase text-ink-300">
              {locked ? 'sempre ativo' : s.abbr}
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}

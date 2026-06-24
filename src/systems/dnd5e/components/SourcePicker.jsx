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
    <fieldset className="source-picker">
      <legend>Fontes</legend>
      {Object.values(SOURCES).map(s => (
        <label key={s.code}>
          <input
            type="checkbox"
            checked={s.code === 'phb' ? true : active.has(s.code)}
            disabled={s.code === 'phb'}
            onChange={() => toggle(s.code)}
          />
          {s.label}
        </label>
      ))}
    </fieldset>
  )
}

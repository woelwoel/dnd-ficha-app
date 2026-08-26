import { RULESETS } from '../domain/ruleset'

/**
 * Escolhe o conjunto de regras da ficha. Exclusivo e DEFINITIVO: ao contrário
 * das fontes, o ruleset não pode ser trocado depois da criação.
 *
 * value: '2014' | '2024'. onChange recebe o código escolhido.
 */
export function RulesetPicker({ value = '2014', onChange }) {
  return (
    <fieldset className="ruleset-picker flex flex-col gap-2">
      <legend className="text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
        Conjunto de regras
      </legend>
      {Object.values(RULESETS).map(r => {
        const checked = value === r.code
        return (
          <label
            key={r.code}
            className={[
              'flex items-center gap-3 py-2 px-3 rounded-sm border-2 transition-all cursor-pointer',
              checked
                ? 'border-ink-500 bg-parchment-100'
                : 'border-parchment-600/50 hover:border-parchment-600 hover:bg-parchment-100/60',
            ].join(' ')}
          >
            <input
              type="radio"
              name="ruleset"
              value={r.code}
              checked={checked}
              onChange={() => onChange(r.code)}
              aria-label={r.label}
              className="w-4 h-4 shrink-0 accent-ink-500"
            />
            <span className="flex-1 text-sm font-semibold font-display tracking-wide text-ink-500">
              {r.label}
            </span>
            <span className="shrink-0 text-[10px] font-display tracking-widest uppercase text-ink-300">
              {r.abbr}
            </span>
          </label>
        )
      })}
      <p className="text-xs ink-italic">
        A escolha é definitiva: não dá para trocar depois que a ficha existe.
      </p>
    </fieldset>
  )
}

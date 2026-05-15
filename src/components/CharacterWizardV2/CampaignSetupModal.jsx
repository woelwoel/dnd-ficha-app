import { useState } from 'react'

const METHODS = [
  { value: 'standard-array', label: 'Standard Array (15,14,13,12,10,8)' },
  { value: 'point-buy',      label: 'Point Buy (27 pontos)' },
  { value: 'manual',         label: 'Manual (digitar valores)' },
  { value: 'roll',           label: 'Rolar 4d6 e descartar menor' },
]

function clampLevel(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 1
  return Math.max(1, Math.min(20, Math.round(v)))
}

export function CampaignSetupModal({ open, onCancel, onConfirm }) {
  const [method, setMethod] = useState('standard-array')
  const [allowFeats, setAllowFeats] = useState(false)
  const [allowMulticlass, setAllowMulticlass] = useState(false)
  const [startLevel, setStartLevel] = useState(1)

  if (!open) return null

  function submit(e) {
    e.preventDefault()
    onConfirm({
      abilityScoreMethod: method,
      allowFeats,
      allowMulticlass,
      startLevel: clampLevel(startLevel),
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4">
      <form
        onSubmit={submit}
        role="dialog"
        aria-label="Configuração da Campanha"
        noValidate
        className="w-full max-w-md flex flex-col gap-5 bg-parchment-50 border-2 border-parchment-600 rounded-sm p-6"
        style={{ boxShadow: 'var(--shadow-parchment-lg)' }}
      >
        <header className="text-center">
          <p className="text-[10px] ink-italic tracking-[0.3em] uppercase mb-1">Forjar Herói</p>
          <h2 className="text-xl font-display text-ink-500 tracking-widest uppercase">
            Como vai ser essa campanha?
          </h2>
        </header>

        <fieldset>
          <legend className="text-xs font-display tracking-widest uppercase text-ink-500 mb-2">
            Método de atributos
          </legend>
          <div className="flex flex-col gap-1">
            {METHODS.map(m => (
              <label key={m.value} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="method"
                  value={m.value}
                  checked={method === m.value}
                  onChange={() => setMethod(m.value)}
                />
                {m.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowFeats}
            onChange={e => setAllowFeats(e.target.checked)}
          />
          Permitir feats no lugar de ASI
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allowMulticlass}
            onChange={e => setAllowMulticlass(e.target.checked)}
          />
          Permitir multiclasse
        </label>

        <label className="flex items-center justify-between gap-2 text-sm">
          <span>Nível inicial</span>
          <input
            type="number"
            min={1}
            max={20}
            value={startLevel}
            onChange={e => setStartLevel(e.target.value)}
            className="w-16 px-2 py-1 border-2 border-parchment-600 rounded-sm bg-parchment-50 text-ink-500 text-right"
          />
        </label>

        <div className="flex justify-end gap-3 mt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-1.5 rounded-sm border-2 border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 text-sm font-display tracking-wide"
          >Cancelar</button>
          <button
            type="submit"
            className="px-5 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 text-sm font-display tracking-wide"
          >Começar</button>
        </div>
      </form>
    </div>
  )
}

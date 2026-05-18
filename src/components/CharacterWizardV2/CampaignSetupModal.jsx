import { useState } from 'react'

const METHODS = [
  {
    value: 'standard-array',
    label: 'Standard Array',
    hint: 'Valores fixos: 15 · 14 · 13 · 12 · 10 · 8',
    desc: 'Equilibrado e rápido. Recomendado pra mesas novas.',
  },
  {
    value: 'point-buy',
    label: 'Point Buy (27 pontos)',
    hint: '27 pontos pra distribuir entre atributos',
    desc: 'Customização total dentro de limites justos.',
  },
  {
    value: 'manual',
    label: 'Manual (digitar valores)',
    hint: 'Você digita os 6 valores na mão',
    desc: 'Pra rolagens feitas fora do app ou conversão de fichas.',
  },
  {
    value: 'roll',
    label: 'Rolar 4d6 e descartar menor',
    hint: 'Sorte decide — pode gerar heróis fortes ou fracos',
    desc: 'Estilo clássico, abraça o caos.',
  },
]

function clampLevel(n) {
  const v = Number(n)
  if (!Number.isFinite(v)) return 1
  return Math.max(1, Math.min(20, Math.round(v)))
}

function levelHint(lvl) {
  const v = clampLevel(lvl)
  if (v === 1) return 'Padrão pra campanhas novas.'
  if (v <= 4) return 'Início rápido — pula a fase mais frágil.'
  if (v <= 10) return 'Subclasses já escolhidas. Várias decisões no setup.'
  return 'Herói experiente — muitas escolhas e magias pra configurar.'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/60 p-4 overflow-y-auto">
      <form
        onSubmit={submit}
        role="dialog"
        aria-label="Configuração da Campanha"
        noValidate
        className="w-full max-w-lg flex flex-col gap-5 bg-parchment-50 border-2 border-parchment-600 rounded-sm p-6 my-auto"
        style={{ boxShadow: 'var(--shadow-parchment-lg)' }}
      >
        <header className="text-center border-b border-parchment-600/40 pb-4">
          <p className="text-[10px] ink-italic tracking-[0.3em] uppercase mb-1">Forjar Herói</p>
          <h2 className="text-xl font-display text-ink-500 tracking-widest uppercase">
            Como vai ser essa campanha?
          </h2>
          <p className="text-xs ink-italic mt-2 max-w-sm mx-auto">
            Essas escolhas valem só pra este personagem. Você pode criar outros com regras diferentes.
          </p>
        </header>

        <fieldset>
          <legend className="text-xs font-display tracking-widest uppercase text-ink-500 mb-2">
            Método de atributos
          </legend>
          <div className="flex flex-col gap-2">
            {METHODS.map(m => {
              const selected = method === m.value
              return (
                <label
                  key={m.value}
                  className={[
                    'flex items-start gap-3 p-3 rounded-sm border-2 cursor-pointer transition-colors',
                    selected
                      ? 'border-ink-500 bg-parchment-100'
                      : 'border-parchment-600/60 hover:border-parchment-600 hover:bg-parchment-100/60',
                  ].join(' ')}
                >
                  <input
                    type="radio"
                    name="method"
                    value={m.value}
                    checked={selected}
                    onChange={() => setMethod(m.value)}
                    className="mt-1 shrink-0"
                  />
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-sm font-semibold text-ink-500">{m.label}</span>
                    <span className="text-xs text-ink-400 font-mono">{m.hint}</span>
                    <span className="text-xs ink-italic">{m.desc}</span>
                  </div>
                </label>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
            Regras opcionais
          </legend>

          <label
            className={[
              'flex items-start gap-3 p-3 rounded-sm border-2 cursor-pointer transition-colors',
              allowFeats
                ? 'border-ink-500 bg-parchment-100'
                : 'border-parchment-600/60 hover:border-parchment-600 hover:bg-parchment-100/60',
            ].join(' ')}
          >
            <input
              type="checkbox"
              checked={allowFeats}
              onChange={e => setAllowFeats(e.target.checked)}
              className="mt-1 shrink-0"
            />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-semibold text-ink-500">
                Permitir feats no lugar de ASI
              </span>
              <span className="text-xs ink-italic">
                Nos níveis de aumento de atributo (4, 8, 12…), você pode pegar um talento especial em vez de +2 em atributos.
              </span>
            </div>
          </label>

          <label
            className={[
              'flex items-start gap-3 p-3 rounded-sm border-2 cursor-pointer transition-colors',
              allowMulticlass
                ? 'border-ink-500 bg-parchment-100'
                : 'border-parchment-600/60 hover:border-parchment-600 hover:bg-parchment-100/60',
            ].join(' ')}
          >
            <input
              type="checkbox"
              checked={allowMulticlass}
              onChange={e => setAllowMulticlass(e.target.checked)}
              className="mt-1 shrink-0"
            />
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-semibold text-ink-500">
                Permitir multiclasse
              </span>
              <span className="text-xs ink-italic">
                Ao subir de nível, você pode pegar um nível de outra classe (com pré-requisitos de atributo).
              </span>
            </div>
          </label>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-display tracking-widest uppercase text-ink-500 mb-2">
            Nível inicial
          </legend>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={20}
              value={startLevel}
              onChange={e => setStartLevel(e.target.value)}
              aria-label="Nível inicial"
              className="w-20 px-2 py-1.5 border-2 border-parchment-600 rounded-sm bg-parchment-50 text-ink-500 text-right text-base font-display"
            />
            <span className="text-xs ink-italic flex-1">{levelHint(startLevel)}</span>
          </div>
        </fieldset>

        <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-parchment-600/40">
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

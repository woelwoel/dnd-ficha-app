import { useEffect, useState } from 'react'
import { listMyCampaigns } from '../../lib/campaigns'

const METHODS = [
  {
    value: 'standard-array',
    icon: '⚖',
    label: 'Standard Array',
    hint: '15 · 14 · 13 · 12 · 10 · 8',
    desc: 'Equilibrado e rápido. Recomendado pra mesas novas.',
  },
  {
    value: 'point-buy',
    icon: '◈',
    label: 'Point Buy (27 pontos)',
    hint: '27 pontos pra distribuir entre atributos',
    desc: 'Customização total dentro de limites justos.',
  },
  {
    value: 'manual',
    icon: '✎',
    label: 'Manual (digitar valores)',
    hint: 'Você digita os 6 valores na mão',
    desc: 'Pra rolagens feitas fora do app ou conversão de fichas.',
  },
  {
    value: 'roll',
    icon: '⚀',
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

/* ── Ornamento decorativo: ❦ entre traços ─────────────────── */
function Flourish() {
  return (
    <div className="flex items-center justify-center gap-2 text-parchment-600/70 select-none" aria-hidden>
      <span className="h-px w-12 bg-parchment-600/40" />
      <span className="text-sm">❦</span>
      <span className="h-px w-12 bg-parchment-600/40" />
    </div>
  )
}

/* ── Selo custom: ⬤ preenchido quando selecionado ─────────── */
function Seal({ selected, kind = 'radio' }) {
  return (
    <span
      aria-hidden
      className={[
        'shrink-0 mt-0.5 w-5 h-5 flex items-center justify-center border-2 rounded-full transition-all',
        selected
          ? 'border-ink-500 bg-ink-500 text-parchment-50 shadow-[0_0_0_2px_var(--color-parchment-50)_inset]'
          : 'border-parchment-600 bg-parchment-50',
      ].join(' ')}
    >
      {selected && (
        <span className="text-xs leading-none">
          {kind === 'check' ? '✓' : '●'}
        </span>
      )}
    </span>
  )
}

/* ── Card selecionável com input acessível escondido ──────── */
function SelectableCard({ selected, children, inputProps, kind = 'radio' }) {
  return (
    <label
      className={[
        'relative flex items-start gap-3 p-3 rounded-sm border-2 cursor-pointer transition-all group',
        // focus-within destaca o card quando o input nativo recebe foco
        // (Tab/setas no radio group) — restaura a affordance que
        // opacity:0 mantinha invisível.
        'focus-within:ring-2 focus-within:ring-ink-200 focus-within:ring-offset-1',
        selected
          ? 'border-ink-500 bg-parchment-100 shadow-[var(--shadow-parchment-sm)]'
          : 'border-parchment-600/50 hover:border-parchment-600 hover:bg-parchment-100/60',
      ].join(' ')}
    >
      {/* Borda lateral decorativa quando selecionado */}
      {selected && (
        <span aria-hidden className="absolute left-0 top-2 bottom-2 w-0.5 bg-ink-500 rounded-full" />
      )}
      {/* sr-only mantém o input NO FLUXO de tab/setas (radio groups
          do browser dependem dele pra navegação) mas invisível visualmente.
          Antes usávamos `opacity:0 w-0 h-0 pointer-events-none`, que
          removia ele completamente do fluxo — quebrava setas-do-teclado
          em radio groups. Acessibilidade fail apontado na audit. */}
      <input
        {...inputProps}
        className="sr-only"
      />
      <Seal selected={selected} kind={kind} />
      <div className="flex-1 min-w-0">{children}</div>
    </label>
  )
}

/**
 * Modal de onboarding do wizard.
 *
 * - Quando `showDestination` é true (criação nova sem campaignId definido),
 *   adiciona uma seção "Destino" no topo: pessoal vs mesa em que sou membro.
 *   onConfirm recebe `{ settings, campaignId }`.
 * - Quando false (compatibilidade com testes / chamadas legadas), o modal
 *   funciona como antes — só configurações, onConfirm recebe `{ settings }`.
 *
 * #19 do super review: fundir DestinationModal + CampaignSetupModal num único
 * passo, eliminando a cadeia de 2 modais consecutivos pra usuário novo.
 */
export function CampaignSetupModal({
  open,
  showDestination = false,
  onCancel,
  onConfirm,
}) {
  const [method, setMethod] = useState('standard-array')
  const [allowFeats, setAllowFeats] = useState(false)
  const [allowMulticlass, setAllowMulticlass] = useState(false)
  const [startLevel, setStartLevel] = useState(1)
  // null = pessoal; uuid = mesa. Default null (pessoal).
  const [campaignId, setCampaignId] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(showDestination)

  useEffect(() => {
    if (!showDestination) return
    let alive = true
    listMyCampaigns().then(list => {
      if (!alive) return
      setCampaigns(list)
      setLoadingCampaigns(false)
    })
    return () => { alive = false }
  }, [showDestination])

  if (!open) return null

  function submit(e) {
    e.preventDefault()
    const settings = {
      abilityScoreMethod: method,
      allowFeats,
      allowMulticlass,
      startLevel: clampLevel(startLevel),
    }
    if (showDestination) onConfirm({ settings, campaignId })
    else onConfirm(settings)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/70 p-4 overflow-y-auto backdrop-blur-sm">
      <form
        onSubmit={submit}
        role="dialog"
        aria-label="Configuração da Campanha"
        noValidate
        className="relative w-full max-w-lg flex flex-col gap-5 bg-parchment-50 border-2 border-parchment-600 rounded-sm p-7 my-auto shadow-parchment-lg setup-modal-bg"
      >
        {/* Cantos decorativos */}
        <span aria-hidden className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-parchment-600/70" />
        <span aria-hidden className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-parchment-600/70" />
        <span aria-hidden className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-parchment-600/70" />
        <span aria-hidden className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-parchment-600/70" />

        <header className="text-center">
          <p className="text-xs ink-italic tracking-[0.4em] uppercase mb-1 text-ink-300">Forjar Herói</p>
          <h2 className="text-2xl font-display text-ink-500 tracking-widest uppercase leading-tight">
            Como vai ser<br />essa campanha?
          </h2>
          <div className="mt-3"><Flourish /></div>
          <p className="text-xs ink-italic mt-3 max-w-sm mx-auto">
            Essas escolhas valem só pra este personagem. Você pode criar outros com regras diferentes.
          </p>
        </header>

        {showDestination && (
          <fieldset>
            <legend className="text-xs font-display tracking-widest uppercase text-ink-500 mb-2">
              Destino
            </legend>
            <div className="flex flex-col gap-2">
              <SelectableCard
                selected={campaignId === null}
                inputProps={{
                  type: 'radio',
                  name: 'destination',
                  value: '__personal__',
                  checked: campaignId === null,
                  onChange: () => setCampaignId(null),
                  'aria-label': 'Personagem pessoal',
                }}
              >
                <span className="block text-sm font-semibold text-ink-500 font-display tracking-wide">
                  Personagem pessoal
                </span>
                <span className="block text-xs ink-italic mt-0.5">
                  Só você vê. Pode vincular a uma mesa depois pelo botão no header da ficha.
                </span>
              </SelectableCard>
              {loadingCampaigns ? (
                <p className="text-xs ink-italic text-ink-300 pl-2">Carregando mesas…</p>
              ) : campaigns.length === 0 ? (
                <p className="text-xs ink-italic text-ink-300 pl-2">
                  Você ainda não é membro de nenhuma mesa.
                </p>
              ) : (
                campaigns.map(c => (
                  <SelectableCard
                    key={c.id}
                    selected={campaignId === c.id}
                    inputProps={{
                      type: 'radio',
                      name: 'destination',
                      value: c.id,
                      checked: campaignId === c.id,
                      onChange: () => setCampaignId(c.id),
                      'aria-label': `Mesa ${c.name}`,
                    }}
                  >
                    <span className="block text-sm font-semibold text-ink-500 font-display tracking-wide">
                      Mesa: {c.name}
                    </span>
                    <span className="block text-xs ink-italic mt-0.5">
                      {c.role === 'dm' ? 'Você é o Mestre dessa mesa.' : 'O Mestre poderá ler a ficha.'}
                    </span>
                  </SelectableCard>
                ))
              )}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend className="text-xs font-display tracking-widest uppercase text-ink-500 mb-2">
            Método de atributos
          </legend>
          <div className="flex flex-col gap-2">
            {METHODS.map(m => {
              const selected = method === m.value
              return (
                <SelectableCard
                  key={m.value}
                  selected={selected}
                  inputProps={{
                    type: 'radio',
                    name: 'method',
                    value: m.value,
                    checked: selected,
                    onChange: () => setMethod(m.value),
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden
                      className={[
                        'text-lg leading-none w-6 text-center',
                        selected ? 'text-ink-500' : 'text-parchment-600',
                      ].join(' ')}
                    >
                      {m.icon}
                    </span>
                    <span className="text-sm font-semibold text-ink-500 font-display tracking-wide">
                      {m.label}
                    </span>
                  </div>
                  <span className="block text-xs text-ink-400 font-mono mt-1 pl-8">{m.hint}</span>
                  <span className="block text-xs ink-italic mt-0.5 pl-8">{m.desc}</span>
                </SelectableCard>
              )
            })}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
            Regras opcionais
          </legend>

          <SelectableCard
            selected={allowFeats}
            kind="check"
            inputProps={{
              type: 'checkbox',
              checked: allowFeats,
              onChange: e => setAllowFeats(e.target.checked),
              'aria-label': 'Permitir feats no lugar de ASI',
            }}
          >
            <span className="block text-sm font-semibold text-ink-500 font-display tracking-wide">
              Permitir feats no lugar de ASI
            </span>
            <span className="block text-xs ink-italic mt-0.5">
              Nos níveis de aumento de atributo (4, 8, 12…), você pode pegar um talento especial em vez de +2 em atributos.
            </span>
          </SelectableCard>

          <SelectableCard
            selected={allowMulticlass}
            kind="check"
            inputProps={{
              type: 'checkbox',
              checked: allowMulticlass,
              onChange: e => setAllowMulticlass(e.target.checked),
              'aria-label': 'Permitir multiclasse',
            }}
          >
            <span className="block text-sm font-semibold text-ink-500 font-display tracking-wide">
              Permitir multiclasse
            </span>
            <span className="block text-xs ink-italic mt-0.5">
              Ao subir de nível, você pode pegar um nível de outra classe (com pré-requisitos de atributo).
            </span>
          </SelectableCard>
        </fieldset>

        <fieldset className="bg-parchment-100/60 border-2 border-parchment-600/50 rounded-sm p-3">
          <legend className="text-xs font-display tracking-widest uppercase text-ink-500 px-2">
            Nível inicial
          </legend>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setStartLevel(v => clampLevel(Number(v) - 1))}
                aria-label="Diminuir nível"
                className="w-8 h-10 rounded-sm border-2 border-parchment-600 hover:border-ink-500 hover:bg-parchment-200 text-ink-500 font-display text-lg leading-none"
              >−</button>
              <input
                type="number"
                min={1}
                max={20}
                value={startLevel}
                onChange={e => setStartLevel(e.target.value)}
                aria-label="Nível inicial"
                className="w-14 h-10 px-2 border-2 border-parchment-600 rounded-sm bg-parchment-50 text-ink-500 text-center text-xl font-display [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setStartLevel(v => clampLevel(Number(v) + 1))}
                aria-label="Aumentar nível"
                className="w-8 h-10 rounded-sm border-2 border-parchment-600 hover:border-ink-500 hover:bg-parchment-200 text-ink-500 font-display text-lg leading-none"
              >+</button>
            </div>
            <span className="text-xs ink-italic flex-1">{levelHint(startLevel)}</span>
          </div>
        </fieldset>

        <Flourish />

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-2 rounded-sm border-2 border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 text-sm font-display tracking-widest uppercase"
          >Cancelar</button>
          <button
            type="submit"
            className="px-6 py-2 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 text-sm font-display tracking-widest uppercase shadow-[var(--shadow-parchment-sm)]"
          >Começar</button>
        </div>
      </form>
    </div>
  )
}

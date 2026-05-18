// src/components/CharacterSheet/DamageModal.jsx
// Modal opcional pra aplicar dano com crítico e tipo de dano.
// O fluxo padrão (sem modal) continua sendo inline em DamageHealControls.
import { useState } from 'react'

const DAMAGE_TYPES = [
  { value: '',           label: '— Não especificado —' },
  { value: 'slashing',   label: '🗡 Cortante' },
  { value: 'piercing',   label: '🏹 Perfurante' },
  { value: 'bludgeoning',label: '🔨 Contundente' },
  { value: 'fire',       label: '🔥 Fogo' },
  { value: 'cold',       label: '❄ Frio' },
  { value: 'lightning',  label: '⚡ Elétrico' },
  { value: 'thunder',    label: '🌩 Trovejante' },
  { value: 'acid',       label: '🧪 Ácido' },
  { value: 'poison',     label: '☠ Veneno' },
  { value: 'radiant',    label: '✨ Radiante' },
  { value: 'necrotic',   label: '💀 Necrótico' },
  { value: 'psychic',    label: '🧠 Psíquico' },
  { value: 'force',      label: '💥 Força' },
]

export function DamageModal({ open, onClose, onConfirm }) {
  const [amount, setAmount]     = useState('')
  const [critical, setCritical] = useState(false)
  const [type, setType]         = useState('')

  if (!open) return null

  const num = Math.max(0, parseInt(amount, 10) || 0)
  const canSubmit = num > 0

  function handleSubmit() {
    if (!canSubmit) return
    onConfirm(num, { critical, type: type || null })
    setAmount('')
    setCritical(false)
    setType('')
    onClose()
  }

  function handleClose() {
    setAmount('')
    setCritical(false)
    setType('')
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-parchment-100 border-2 border-parchment-600 rounded-sm shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
        style={{ boxShadow: 'var(--shadow-parchment)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b-2 border-parchment-600">
          <h3 className="text-sm font-display text-ink-500 uppercase tracking-widest">
            ⚔ Aplicar Dano
          </h3>
          <button
            onClick={handleClose}
            className="text-ink-200 hover:text-ink-500 text-lg leading-none"
          >✕</button>
        </div>

        <div className="p-4 space-y-3">
          {/* Valor */}
          <div>
            <label htmlFor="damage-modal-amount" className="block text-xs text-ink-200 mb-1.5">Quantidade</label>
            <input
              id="damage-modal-amount"
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onWheel={e => e.currentTarget.blur()}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              placeholder="0"
              autoFocus
              className="w-full text-center text-xl font-bold bg-parchment-50 border border-parchment-600 rounded px-2 py-1.5 text-ink-500 focus:outline-none focus:border-ink-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          {/* Tipo de dano */}
          <div>
            <label htmlFor="damage-modal-type" className="block text-xs text-ink-200 mb-1.5">Tipo de dano</label>
            <select
              id="damage-modal-type"
              value={type}
              onChange={e => setType(e.target.value)}
              className="w-full bg-parchment-50 border border-parchment-600 rounded px-2 py-1.5 text-sm text-ink-500 focus:outline-none focus:border-ink-300"
            >
              {DAMAGE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          {/* Crítico */}
          <label className="flex items-center gap-2 cursor-pointer p-2 bg-parchment-50 border border-parchment-600 rounded hover:border-ink-300">
            <input
              type="checkbox"
              checked={critical}
              onChange={e => setCritical(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm text-ink-500">
              💥 Crítico
              <span className="ml-2 text-[10px] text-ink-200">
                (dobra falhas de morte se a 0 PV — PHB p.197)
              </span>
            </span>
          </label>
        </div>

        <div className="flex gap-2 px-4 py-3 border-t-2 border-parchment-600">
          <button
            onClick={handleClose}
            className="px-4 py-1.5 rounded-sm bg-parchment-300 hover:bg-parchment-400 border border-parchment-600 text-ink-500 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 px-4 py-1.5 rounded-sm bg-red-700 hover:bg-red-600 text-parchment-50 text-sm font-display tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ⚔ Aplicar Dano
          </button>
        </div>
      </div>
    </div>
  )
}

// src/components/CharacterSheet/DamageModal.jsx
// Modal opcional pra aplicar dano com crítico e tipo de dano.
// O fluxo padrão (sem modal) continua sendo inline em DamageHealControls.
import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Icon } from '../ui/Icon'

const DAMAGE_TYPES = [
  { value: '',           label: '— Não especificado —' },
  { value: 'slashing',   label: 'Cortante' },
  { value: 'piercing',   label: 'Perfurante' },
  { value: 'bludgeoning',label: 'Contundente' },
  { value: 'fire',       label: 'Fogo' },
  { value: 'cold',       label: 'Frio' },
  { value: 'lightning',  label: 'Elétrico' },
  { value: 'thunder',    label: 'Trovejante' },
  { value: 'acid',       label: 'Ácido' },
  { value: 'poison',     label: 'Veneno' },
  { value: 'radiant',    label: 'Radiante' },
  { value: 'necrotic',   label: 'Necrótico' },
  { value: 'psychic',    label: 'Psíquico' },
  { value: 'force',      label: 'Força' },
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
    <Modal
      open={open}
      onClose={handleClose}
      title={(
        <span className="inline-flex items-center gap-2">
          <Icon name="sword" size={16} strokeWidth={1.75} />
          <span>Aplicar Dano</span>
        </span>
      )}
      size="sm"
      footer={
        <>
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-1.5 rounded-sm border-2 border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 text-sm font-display tracking-wide"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-5 py-1.5 rounded-sm bg-red-700 hover:bg-red-600 border-2 border-red-800 text-parchment-50 text-sm font-display tracking-wide disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <Icon name="sword" size={14} strokeWidth={2} />
            Aplicar Dano
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {/* Valor */}
        <div>
          <label htmlFor="damage-modal-amount" className="block text-xs font-display tracking-widest uppercase text-ink-300 mb-1.5">
            Quantidade
          </label>
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
            className="w-full text-center text-xl font-bold bg-parchment-100 border-2 border-parchment-600 rounded-sm px-2 py-1.5 text-ink-500 focus:outline-none focus:border-ink-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>

        {/* Tipo de dano */}
        <div>
          <label htmlFor="damage-modal-type" className="block text-xs font-display tracking-widest uppercase text-ink-300 mb-1.5">
            Tipo de dano
          </label>
          <select
            id="damage-modal-type"
            value={type}
            onChange={e => setType(e.target.value)}
            className="w-full bg-parchment-100 border-2 border-parchment-600 rounded-sm px-2 py-1.5 text-sm text-ink-500 focus:outline-none focus:border-ink-300"
          >
            {DAMAGE_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Crítico */}
        <label className="flex items-center gap-2 cursor-pointer p-2 bg-parchment-100 border-2 border-parchment-600 rounded-sm hover:border-ink-300">
          <input
            type="checkbox"
            checked={critical}
            onChange={e => setCritical(e.target.checked)}
            className="w-4 h-4 accent-ink-500"
          />
          <span className="text-sm text-ink-500 inline-flex items-center gap-1.5">
            <Icon name="bolt" size={14} strokeWidth={2} className="text-amber-700" />
            Crítico
            <span className="text-xs ink-italic text-ink-300">
              (dobra falhas de morte se a 0 PV — PHB p.197)
            </span>
          </span>
        </label>
      </div>
    </Modal>
  )
}

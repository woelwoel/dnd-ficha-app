import { useState, useEffect } from 'react'
import { SrdSearchModal } from '../SrdSearchModal'

const CURRENCY_CONFIG = [
  { key: 'pp', label: 'PPl', title: 'Platina',  color: 'text-purple-300' },
  { key: 'gp', label: 'PO',  title: 'Ouro',     color: 'text-yellow-300' },
  { key: 'ep', label: 'PE',  title: 'Electro',  color: 'text-blue-300'   },
  { key: 'sp', label: 'PA',  title: 'Prata',    color: 'text-gray-300'   },
  { key: 'cp', label: 'PC',  title: 'Cobre',    color: 'text-orange-300' },
]

const EMPTY_ITEM = { name: '', qty: 1, weight: '', notes: '' }

export function Inventory({ inventory, onUpdateCurrency, onAddItem, onRemoveItem }) {
  const [newItem, setNewItem] = useState(EMPTY_ITEM)
  const [showForm, setShowForm] = useState(false)
  const [srdEquipment, setSrdEquipment] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    fetch('/srd-data/5e-SRD-Equipment.json')
      .then(r => r.json())
      .then(setSrdEquipment)
      .catch(() => {})
  }, [])

  function handleAdd() {
    if (!newItem.name.trim()) return
    onAddItem({
      name: newItem.name.trim(),
      qty: Math.max(1, parseInt(newItem.qty) || 1),
      weight: newItem.weight,
      notes: newItem.notes,
    })
    setNewItem(EMPTY_ITEM)
    setShowForm(false)
  }

  return (
    <div className="space-y-4">
      {/* Currency */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">Moedas</h3>
        <div className="flex flex-wrap gap-3">
          {CURRENCY_CONFIG.map(({ key, label, title, color }) => (
            <div key={key} className="flex flex-col items-center bg-gray-900 rounded p-2 min-w-[60px]">
              <span className={`text-xs font-bold mb-1 ${color}`}>{label}</span>
              <input
                type="number"
                min={0}
                value={inventory.currency[key]}
                onChange={e => onUpdateCurrency(key, e.target.value)}
                onWheel={e => e.currentTarget.blur()}
                title={title}
                className="w-14 text-center bg-transparent text-white text-base font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Items */}
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest">
            Itens
            <span className="ml-2 text-gray-500 font-normal normal-case text-xs">
              {inventory.items.length} item{inventory.items.length !== 1 ? 's' : ''}
            </span>
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              className="text-xs px-3 py-1 rounded bg-gray-600 hover:bg-gray-500 text-white font-semibold"
            >
              Buscar SRD
            </button>
            <button
              onClick={() => setShowForm(v => !v)}
              className="text-xs px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold"
            >
              {showForm ? 'Cancelar' : '+ Manual'}
            </button>
          </div>
        </div>

        {/* Add item form */}
        {showForm && (
          <div className="mb-3 p-3 bg-gray-900 rounded-lg space-y-2">
            <input
              type="text"
              placeholder="Nome do item *"
              value={newItem.name}
              onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
            />
            <div className="flex gap-2">
              <div className="w-24">
                <label className="text-xs text-gray-400 block mb-0.5">Qtd</label>
                <input
                  type="number"
                  min={1}
                  value={newItem.qty}
                  onChange={e => setNewItem(p => ({ ...p, qty: e.target.value }))}
                  onWheel={e => e.currentTarget.blur()}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="w-24">
                <label className="text-xs text-gray-400 block mb-0.5">Peso (lb)</label>
                <input
                  type="text"
                  placeholder="—"
                  value={newItem.weight}
                  onChange={e => setNewItem(p => ({ ...p, weight: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-400 block mb-0.5">Notas</label>
                <input
                  type="text"
                  placeholder="—"
                  value={newItem.notes}
                  onChange={e => setNewItem(p => ({ ...p, notes: e.target.value }))}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={!newItem.name.trim()}
              className="w-full py-1.5 rounded bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-sm font-semibold"
            >
              Salvar Item
            </button>
          </div>
        )}

        {/* SRD equipment search */}
        <SrdSearchModal
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          title="Buscar Equipamento (SRD)"
          items={srdEquipment}
          onSelect={eq => onAddItem({
            name: eq.name,
            qty: 1,
            weight: eq.weight ? `${eq.weight}lb` : '',
            notes: [
              eq.damage?.damage_dice ? `Dano: ${eq.damage.damage_dice}` : null,
              eq.armor_class ? `CA: ${eq.armor_class.base}` : null,
              eq.cost ? `Custo: ${eq.cost.quantity}${eq.cost.unit}` : null,
            ].filter(Boolean).join(' · '),
          })}
          renderItem={eq => (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{eq.name}</span>
                {eq.damage?.damage_dice && (
                  <span className="text-xs text-amber-400">{eq.damage.damage_dice}</span>
                )}
                {eq.armor_class && (
                  <span className="text-xs text-blue-400">CA {eq.armor_class.base}</span>
                )}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                {[
                  eq.equipment_category?.name,
                  eq.weight ? `${eq.weight} lb` : null,
                  eq.cost ? `${eq.cost.quantity}${eq.cost.unit}` : null,
                ].filter(Boolean).join(' · ')}
              </div>
            </div>
          )}
        />

        {/* Items list */}
        {inventory.items.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Nenhum item ainda.</p>
        ) : (
          <div className="space-y-1">
            {/* Header */}
            <div className="grid grid-cols-[1fr_3rem_4rem_1fr_2rem] gap-2 px-2 text-xs text-gray-500 uppercase">
              <span>Nome</span>
              <span className="text-center">Qtd</span>
              <span className="text-center">Peso</span>
              <span>Notas</span>
              <span />
            </div>
            {inventory.items.map(item => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_3rem_4rem_1fr_2rem] gap-2 items-center bg-gray-900 rounded px-2 py-1.5"
              >
                <span className="text-sm text-white truncate">{item.name}</span>
                <span className="text-sm text-gray-300 text-center">{item.qty}</span>
                <span className="text-sm text-gray-400 text-center">{item.weight || '—'}</span>
                <span className="text-xs text-gray-500 truncate">{item.notes || '—'}</span>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="text-red-500 hover:text-red-400 text-lg leading-none font-bold justify-self-center"
                  title="Remover"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { SrdSearchModal } from '../SrdSearchModal'
import { findArmorByName, ARMOR_TABLE } from '../../domain/equipment'

const CURRENCY_CONFIG = [
  { key: 'pp', label: 'PPl', title: 'Platina',  color: 'text-purple-300' },
  { key: 'gp', label: 'PO',  title: 'Ouro',     color: 'text-yellow-300' },
  { key: 'ep', label: 'PE',  title: 'Electro',  color: 'text-blue-300'   },
  { key: 'sp', label: 'PA',  title: 'Prata',    color: 'text-gray-300'   },
  { key: 'cp', label: 'PC',  title: 'Cobre',    color: 'text-orange-300' },
]

const EMPTY_ITEM = { name: '', qty: 1, weight: '', notes: '', requiresAttunement: false }

/** Parse peso de um item para número (lb). Aceita "2", "2.5", "2lb", "2 lb". */
function parseWeight(w) {
  if (!w) return 0
  const n = parseFloat(String(w).replace(/[^\d.]/g, ''))
  return isNaN(n) ? 0 : n
}

/** Calcula capacidade de carga (PHB p.176): FOR × 15 lbs */
function carryingCapacity(strScore) {
  return (strScore ?? 10) * 15
}

export function Inventory({ inventory, attributes, onUpdateCurrency, onAddItem, onRemoveItem, onUpdateItem }) {
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
    const armor = findArmorByName(newItem.name)
    onAddItem({
      name: newItem.name.trim(),
      qty: Math.max(1, parseInt(newItem.qty) || 1),
      weight: newItem.weight,
      notes: newItem.notes,
      requiresAttunement: newItem.requiresAttunement,
      attuned: false,
      ...(armor ? { armorKey: armor.key, armorType: armor.category } : {}),
    })
    setNewItem(EMPTY_ITEM)
    setShowForm(false)
  }

  // Peso total e capacidade
  const totalWeight    = inventory.items.reduce((sum, i) => sum + parseWeight(i.weight) * (i.qty || 1), 0)
  const capacity       = carryingCapacity(attributes?.str ?? 10)
  const weightPct      = Math.min(100, (totalWeight / capacity) * 100)
  const isEncumbered   = totalWeight > capacity * 0.5
  const isHeavyLoad    = totalWeight > capacity

  // Atunamento
  const attunedCount   = inventory.items.filter(i => i.attuned).length
  const MAX_ATTUNED    = 3

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

      {/* Capacidade de Carga + Atunamento */}
      <div className="grid grid-cols-2 gap-3">
        {/* Peso */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Carga</span>
            <span className={`text-xs font-mono ${isHeavyLoad ? 'text-red-400' : isEncumbered ? 'text-orange-400' : 'text-gray-400'}`}>
              {totalWeight.toFixed(1)} / {capacity} lb
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isHeavyLoad ? 'bg-red-500' : isEncumbered ? 'bg-orange-500' : 'bg-green-500'
              }`}
              style={{ width: `${weightPct}%` }}
            />
          </div>
          {isHeavyLoad && <p className="text-[10px] text-red-400">Carga excessiva — velocidade −20ft</p>}
          {isEncumbered && !isHeavyLoad && <p className="text-[10px] text-orange-400">Sobrecarregado — velocidade −10ft (opcional)</p>}
          <p className="text-[10px] text-gray-600">FOR ({attributes?.str ?? 10}) × 15 = {capacity} lb</p>
        </div>

        {/* Atunamento */}
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Atunamento</span>
            <span className={`text-xs font-mono ${attunedCount >= MAX_ATTUNED ? 'text-amber-400' : 'text-gray-400'}`}>
              {attunedCount}/{MAX_ATTUNED}
            </span>
          </div>
          <div className="flex gap-1.5 mt-1">
            {[0, 1, 2].map(i => (
              <div
                key={i}
                className={`flex-1 h-4 rounded border transition-colors ${
                  i < attunedCount
                    ? 'bg-amber-600 border-amber-500'
                    : 'bg-gray-700 border-gray-600'
                }`}
              />
            ))}
          </div>
          <p className="text-[10px] text-gray-600">Máx. 3 itens mágicos (PHB p.136)</p>
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
            <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newItem.requiresAttunement}
                onChange={e => setNewItem(p => ({ ...p, requiresAttunement: e.target.checked }))}
                className="accent-amber-400"
              />
              Requer atunamento
            </label>
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
          onSelect={eq => {
            const byName = findArmorByName(eq.name)
            const srdCategory = (eq.armor_category || '').toLowerCase()
            const armorType = srdCategory.includes('shield') || srdCategory === 'escudo'
              ? 'shield'
              : srdCategory.includes('light') || srdCategory === 'leve'
                ? 'light'
                : srdCategory.includes('medium') || srdCategory === 'média' || srdCategory === 'media'
                  ? 'medium'
                  : srdCategory.includes('heavy') || srdCategory === 'pesada'
                    ? 'heavy'
                    : (byName?.category ?? null)
            onAddItem({
              name: eq.name,
              qty: 1,
              weight: eq.weight ? `${eq.weight}lb` : '',
              notes: [
                eq.damage?.damage_dice ? `Dano: ${eq.damage.damage_dice}` : null,
                eq.armor_class ? `CA: ${eq.armor_class.base}` : null,
                eq.cost ? `Custo: ${eq.cost.quantity}${eq.cost.unit}` : null,
              ].filter(Boolean).join(' · '),
              requiresAttunement: false,
              attuned: false,
              ...(armorType ? { armorKey: byName?.key, armorType } : {}),
            })
          }}
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
            <div className="grid grid-cols-[1fr_3rem_4rem_1fr_auto_2rem] gap-2 px-2 text-xs text-gray-500 uppercase">
              <span>Nome</span>
              <span className="text-center">Qtd</span>
              <span className="text-center">Peso</span>
              <span>Notas</span>
              <span className="text-center">Atunar</span>
              <span />
            </div>
            {inventory.items.map(item => {
              const resolvedArmor = item.armorType
                ? (item.armorKey && ARMOR_TABLE[item.armorKey]
                    ? { ...ARMOR_TABLE[item.armorKey], key: item.armorKey }
                    : { category: item.armorType, type: item.armorType === 'shield' ? 'shield' : 'armor' })
                : findArmorByName(item.name)
              const isEquippable   = !!resolvedArmor
              const isEquipped     = !!item.equipped
              const canAtune       = !!item.requiresAttunement
              const isAttuned      = !!item.attuned
              const canAddAtunement = !isAttuned && attunedCount < MAX_ATTUNED

              return (
                <div
                  key={item.id}
                  className={`grid grid-cols-[1fr_3rem_4rem_1fr_auto_2rem] gap-2 items-center rounded px-2 py-1.5 ${
                    item.source === 'background' ? 'bg-amber-950/30 border border-amber-900/40' : 'bg-gray-900'
                  } ${isEquipped ? 'ring-1 ring-amber-600/50' : ''} ${isAttuned ? 'ring-1 ring-purple-600/50' : ''}`}
                >
                  <span className="text-sm text-white truncate flex items-center gap-1.5">
                    {item.source === 'background' && <span title="Item do antecedente" className="text-[10px]">🎒</span>}
                    {isAttuned && <span title="Atunado" className="text-[10px]">💎</span>}
                    {isEquippable && (
                      <button
                        onClick={() => onUpdateItem?.(item.id, { equipped: !isEquipped })}
                        title={isEquipped ? 'Desequipar' : 'Equipar (contribui para a CA)'}
                        className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                          isEquipped
                            ? 'border-amber-500 bg-amber-900/30 text-amber-300'
                            : 'border-gray-600 text-gray-500 hover:text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {isEquipped ? '✓ Equipado' : 'Equipar'}
                      </button>
                    )}
                    {isEquippable && (
                      <span className="text-[9px] text-gray-500 uppercase">
                        {resolvedArmor.type === 'shield' ? 'escudo' : resolvedArmor.category}
                      </span>
                    )}
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="text-sm text-gray-300 text-center">{item.qty}</span>
                  <span className="text-sm text-gray-400 text-center">{item.weight || '—'}</span>
                  <span className="text-xs text-gray-500 truncate">{item.notes || '—'}</span>

                  {/* Atunamento */}
                  <div className="flex items-center justify-center">
                    {canAtune ? (
                      <button
                        onClick={() => {
                          if (!isAttuned && !canAddAtunement) return
                          onUpdateItem?.(item.id, { attuned: !isAttuned })
                        }}
                        disabled={!isAttuned && !canAddAtunement}
                        title={isAttuned ? 'Remover atunamento' : canAddAtunement ? 'Atunar item' : 'Limite de atunamento atingido'}
                        className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                          isAttuned
                            ? 'border-purple-500 bg-purple-900/30 text-purple-300'
                            : canAddAtunement
                              ? 'border-gray-600 text-gray-500 hover:border-purple-600 hover:text-purple-400'
                              : 'border-gray-700 text-gray-700 cursor-not-allowed'
                        }`}
                      >
                        {isAttuned ? '💎' : '○'}
                      </button>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </div>

                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-red-500 hover:text-red-400 text-lg leading-none font-bold justify-self-center"
                    title="Remover"
                  >
                    ×
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

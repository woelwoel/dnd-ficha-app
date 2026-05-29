import { useState, useEffect, useMemo } from 'react'
import { SrdSearchModal } from '../SrdSearchModal'
import { findArmorByName, ARMOR_TABLE } from '../../domain/equipment'
import { getRarityInfo, getActiveMagicEffects } from '../../domain/magicItems'
import { buildItemLookup, enrichItemDisplay } from '../../domain/itemLookup'

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

/**
 * Identifica se uma entrada da SRD é uma arma (categoria "Weapon" ou tem
 * bloco de dano). Usado pra liberar Equipar em armas do inventário.
 */
function isWeaponSrd(srd) {
  if (!srd) return false
  const cat = srd.equipment_category?.name ?? ''
  return /weapon/i.test(cat) || !!srd.damage
}

/**
 * Converte uma entrada de arma da SRD num objeto de ataque (formato
 * combat.attacks). Mantém um id estável `weapon-<itemId>` pra permitir
 * idempotência ao re-equipar e remoção precisa ao desequipar.
 */
function buildAttackFromWeaponSrd(item, srd) {
  const props = (srd.properties ?? []).map(p => p.index)
  if (srd.weapon_range === 'Ranged') props.push('ranged')
  return {
    id: `weapon-${item.id}`,
    name: item.name,
    damageDice: srd.damage?.damage_dice ?? '1d6',
    damageType: srd.damage?.damage_type?.name ?? '',
    properties: props,
    proficient: true,
    magicBonus: 0,
    versatileDice: srd.two_handed_damage?.damage_dice,
    versatileTwoHanded: false, // toggle de empunhar versátil c/ 2 mãos
    abilityOverride: '',
    notes: '',
    fromItemId: item.id,                // rastreia origem pra clean-up
    weaponIndex: srd.index ?? null,     // pra lookup de munição/range futuro
    rangeNormal: srd.range?.normal ?? null,  // em pés (convertido em display)
    rangeLong:   srd.range?.long ?? null,
  }
}

export function Inventory({
  inventory, attributes,
  onUpdateCurrency, onAddItem, onRemoveItem, onUpdateItem,
  onAddAttack, onRemoveAttack,
}) {
  const [newItem, setNewItem] = useState(EMPTY_ITEM)
  const [showForm, setShowForm] = useState(false)
  const [srdEquipment, setSrdEquipment] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [magicCatalog, setMagicCatalog] = useState([])
  const [magicSearchOpen, setMagicSearchOpen] = useState(false)
  const [ptWeapons, setPtWeapons] = useState([])

  // Lookup PT-BR ↔ SRD reconstruído quando os datasets carregam.
  const itemLookup = useMemo(
    () => buildItemLookup(srdEquipment, ptWeapons),
    [srdEquipment, ptWeapons],
  )

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/srd-data/5e-SRD-Equipment.json', { signal: ctrl.signal })
      .then(r => r.json())
      .then(setSrdEquipment)
      .catch(err => {
        if (err.name !== 'AbortError') console.error('Falha ao carregar Equipment:', err)
      })
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/srd-data/phb-weapons-pt.json', { signal: ctrl.signal })
      .then(r => r.json())
      .then(json => setPtWeapons(json?.weapons ?? json ?? []))
      .catch(err => {
        if (err.name !== 'AbortError') console.error('Falha ao carregar armas PT:', err)
      })
    return () => ctrl.abort()
  }, [])

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/srd-data/phb-magic-items-pt.json', { signal: ctrl.signal })
      .then(r => r.json())
      .then(setMagicCatalog)
      .catch(err => {
        if (err.name !== 'AbortError') console.error('Falha ao carregar itens mágicos:', err)
      })
    return () => ctrl.abort()
  }, [])

  /**
   * Toggle de equipar — funciona pra armaduras E armas.
   * Quando arma é equipada, também adiciona um attack no combat.attacks
   * (id estável `weapon-<itemId>`). Quando desequipada, remove.
   * Idempotente: re-equipar sem desequipar antes não duplica.
   */
  function toggleEquip(item, currentlyEquipped) {
    const willEquip = !currentlyEquipped
    onUpdateItem?.(item.id, { equipped: willEquip })
    const srd = itemLookup.resolve(item.name)
    if (!srd || !isWeaponSrd(srd)) return // armadura segue só com flag
    if (willEquip) {
      onAddAttack?.(buildAttackFromWeaponSrd(item, srd))
    } else {
      onRemoveAttack?.(`weapon-${item.id}`)
    }
  }

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

  // Peso total e capacidade — usa enrichment p/ que itens do wizard (que
  // entram sem peso) contem na carga.
  const totalWeight    = inventory.items.reduce((sum, i) => {
    const w = parseWeight(i.weight || enrichItemDisplay(i, itemLookup).weight)
    return sum + w * (i.qty || 1)
  }, 0)
  const capacity       = carryingCapacity(attributes?.str ?? 10)
  const weightPct      = Math.min(100, (totalWeight / capacity) * 100)
  const isEncumbered   = totalWeight > capacity * 0.5
  const isHeavyLoad    = totalWeight > capacity

  // Atunamento
  const attunedCount   = inventory.items.filter(i => i.attuned).length
  const MAX_ATTUNED    = 3

  // Efeitos mágicos agregados (mesma engine pura usada pelo hook central).
  const magicEffects = getActiveMagicEffects(inventory.items ?? [])
  const effectSummary = []
  if (magicEffects.ac)        effectSummary.push(`CA +${magicEffects.ac}`)
  if (magicEffects.armorAc)   effectSummary.push(`Armadura +${magicEffects.armorAc}`)
  if (magicEffects.attack)    effectSummary.push(`ATK +${magicEffects.attack}`)
  if (magicEffects.damage)    effectSummary.push(`DAN +${magicEffects.damage}`)
  if (magicEffects.saves)     effectSummary.push(`Saves +${magicEffects.saves}`)
  for (const ab of ['str','dex','con','int','wis','cha']) {
    if (magicEffects.saveAbility[ab])
      effectSummary.push(`Save ${ab.toUpperCase()} +${magicEffects.saveAbility[ab]}`)
    if (magicEffects.attrSet[ab] != null)
      effectSummary.push(`${ab.toUpperCase()} ${magicEffects.attrSet[ab]}`)
    if (magicEffects.attrBonus[ab].value)
      effectSummary.push(`${ab.toUpperCase()} +${magicEffects.attrBonus[ab].value}`)
  }
  if (magicEffects.speed)      effectSummary.push(`Velocidade +${magicEffects.speed} ft`)
  if (magicEffects.darkvision) effectSummary.push(`Visão no Escuro ${magicEffects.darkvision} ft`)
  if (magicEffects.resistances.length)
    effectSummary.push(`Resistência: ${magicEffects.resistances.join(', ')}`)
  if (magicEffects.advSaves)   effectSummary.push('Vantagem em saves')

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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

      {/* Efeitos Mágicos Ativos */}
      {effectSummary.length > 0 && (
        <div className="bg-purple-950/30 border border-purple-700/50 rounded-lg p-3">
          <h3 className="text-sm font-bold text-purple-300 uppercase tracking-widest mb-2">
            Efeitos Mágicos Ativos
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {effectSummary.map((e, i) => (
              <span
                key={i}
                className="text-xs px-2 py-0.5 rounded bg-purple-900/50 border border-purple-700/40 text-purple-200"
              >
                {e}
              </span>
            ))}
          </div>
        </div>
      )}

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
              onClick={() => setMagicSearchOpen(true)}
              className="text-xs px-3 py-1 rounded bg-purple-700 hover:bg-purple-600 text-white font-semibold"
            >
              Buscar Mágico
            </button>
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
          categories={[
            { key: 'arma',     label: 'Armas',     match: eq => /weapon|arma/i.test(eq.equipment_category?.name ?? '') },
            { key: 'armadura', label: 'Armaduras', match: eq => /armor|armadura|armour/i.test(eq.equipment_category?.name ?? '') || !!eq.armor_class },
            { key: 'outro',    label: 'Outros',    match: eq => !/weapon|arma|armor|armadura|armour/i.test(eq.equipment_category?.name ?? '') && !eq.armor_class },
          ]}
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

        {/* Magic item search */}
        <SrdSearchModal
          isOpen={magicSearchOpen}
          onClose={() => setMagicSearchOpen(false)}
          title="Buscar Item Mágico"
          items={magicCatalog}
          categories={[
            { key: 'arma',       label: 'Armas',         match: it => it.category === 'arma' },
            { key: 'armadura',   label: 'Armaduras',     match: it => it.category === 'armadura' },
            { key: 'anel',       label: 'Anéis',         match: it => it.category === 'anel' },
            { key: 'manto',      label: 'Mantos/Capas',  match: it => it.category === 'manto' },
            { key: 'cinto',      label: 'Cintos',        match: it => it.category === 'cinto' },
            { key: 'amuleto',    label: 'Amuletos',      match: it => it.category === 'amuleto' },
            { key: 'botas',      label: 'Botas',         match: it => it.category === 'botas' },
            { key: 'varinha',    label: 'Varinhas/Cajados', match: it => it.category === 'varinha' || it.category === 'cajado' },
            { key: 'tomo',       label: 'Tomos/Manuais', match: it => it.category === 'tomo' },
            { key: 'pocao',      label: 'Poções/Pergaminhos', match: it => it.category === 'pocao' || it.category === 'pergaminho' },
            { key: 'bugiganga',  label: 'Bugigangas',    match: it => it.category === 'bugiganga' },
          ]}
          onSelect={mag => {
            onAddItem({
              name: mag.name,
              qty: 1,
              weight: '',
              notes: mag.description ?? '',
              requiresAttunement: !!mag.requiresAttunement,
              attuned: false,
              magicItemIndex: mag.index,
              rarity: mag.rarity,
              effects: mag.effects ?? [],
            })
            setMagicSearchOpen(false)
          }}
          renderItem={mag => {
            const rar = getRarityInfo(mag.rarity)
            return (
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{mag.name}</span>
                  <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded border ${rar.text} ${rar.border} ${rar.bg}`}>
                    {rar.label}
                  </span>
                  {mag.requiresAttunement && (
                    <span className="text-[10px] text-purple-300">💎 atunamento</span>
                  )}
                </div>
                {mag.description && (
                  <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{mag.description}</div>
                )}
              </div>
            )
          }}
        />

        {/* Items list */}
        {inventory.items.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">Nenhum item ainda.</p>
        ) : (
          <>
            {/* ── Mobile: cards empilhados ─────────────────────── */}
            <div className="sm:hidden space-y-2">
              {inventory.items.map(item => {
                const resolvedArmor = item.armorType
                  ? (item.armorKey && ARMOR_TABLE[item.armorKey]
                      ? { ...ARMOR_TABLE[item.armorKey], key: item.armorKey }
                      : { category: item.armorType, type: item.armorType === 'shield' ? 'shield' : 'armor' })
                  : findArmorByName(item.name)
                const srdEntry        = itemLookup.resolve(item.name)
                const isWeapon        = isWeaponSrd(srdEntry)
                const isEquippable    = !!resolvedArmor || isWeapon
                const isEquipped      = !!item.equipped
                const canAtune        = !!item.requiresAttunement
                const isAttuned       = !!item.attuned
                const canAddAtunement = !isAttuned && attunedCount < MAX_ATTUNED
                const rarInfo         = item.rarity ? getRarityInfo(item.rarity) : null
                const rarityBorder    = rarInfo ? rarInfo.border : 'border-gray-700/50'
                const enriched        = enrichItemDisplay(item, itemLookup)

                return (
                  <div
                    key={item.id}
                    className={`rounded-lg px-3 py-2.5 ${
                      item.source === 'background' ? 'bg-amber-950/30 border border-amber-900/40' : `bg-gray-900 border ${rarityBorder}`
                    } ${isEquipped ? 'ring-1 ring-amber-600/50' : ''} ${isAttuned ? 'ring-1 ring-purple-600/50' : ''}`}
                  >
                    {/* Linha 1: nome + ações */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 flex-wrap">
                        {item.source === 'background' && <span className="text-[11px] shrink-0">🎒</span>}
                        {isAttuned && <span className="text-[11px] shrink-0">💎</span>}
                        <span className="text-sm text-white font-medium truncate">{item.name}</span>
                        {rarInfo && (
                          <span className={`text-[9px] uppercase tracking-wider px-1 rounded border shrink-0 ${rarInfo.text} ${rarInfo.border}`}>
                            {rarInfo.label}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {canAtune && (
                          <button
                            onClick={() => { if (!isAttuned && !canAddAtunement) return; onUpdateItem?.(item.id, { attuned: !isAttuned }) }}
                            disabled={!isAttuned && !canAddAtunement}
                            title={isAttuned ? 'Remover atunamento' : 'Atunar'}
                            className={`text-xs px-2 py-1 rounded border transition-colors min-h-[32px] ${
                              isAttuned ? 'border-purple-500 bg-purple-900/30 text-purple-300' :
                              canAddAtunement ? 'border-gray-600 text-gray-400 hover:border-purple-600 hover:text-purple-400' :
                              'border-gray-700 text-gray-700 cursor-not-allowed opacity-50'
                            }`}
                          >
                            {isAttuned ? '💎' : '○'}
                          </button>
                        )}
                        <button
                          onClick={() => { onRemoveAttack?.(`weapon-${item.id}`); onRemoveItem(item.id) }}
                          className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-400 text-xl font-bold"
                          title="Remover"
                        >×</button>
                      </div>
                    </div>
                    {/* Linha 2: detalhes + equipar */}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-xs text-gray-500">
                        {item.qty > 1 ? `${item.qty}×` : ''}
                        {enriched.weight ? ` · ${enriched.weight}` : ''}
                      </span>
                      {enriched.notes && <span className="text-xs text-gray-500 truncate flex-1">{enriched.notes}</span>}
                      {isEquippable && (
                        <button
                          onClick={() => toggleEquip(item, isEquipped)}
                          title={isWeapon ? (isEquipped ? 'Desequipar (remove dos Ataques)' : 'Equipar (cria entrada em Ataques)') : undefined}
                          className={`text-xs px-2 py-1 rounded border transition-colors min-h-[28px] ${
                            isEquipped ? 'border-amber-500 bg-amber-900/30 text-amber-300' : 'border-gray-600 text-gray-500 hover:border-amber-500 hover:text-amber-300'
                          }`}
                        >
                          {isEquipped ? '✓ Equipado' : (isWeapon ? 'Empunhar' : 'Equipar')}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Desktop: grid tabela ─────────────────────────── */}
            <div className="hidden sm:block space-y-1">
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
                const srdEntry        = itemLookup.resolve(item.name)
                const isWeapon        = isWeaponSrd(srdEntry)
                const isEquippable    = !!resolvedArmor || isWeapon
                const isEquipped      = !!item.equipped
                const canAtune        = !!item.requiresAttunement
                const isAttuned       = !!item.attuned
                const canAddAtunement = !isAttuned && attunedCount < MAX_ATTUNED
                const rarInfo         = item.rarity ? getRarityInfo(item.rarity) : null
                const rarityBorder    = rarInfo ? `border ${rarInfo.border}` : ''
                const enriched        = enrichItemDisplay(item, itemLookup)

                return (
                  <div
                    key={item.id}
                    className={`grid grid-cols-[1fr_3rem_4rem_1fr_auto_2rem] gap-2 items-center rounded px-2 py-1.5 ${
                      item.source === 'background' ? 'bg-amber-950/30 border border-amber-900/40' : `bg-gray-900 ${rarityBorder}`
                    } ${isEquipped ? 'ring-1 ring-amber-600/50' : ''} ${isAttuned ? 'ring-1 ring-purple-600/50' : ''}`}
                  >
                    <span className="text-sm text-white truncate flex items-center gap-1.5">
                      {item.source === 'background' && <span title="Item do antecedente" className="text-[10px]">🎒</span>}
                      {isAttuned && <span title="Atunado" className="text-[10px]">💎</span>}
                      {isEquippable && (
                        <button
                          onClick={() => toggleEquip(item, isEquipped)}
                          title={isWeapon
                            ? (isEquipped ? 'Desempunhar (remove dos Ataques)' : 'Empunhar (cria entrada em Ataques)')
                            : (isEquipped ? 'Desequipar' : 'Equipar')}
                          className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                            isEquipped ? 'border-amber-500 bg-amber-900/30 text-amber-300' : 'border-gray-600 text-gray-500 hover:text-gray-300 hover:border-gray-500'
                          }`}
                        >
                          {isEquipped ? '✓ Equipado' : (isWeapon ? 'Empunhar' : 'Equipar')}
                        </button>
                      )}
                      {isEquippable && (
                        <span className="text-[9px] text-gray-500 uppercase">
                          {resolvedArmor
                            ? (resolvedArmor.type === 'shield' ? 'escudo' : resolvedArmor.category)
                            : 'arma'}
                        </span>
                      )}
                      <span className="truncate">{item.name}</span>
                      {rarInfo && (
                        <span className={`text-[9px] uppercase tracking-wider px-1 rounded border shrink-0 ${rarInfo.text} ${rarInfo.border}`}>
                          {rarInfo.label}
                        </span>
                      )}
                    </span>
                    <span className="text-sm text-gray-300 text-center">{item.qty}</span>
                    <span className="text-sm text-gray-400 text-center">{enriched.weight || '—'}</span>
                    <span className="text-xs text-gray-500 truncate">{enriched.notes || '—'}</span>
                    <div className="flex items-center justify-center">
                      {canAtune ? (
                        <button
                          onClick={() => { if (!isAttuned && !canAddAtunement) return; onUpdateItem?.(item.id, { attuned: !isAttuned }) }}
                          disabled={!isAttuned && !canAddAtunement}
                          title={isAttuned ? 'Remover atunamento' : canAddAtunement ? 'Atunar item' : 'Limite atingido'}
                          className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                            isAttuned ? 'border-purple-500 bg-purple-900/30 text-purple-300' :
                            canAddAtunement ? 'border-gray-600 text-gray-500 hover:border-purple-600 hover:text-purple-400' :
                            'border-gray-700 text-gray-700 cursor-not-allowed'
                          }`}
                        >
                          {isAttuned ? '💎' : '○'}
                        </button>
                      ) : (
                        <span className="text-gray-700">—</span>
                      )}
                    </div>
                    <button
                      onClick={() => { onRemoveAttack?.(`weapon-${item.id}`); onRemoveItem(item.id) }}
                      className="text-red-500 hover:text-red-400 text-lg leading-none font-bold justify-self-center"
                      title="Remover"
                    >×</button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

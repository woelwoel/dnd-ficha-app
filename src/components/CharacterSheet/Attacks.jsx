import { useState } from 'react'
import { calculateWeaponAttackBonus, calculateWeaponDamage, resolveAttackAbility } from '../../utils/attacks'
import { formatModifier } from '../../utils/calculations'
import { abbrOfKey } from '../../domain/attributes'
import { RollButton } from '../DiceRoller/RollButton'
import { AttackRollButton } from './AttackRollButton'
import {
  translateProperty, translateDamageType, formatRange, findAmmoForAttack,
} from '../../utils/weaponI18n'

const EMPTY_ATTACK = {
  name: '',
  damageDice: '1d6',
  damageType: '',
  properties: [],
  proficient: true,
  magicBonus: 0,
  versatileDice: '',
  versatileTwoHanded: false,
  abilityOverride: '',
  notes: '',
}

const PROPERTY_OPTIONS = [
  { key: 'finesse',    label: 'Sutileza (finesse)' },
  { key: 'versatile',  label: 'Versátil' },
  { key: 'ranged',     label: 'À distância' },
  { key: 'thrown',     label: 'Arremesso' },
  { key: 'light',      label: 'Leve' },
  { key: 'heavy',      label: 'Pesada' },
  { key: 'two-handed', label: 'Duas mãos' },
  { key: 'ammunition', label: 'Munição' },
  { key: 'reach',      label: 'Alcance estendido' },
]

/* ──────────────────────────────────────────────────────────────────
   Form reutilizável (criar OU editar)
   ────────────────────────────────────────────────────────────────── */
function AttackForm({ value, onChange, onSave, onCancel, title }) {
  function toggleProperty(propKey) {
    const set = new Set(value.properties ?? [])
    if (set.has(propKey)) set.delete(propKey); else set.add(propKey)
    onChange({ ...value, properties: Array.from(set) })
  }
  return (
    <div className="mb-3 p-3 bg-gray-900 rounded-lg space-y-2">
      <div className="text-[13px] uppercase tracking-widest text-amber-400 font-display">{title}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input type="text" placeholder="Nome da arma *"
          value={value.name}
          onChange={e => onChange({ ...value, name: e.target.value })}
          className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
        />
        <input type="text" placeholder="Dano (ex. 1d8)"
          value={value.damageDice}
          onChange={e => onChange({ ...value, damageDice: e.target.value })}
          className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
        />
        <input type="text" placeholder="Tipo de dano (ex. cortante)"
          value={value.damageType}
          onChange={e => onChange({ ...value, damageType: e.target.value })}
          className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
        />
        <input type="text" placeholder="Versátil (ex. 1d10)"
          value={value.versatileDice ?? ''}
          onChange={e => onChange({ ...value, versatileDice: e.target.value })}
          className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
        />
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <label className="flex items-center gap-1 text-xs text-gray-300">
          <input type="checkbox"
            checked={!!value.proficient}
            onChange={e => onChange({ ...value, proficient: e.target.checked })}
            className="accent-amber-400"
          />
          Proficiente
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-300">
          Bônus mágico
          <input type="number"
            value={value.magicBonus ?? 0}
            onChange={e => onChange({ ...value, magicBonus: parseInt(e.target.value, 10) || 0 })}
            onWheel={e => e.currentTarget.blur()}
            className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-sm text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
        </label>
        <label className="flex items-center gap-1 text-xs text-gray-300">
          Atributo
          <select
            value={value.abilityOverride ?? ''}
            onChange={e => onChange({ ...value, abilityOverride: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-sm text-white"
          >
            <option value="">Automático</option>
            <option value="str">FOR</option>
            <option value="dex">DES</option>
            <option value="con">CON</option>
            <option value="int">INT</option>
            <option value="wis">SAB</option>
            <option value="cha">CAR</option>
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {PROPERTY_OPTIONS.map(opt => (
          <label key={opt.key} className="flex items-center gap-1 text-xs text-gray-300">
            <input type="checkbox"
              checked={(value.properties ?? []).includes(opt.key)}
              onChange={() => toggleProperty(opt.key)}
              className="accent-amber-400"
            />
            {opt.label}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={!value.name?.trim()}
          className="flex-1 py-1.5 rounded bg-green-700 hover:bg-green-600 disabled:opacity-40 text-parchment-50 text-sm font-semibold"
        >Salvar</button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm"
        >Cancelar</button>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Linha de um ataque (mobile + desktop)
   ────────────────────────────────────────────────────────────────── */
function AttackRow({
  atk, attributes, profBonus, ammoItem, isDesktop,
  onEdit, onRemove, onUpdate, onUpdateItem,
}) {
  const versatileMode = !!atk.versatileTwoHanded && !!atk.versatileDice
  const attackBonus = calculateWeaponAttackBonus(atk, attributes, profBonus)
  const damage      = calculateWeaponDamage(atk, attributes, { versatileTwoHanded: versatileMode })
  const ability     = resolveAttackAbility(atk, attributes)
  const abbr        = abbrOfKey(ability)
  const atkNotation = `1d20${formatModifier(attackBonus)}`
  const dmgNotation = damage.expression
  const rangeText   = formatRange(atk.rangeNormal, atk.rangeLong)
  const damageTypePt = translateDamageType(atk.damageType)
  const propsPt = (atk.properties ?? []).map(translateProperty)

  // Consumo de munição: 1× por click no botão Atacar (ou no dado avulso de
  // dano — assume que o jogador rolou pra causar dano). RollButton avulso
  // do d20 NÃO consome (pode ser test/preview).
  function consumeAmmo() {
    if (!ammoItem || (ammoItem.qty ?? 0) <= 0) return
    onUpdateItem?.(ammoItem.id, { qty: Math.max(0, (ammoItem.qty ?? 0) - 1) })
  }

  const noAmmo = !!ammoItem && (ammoItem.qty ?? 0) <= 0

  function toggleVersatile() {
    onUpdate?.(atk.id, { versatileTwoHanded: !versatileMode })
  }

  const meta = [abbr, atk.proficient ? 'prof' : null, atk.magicBonus ? `+${atk.magicBonus} mág.` : null, ...propsPt]
    .filter(Boolean).join(' · ')

  if (isDesktop) {
    return (
      <div className="grid grid-cols-[2fr_auto_1fr_2rem] gap-2 items-center bg-gray-900 rounded px-2 py-1.5">
        <div className="min-w-0">
          <button
            onClick={() => onEdit(atk)}
            className="text-sm text-white truncate text-left hover:text-amber-300 transition-colors"
            title="Clique para editar"
          >{atk.name}</button>
          <div className="text-xs text-gray-500">
            {meta}
            {rangeText && <span className="text-gray-400 ml-1">· {rangeText}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <AttackRollButton
            attackNotation={atkNotation}
            damageNotation={dmgNotation}
            weaponName={atk.name}
            disabled={noAmmo}
            onAfterRoll={consumeAmmo}
            size="xs"
          />
          {atk.versatileDice && (
            <button
              onClick={toggleVersatile}
              title={versatileMode
                ? 'Usando 2 mãos (versátil). Clique para voltar a 1 mão.'
                : 'Usando 1 mão. Clique para empunhar com 2 mãos (versátil).'}
              className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
                versatileMode
                  ? 'bg-amber-700/40 border-amber-500 text-amber-200'
                  : 'bg-gray-800 border-gray-600 text-gray-400 hover:border-amber-500 hover:text-amber-300'
              }`}
            >{versatileMode ? '✊ 2M' : '⚔ 1M'}</button>
          )}
        </div>
        <div className="text-xs text-gray-300">
          <div className="flex items-center gap-1">
            <span className="text-amber-300 font-semibold">{formatModifier(attackBonus)}</span>
            <span className="text-gray-600">/</span>
            <span>{damage.expression}</span>
            {damageTypePt && <span className="text-gray-500">{damageTypePt}</span>}
            <RollButton notation={dmgNotation} label={`Dano avulso · ${atk.name}`} size="xs" />
          </div>
          {atk.versatileDice && !versatileMode && (
            <div className="text-gray-500 text-xs">
              2 mãos: {calculateWeaponDamage(atk, attributes, { versatileTwoHanded: true }).expression}
            </div>
          )}
          {ammoItem && (
            <div className={`text-xs mt-0.5 ${noAmmo ? 'text-red-400' : 'text-sky-400'}`}>
              {noAmmo ? '⚠ Sem' : '🏹'} {ammoItem.name}: {ammoItem.qty ?? 0}
            </div>
          )}
        </div>
        <button
          onClick={() => onRemove(atk.id)}
          className="text-red-500 hover:text-red-400 text-lg leading-none font-bold justify-self-center"
          title="Remover"
        >×</button>
      </div>
    )
  }

  /* Mobile */
  return (
    <div className="bg-gray-900 border border-gray-700/50 rounded-lg px-3 py-2.5">
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <button
          onClick={() => onEdit(atk)}
          className="text-sm text-white font-semibold truncate text-left hover:text-amber-300 transition-colors"
          title="Clique para editar"
        >{atk.name}</button>
        <button
          onClick={() => onRemove(atk.id)}
          className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-400 text-xl font-bold shrink-0"
          title="Remover"
        >×</button>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <AttackRollButton
          attackNotation={atkNotation}
          damageNotation={dmgNotation}
          weaponName={atk.name}
          disabled={noAmmo}
          onAfterRoll={consumeAmmo}
          size="xs"
        />
        {atk.versatileDice && (
          <button
            onClick={toggleVersatile}
            className={`text-xs px-1.5 py-0.5 rounded border transition-colors ${
              versatileMode
                ? 'bg-amber-700/40 border-amber-500 text-amber-200'
                : 'bg-gray-800 border-gray-600 text-gray-400'
            }`}
          >{versatileMode ? '✊ 2 mãos' : '⚔ 1 mão'}</button>
        )}
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <span>Atk {formatModifier(attackBonus)}</span>
          <span>·</span>
          <span>Dano {damage.expression}</span>
          {damageTypePt && <span className="text-gray-600">{damageTypePt}</span>}
          <RollButton notation={dmgNotation} label={`Dano avulso · ${atk.name}`} size="xs" />
        </div>
      </div>
      <div className="text-xs text-gray-600 mt-1">
        {meta}
        {rangeText && <span className="text-gray-400"> · {rangeText}</span>}
      </div>
      {atk.versatileDice && !versatileMode && (
        <div className="text-xs text-gray-600">
          2 mãos: {calculateWeaponDamage(atk, attributes, { versatileTwoHanded: true }).expression}
        </div>
      )}
      {ammoItem && (
        <div className={`text-[13px] mt-0.5 ${noAmmo ? 'text-red-400' : 'text-sky-400'}`}>
          {noAmmo ? '⚠ Sem' : '🏹'} {ammoItem.name}: {ammoItem.qty ?? 0}
        </div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────────────────
   Componente principal
   ────────────────────────────────────────────────────────────────── */
export function Attacks({
  attacks = [], attributes, profBonus,
  inventoryItems = [],
  onAdd, onRemove, onUpdate, onUpdateItem,
}) {
  // Modo do formulário: null = fechado, 'new' = criando, id = editando
  const [formMode, setFormMode] = useState(null)
  const [draft, setDraft] = useState(EMPTY_ATTACK)

  function startNew() { setDraft(EMPTY_ATTACK); setFormMode('new') }
  function startEdit(atk) {
    setDraft({ ...EMPTY_ATTACK, ...atk })
    setFormMode(atk.id)
  }
  function cancel() { setFormMode(null); setDraft(EMPTY_ATTACK) }
  function save() {
    const name = draft.name?.trim()
    if (!name) return
    const payload = {
      ...draft,
      name,
      magicBonus: parseInt(draft.magicBonus, 10) || 0,
      abilityOverride: draft.abilityOverride || undefined,
      versatileDice: draft.versatileDice || undefined,
    }
    if (formMode === 'new') onAdd(payload)
    else if (formMode) onUpdate?.(formMode, payload)
    cancel()
  }

  const editingTitle = formMode === 'new'
    ? 'Novo ataque'
    : (attacks.find(a => a.id === formMode)?.name
        ? `Editar — ${attacks.find(a => a.id === formMode).name}`
        : 'Editar ataque')

  /* Sem ataques e form fechado: linha discreta com botão */
  if (attacks.length === 0 && !formMode) {
    return (
      <div className="bg-parchment-100 border border-parchment-600 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 shadow-parchment-sm">
        <h3 className="text-sm font-display text-ink-500 uppercase tracking-widest">
          Ataques
          <span className="ml-2 ink-italic text-ink-300 text-xs normal-case tracking-normal">
            — nenhum registrado
          </span>
        </h3>
        <button
          onClick={startNew}
          className="text-xs px-3 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 text-parchment-50 font-display tracking-wide"
        >+ Ataque</button>
      </div>
    )
  }

  return (
    <div className="bg-parchment-100 border border-parchment-600 rounded-lg p-4 shadow-parchment-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-display text-ink-500 uppercase tracking-widest">
          Ataques
          <span className="ml-2 text-ink-300 font-normal normal-case text-xs">
            {attacks.length} registrado{attacks.length !== 1 ? 's' : ''}
          </span>
        </h3>
        <button
          onClick={formMode ? cancel : startNew}
          className="text-xs px-3 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 text-parchment-50 font-display tracking-wide"
        >{formMode ? 'Cancelar' : '+ Ataque'}</button>
      </div>

      {formMode && (
        <AttackForm
          title={editingTitle}
          value={draft}
          onChange={setDraft}
          onSave={save}
          onCancel={cancel}
        />
      )}

      {attacks.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-3">Nenhum ataque registrado.</p>
      ) : (
        <>
          {/* ── Mobile ──────────────────────────────────── */}
          <div className="sm:hidden space-y-2">
            {attacks.map(atk => {
              const ammoItem = findAmmoForAttack(atk, inventoryItems)
              return (
                <AttackRow
                  key={atk.id} atk={atk}
                  attributes={attributes} profBonus={profBonus}
                  ammoItem={ammoItem} isDesktop={false}
                  onEdit={startEdit} onRemove={onRemove}
                  onUpdate={onUpdate} onUpdateItem={onUpdateItem}
                />
              )
            })}
          </div>

          {/* ── Desktop ─────────────────────────────────── */}
          <div className="hidden sm:block space-y-1">
            <div className="grid grid-cols-[2fr_auto_1fr_2rem] gap-2 px-2 text-xs text-gray-500 uppercase">
              <span>Arma</span>
              <span className="text-center">Ataque</span>
              <span>Dano</span>
              <span />
            </div>
            {attacks.map(atk => {
              const ammoItem = findAmmoForAttack(atk, inventoryItems)
              return (
                <AttackRow
                  key={atk.id} atk={atk}
                  attributes={attributes} profBonus={profBonus}
                  ammoItem={ammoItem} isDesktop={true}
                  onEdit={startEdit} onRemove={onRemove}
                  onUpdate={onUpdate} onUpdateItem={onUpdateItem}
                />
              )
            })}
          </div>
        </>
      )}

      {attacks.length > 0 && (
        <p className="mt-2 text-[13px] text-gray-600">
          Dica: clique no nome da arma para editar. Use o toggle ⚔/✊ pra alternar versátil (1 mão ↔ 2 mãos).
        </p>
      )}
    </div>
  )
}

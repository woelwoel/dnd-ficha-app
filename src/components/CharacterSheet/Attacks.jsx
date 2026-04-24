import { useState } from 'react'
import { calculateWeaponAttackBonus, calculateWeaponDamage, resolveAttackAbility } from '../../utils/attacks'
import { formatModifier } from '../../utils/calculations'
import { abbrOfKey } from '../../domain/attributes'

const EMPTY_ATTACK = {
  name: '',
  damageDice: '1d6',
  damageType: '',
  properties: [],
  proficient: true,
  magicBonus: 0,
  versatileDice: '',
  abilityOverride: '',
  notes: '',
}

const PROPERTY_OPTIONS = [
  { key: 'finesse', label: 'Acuidade (finesse)' },
  { key: 'versatile', label: 'Versátil' },
  { key: 'ranged', label: 'À distância' },
  { key: 'thrown', label: 'Arremesso' },
  { key: 'light', label: 'Leve' },
  { key: 'heavy', label: 'Pesada' },
  { key: 'two-handed', label: 'Duas mãos' },
]

/**
 * Lista editável de ataques de arma (PHB p.149).
 *
 * A lógica pura está em `utils/attacks.js` — este componente apenas mostra
 * os valores calculados e expõe formulário de CRUD.
 */
export function Attacks({ attacks = [], attributes, profBonus, onAdd, onRemove, onUpdate }) {
  const [showForm, setShowForm] = useState(false)
  const [draft, setDraft] = useState(EMPTY_ATTACK)

  function handleAdd() {
    if (!draft.name.trim()) return
    onAdd({
      ...draft,
      name: draft.name.trim(),
      magicBonus: parseInt(draft.magicBonus, 10) || 0,
      abilityOverride: draft.abilityOverride || undefined,
      versatileDice: draft.versatileDice || undefined,
    })
    setDraft(EMPTY_ATTACK)
    setShowForm(false)
  }

  function toggleProperty(attackOrDraft, propKey, onChange) {
    const set = new Set(attackOrDraft.properties ?? [])
    if (set.has(propKey)) set.delete(propKey); else set.add(propKey)
    onChange(Array.from(set))
  }

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest">
          Ataques
          <span className="ml-2 text-gray-500 font-normal normal-case text-xs">
            {attacks.length} registrado{attacks.length !== 1 ? 's' : ''}
          </span>
        </h3>
        <button
          onClick={() => setShowForm(v => !v)}
          className="text-xs px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-semibold"
        >
          {showForm ? 'Cancelar' : '+ Ataque'}
        </button>
      </div>

      {showForm && (
        <div className="mb-3 p-3 bg-gray-900 rounded-lg space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Nome da arma *"
              value={draft.name}
              onChange={e => setDraft(p => ({ ...p, name: e.target.value }))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              placeholder="Dano (ex. 1d8)"
              value={draft.damageDice}
              onChange={e => setDraft(p => ({ ...p, damageDice: e.target.value }))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              placeholder="Tipo de dano (ex. cortante)"
              value={draft.damageType}
              onChange={e => setDraft(p => ({ ...p, damageType: e.target.value }))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              placeholder="Versátil (ex. 1d10)"
              value={draft.versatileDice}
              onChange={e => setDraft(p => ({ ...p, versatileDice: e.target.value }))}
              className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-400"
            />
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <label className="flex items-center gap-1 text-xs text-gray-300">
              <input
                type="checkbox"
                checked={draft.proficient}
                onChange={e => setDraft(p => ({ ...p, proficient: e.target.checked }))}
                className="accent-amber-400"
              />
              Proficiente
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-300">
              Bônus mágico
              <input
                type="number"
                value={draft.magicBonus}
                onChange={e => setDraft(p => ({ ...p, magicBonus: e.target.value }))}
                onWheel={e => e.currentTarget.blur()}
                className="w-14 bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-sm text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-gray-300">
              Atributo
              <select
                value={draft.abilityOverride}
                onChange={e => setDraft(p => ({ ...p, abilityOverride: e.target.value }))}
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
                <input
                  type="checkbox"
                  checked={(draft.properties ?? []).includes(opt.key)}
                  onChange={() => toggleProperty(draft, opt.key, (next) => setDraft(p => ({ ...p, properties: next })))}
                  className="accent-amber-400"
                />
                {opt.label}
              </label>
            ))}
          </div>
          <button
            onClick={handleAdd}
            disabled={!draft.name.trim()}
            className="w-full py-1.5 rounded bg-green-700 hover:bg-green-600 disabled:opacity-40 text-white text-sm font-semibold"
          >
            Salvar Ataque
          </button>
        </div>
      )}

      {attacks.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-3">Nenhum ataque registrado.</p>
      ) : (
        <div className="space-y-1">
          <div className="grid grid-cols-[2fr_4rem_1fr_2rem] gap-2 px-2 text-xs text-gray-500 uppercase">
            <span>Arma</span>
            <span className="text-center">Ataque</span>
            <span>Dano</span>
            <span />
          </div>
          {attacks.map(atk => {
            const attackBonus = calculateWeaponAttackBonus(atk, attributes, profBonus)
            const damage = calculateWeaponDamage(atk, attributes)
            const ability = resolveAttackAbility(atk, attributes)
            const abbr = abbrOfKey(ability)
            return (
              <div key={atk.id} className="grid grid-cols-[2fr_4rem_1fr_2rem] gap-2 items-center bg-gray-900 rounded px-2 py-1.5">
                <div className="min-w-0">
                  <div className="text-sm text-white truncate">{atk.name}</div>
                  <div className="text-xs text-gray-500">
                    {abbr}
                    {atk.proficient ? ' · prof' : ''}
                    {atk.magicBonus ? ` · +${atk.magicBonus} mág.` : ''}
                    {(atk.properties ?? []).length > 0 ? ` · ${atk.properties.join(', ')}` : ''}
                  </div>
                </div>
                <span className="text-sm text-amber-300 font-bold text-center">
                  {formatModifier(attackBonus)}
                </span>
                <div className="text-xs text-gray-300">
                  <div>{damage.expression} {atk.damageType ? <span className="text-gray-500">{atk.damageType}</span> : null}</div>
                  {atk.versatileDice && (
                    <div className="text-gray-500">
                      2 mãos: {calculateWeaponDamage(atk, attributes, { versatileTwoHanded: true }).expression}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onRemove(atk.id)}
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

      {/* Toggle rápido de proficiência / bônus mágico por linha */}
      {attacks.length > 0 && (
        <p className="mt-2 text-[11px] text-gray-600">
          Dica: clique no nome da arma para editar depois (em breve).
          {/* onUpdate já exposto para integração futura (edição inline). */}
          {typeof onUpdate === 'function' ? '' : ''}
        </p>
      )}
    </div>
  )
}

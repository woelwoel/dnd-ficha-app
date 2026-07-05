import { useState } from 'react'
import { useCharacterContext } from '../CharacterContext'
import { EditDialog } from './EditDialog'
import { Attacks } from '../Attacks'
import { CombatClassActions } from '../CombatClassActions'
import { ManeuversPanel } from '../ManeuversPanel'
import { AttackRollButton } from '../AttackRollButton'
import { RollButton } from '../../../../../components/DiceRoller/RollButton'
import {
  calculateWeaponAttackBonus, calculateWeaponDamage, resolveAttackAbility,
} from '../../../utils/attacks'
import { formatModifier } from '../../../utils/calculations'
import { abbrOfKey } from '../../../domain/attributes'
import { findAmmoForAttack } from '../../../utils/weaponI18n'
import { actionTypeOf } from './actionTypes'

const FILTERS = [
  { id: 'todas', label: 'Todas' },
  { id: 'acao', label: 'Ação' },
  { id: 'bonus', label: 'Bônus' },
  { id: 'reacao', label: 'Reação' },
  { id: 'limitadas', label: 'Limitadas' },
]

function SectionTitle({ children }) {
  return <div className="v2-title" style={{ marginTop: 4 }}>{children}</div>
}

/* Linha de ataque nativa v2 — cálculo importado de utils/attacks (mesma fonte
   da verdade que o Attacks.jsx v1; ver AttackRow lá). Rola de verdade via
   AttackRollButton (fluxo ataque→crítico→dano) + RollButton pra dano avulso;
   consumo de munição idêntico ao AttackRow v1. A edição completa fica no
   Attacks v1 sob "Gerenciar ataques". */
function AttackRowV2({ atk, attributes, profBonus, ammoItem, onUpdateItem }) {
  const bonus = calculateWeaponAttackBonus(atk, attributes, profBonus)
  const dmg = calculateWeaponDamage(atk, attributes, {})
  const abbr = abbrOfKey(resolveAttackAbility(atk, attributes))
  const noAmmo = !!ammoItem && (ammoItem.qty ?? 0) <= 0

  // Mesma semântica do AttackRow v1: 1 consumo por clique em Atacar.
  function consumeAmmo() {
    if (!ammoItem || (ammoItem.qty ?? 0) <= 0) return
    onUpdateItem?.(ammoItem.id, { qty: Math.max(0, (ammoItem.qty ?? 0) - 1) })
  }

  return (
    <div className="v2-row">
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {atk.name}
        <span className="v2-mut" style={{ marginLeft: 6, fontSize: 11 }}>{abbr}</span>
        {ammoItem && (
          <span className="v2-mut" style={{ marginLeft: 6, fontSize: 11 }}>
            {noAmmo ? '⚠ sem munição' : `🏹 ${ammoItem.qty ?? 0}`}
          </span>
        )}
      </span>
      <span style={{ whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span className="v2-acc" style={{ fontWeight: 600 }}>{formatModifier(bonus)}</span>
        <span className="v2-mut">·</span>
        {dmg.expression}
        {atk.damageType ? <span className="v2-mut">{atk.damageType}</span> : null}
        <AttackRollButton
          attackNotation={`1d20${formatModifier(bonus)}`}
          damageNotation={dmg.expression}
          weaponName={atk.name}
          disabled={noAmmo}
          onAfterRoll={consumeAmmo}
          size="xs"
        />
        <RollButton notation={dmg.expression} label={`Dano avulso · ${atk.name}`} size="xs" />
      </span>
    </div>
  )
}

/* Bolinhas de espaços de magia — semântica idêntica ao Spells.jsx v1:
   bolinha i está "gasta" quando i < usados; clicar gasta/recupera. */
function SpellSlotsSection({ maxSlots, safeUsedSlots, toggleSlot }) {
  const levels = Object.keys(maxSlots ?? {})
    .map(Number)
    .filter(lvl => (maxSlots[lvl] ?? 0) > 0)
    .sort((a, b) => a - b)
  if (levels.length === 0) return null
  return (
    <div>
      <SectionTitle>Espaços de magia</SectionTitle>
      {levels.map(lvl => {
        const max = maxSlots[lvl] ?? 0
        const used = safeUsedSlots?.[lvl] ?? 0
        return (
          <div key={lvl} className="v2-row">
            <span className="v2-mut">Círculo {lvl}</span>
            <span style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: max }, (_, i) => {
                const isUsed = i < used
                return (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Círculo ${lvl}, espaço de magia ${i + 1}${isUsed ? ' (gasto)' : ''}`}
                    onClick={() => toggleSlot(lvl, isUsed ? used - 1 : used + 1)}
                    style={{
                      width: 16, height: 16, borderRadius: '50%', cursor: 'pointer',
                      border: '2px solid var(--v2-accent)',
                      background: isUsed ? 'transparent' : 'var(--v2-accent)',
                    }}
                  />
                )
              })}
            </span>
          </div>
        )
      })}
    </div>
  )
}

/* Linhas nativas rápidas dos filtros Ação/Bônus/Reação: um tracker enxuto por
   recurso classificado (actionTypes.js). NÃO coexistem na tela com o
   CombatClassActions rico — este só aparece sob Todas/Limitadas. */
function TypedFeatureRows({ type, featureUses, onSpend }) {
  const rows = (featureUses ?? []).filter(u => actionTypeOf(u.id) === type)
  const label = { action: 'Ações', bonus: 'Ações bônus', reaction: 'Reações' }[type]
  return (
    <div>
      <SectionTitle>{label}</SectionTitle>
      {rows.length === 0
        ? <div className="v2-mut" style={{ fontSize: 13, padding: '4px 0' }}>Nenhum recurso deste tipo.</div>
        : rows.map(u => {
          const remaining = (u.max ?? 0) - (u.used ?? 0)
          return (
            <div key={u.id} className="v2-row">
              <span>{u.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="v2-chip">{remaining}/{u.max}</span>
                <button
                  type="button"
                  className="v2-btn"
                  disabled={remaining <= 0}
                  style={remaining <= 0 ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                  onClick={() => onSpend(u.id)}
                >
                  Usar
                </button>
              </span>
            </div>
          )
        })}
    </div>
  )
}

export function ActionsTab() {
  const { character, calc, updaters, featureUses } = useCharacterContext()
  const [filter, setFilter] = useState('todas')
  const [manageOpen, setManageOpen] = useState(false)

  const {
    addAttack, removeAttack, updateAttack, updateItem,
    setRageActive, spendFeatureUse, regainFeatureUse, toggleSlot,
    setWildShape, applyDamage, toggleKnownBeast, setRangerCompanion, updatePortent,
  } = updaters

  const attacks = character.combat?.attacks ?? []
  const nativeType = filter === 'acao' ? 'action'
    : filter === 'bonus' ? 'bonus'
    : filter === 'reacao' ? 'reaction'
    : null
  const showAttacks = filter === 'todas' || filter === 'acao'
  const showResources = filter === 'todas' || filter === 'limitadas'

  return (
    <div className="space-y-4">
      <div role="group" aria-label="Filtrar ações" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const active = filter === f.id
          return (
            <button
              key={f.id}
              type="button"
              className="v2-chip"
              aria-pressed={active}
              onClick={() => setFilter(f.id)}
              style={{
                cursor: 'pointer',
                border: '1px solid var(--v2-border)',
                background: active ? 'var(--v2-accent)' : 'var(--v2-surface-2)',
                color: active ? 'var(--v2-surface-0)' : 'var(--v2-text-2)',
                fontWeight: active ? 600 : 400,
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {showAttacks && (
        <div>
          <div className="v2-row" style={{ padding: 0 }}>
            <SectionTitle>Ataques</SectionTitle>
            <button type="button" className="v2-btn" onClick={() => setManageOpen(true)}>
              Gerenciar ataques
            </button>
          </div>
          {attacks.length === 0
            ? <div className="v2-mut" style={{ fontSize: 13, padding: '4px 0' }}>Nenhum ataque registrado.</div>
            : attacks.map(atk => (
              <AttackRowV2
                key={atk.id}
                atk={atk}
                attributes={character.attributes}
                profBonus={calc.profBonus}
                ammoItem={findAmmoForAttack(atk, character.inventory?.items ?? [])}
                onUpdateItem={updateItem}
              />
            ))}
        </div>
      )}

      {nativeType && (
        <TypedFeatureRows
          type={nativeType}
          featureUses={featureUses}
          onSpend={id => spendFeatureUse(id, featureUses)}
        />
      )}

      {showResources && (
        <>
          <SpellSlotsSection maxSlots={calc.maxSlots} safeUsedSlots={calc.safeUsedSlots} toggleSlot={toggleSlot} />
          <div>
            <SectionTitle>Recursos de classe</SectionTitle>
            <CombatClassActions
              character={character}
              featureUses={featureUses}
              onToggleRage={setRageActive}
              onSpendFeatureUse={id => spendFeatureUse(id, featureUses)}
              onRegainFeatureUse={id => regainFeatureUse(id, featureUses)}
              onToggleSlot={toggleSlot}
              onSetWildShape={setWildShape}
              onApplyDamage={applyDamage}
              onToggleKnownBeast={toggleKnownBeast}
              onSetRangerCompanion={setRangerCompanion}
              onUpdatePortent={updatePortent}
            />
            <ManeuversPanel
              character={character}
              featureUses={featureUses}
              onSpend={id => spendFeatureUse(id, featureUses)}
            />
          </div>
        </>
      )}

      <EditDialog open={manageOpen} onClose={() => setManageOpen(false)} title="Gerenciar ataques" size="md">
        <Attacks
          attacks={attacks}
          attributes={character.attributes}
          profBonus={calc.profBonus}
          inventoryItems={character.inventory?.items ?? []}
          onAdd={addAttack}
          onRemove={removeAttack}
          onUpdate={updateAttack}
          onUpdateItem={updateItem}
        />
      </EditDialog>
    </div>
  )
}

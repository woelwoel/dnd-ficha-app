import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadCampaignCharacters } from '../../../../lib/campaigns'
import { rowToCharacter } from '../../../../utils/storage'
import { dmApplyCombatState } from '../../../../lib/dmWrites'
import { Button } from '../../../../components/ui/Button'
import { applyDamage, applyHealing, gainTempHp } from '../../domain/rules'
import { calculateInitiative } from '../../utils/calculations'
import { combatPatchFrom } from '../../domain/dmPatch'
import {
  applyNpcDamage, applyNpcHealing, setNpcTempHp, toggleNpcCondition,
  removeCombatant, setInitiative, nextTurn, previousTurn, markOrphans, totalXp,
} from '../../domain/encounter'
import { useEncounter } from './useEncounter'
import { SetupPanel } from './SetupPanel'
import { CombatantRow } from './CombatantRow'
import { PartyRestPanel } from './PartyRestPanel'

/**
 * Tela do Mestre pra rodar o combate da mesa (spec 2026-07-26).
 *
 * Duas fases: montagem (SetupPanel) e combate. O HP do PJ NUNCA é copiado pro
 * encontro — vem do doc da ficha, que esta tela mantém em `docs` e reescreve
 * pela RPC estreita do Mestre.
 */
export function EncounterScreen({ campaignId, onBack }) {
  const { state, update, close, loading, conflict: encConflict } = useEncounter(campaignId)
  const [docs, setDocs] = useState({})       // characterId → doc da ficha
  const [notes, setNotes] = useState({})     // combatantId → aviso transitório
  const [loadingParty, setLoadingParty] = useState(true)

  const reloadParty = useCallback(async () => {
    const rows = await loadCampaignCharacters(campaignId)
    const map = {}
    for (const r of rows) {
      const doc = rowToCharacter(r)
      if (doc) map[r.id] = doc
    }
    setDocs(map)
    setLoadingParty(false)
    return map
  }, [campaignId])

  useEffect(() => { reloadParty() }, [reloadParty])

  // Fichas que saíram da mesa continuam na ordem de iniciativa, só travadas.
  // A guarda de `loadingParty` é essencial: markOrphans com lista vazia
  // marcaria a companhia inteira como órfã.
  useEffect(() => {
    if (loadingParty || !state.started) return
    const live = Object.keys(docs)
    const stale = state.combatants.some(c => c.kind === 'pc' && c.orphaned !== !live.includes(c.characterId))
    if (stale) update(s => markOrphans(s, live))
  }, [docs, loadingParty, state.started, state.combatants, update])

  const party = useMemo(() => Object.values(docs).map(doc => ({
    characterId: doc.id,
    name: doc.info?.name ?? 'Sem nome',
    initiativeBonus: calculateInitiative(doc.attributes?.dex ?? 10, { feats: doc.info?.feats ?? [] }),
  })), [docs])

  function note(combatantId, text) {
    setNotes(prev => ({ ...prev, [combatantId]: text }))
  }

  /** Roda a regra em JS e manda só o patch estreito pro banco. */
  async function writePc(combatant, mutate) {
    const doc = docs[combatant.characterId]
    if (!doc) return
    const { character: next, sideEffects } = mutate(doc)
    setDocs(prev => ({ ...prev, [doc.id]: next }))       // otimista
    const res = await dmApplyCombatState(doc.id, combatPatchFrom(next), doc.version)
    if (res.ok) {
      setDocs(prev => ({ ...prev, [doc.id]: { ...next, version: res.version } }))
      const msgs = []
      if (sideEffects?.concentrationCheckDC) msgs.push(`CD ${sideEffects.concentrationCheckDC} de concentração`)
      if (sideEffects?.instakill) msgs.push('morte instantânea por dano massivo')
      else if (sideEffects?.died) msgs.push('morreu (3 falhas)')
      else if (sideEffects?.droppedTo0) msgs.push('caiu a 0 PV')
      note(combatant.id, msgs.join(' · '))
      return
    }
    await reloadParty()
    note(combatant.id, res.reason === 'conflict'
      ? 'a ficha mudou no meio — recarregada, tente de novo'
      : `falha ao escrever na ficha (${res.reason})`)
  }

  const byId = (id) => state.combatants.find(c => c.id === id)

  const onDamage = (id, amount) => {
    const c = byId(id)
    if (!c) return
    if (c.kind === 'npc') return update(s => applyNpcDamage(s, id, amount))
    return writePc(c, doc => applyDamage(doc, amount))
  }
  const onHeal = (id, amount) => {
    const c = byId(id)
    if (!c) return
    if (c.kind === 'npc') return update(s => applyNpcHealing(s, id, amount))
    // applyHealing já devolve { character, sideEffects } (rules.js:1145).
    return writePc(c, doc => applyHealing(doc, amount))
  }
  const onTempHp = (id, amount) => {
    const c = byId(id)
    if (!c) return
    if (c.kind === 'npc') return update(s => setNpcTempHp(s, id, amount))
    // gainTempHp devolve { character } sem sideEffects (rules.js:1179).
    return writePc(c, doc => gainTempHp(doc, amount))
  }
  const onToggleCondition = (id, conditionId) => {
    const c = byId(id)
    if (!c) return
    if (c.kind === 'npc') return update(s => toggleNpcCondition(s, id, conditionId))
    return writePc(c, doc => {
      const list = doc.combat?.conditions ?? []
      const conditions = list.includes(conditionId)
        ? list.filter(x => x !== conditionId)
        : [...list, conditionId]
      return { character: { ...doc, combat: { ...doc.combat, conditions } }, sideEffects: null }
    })
  }

  if (loading || loadingParty) {
    return <div className="p-6 text-ink-300 ink-italic text-sm">Carregando mesa de combate…</div>
  }

  return (
    <div className="min-h-screen p-4 bg-parchment-100 text-ink-500">
      <header className="max-w-3xl mx-auto mb-4">
        <button onClick={onBack} className="text-xs ink-italic text-ink-300 hover:text-ink-500">← Mesa</button>
        <h1 className="text-2xl font-display tracking-widest uppercase text-ink-500 mt-1">Combate</h1>
        {state.started && (
          <p className="text-xs ink-italic text-ink-300">
            Rodada {state.round} · {totalXp(state)} XP em monstros
          </p>
        )}
        {encConflict && (
          <p className="text-xs text-amber-800 ink-italic">o encontro mudou em outra tela — recarregado</p>
        )}
      </header>

      <div className="max-w-3xl mx-auto grid gap-4">
        {!state.started ? (
          <SetupPanel party={party} onStart={(next) => update(() => next)} />
        ) : (
          <>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => update(previousTurn)}>Anterior</Button>
              <Button size="sm" onClick={() => update(nextTurn)}>Próximo</Button>
            </div>

            <ul className="rounded-sm border-2 border-parchment-600 bg-parchment-50 divide-y divide-parchment-600/50 overflow-hidden">
              {state.combatants.map(c => (
                <CombatantRow
                  key={c.id}
                  combatant={c}
                  doc={c.kind === 'pc' ? docs[c.characterId] ?? null : null}
                  active={state.activeId === c.id}
                  warning={notes[c.id]}
                  onDamage={onDamage}
                  onHeal={onHeal}
                  onTempHp={onTempHp}
                  onToggleCondition={onToggleCondition}
                  onRemove={(id) => update(s => removeCombatant(s, id))}
                  onInitiativeChange={(id, v) => update(s => setInitiative(s, id, v))}
                />
              ))}
            </ul>

            <PartyRestPanel docs={docs} onRested={reloadParty} />

            <div>
              <Button variant="ghost" size="sm" onClick={close}>Encerrar combate</Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

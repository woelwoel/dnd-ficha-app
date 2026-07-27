import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  // Espelho de `docs` pra decidir de forma SÍNCRONA se a releitura trouxe
  // verdade nova: o updater do setDocs só roda no próximo render, tarde demais
  // pra quem precisa da resposta ainda dentro da mesma função.
  const docsRef = useRef(docs)

  const commitDocs = useCallback((next) => {
    docsRef.current = next
    setDocs(next)
  }, [])

  const reloadParty = useCallback(async () => {
    const rows = await loadCampaignCharacters(campaignId)
    const map = {}
    for (const r of rows) {
      const doc = rowToCharacter(r)
      if (doc) map[r.id] = doc
    }
    // `loadCampaignCharacters` NUNCA lança: em erro de rede ela engole o erro
    // e devolve [] (src/lib/campaigns.js:199) — exatamente o mesmo formato de
    // uma mesa genuinamente vazia. Por isso NUNCA sobrescrevemos uma `docs`
    // já povoada com um resultado vazio: perder a companhia inteira da tela
    // por causa de um problema de leitura é pior que manter o valor antigo
    // (mesmo que esse valor possa estar desatualizado).
    const engoliuErro = Object.keys(map).length === 0 && Object.keys(docsRef.current).length > 0
    if (!engoliuErro) commitDocs(map)
    setLoadingParty(false)
    return { docs: docsRef.current, resynced: !engoliuErro }
  }, [campaignId, commitDocs])

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
    commitDocs({ ...docsRef.current, [doc.id]: next })   // otimista
    const res = await dmApplyCombatState(doc.id, combatPatchFrom(next), doc.version)
    if (res.ok) {
      commitDocs({ ...docsRef.current, [doc.id]: { ...next, version: res.version } })
      const msgs = []
      if (sideEffects?.concentrationCheckDC) msgs.push(`CD ${sideEffects.concentrationCheckDC} de concentração`)
      if (sideEffects?.instakill) msgs.push('morte instantânea por dano massivo')
      else if (sideEffects?.died) msgs.push('morreu (3 falhas)')
      else if (sideEffects?.droppedTo0) msgs.push('caiu a 0 PV')
      note(combatant.id, msgs.join(' · '))
      return
    }
    // A escrita foi recusada: `docs` está preso no valor otimista, que pode
    // estar errado. Tenta confirmar a verdade recarregando a companhia — e
    // `reloadParty` já se protege de devolver um resultado vazio ambíguo (ver
    // comentário lá). `resynced: false` é o pior caso: nem a escrita nem a
    // releitura confirmaram nada, e o valor na tela pode estar errado.
    const { resynced } = await reloadParty()
    note(combatant.id, !resynced
      ? 'falha ao escrever E ao recarregar — o valor na tela pode estar errado, recarregue a página'
      : res.reason === 'conflict'
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
              {/* Aviso transitório (ex.: CD de concentração) não deve sobreviver à
                  virada de turno — senão parece um alerta do turno atual. */}
              <Button size="sm" variant="ghost" onClick={() => { setNotes({}); update(previousTurn) }}>Anterior</Button>
              <Button size="sm" onClick={() => { setNotes({}); update(nextTurn) }}>Próximo</Button>
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

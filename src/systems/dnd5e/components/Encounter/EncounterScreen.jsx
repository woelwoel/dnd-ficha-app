import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { loadCampaignCharacters } from '../../../../lib/campaigns'
import { rowToCharacter } from '../../../../utils/storage'
import { dmApplyCombatState } from '../../../../lib/dmWrites'
import { applyDamage, applyHealing, gainTempHp } from '../../domain/rules'
import { calculateInitiative } from '../../utils/calculations'
import { characterLevel } from '../../domain/party'
import { combatPatchFrom } from '../../domain/dmPatch'
import {
  applyNpcDamage, applyNpcHealing, setNpcTempHp, toggleNpcCondition, setConditionDuration,
  removeCombatant, setInitiative, nextTurn, previousTurn, markOrphans, totalXp,
  addNpc, rollInitiativeFor, restoreCombatant,
} from '../../domain/encounter'
import { BestiaryModal } from '../Bestiary/BestiaryModal'
import { useEncounter } from './useEncounter'
import { SetupPanel } from './SetupPanel'
import { CombatantRow } from './CombatantRow'
import { CombatantDetail } from './CombatantDetail'
import { EncounterToolbar, UndoBar } from './EncounterToolbar'
import { PartyRestPanel } from './PartyRestPanel'

/**
 * Tela do Mestre pra rodar o combate da mesa (specs 2026-07-26 e 2026-07-31).
 *
 * Casca de layout e orquestração: duas fases (montagem e combate) e, na fase de
 * combate, duas colunas — ordem de iniciativa à esquerda, detalhe do
 * selecionado à direita.
 *
 * O HP do PJ NUNCA é copiado pro encontro — vem do doc da ficha, que esta tela
 * mantém em `docs` e reescreve pela RPC estreita do Mestre.
 */
export function EncounterScreen({ campaignId, onBack }) {
  const { state, update, close, loading, conflict: encConflict } = useEncounter(campaignId)
  const [docs, setDocs] = useState({})       // characterId → doc da ficha
  const [notes, setNotes] = useState({})     // combatantId → aviso transitório
  const [loadingParty, setLoadingParty] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [lastAction, setLastAction] = useState(null)
  const [log, setLog] = useState([])
  const [bestiaryOpen, setBestiaryOpen] = useState(false)
  const logSeq = useRef(0)
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
    level: characterLevel(doc),
    initiativeBonus: calculateInitiative(doc.attributes?.dex ?? 10, { feats: doc.info?.feats ?? [] }),
  })), [docs])

  const byId = useCallback(
    (id) => state.combatants.find(c => c.id === id),
    [state.combatants],
  )

  // Seleção é estado LOCAL, nunca do jsonb: persistir faria os dois aparelhos
  // do Mestre brigarem pelo foco e queimaria um bump de versão por clique.
  const selected = byId(selectedId) ?? null

  function note(combatantId, text) {
    setNotes(prev => ({ ...prev, [combatantId]: text }))
  }

  const appendLog = useCallback((text) => {
    logSeq.current += 1
    const entry = { seq: logSeq.current, round: state.round, text }
    setLog(prev => [entry, ...prev].slice(0, 50))
  }, [state.round])

  /** Virar o turno zera o que é do turno anterior: avisos e desfazer. */
  function turn(fn) {
    setNotes({})
    setLastAction(null)
    update(s => {
      const next = fn(s)
      setSelectedId(next.activeId)
      return next
    })
  }

  /** Roda a regra em JS e manda só o patch estreito pro banco. */
  const writePc = useCallback(async (combatant, mutate) => {
    const doc = docsRef.current[combatant.characterId]
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
      if (msgs.length > 0) appendLog(`${combatant.name}: ${msgs.join(' · ')}`)
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
  }, [commitDocs, reloadParty, appendLog])

  /**
   * Arma o slot único de desfazer. Monstro volta pelo snapshot do combatente
   * (restaurar o `state` inteiro atropelaria o outro aparelho do Mestre);
   * PJ volta reescrevendo o bloco `combat` anterior pela mesma RPC.
   */
  const armUndo = useCallback((combatant, label) => {
    if (combatant.kind === 'npc') {
      const snapshot = combatant
      setLastAction({ combatantId: combatant.id, label, undo: () => update(s => restoreCombatant(s, snapshot)) })
      return
    }
    const anterior = docsRef.current[combatant.characterId]?.combat
    if (!anterior) return
    setLastAction({
      combatantId: combatant.id,
      label,
      undo: () => writePc(combatant, doc => ({ character: { ...doc, combat: anterior }, sideEffects: null })),
    })
  }, [update, writePc])

  const onDamage = (id, amount) => {
    const c = byId(id)
    if (!c || amount <= 0) return
    armUndo(c, `Dano de ${amount} em ${c.name}`)
    appendLog(`${c.name} sofreu ${amount} de dano`)
    if (c.kind === 'npc') return update(s => applyNpcDamage(s, id, amount))
    return writePc(c, doc => applyDamage(doc, amount))
  }
  const onHeal = (id, amount) => {
    const c = byId(id)
    if (!c || amount <= 0) return
    armUndo(c, `Cura de ${amount} em ${c.name}`)
    appendLog(`${c.name} recuperou ${amount} de vida`)
    if (c.kind === 'npc') return update(s => applyNpcHealing(s, id, amount))
    // applyHealing já devolve { character, sideEffects } (rules.js:1145).
    return writePc(c, doc => applyHealing(doc, amount))
  }
  const onTempHp = (id, amount) => {
    const c = byId(id)
    if (!c || amount <= 0) return
    armUndo(c, `HP temporário de ${amount} em ${c.name}`)
    appendLog(`${c.name} ganhou ${amount} de HP temporário`)
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
  const onSetConditionDuration = (id, conditionId, rounds) =>
    update(s => setConditionDuration(s, id, conditionId, rounds))

  function addMonster(monster) {
    setBestiaryOpen(false)
    setLastAction(null)
    update(s => {
      // `addNpc` usa `s.nextSeq` pro id, então o id do recém-entrado é
      // previsível — é o que permite rolar a iniciativa só dele em seguida.
      const novoId = `k${s.nextSeq}`
      return rollInitiativeFor(addNpc(s, monster), novoId)
    })
    appendLog(`${monster.name} entrou no combate`)
  }

  function onRemove(id) {
    const c = byId(id)
    setLastAction(null)
    if (selectedId === id) setSelectedId(null)
    if (c) appendLog(`${c.name} saiu do combate`)
    update(s => removeCombatant(s, id))
  }

  async function undo() {
    const acao = lastAction
    setLastAction(null)
    if (!acao) return
    appendLog(`desfeito: ${acao.label.toLowerCase()}`)
    await acao.undo()
  }

  if (loading || loadingParty) {
    return <div className="p-6 text-ink-300 ink-italic text-sm">Carregando mesa de combate…</div>
  }

  // Desfazer some junto com o combatente que ele desfaria.
  const undoAtivo = lastAction && byId(lastAction.combatantId) ? lastAction : null

  return (
    <div className="min-h-screen p-4 bg-parchment-100 text-ink-500">
      <header className="max-w-6xl mx-auto mb-3">
        <button onClick={onBack} className="text-xs ink-italic text-ink-300 hover:text-ink-500">← Mesa</button>
        <h1 className="text-2xl font-display tracking-widest uppercase text-ink-500 mt-1">Combate</h1>
        {encConflict && (
          <p className="text-xs text-amber-800 ink-italic">o encontro mudou em outra tela — recarregado</p>
        )}
      </header>

      <div className="max-w-6xl mx-auto">
        {!state.started ? (
          <div className="max-w-3xl">
            <SetupPanel party={party} campaignId={campaignId} onStart={(next) => update(() => next)} />
          </div>
        ) : (
          <>
            <EncounterToolbar
              round={state.round}
              xp={totalXp(state)}
              onPrevious={() => turn(previousTurn)}
              onNext={() => turn(nextTurn)}
              onAdd={() => setBestiaryOpen(true)}
              onClose={close}
            />

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] items-start">
              <div className="flex flex-col gap-4 min-w-0">
                <UndoBar action={undoAtivo} onUndo={undo} />

                <ul
                  aria-label="Ordem de iniciativa"
                  className="rounded-sm border-2 border-parchment-600 bg-parchment-50 divide-y divide-parchment-600/50 overflow-hidden"
                >
                  {state.combatants.map(c => (
                    <CombatantRow
                      key={c.id}
                      combatant={c}
                      doc={c.kind === 'pc' ? docs[c.characterId] ?? null : null}
                      active={state.activeId === c.id}
                      selected={selectedId === c.id}
                      warning={notes[c.id]}
                      onSelect={setSelectedId}
                      onDamage={onDamage}
                      onHeal={onHeal}
                      onRemove={onRemove}
                      onInitiativeChange={(id, v) => update(s => setInitiative(s, id, v))}
                    />
                  ))}
                </ul>

                <PartyRestPanel docs={docs} onRested={reloadParty} />
              </div>

              <CombatantDetail
                combatant={selected}
                doc={selected?.kind === 'pc' ? docs[selected.characterId] ?? null : null}
                round={state.round}
                log={log}
                onTempHp={onTempHp}
                onToggleCondition={onToggleCondition}
                onSetConditionDuration={onSetConditionDuration}
              />
            </div>

            <BestiaryModal
              isOpen={bestiaryOpen}
              onClose={() => setBestiaryOpen(false)}
              onPick={addMonster}
            />
          </>
        )}
      </div>
    </div>
  )
}

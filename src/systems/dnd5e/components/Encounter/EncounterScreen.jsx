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
  addNpc, rollInitiativeFor, restoreCombatant, applyNpcDamageMany, halfDamage,
} from '../../domain/encounter'
import { AreaDamagePanel } from './AreaDamagePanel'
import { BestiaryModal } from '../Bestiary/BestiaryModal'
import { useEncounter } from './useEncounter'
import { SetupPanel } from './SetupPanel'
import { CombatantRow } from './CombatantRow'
import { CombatantDetail } from './CombatantDetail'
import { EncounterToolbar, UndoBar } from './EncounterToolbar'
import { PartyRestPanel } from './PartyRestPanel'

/**
 * Lê `?encontro=` sem hook de rota: é um valor de leitura única, usado na
 * montagem, e exigir `useSearchParams` faria toda a árvore de combate passar a
 * depender de um <Router> em volta — inclusive nos testes de componente.
 */
function templateIdFromUrl() {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('encontro')
}

/**
 * Tela do Mestre pra rodar o combate da mesa (specs 2026-07-26 e 2026-07-31).
 *
 * Casca de layout e orquestração: duas fases (montagem e combate) e, na fase de
 * combate, duas colunas — ordem de iniciativa à esquerda, detalhe do
 * selecionado à direita.
 *
 * O HP do PJ NUNCA é copiado pro encontro — vem do doc da ficha, que esta tela
 * mantém em `docs` e reescreve pela RPC estreita do Mestre.
 *
 * @param {string} [preloadId] — encontro salvo a carregar na montagem. O
 *   padrão lê `?encontro=` da própria URL (é assim que o botão "Rodar" da
 *   biblioteca chega aqui): query string, e não estado de rota, pra sobreviver
 *   a um recarregamento no meio da sessão.
 */
export function EncounterScreen({ campaignId, onBack, preloadId = templateIdFromUrl() }) {
  const { state, update, close, loading, conflict: encConflict } = useEncounter(campaignId)
  const [docs, setDocs] = useState({})       // characterId → doc da ficha
  const [notes, setNotes] = useState({})     // combatantId → aviso transitório
  const [loadingParty, setLoadingParty] = useState(true)
  const [selectedId, setSelectedId] = useState(null)
  const [lastAction, setLastAction] = useState(null)
  const [log, setLog] = useState([])
  const [bestiaryOpen, setBestiaryOpen] = useState(false)
  const [area, setArea] = useState(null) // { amount, targets:Set, saved:Set, busy }
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
   * Arma o slot único de desfazer, para um ou vários combatentes.
   *
   * Monstro volta pelo snapshot do combatente — restaurar o `state` inteiro
   * seria mais simples e atropelaria o que o outro aparelho do Mestre mudou no
   * meio. PJ volta reescrevendo o bloco `combat` anterior pela mesma RPC.
   *
   * A lista existe por causa do dano em área: desfazer só metade de uma bola de
   * fogo seria pior que não desfazer.
   */
  const armUndo = useCallback((combatants, label) => {
    const alvos = [].concat(combatants)
    const npcs = alvos.filter(c => c.kind === 'npc')
    const pcs = alvos
      .filter(c => c.kind === 'pc')
      .map(c => ({ combatant: c, combat: docsRef.current[c.characterId]?.combat }))
      .filter(x => x.combat)
    if (npcs.length === 0 && pcs.length === 0) return

    setLastAction({
      ids: alvos.map(c => c.id),
      label,
      undo: async () => {
        // Monstros numa escrita só, pelo mesmo motivo do dano em lote.
        if (npcs.length > 0) {
          await update(s => npcs.reduce((acc, snap) => restoreCombatant(acc, snap), s))
        }
        await Promise.all(pcs.map(({ combatant, combat }) =>
          writePc(combatant, doc => ({ character: { ...doc, combat }, sideEffects: null }))))
      },
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

  function toggleTarget(id) {
    setArea(a => {
      if (!a) return a
      const targets = new Set(a.targets)
      const saved = new Set(a.saved)
      if (targets.has(id)) { targets.delete(id); saved.delete(id) }
      else targets.add(id)
      return { ...a, targets, saved }
    })
  }

  /**
   * Resolve a área inteira de uma vez: monstros numa única escrita no jsonb
   * (senão o segundo save levaria conflito contra o primeiro), PJs em paralelo
   * pela RPC, que é por natureza uma escrita por ficha.
   */
  async function applyArea() {
    if (!area) return
    const valor = Math.max(0, Math.floor(Number(area.amount) || 0))
    const alvos = state.combatants.filter(c => area.targets.has(c.id))
    // PJ órfão fica de fora, como já fica do dano individual.
    const validos = alvos.filter(c => !(c.kind === 'pc' && (c.orphaned || !docs[c.characterId])))
    if (valor <= 0 || validos.length === 0) return

    const dano = (c) => (area.saved.has(c.id) ? halfDamage(valor) : valor)

    setArea(a => ({ ...a, busy: true }))
    armUndo(validos, `Dano em área de ${valor} em ${validos.length} alvo(s)`)
    appendLog(`área de ${valor}: ${validos.map(c => `${c.name} ${dano(c)}`).join(', ')}`)

    const npcs = validos.filter(c => c.kind === 'npc')
    if (npcs.length > 0) {
      await update(s => applyNpcDamageMany(s, npcs.map(c => ({ id: c.id, amount: dano(c) }))))
    }
    await Promise.all(validos
      .filter(c => c.kind === 'pc')
      .map(c => writePc(c, doc => applyDamage(doc, dano(c)))))

    setArea(null)
  }

  if (loading || loadingParty) {
    return <div className="p-6 text-ink-300 ink-italic text-sm">Carregando mesa de combate…</div>
  }

  // Some quando TODOS os alvos saíram: um monstro removido dos seis não invalida
  // o desfazer dos outros cinco, e `restoreCombatant` já ignora quem sumiu.
  const undoAtivo = lastAction && lastAction.ids.some(id => byId(id)) ? lastAction : null

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
            <SetupPanel
              party={party}
              campaignId={campaignId}
              preloadId={preloadId}
              onStart={(next) => update(() => next)}
            />
          </div>
        ) : (
          <>
            <EncounterToolbar
              round={state.round}
              xp={totalXp(state)}
              onPrevious={() => turn(previousTurn)}
              onNext={() => turn(nextTurn)}
              onAdd={() => setBestiaryOpen(true)}
              onArea={() => setArea({ amount: '', targets: new Set(), saved: new Set(), busy: false })}
              areaOn={!!area}
              onClose={close}
            />

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_24rem] items-start">
              <div className="flex flex-col gap-4 min-w-0">
                <UndoBar action={undoAtivo} onUndo={undo} />

                {area && (
                  <AreaDamagePanel
                    amount={area.amount}
                    onAmountChange={(v) => setArea(a => ({ ...a, amount: v }))}
                    targets={state.combatants.filter(c => area.targets.has(c.id))}
                    saved={area.saved}
                    onToggleSaved={(id) => setArea(a => {
                      const saved = new Set(a.saved)
                      if (saved.has(id)) saved.delete(id); else saved.add(id)
                      return { ...a, saved }
                    })}
                    onApply={applyArea}
                    onCancel={() => setArea(null)}
                    busy={area.busy}
                  />
                )}

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
                      targeting={!!area}
                      targeted={!!area?.targets.has(c.id)}
                      onToggleTarget={toggleTarget}
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

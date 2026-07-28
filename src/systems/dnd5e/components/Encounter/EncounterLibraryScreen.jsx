import { useCallback, useEffect, useMemo, useState } from 'react'
import { listTemplates, createTemplate, updateTemplate, deleteTemplate } from '../../../../lib/encounterTemplates'
import { loadCampaignCharacters } from '../../../../lib/campaigns'
import { rowToCharacter } from '../../../../utils/storage'
import { Button } from '../../../../components/ui/Button'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'
import { partyLevels } from '../../domain/party'
import { emptyEncounterState, addNpc, totalXp } from '../../domain/encounter'
import { summarizeEncounter } from '../../domain/encounterDifficulty'
import { MonsterGroupPanel } from './MonsterGroupPanel'
import { DifficultyMeter } from './DifficultyMeter'
import { useLazySrdDataset } from '../../data/SrdProvider'

const BAND_LABEL = {
  trivial: 'Trivial', easy: 'Fácil', medium: 'Médio', hard: 'Difícil', deadly: 'Mortal',
}

/** `state` de encontro → receita salva: agrupa repetidos em `count`. */
export function toRecipe(state) {
  const byIndex = new Map()
  for (const c of state.combatants) {
    if (c.kind !== 'npc') continue
    byIndex.set(c.monsterIndex, (byIndex.get(c.monsterIndex) ?? 0) + 1)
  }
  return [...byIndex].map(([monsterIndex, count]) => ({ monsterIndex, count }))
}

/** Receita salva → `state` de encontro, usando o catálogo pra achar o statblock. */
export function fromRecipe(recipe, monstersByIndex) {
  let s = emptyEncounterState()
  const unknown = []
  for (const item of recipe ?? []) {
    const monster = monstersByIndex.get(item.monsterIndex)
    if (!monster) { unknown.push(item.monsterIndex); continue }
    const count = Math.max(1, Math.floor(Number(item.count) || 1))
    for (let i = 0; i < count; i++) s = addNpc(s, monster)
  }
  return { state: s, unknown }
}

/**
 * Tela de preparação: a biblioteca de encontros salvos da mesa.
 *
 * Separada da tela de combate de propósito — abrir aquela CRIA um encontro
 * ativo no banco, e preparar não deveria abrir uma luta que ninguém joga.
 */
export function EncounterLibraryScreen({ campaignId, onBack }) {
  // Catálogo sob demanda: 1,3 MB que só esta tela e o bestiário precisam.
  const catalog = useLazySrdDataset('monsters')
  const [templates, setTemplates] = useState([])
  const [levels, setLevels] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // { id|null, name, group }
  const [error, setError] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const byIndex = useMemo(() => {
    const m = new Map()
    for (const mon of catalog ?? []) m.set(mon.index, mon)
    return m
  }, [catalog])

  const reload = useCallback(async () => {
    const [rows, chars] = await Promise.all([
      listTemplates(campaignId),
      loadCampaignCharacters(campaignId),
    ])
    setTemplates(rows)
    setLevels(partyLevels(chars.map(rowToCharacter).filter(Boolean)))
    setLoading(false)
  }, [campaignId])

  useEffect(() => { reload() }, [reload])

  function novo() {
    setError(null)
    setEditing({ id: null, name: '', group: emptyEncounterState() })
  }

  function editar(tpl) {
    setError(null)
    const { state } = fromRecipe(tpl.monsters, byIndex)
    setEditing({ id: tpl.id, name: tpl.name, group: state })
  }

  async function salvar() {
    const recipe = toRecipe(editing.group)
    const res = editing.id
      ? await updateTemplate(editing.id, { name: editing.name, monsters: recipe })
      : await createTemplate(campaignId, editing.name, recipe)
    if (!res.ok) {
      setError(res.reason === 'duplicate-name'
        ? 'Já existe um encontro com esse nome nesta mesa.'
        : res.reason === 'invalid-name'
          ? 'O nome precisa ter de 1 a 80 caracteres.'
          : 'Não consegui salvar. Tente de novo.')
      return
    }
    setEditing(null)
    setError(null)
    reload()
  }

  if (loading) return <div className="p-6 text-ink-300 ink-italic text-sm">Carregando encontros…</div>

  return (
    <div className="min-h-screen p-4 bg-parchment-100 text-ink-500">
      <header className="max-w-3xl mx-auto mb-4">
        <button onClick={onBack} className="text-xs ink-italic text-ink-300 hover:text-ink-500">← Mesa</button>
        <h1 className="text-2xl font-display tracking-widest uppercase text-ink-500 mt-1">Encontros</h1>
      </header>

      <div className="max-w-3xl mx-auto grid gap-4">
        {editing ? (
          <>
            <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 p-4 flex flex-col gap-3">
              <label className="text-xs ink-italic text-ink-300 flex flex-col gap-1">
                Nome do encontro
                <input
                  type="text"
                  aria-label="Nome do encontro"
                  value={editing.name}
                  onChange={e => setEditing(v => ({ ...v, name: e.target.value }))}
                  className="px-2 py-1 text-sm text-ink-500 border-2 border-parchment-600 bg-parchment-50 rounded-sm"
                />
              </label>
              {error && <p className="text-xs text-red-700">{error}</p>}
            </section>

            <MonsterGroupPanel value={editing.group} onChange={g => setEditing(v => ({ ...v, group: g }))} />

            <DifficultyMeter
              monsterXpTotal={totalXp(editing.group)}
              monsterCount={editing.group.combatants.length}
              levels={levels}
            />

            <div className="flex gap-2">
              <Button size="sm" onClick={salvar}>Salvar</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setError(null) }}>Cancelar</Button>
            </div>
          </>
        ) : (
          <>
            <div><Button size="sm" onClick={novo}>Novo encontro</Button></div>

            <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden">
              <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100">
                Salvos ({templates.length})
              </h2>
              {templates.length === 0 ? (
                <p className="p-4 text-sm ink-italic text-ink-300">
                  Nenhum encontro salvo nesta mesa ainda.
                </p>
              ) : (
                <ul className="divide-y divide-parchment-600/50">
                  {templates.map(tpl => {
                    const { state, unknown } = fromRecipe(tpl.monsters, byIndex)
                    const s = summarizeEncounter({
                      monsterXpTotal: totalXp(state),
                      monsterCount: state.combatants.length,
                      levels,
                    })
                    return (
                      <li key={tpl.id} className="px-4 py-2 flex flex-wrap items-center gap-3">
                        <span className="flex-1 text-sm font-display tracking-wide">{tpl.name}</span>
                        <span className="text-xs ink-italic text-ink-300">{s.adjusted} XP ajustado</span>
                        {s.band && <span className="text-xs text-ink-500">{BAND_LABEL[s.band]}</span>}
                        {unknown.length > 0 && (
                          <span className="text-xs ink-italic text-red-700">
                            {unknown.length} monstro(s) desconhecido(s)
                          </span>
                        )}
                        <button type="button" onClick={() => editar(tpl)}
                          className="text-xs text-ink-500 underline">editar</button>
                        <button
                          type="button"
                          aria-label={`Apagar ${tpl.name}`}
                          onClick={() => setConfirmDelete(tpl)}
                          className="text-xs text-red-700 underline"
                        >
                          apagar
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Apagar encontro salvo?"
        message={<p>O encontro <strong>{confirmDelete?.name}</strong> some da mesa. Não há como desfazer.</p>}
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={async () => {
          const alvo = confirmDelete
          setConfirmDelete(null)
          if (alvo) { await deleteTemplate(alvo.id); reload() }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  )
}

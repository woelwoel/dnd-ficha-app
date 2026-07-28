import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../../../components/ui/Button'
import { emptyEncounterState, addPc, rollInitiative, startEncounter, totalXp } from '../../domain/encounter'
import { MonsterGroupPanel } from './MonsterGroupPanel'
import { DifficultyMeter } from './DifficultyMeter'
import { listTemplates } from '../../../../lib/encounterTemplates'
import { useLazySrdDataset } from '../../data/SrdProvider'
import { fromRecipe } from './EncounterLibraryScreen'

/**
 * Fase de montagem: quem da companhia está na cena, quais monstros entram, e a
 * rolagem de iniciativa que inicia o combate.
 *
 * Puro em relação a dados: recebe `party` (companhia já carregada pela tela de
 * cima) e devolve o state montado via `onStart`. Não fala com Supabase.
 *
 * @param {Array<{characterId,name,initiativeBonus}>} party — companhia da mesa
 * @param {(state:object) => void} onStart — recebe o state já iniciado
 * @param {string} [campaignId] — pra listar encontros salvos da mesa
 * @param {() => number} [rng] — injetável pro teste fixar o dado
 */
export function SetupPanel({ party, onStart, campaignId, rng = Math.random }) {
  const [excluded, setExcluded] = useState(() => new Set())
  const [monsters, setMonsters] = useState(emptyEncounterState)
  const catalog = useLazySrdDataset('monsters')
  const [saved, setSaved] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    let alive = true
    if (!campaignId) return
    listTemplates(campaignId).then(rows => { if (alive) setSaved(rows) })
    return () => { alive = false }
  }, [campaignId])

  const byIndex = useMemo(() => {
    const m = new Map()
    for (const mon of catalog ?? []) m.set(mon.index, mon)
    return m
  }, [catalog])

  function carregar(tpl) {
    // Acrescenta à cena em vez de substituir: o Mestre pode juntar dois grupos.
    const { state: grupo } = fromRecipe(tpl.monsters, byIndex)
    setMonsters(prev => grupo.combatants.reduce(
      (s, m) => ({ ...s, nextSeq: s.nextSeq + 1, combatants: [...s.combatants, { ...m, id: `k${s.nextSeq}` }] }),
      prev,
    ))
    setPickerOpen(false)
  }

  const chosen = party.filter(p => !excluded.has(p.characterId))
  const canStart = chosen.length + monsters.combatants.length > 0

  // O medidor usa quem está MARCADO na cena, não a mesa inteira — é a
  // informação mais precisa disponível neste momento.
  const levels = chosen.map(p => p.level ?? 1)

  function toggle(characterId) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(characterId)) next.delete(characterId)
      else next.add(characterId)
      return next
    })
  }

  function start() {
    let s = emptyEncounterState()
    for (const p of chosen) {
      s = addPc(s, { characterId: p.characterId, name: p.name, initiativeBonus: p.initiativeBonus ?? 0 })
    }
    for (const m of monsters.combatants) {
      // Reusa o combatente já montado (nome/ordinal/status), só renumerando o
      // id na sequência nova — o id de rascunho não sobrevive à montagem.
      s = { ...s, nextSeq: s.nextSeq + 1, combatants: [...s.combatants, { ...m, id: `k${s.nextSeq}` }] }
    }
    onStart(startEncounter(rollInitiative(s, rng).state))
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden">
        <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100">
          Quem está na cena ({chosen.length})
        </h2>
        {party.length === 0 ? (
          <p className="p-4 text-sm ink-italic text-ink-300">Nenhuma ficha vinculada à mesa.</p>
        ) : (
          <ul className="divide-y divide-parchment-600/50">
            {party.map(p => (
              <li key={p.characterId} className="px-4 py-2 flex items-center gap-3">
                <input
                  id={`cena-${p.characterId}`}
                  type="checkbox"
                  checked={!excluded.has(p.characterId)}
                  onChange={() => toggle(p.characterId)}
                  className="w-4 h-4"
                />
                <label htmlFor={`cena-${p.characterId}`} className="flex-1 text-sm text-ink-500">
                  {p.name}
                </label>
                <span className="text-xs ink-italic text-ink-300">
                  inic. {(p.initiativeBonus ?? 0) >= 0 ? '+' : ''}{p.initiativeBonus ?? 0}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {saved.length > 0 && (
        <div className="flex flex-col gap-2">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setPickerOpen(o => !o)}>
              Carregar encontro salvo
            </Button>
          </div>
          {pickerOpen && (
            <ul className="rounded-sm border-2 border-parchment-600 bg-parchment-50 divide-y divide-parchment-600/50">
              {saved.map(t => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => carregar(t)}
                    className="w-full text-left px-4 py-2 text-sm text-ink-500 hover:bg-parchment-200"
                  >
                    {t.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <MonsterGroupPanel value={monsters} onChange={setMonsters} />

      <DifficultyMeter
        monsterXpTotal={totalXp(monsters)}
        monsterCount={monsters.combatants.length}
        levels={levels}
      />

      <div>
        <Button onClick={start} disabled={!canStart}>Rolar iniciativa</Button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { MonsterStatBlock } from '../Bestiary/MonsterStatBlock'
import { useMonsterCatalog } from '../../utils/useMonsterCatalog'
import { useLanguage } from '../../../../utils/useLanguage'
import { MonsterActionList } from './MonsterActionList'
import { PcTacticalCard } from './PcTacticalCard'
import { ConditionPalette } from './ConditionPalette'
import { CombatLog } from './CombatLog'

/**
 * Painel lateral: tudo que é consulta ou gesto eventual sobre o combatente
 * selecionado. Renderiza UMA vez só — em telas largas fica à direita, abaixo de
 * `lg` cai sob a lista pelo próprio grid, sem `matchMedia` e sem segunda
 * instância no DOM.
 */
export function CombatantDetail({
  combatant, doc, round, log,
  onTempHp, onToggleCondition, onSetConditionDuration,
}) {
  const [tempInput, setTempInput] = useState('')
  // Catálogo sob demanda: 1,3 MB que o statblock precisa e a lista não.
  const { byIndex, loading: carregandoCatalogo } = useMonsterCatalog()
  const { lang } = useLanguage()

  if (!combatant) {
    return (
      <aside className="rounded-sm border-2 border-parchment-600 bg-parchment-50 p-4">
        <p className="text-sm ink-italic text-ink-300">
          Escolha alguém na ordem de iniciativa para ver o statblock, marcar condições
          e ler o registro.
        </p>
        <div className="mt-4"><CombatLog entries={log} /></div>
      </aside>
    )
  }

  const isPc = combatant.kind === 'pc'
  const locked = isPc && (combatant.orphaned || !doc)
  const monster = isPc ? null : byIndex.get(combatant.monsterIndex)
  const conditions = isPc ? (doc?.combat?.conditions ?? []) : (combatant.conditions ?? [])

  return (
    <aside className="rounded-sm border-2 border-parchment-600 bg-parchment-50 overflow-hidden flex flex-col">
      <h2 className="px-4 py-2 text-xs font-display tracking-widest uppercase text-ink-500 border-b border-parchment-600 bg-parchment-100">
        {combatant.name}
      </h2>

      <div className="p-4 flex flex-col gap-4 overflow-y-auto">
        {isPc ? (
          <PcTacticalCard doc={doc} />
        ) : monster ? (
          <>
            <MonsterActionList monster={monster} combatantName={combatant.name} />
            <div className="text-sm"><MonsterStatBlock monster={monster} lang={lang} /></div>
          </>
        ) : carregandoCatalogo ? (
          <p className="text-sm ink-italic text-ink-300">Carregando statblock…</p>
        ) : (
          <p className="text-sm ink-italic text-amber-800">
            Statblock de "{combatant.name}" não encontrado no catálogo
            {combatant.monsterIndex && <> (índice <code>{combatant.monsterIndex}</code>)</>}.
          </p>
        )}

        <div className="flex items-center gap-2">
          <input
            type="number"
            min="0"
            aria-label={`HP temporário para ${combatant.name}`}
            value={tempInput}
            onChange={e => setTempInput(e.target.value)}
            className="w-16 px-2 py-1 text-sm border-2 border-parchment-600 bg-parchment-50 rounded-sm"
          />
          <button
            type="button"
            disabled={locked}
            onClick={() => { onTempHp(combatant.id, Math.max(0, Math.floor(Number(tempInput) || 0))); setTempInput('') }}
            className="text-xs px-2 py-1 border-2 border-parchment-600 text-ink-500 rounded-sm disabled:opacity-40"
          >
            HP temporário
          </button>
        </div>

        <ConditionPalette
          conditions={conditions}
          until={combatant.conditionUntil}
          round={round}
          canSetDuration={!isPc}
          onToggle={id => onToggleCondition(combatant.id, id)}
          onSetDuration={(id, rounds) => onSetConditionDuration(combatant.id, id, rounds)}
        />

        <CombatLog entries={log} />
      </div>
    </aside>
  )
}

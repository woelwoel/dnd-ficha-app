import { useMemo } from 'react'
import { useCharacterContext } from './CharacterContext'
import { RollButton } from '../DiceRoller/RollButton'

/**
 * Painel compacto de magias preparadas + truques abaixo de Ataques.
 *
 * Mostra:
 * - Resumo de espaços disponíveis por nível (chips)
 * - Truques (sempre prontos)
 * - Magias preparadas, agrupadas por nível
 * - Atalho pra abrir a aba Magias quando precisa gerenciar
 *
 * Não substitui a aba Magias completa — é um quick-reference pra mesa.
 * Botão de rolar dispara o painel de dados global, sem consumir slot
 * automaticamente (consumo de espaço acontece na aba Magias quando você
 * efetivamente conjura). Isso é proposital: muitas magias têm efeitos
 * sem dado (utility) e marcar gasto a cada hover seria invasivo.
 */
export function PreparedSpellsList() {
  const { character, calc, onNavigateToSpells } = useCharacterContext()
  const spellcasting = character.spellcasting ?? {}
  const allSpells = spellcasting.spells ?? []
  const spellAbilityKey = calc?.spellAbilityKey ?? null

  // Truques (nível 0), preparadas (level >= 1 + prepared) e "sempre preparadas"
  // da subclasse (domínio/juramento/círculo — alwaysPrepared=true).
  const grouped = useMemo(() => {
    const groups = {}
    for (const s of allSpells) {
      const isCantrip = (s.level ?? 0) === 0
      const isPrepared = isCantrip || s.prepared === true || s.alwaysPrepared === true
      if (!isPrepared) continue
      const lvl = s.level ?? 0
      if (!groups[lvl]) groups[lvl] = []
      groups[lvl].push(s)
    }
    // Ordena cada grupo: sempre-preparadas primeiro, depois alfabético
    for (const lvl of Object.keys(groups)) {
      groups[lvl].sort((a, b) => {
        const aAlways = a.alwaysPrepared ? 0 : 1
        const bAlways = b.alwaysPrepared ? 0 : 1
        if (aAlways !== bAlways) return aAlways - bAlways
        return (a.name ?? '').localeCompare(b.name ?? '', 'pt-BR')
      })
    }
    return groups
  }, [allSpells])

  // Resumo de espaços por nível
  const maxSlots = calc?.maxSlots ?? {}
  const usedSlots = calc?.safeUsedSlots ?? {}
  const slotLevels = Object.keys(maxSlots).map(Number).sort((a, b) => a - b)

  // Não renderiza se não tem nada (não-caster sem magias)
  if (!spellAbilityKey && allSpells.length === 0) return null

  const totalPrepared = Object.values(grouped).reduce((s, arr) => s + arr.length, 0)
  if (totalPrepared === 0 && slotLevels.length === 0) return null

  const groupLevels = Object.keys(grouped).map(Number).sort((a, b) => a - b)

  return (
    <div className="bg-parchment-100 border border-parchment-600 rounded-lg p-3 shadow-parchment-sm">
      {/* Header: título + atalho pra aba completa */}
      <div className="flex items-center justify-between gap-2 mb-2 border-b border-parchment-600 pb-1.5">
        <div className="flex items-baseline gap-2 min-w-0">
          <h3 className="text-sm font-display text-ink-500 uppercase tracking-widest">
            Magias Preparadas
          </h3>
          <span className="text-[10px] ink-italic text-ink-300">
            {totalPrepared} {totalPrepared === 1 ? 'pronta' : 'prontas'}
          </span>
        </div>
        {onNavigateToSpells && (
          <button
            onClick={() => onNavigateToSpells()}
            className="text-[10px] font-display tracking-wide text-ink-300 hover:text-ink-500 underline"
            title="Abrir aba Magias pra preparar/conjurar"
          >
            gerenciar →
          </button>
        )}
      </div>

      {/* Resumo de espaços disponíveis */}
      {slotLevels.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="text-[10px] font-display tracking-widest uppercase text-ink-300">
            Espaços
          </span>
          {slotLevels.map(lvl => {
            const max = maxSlots[lvl] ?? 0
            const used = usedSlots[lvl] ?? 0
            const avail = Math.max(0, max - used)
            const allUsed = avail === 0 && max > 0
            return (
              <span
                key={lvl}
                title={`Nível ${lvl}: ${avail}/${max} disponíveis`}
                className={[
                  'px-1.5 py-0.5 rounded-sm border text-[10px] font-display tabular-nums',
                  allUsed
                    ? 'bg-parchment-200 border-parchment-600 text-ink-300 line-through'
                    : 'bg-parchment-50 border-parchment-600 text-ink-500',
                ].join(' ')}
              >
                {lvl}° <span className="font-bold">{avail}/{max}</span>
              </span>
            )
          })}
        </div>
      )}

      {/* Lista de magias preparadas, agrupada por nível */}
      {groupLevels.length === 0 ? (
        <p className="text-[11px] ink-italic text-ink-300 text-center py-2">
          Nenhuma magia preparada ainda — abra a aba Magias pra preparar.
        </p>
      ) : (
        <div className="space-y-2">
          {groupLevels.map(lvl => (
            <div key={lvl}>
              <p className="text-[10px] font-display tracking-widest uppercase text-ink-300 mb-1">
                {lvl === 0 ? 'Truques (sempre prontas)' : `Nível ${lvl}`}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {grouped[lvl].map((s, idx) => (
                  <SpellChip key={`${s.index ?? s.name}-${idx}`} spell={s} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Chip individual de magia ─────────────────────────────────
 * Mostra o nome. Se a magia tem `damageDice` (ex: "3d10" pra Bola
 * de Fogo) ou `attackRoll`, exibe um RollButton compacto ao lado.
 * Click no nome → abrir aba Magias (gerenciar/casting completo).
 */
function SpellChip({ spell }) {
  const { onNavigateToSpells } = useCharacterContext()
  const hasRoll = !!spell.damageDice
  const notation = spell.damageDice || null
  // Passamos id ou index (o Spells aceita ambos). Click navega pra aba Magias
  // e auto-abre o SpellDetailModal com essa magia em destaque.
  const focusId = spell.id ?? spell.index
  const isAlways = spell.alwaysPrepared === true

  // Chips "sempre preparadas" ganham um anel dourado e um ✦ pra destacar
  // que vieram da subclasse (não contam pro limite de preparadas).
  const chipCls = isAlways
    ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-amber-50 border border-amber-400 text-xs text-ink-500'
    : 'inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-parchment-50 border border-parchment-600 text-xs text-ink-500'

  const sourceTag = spell.sourceLabel
    ? `\n\n[${spell.sourceLabel} — sempre preparada]`
    : (isAlways ? '\n\n[Sempre preparada — não conta no limite]' : '')

  return (
    <span className={chipCls}>
      {isAlways && (
        <span className="text-amber-600 leading-none" title="Sempre preparada (subclasse)">✦</span>
      )}
      <button
        onClick={() => onNavigateToSpells?.(focusId)}
        className="hover:text-ink-600 hover:underline"
        title={`${spell.name}${spell.school ? ` · ${spell.school}` : ''}${spell.castingTime ? ` · ${spell.castingTime}` : ''}${sourceTag}\n\n(click pra ver a descrição completa)`}
      >
        {spell.name}
      </button>
      {hasRoll && notation && (
        <RollButton
          notation={notation}
          label={`${spell.name} — dano`}
          size="xs"
        />
      )}
    </span>
  )
}

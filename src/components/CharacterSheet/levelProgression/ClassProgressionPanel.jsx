// src/components/CharacterSheet/levelProgression/ClassProgressionPanel.jsx
//
// Painel de progressão de UMA classe. Após a audit de UX:
//
//  1. Características adquiridas EXPANDIDAS por default + 1ª seção visível.
//  2. Removido a duplicação Timeline ↔ Lista. Mantida só a lista, organizada
//     em tiers narrativos D&D (Aventureiros, Heróis, Mestres, Mestres do mundo).
//  3. Cada linha da lista mostra: features clicáveis, bônus de proficiência
//     SÓ quando muda, novos slots de magia, novo tier de magia destacado.
//  4. Card "Próxima conquista" no topo dá meta clara ao jogador.
//  5. Botão "Descer nível" movido pra menu discreto à esquerda, longe do
//     CTA principal "Subir nível" — evita click acidental.
//
import { useState } from 'react'
import { DetailsModal } from '../../DetailsModal'
import { ConfirmDialog } from '../../ui/ConfirmDialog'
import { Icon } from '../../ui/Icon'
import {
  isASIEntry, getTierForLevel, TIERS,
  getNextMilestone, formatSlotsCompact, categorizeLevel,
} from './helpers'
import { LevelUpPanel } from './LevelUpPanel'
import { AcquiredFeatures } from './AcquiredFeatures'

/* ── Card "Próxima conquista" ──────────────────────────────────── */
function NextMilestoneCard({ currentLevel, levels, onJumpToLevelUp }) {
  const next = getNextMilestone(currentLevel, levels)
  if (!next) {
    if (currentLevel >= 20) {
      return (
        <div className="bg-amber-50 border-2 border-amber-700 rounded-sm px-4 py-3">
          <p className="text-sm font-display tracking-wide text-amber-800">
            ✦ Nível máximo alcançado. Você é uma lenda viva.
          </p>
        </div>
      )
    }
    return null
  }
  const distance = next.level - currentLevel
  return (
    <div className="bg-amber-50 border-2 border-amber-700 rounded-sm px-4 py-3 flex items-start gap-3">
      <Icon name="target" size={20} strokeWidth={1.75} className="text-amber-800 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-display tracking-widest uppercase text-amber-800 mb-0.5">
          Próxima conquista {distance === 1 ? '(próximo nível)' : `(em ${distance} níveis)`}
        </p>
        <p className="text-sm text-ink-500 leading-snug">
          <strong className="font-display tracking-wide">Nível {next.level}:</strong>{' '}
          {next.label}
        </p>
      </div>
      {distance === 1 && onJumpToLevelUp && (
        <button
          type="button"
          onClick={onJumpToLevelUp}
          className="text-xs px-3 py-1 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 font-display tracking-wide shrink-0"
        >
          Subir agora →
        </button>
      )}
    </div>
  )
}

/* ── Linha individual da Jornada ──────────────────────────────── */
function LevelRow({ entry, prevEntry, currentLevel, onFeatureClick }) {
  const lvl = entry.level
  const isCurrent = lvl === currentLevel
  const isPast    = lvl < currentLevel
  const isFuture  = lvl > currentLevel
  const isASI     = isASIEntry(entry)
  const realFeatures = (entry.features ?? []).filter(
    f => !f.name?.includes('Aumento') && !f.name?.includes('Melhoria'),
  )
  const slots = formatSlotsCompact(entry)
  const profChanged = prevEntry ? entry.proficiency_bonus !== prevEntry.proficiency_bonus : true
  const category = categorizeLevel(entry, prevEntry)

  // Slots "novos" — categoria que apareceu pela primeira vez
  const newSlotTier = (() => {
    if (!entry.spell_slots || !prevEntry?.spell_slots) return null
    for (let idx = 0; idx < entry.spell_slots.length; idx++) {
      const before = prevEntry.spell_slots[idx] ?? 0
      const after  = entry.spell_slots[idx] ?? 0
      if (before === 0 && after > 0) return idx + 1
    }
    return null
  })()

  return (
    <div
      className={[
        'flex items-start gap-3 px-3 py-2 transition-colors',
        isCurrent
          ? 'bg-amber-100 border-l-4 border-amber-700'
          : isFuture
            ? 'border-l-4 border-transparent hover:bg-parchment-100/50'
            : 'border-l-4 border-transparent hover:bg-parchment-100/30',
        isFuture ? 'opacity-80' : '',
      ].join(' ')}
    >
      {/* Selo do nível */}
      <div className={[
        'w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border-2 font-display',
        isCurrent
          ? 'bg-amber-700 border-amber-800 text-parchment-50 shadow-sm'
          : isPast
            ? 'bg-parchment-200 border-parchment-600 text-ink-500'
            : 'bg-parchment-50 border-parchment-600 text-ink-300',
      ].join(' ')}>
        {lvl}
      </div>

      <div className="flex-1 min-w-0">
        {/* Linha principal: features + ASI + slots novos */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {isASI && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-600 px-1.5 py-0.5 rounded-sm">
              <span aria-hidden>★</span>
              <span>Aumento de Habilidade</span>
            </span>
          )}
          {realFeatures.map((f, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onFeatureClick(f)}
              className="text-sm text-ink-500 hover:text-amber-700 underline decoration-dotted underline-offset-2 font-display tracking-wide text-left"
              title="Ver descrição completa"
            >
              {f.name}
            </button>
          ))}
          {newSlotTier != null && (
            <span className="text-xs font-semibold text-purple-800 bg-purple-50 border border-purple-600 px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1">
              <Icon name="sparkle" size={11} strokeWidth={2} />
              Magias de {newSlotTier}º
            </span>
          )}
          {category === 'empty' && (
            <span className="text-xs ink-italic text-ink-300">Sem nova característica</span>
          )}
        </div>

        {/* Linha meta: prof + slots resumidos */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
          {profChanged && (
            <span className="text-xs font-bold text-emerald-800 inline-flex items-center gap-1">
              <span aria-hidden>↑</span> Prof +{entry.proficiency_bonus}
            </span>
          )}
          {slots && (
            <div className="flex flex-wrap gap-1">
              {slots.map(s => (
                <span
                  key={s.level}
                  className="text-xs bg-parchment-200 border border-parchment-600 px-1.5 py-0 rounded-sm text-ink-500 font-mono"
                  title={`${s.count} espaço${s.count !== 1 ? 's' : ''} de magia de ${s.level}º nível`}
                >
                  {s.level}°:{s.count}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Tier (collapsável) ──────────────────────────────────────── */
function TierSection({ tier, entries, currentLevel, onFeatureClick }) {
  const [open, setOpen] = useState(() => {
    // Default open = tier contém o nível atual; ou tier completo
    const [from, to] = tier.range
    return currentLevel >= from && currentLevel <= to + 4 // atual + 4 níveis seguintes pra dar contexto
  })
  if (!entries.length) return null
  const allPast = entries.every(e => e.level < currentLevel)
  const hasCurrent = entries.some(e => e.level === currentLevel)
  return (
    <section className="border-2 border-parchment-600 rounded-sm bg-parchment-50 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-parchment-100 hover:bg-parchment-200 border-b border-parchment-600 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-display font-bold tracking-widest text-parchment-700 w-6 text-center">
            {tier.roman}
          </span>
          <div className="text-left min-w-0">
            <p className="text-sm font-display tracking-wide uppercase text-ink-500">
              {tier.label}
            </p>
            <p className="text-xs ink-italic text-ink-300">
              Níveis {tier.range[0]}–{tier.range[1]}
              {hasCurrent && (
                <span className="ml-2 text-amber-800 font-semibold not-italic">
                  · Você está aqui
                </span>
              )}
              {allPast && !hasCurrent && (
                <span className="ml-2 text-emerald-800 font-semibold not-italic">✓ completo</span>
              )}
            </p>
          </div>
        </div>
        <span aria-hidden className="text-ink-300 text-xs shrink-0">
          {open ? '▴' : '▾'}
        </span>
      </button>
      {open && (
        <div className="divide-y divide-parchment-600/50">
          {entries.map((entry, i) => (
            <LevelRow
              key={entry.level}
              entry={entry}
              prevEntry={i === 0 ? null : entries[i - 1]}
              currentLevel={currentLevel}
              onFeatureClick={onFeatureClick}
            />
          ))}
        </div>
      )}
    </section>
  )
}

/* ── Componente principal ───────────────────────────────────────── */
export function ClassProgressionPanel({
  progression, currentLevel, hitDie, conMod, attributes, isMulticlass,
  onLevelChange, onApplyLevelUp, multiclassIndex,
  levelChoices, chosenFeatures, allowFeats = false,
}) {
  const [wizardOpen, setWizardOpen] = useState(false)
  const [selectedFeat, setSelectedFeat] = useState(null)
  const [confirmDescer, setConfirmDescer] = useState(false)

  const levels       = progression?.levels ?? []
  const currentEntry = levels.find(l => l.level === currentLevel)
  const nextEntry    = levels.find(l => l.level === currentLevel + 1)
  const currentTier  = getTierForLevel(currentLevel)

  function handleConfirmLevelUp(payload) {
    onApplyLevelUp?.({ ...payload, multiclassIndex: multiclassIndex ?? null })
    setWizardOpen(false)
  }

  // Agrupa níveis por tier
  const tieredLevels = TIERS.map(tier => ({
    tier,
    entries: levels.filter(l => l.level >= tier.range[0] && l.level <= tier.range[1]),
  }))

  return (
    <div className="space-y-4">
      {/* ── Header de classe ──────────────────────────────────── */}
      <header className="bg-parchment-100 border-2 border-parchment-600 rounded-sm shadow-parchment-sm px-4 py-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs font-display tracking-[0.3em] uppercase text-ink-300 mb-0.5">
              {currentTier.label}
            </p>
            <p className="text-xs ink-italic text-ink-500">
              Nível atual <strong className="not-italic text-base text-ink-500">{currentLevel}</strong>
              <span className="mx-2 text-parchment-600">·</span>
              Proficiência <strong className="not-italic text-ink-500">+{currentEntry?.proficiency_bonus ?? Math.ceil(currentLevel / 4) + 1}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            {currentLevel < 20 && !wizardOpen && (
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                className="text-xs px-4 py-2 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 font-display tracking-wide inline-flex items-center gap-1.5"
              >
                Subir para Nível {currentLevel + 1}
                <span aria-hidden>→</span>
              </button>
            )}
          </div>
        </div>

        {/* Botão de descer fica DENTRO do header mas separado visualmente
            do CTA principal. Em linha própria, pequeno, com ink-italic. */}
        {!isMulticlass && currentLevel > 1 && (
          <div className="mt-2 pt-2 border-t border-parchment-600/50 flex items-center justify-between">
            <p className="text-[11px] ink-italic text-ink-300">
              Subiu de nível por engano?
            </p>
            <button
              type="button"
              onClick={() => setConfirmDescer(true)}
              className="text-[11px] ink-italic text-ink-300 hover:text-ink-500 underline decoration-dotted underline-offset-2"
            >
              Descer pro nível {currentLevel - 1}
            </button>
          </div>
        )}
      </header>

      {/* ── Wizard de Level Up (aparece inline quando ativado) ── */}
      {wizardOpen && nextEntry && (
        <LevelUpPanel
          nextLevel={currentLevel + 1}
          nextEntry={nextEntry}
          hitDie={hitDie}
          conMod={conMod}
          attributes={attributes}
          levelChoices={levelChoices}
          currentChosenFeatures={chosenFeatures}
          onConfirm={handleConfirmLevelUp}
          onCancel={() => setWizardOpen(false)}
          allowFeats={allowFeats}
        />
      )}

      {/* ── Card "Próxima conquista" ─────────────────────────── */}
      {!wizardOpen && (
        <NextMilestoneCard
          currentLevel={currentLevel}
          levels={levels}
          onJumpToLevelUp={() => setWizardOpen(true)}
        />
      )}

      {/* ── Features adquiridas (expandido por default) ──────── */}
      <AcquiredFeatures
        levels={levels}
        currentLevel={currentLevel}
        onFeatureClick={setSelectedFeat}
        defaultOpen={true}
      />

      {/* ── Jornada por tier ──────────────────────────────────── */}
      <section className="space-y-3">
        <h3 className="text-xs font-display tracking-widest uppercase text-ink-500 px-1">
          Jornada Completa
          <span className="ml-2 ink-italic font-normal normal-case tracking-normal text-ink-300">
            — clique numa feature pra ver o texto completo
          </span>
        </h3>
        {tieredLevels.map(({ tier, entries }) => (
          <TierSection
            key={tier.id}
            tier={tier}
            entries={entries}
            currentLevel={currentLevel}
            onFeatureClick={setSelectedFeat}
          />
        ))}
      </section>

      <DetailsModal
        isOpen={!!selectedFeat}
        onClose={() => setSelectedFeat(null)}
        title={selectedFeat?.name || ''}
      >
        {selectedFeat && (
          <p className="text-sm text-ink-500 leading-relaxed whitespace-pre-wrap">
            {selectedFeat.desc || 'Consulte o Livro do Jogador para a descrição completa desta característica.'}
          </p>
        )}
      </DetailsModal>

      <ConfirmDialog
        open={confirmDescer}
        title="Descer um nível?"
        message={
          <>
            <p className="mb-2">
              Vai voltar do nível <strong>{currentLevel}</strong> pro nível <strong>{currentLevel - 1}</strong>.
            </p>
            <p className="ink-italic text-ink-300">
              Use só se subiu por engano. Recursos, magias e features ganhos
              no nível atual serão removidos da ficha.
            </p>
          </>
        }
        confirmLabel="Descer nível"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => {
          onLevelChange?.(currentLevel - 1)
          setConfirmDescer(false)
        }}
        onCancel={() => setConfirmDescer(false)}
      />
    </div>
  )
}

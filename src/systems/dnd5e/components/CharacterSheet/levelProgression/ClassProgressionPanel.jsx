// src/components/CharacterSheet/levelProgression/ClassProgressionPanel.jsx
//
// Progressão de UMA classe, em 3 zonas claras (estilo tabela da classe no PHB):
//
//   📜 Histórico  → colapsado por default. Lista plana de níveis ganhos.
//   ◆ Você está aqui → linha do nível atual + Prof.
//   ✦ O que vem → só os PRÓXIMOS MARCOS (feature, ASI, nova categoria de magia).
//                 Níveis sem marco (só +PV/+Prof) somem.
//
// Sem tiers, sem labels narrativos inventados. Espelha como o jogador olha a
// tabela da classe no Livro do Jogador: olha pra trás (o que sei) e pra frente
// (o que vou ganhar).
//
import { useState } from 'react'
import { DetailsModal } from '../../DetailsModal'
import { ConfirmDialog } from '../../../../../components/ui/ConfirmDialog'
import { Icon } from '../../../../../components/ui/Icon'
import {
  isASIEntry, realFeaturesOf, newSpellTierOf, isMilestoneLevel,
  formatSlotsCompact,
} from './helpers'
import { LevelUpPanel } from './LevelUpPanel'

/* ── Botão de feature (link sublinhado pontilhado) ──────────────── */
function FeatureLink({ feature, onClick }) {
  return (
    <button
      type="button"
      onClick={() => onClick(feature)}
      className="text-sm text-ink-500 hover:text-amber-700 underline decoration-dotted underline-offset-2 font-display tracking-wide text-left"
      title="Ver descrição completa"
    >
      {feature.name}
    </button>
  )
}

/* ── Badge ASI ──────────────────────────────────────────────────── */
function ASIBadge() {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-600 px-1.5 py-0.5 rounded-sm">
      <span aria-hidden>★</span>
      <span>Aumento de Habilidade</span>
    </span>
  )
}

/* ── Badge nova categoria de magia ─────────────────────────────── */
function SpellTierBadge({ tier }) {
  return (
    <span className="text-xs font-semibold text-purple-800 bg-purple-50 border border-purple-600 px-1.5 py-0.5 rounded-sm inline-flex items-center gap-1">
      <Icon name="sparkle" size={11} strokeWidth={2} />
      Magias de {tier}º nível
    </span>
  )
}

/* ── Linha de um nível futuro (marco) ──────────────────────────── */
function FutureMilestoneRow({ entry, prevEntry, isNext, onFeatureClick, onLevelUp }) {
  const isASI        = isASIEntry(entry)
  const realFeatures = realFeaturesOf(entry)
  const newSpellTier = newSpellTierOf(entry, prevEntry)
  return (
    <div className="flex items-start gap-3 px-3 py-2">
      <div className="w-8 shrink-0 text-right">
        <span className="text-xs font-display tracking-wider text-ink-300">Nv</span>{' '}
        <span className="text-sm font-bold text-ink-500 font-display">{entry.level}</span>
      </div>
      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
        {isASI && <ASIBadge />}
        {realFeatures.map((f, i) => <FeatureLink key={i} feature={f} onClick={onFeatureClick} />)}
        {newSpellTier != null && <SpellTierBadge tier={newSpellTier} />}
      </div>
      {isNext && onLevelUp && (
        <button
          type="button"
          onClick={onLevelUp}
          className="text-xs px-3 py-1 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 font-display tracking-wide shrink-0"
        >
          Subir agora →
        </button>
      )}
    </div>
  )
}

/* ── Histórico recolhido (lista plana de features adquiridas) ─── */
function HistorySection({ levels, currentLevel, onFeatureClick }) {
  const [open, setOpen] = useState(false)
  const acquired = []
  for (const entry of levels) {
    if (entry.level >= currentLevel) break // só até nv anterior (atual é "agora")
    for (const f of (entry.features ?? [])) acquired.push({ ...f, level: entry.level })
  }
  if (!acquired.length) return null
  return (
    <section className="bg-parchment-50 border-2 border-parchment-600 rounded-sm shadow-parchment-sm">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-display tracking-widest uppercase text-ink-500 hover:bg-parchment-100"
      >
        <span className="inline-flex items-center gap-2">
          <span aria-hidden className="text-base">📜</span>
          <span>Histórico</span>
          <span className="ink-italic text-ink-300 font-normal normal-case tracking-normal">
            — níveis 1 a {currentLevel - 1} · {acquired.length} {acquired.length === 1 ? 'característica' : 'características'}
          </span>
        </span>
        <span aria-hidden className="text-ink-300 text-xs">{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-parchment-600 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {acquired.map((f, i) => (
            <div key={i} className="flex items-baseline gap-2 py-1">
              <span className="text-xs ink-italic text-ink-300 shrink-0 w-9 text-right font-mono">
                Nv{f.level}
              </span>
              <button
                type="button"
                onClick={() => onFeatureClick(f)}
                className="text-sm text-ink-500 hover:text-amber-700 text-left underline decoration-dotted underline-offset-2 leading-tight font-display tracking-wide"
                title="Ver descrição completa"
              >
                {f.name}
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

/* ── Linha "Você está aqui" ────────────────────────────────────── */
function CurrentLevelRow({ entry, prevEntry, onFeatureClick }) {
  const isASI        = isASIEntry(entry)
  const realFeatures = realFeaturesOf(entry)
  const newSpellTier = newSpellTierOf(entry, prevEntry)
  const slots        = formatSlotsCompact(entry)
  const hasContent   = isASI || realFeatures.length > 0 || newSpellTier != null
  return (
    <section className="bg-amber-50 border-2 border-amber-700 rounded-sm shadow-parchment-sm">
      <div className="px-4 py-3 border-b border-amber-700/40">
        <p className="text-xs font-display tracking-widest uppercase text-amber-800 inline-flex items-center gap-1.5">
          <span aria-hidden>◆</span> Você está aqui
        </p>
        <p className="text-sm text-ink-500 mt-0.5">
          <strong className="font-display tracking-wide">Nível {entry.level}</strong>
          <span className="mx-2 text-parchment-600">·</span>
          <span className="ink-italic">Proficiência</span>{' '}
          <strong className="text-ink-500">+{entry.proficiency_bonus}</strong>
        </p>
      </div>
      <div className="px-4 py-3 space-y-2">
        {hasContent ? (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {isASI && <ASIBadge />}
            {realFeatures.map((f, i) => <FeatureLink key={i} feature={f} onClick={onFeatureClick} />)}
            {newSpellTier != null && <SpellTierBadge tier={newSpellTier} />}
          </div>
        ) : (
          <p className="text-xs ink-italic text-ink-300">
            Nenhuma característica nova neste nível — só evolução de recursos.
          </p>
        )}
        {slots && (
          <div className="flex flex-wrap gap-1 pt-1 border-t border-amber-700/20">
            <span className="text-xs ink-italic text-ink-300 mr-1">Espaços de magia:</span>
            {slots.map(s => (
              <span
                key={s.level}
                className="text-xs bg-parchment-100 border border-parchment-600 px-1.5 py-0 rounded-sm text-ink-500 font-mono"
                title={`${s.count} espaço${s.count !== 1 ? 's' : ''} de magia de ${s.level}º nível`}
              >
                {s.level}°:{s.count}
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/* ── Componente principal ───────────────────────────────────────── */
export function ClassProgressionPanel({
  progression, currentLevel, hitDie, conMod, attributes, isMulticlass,
  onLevelChange, onApplyLevelUp, multiclassIndex,
  levelChoices, chosenFeatures, allowFeats = false,
}) {
  const [wizardOpen, setWizardOpen]       = useState(false)
  const [selectedFeat, setSelectedFeat]   = useState(null)
  const [confirmDescer, setConfirmDescer] = useState(false)

  const levels       = progression?.levels ?? []
  const currentEntry = levels.find(l => l.level === currentLevel)
  const prevEntry    = levels.find(l => l.level === currentLevel - 1)
  const nextEntry    = levels.find(l => l.level === currentLevel + 1)

  function handleConfirmLevelUp(payload) {
    onApplyLevelUp?.({ ...payload, multiclassIndex: multiclassIndex ?? null })
    setWizardOpen(false)
  }

  // Marcos futuros: só níveis que ganham algo notável.
  const futureMilestones = levels
    .map((entry, i) => ({ entry, prev: levels[i - 1] }))
    .filter(({ entry, prev }) => entry.level > currentLevel && isMilestoneLevel(entry, prev))
  const firstFutureLevel = futureMilestones[0]?.entry.level

  return (
    <div className="space-y-4">
      {/* ── Header simples ─────────────────────────────────────── */}
      <header className="bg-parchment-100 border-2 border-parchment-600 rounded-sm shadow-parchment-sm px-4 py-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-xs ink-italic text-ink-500">
              Nível atual{' '}
              <strong className="not-italic text-base text-ink-500">{currentLevel}</strong>
              <span className="mx-2 text-parchment-600">·</span>
              Proficiência{' '}
              <strong className="not-italic text-ink-500">
                +{currentEntry?.proficiency_bonus ?? Math.ceil(currentLevel / 4) + 1}
              </strong>
            </p>
          </div>
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
        {!isMulticlass && currentLevel > 1 && (
          <div className="mt-2 pt-2 border-t border-parchment-600/50 flex items-center justify-between">
            <p className="text-[11px] ink-italic text-ink-300">Subiu por engano?</p>
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

      {/* ── Wizard de Level Up inline ──────────────────────────── */}
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

      {/* ── Histórico (recolhido) ──────────────────────────────── */}
      {!wizardOpen && currentLevel > 1 && (
        <HistorySection
          levels={levels}
          currentLevel={currentLevel}
          onFeatureClick={setSelectedFeat}
        />
      )}

      {/* ── Você está aqui ─────────────────────────────────────── */}
      {!wizardOpen && currentEntry && (
        <CurrentLevelRow
          entry={currentEntry}
          prevEntry={prevEntry}
          onFeatureClick={setSelectedFeat}
        />
      )}

      {/* ── O que vem por aí ───────────────────────────────────── */}
      {!wizardOpen && futureMilestones.length > 0 && (
        <section className="bg-parchment-50 border-2 border-parchment-600 rounded-sm shadow-parchment-sm">
          <header className="px-4 py-2.5 border-b border-parchment-600 bg-parchment-100">
            <p className="text-xs font-display tracking-widest uppercase text-ink-500 inline-flex items-center gap-1.5">
              <span aria-hidden>✦</span> O que vem por aí
              <span className="ink-italic font-normal normal-case tracking-normal text-ink-300">
                — só os níveis que ganham característica nova
              </span>
            </p>
          </header>
          <div className="divide-y divide-parchment-600/40">
            {futureMilestones.map(({ entry, prev }) => (
              <FutureMilestoneRow
                key={entry.level}
                entry={entry}
                prevEntry={prev}
                isNext={entry.level === firstFutureLevel}
                onFeatureClick={setSelectedFeat}
                onLevelUp={() => setWizardOpen(true)}
              />
            ))}
          </div>
        </section>
      )}

      {!wizardOpen && currentLevel >= 20 && (
        <div className="bg-amber-50 border-2 border-amber-700 rounded-sm px-4 py-3">
          <p className="text-sm font-display tracking-wide text-amber-800">
            ✦ Nível máximo alcançado. Você é uma lenda viva.
          </p>
        </div>
      )}

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

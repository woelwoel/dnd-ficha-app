import { useState, useMemo } from 'react'
import { useSrd, useLazySrdDataset } from '../../data/SrdProvider'
import { enrichDraconicTopics } from '../../../../utils/draconicAncestors'
import { getFeatureTypeMeta } from '../../domain/featureMeta'
import { ChosenFeaturePicker } from '../CharacterWizardV2/blocks/class/ChosenFeaturePicker'
import { resolveMultiSelect, isChoiceDone } from '../CharacterWizardV2/blocks/class-helpers'
import { Icon } from '../../../../components/ui/Icon'
import {
  detectActionType, combatTier, featureCategory, actionTypeOf, isAttributeIncrease,
  featureUseId, collapseScalingFeatures,
} from '../../domain/featureCategories'
import { isOptionalChoice, getChosenAdditions, getOptionalVariants } from '../../domain/optionalFeatures'

/* ══════════════════════════════════════════════════════════════════
   META
   ══════════════════════════════════════════════════════════════════ */
const TYPE_THEME = {
  'ação':       { color: 'border-amber-600/40 bg-amber-900/10', badge: 'bg-amber-800/60 text-amber-200' },
  'ação bônus': { color: 'border-blue-600/40 bg-blue-900/10',   badge: 'bg-blue-800/60 text-blue-200' },
  'reação':     { color: 'border-purple-600/40 bg-purple-900/10', badge: 'bg-purple-800/60 text-purple-200' },
  'passiva':    { color: 'border-gray-600/40 bg-gray-800/10',   badge: 'bg-gray-700/60 text-gray-200' },
}

// Cores pastéis com texto escuro pra ficarem legíveis tanto no tema parchment
// (claro) quanto em fundo escuro. Antes usavam bg-sky-900/40 + text-sky-300
// (escuro com texto claro), o que virava um bloco quase preto+pixel ilegível
// no tema parchment.
const RECHARGE_META = {
  short:  { label: 'Desc. Curto', color: 'bg-sky-100 text-sky-900 border-sky-400' },
  long:   { label: 'Desc. Longo', color: 'bg-amber-100 text-amber-900 border-amber-400' },
  dawn:   { label: 'Amanhecer',   color: 'bg-orange-100 text-orange-900 border-orange-400' },
  manual: { label: 'Manual',      color: 'bg-gray-100 text-gray-800 border-gray-400' },
}

/* ══════════════════════════════════════════════════════════════════
   BLOCOS VISUAIS
   ══════════════════════════════════════════════════════════════════ */

// Acima deste máximo, caixinhas clicáveis viram uma tela cheia (ex.: Imposição
// das Mãos = 5×nível = 65 no nv 13). Aí trocamos por um stepper −/valor/+.
const TRACKER_BOX_LIMIT = 12

/** Rastreador de uso: caixinhas pra contadores pequenos, stepper pra pools grandes */
function ResourceTracker({ use, onSpend, onRegain }) {
  const used = use.used ?? 0
  const remaining = use.max - used
  const meta = RECHARGE_META[use.recharge] ?? RECHARGE_META.manual

  return (
    <div className="flex items-center justify-between gap-3 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-200">{use.name}</p>
        <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full border font-medium leading-tight mt-0.5 ${meta.color}`}>
          {meta.label}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {use.max > TRACKER_BOX_LIMIT ? (
          // Pool grande → stepper compacto
          <div className="flex items-center gap-1">
            <button
              onClick={onSpend}
              disabled={remaining === 0}
              className="w-6 h-6 rounded bg-amber-700 hover:bg-red-700 text-amber-100 text-sm flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Gastar uso"
            >−</button>
            <span className="text-xs text-gray-300 font-mono w-12 text-center">{remaining}/{use.max}</span>
            <button
              onClick={onRegain}
              disabled={used === 0}
              className="w-6 h-6 rounded bg-gray-700 hover:bg-green-800 text-gray-200 text-sm flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Recuperar uso"
            >+</button>
          </div>
        ) : (
          <>
            <div className="flex gap-1">
              {Array.from({ length: use.max }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => i < used ? onRegain?.() : onSpend?.()}
                  title={i < used ? 'Recuperar' : 'Gastar'}
                  className={`w-5 h-5 rounded border transition-colors ${
                    i < used
                      ? 'bg-gray-600 border-gray-500 hover:bg-green-800 hover:border-green-600'
                      : 'bg-amber-600 border-amber-500 hover:bg-red-700 hover:border-red-500'
                  }`}
                  aria-label={i < used ? `Recuperar uso ${i + 1}` : `Gastar uso ${i + 1}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-400 font-mono w-8 text-right">
              {remaining}/{use.max}
            </span>
          </>
        )}
      </div>
    </div>
  )
}

/** Card de ação de combate (ação / ação bônus / reação) */
function ActionCard({ name, type, desc, source, used, max, onSpend, onRegain }) {
  const theme = TYPE_THEME[type] ?? TYPE_THEME['ação']
  const meta = { ...getFeatureTypeMeta(type), ...theme }
  const remaining = max != null ? max - (used ?? 0) : null

  return (
    <div className={`border rounded-lg p-3 ${meta.color}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{meta.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-100 leading-tight">{name}</p>
            {source && <p className="text-xs text-gray-500 capitalize mt-0.5">{source}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>
            {meta.label}
          </span>
          {max != null && (
            <div className="flex items-center gap-1">
              <button
                onClick={onRegain}
                disabled={(used ?? 0) === 0}
                className="w-5 h-5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Recuperar uso"
              >+</button>
              <span className="text-xs font-mono text-gray-300 w-8 text-center">{remaining}/{max}</span>
              <button
                onClick={onSpend}
                disabled={remaining === 0}
                className="w-5 h-5 rounded bg-gray-700 hover:bg-red-800 text-gray-300 text-xs flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label="Gastar uso"
              >−</button>
            </div>
          )}
        </div>
      </div>
      {desc && <p className="text-xs text-gray-400 mt-2 leading-relaxed">{desc}</p>}
    </div>
  )
}

/** Card expansível de característica/habilidade */
function FeatureCard({ name, desc, source, level, tracker, onSpend, onRegain }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-800/60 hover:bg-gray-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-amber-400 shrink-0">{open ? '▾' : '▸'}</span>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-gray-100">{name}</span>
            {(source || level != null) && (
              <span className="text-xs text-gray-500 ml-2 capitalize">
                {source}{level != null ? ` · Nv ${level}` : ''}
              </span>
            )}
          </div>
        </div>
        {tracker && (
          <span className="text-xs font-mono text-amber-400 shrink-0">
            {tracker.max - (tracker.used ?? 0)}/{tracker.max}
          </span>
        )}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-2 bg-gray-900/40 space-y-3">
          {desc && <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{desc}</p>}
          {tracker && (
            <ResourceTracker
              use={tracker}
              onSpend={onSpend}
              onRegain={onRegain}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** Grupo colapsável de features */
function FeatureGroup({ title, icon, features, featureUses, onSpend, onRegain }) {
  const [collapsed, setCollapsed] = useState(false)
  if (!features.length) return null

  return (
    <section>
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        <span aria-hidden>{icon}</span>
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">{title}</h3>
        <span className="text-gray-600 text-xs">({features.length})</span>
        <span className="ml-auto text-gray-600 text-xs">{collapsed ? '▸' : '▾'}</span>
      </button>

      {!collapsed && (
        <div className="space-y-1.5">
          {features.map((f, i) => {
            const tracker = featureUses?.find(u => u.id === f.id)
            return (
              <FeatureCard
                key={f.id ?? `${f.name}-${i}`}
                name={f.name}
                desc={f.desc}
                source={f.source}
                level={f.level}
                tracker={tracker}
                onSpend={() => onSpend?.(f.id)}
                onRegain={() => onRegain?.(f.id)}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

/** Seção de ações de combate agrupadas por tipo */
function ActionGroup({ title, icon, actions, featureUses, onSpend, onRegain }) {
  if (!actions.length) return null
  return (
    <section>
      <h3 className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
        <span aria-hidden>{icon}</span>{title}
        <span className="text-gray-600 font-normal normal-case tracking-normal">({actions.length})</span>
      </h3>
      <div className="space-y-2">
        {actions.map((a, i) => {
          // Recurso rastreável: usa o useId ligado (ex.: "Segunda Rajada" →
          // guerreiro-second-wind) ou cai no próprio id da feature.
          const useId = a.useId ?? a.id
          const tracker = featureUses?.find(u => u.id === useId)
          return (
            <ActionCard
              key={a.id ?? `${a.name}-${i}`}
              {...a}
              used={tracker?.used}
              max={tracker?.max}
              onSpend={() => onSpend?.(useId)}
              onRegain={() => onRegain?.(useId)}
            />
          )
        })}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════
   CATEGORIAS DE HABILIDADES
   ══════════════════════════════════════════════════════════════════ */
const CATEGORY_SECTIONS = [
  ['defesa',     'Defesas & Resistências',   'shield'],
  ['exploracao', 'Exploração & Viagem',       'leaf'],
  ['social',     'Social & Conhecimento',     'book'],
  ['magia',      'Magia & Recursos',          'sparkle'],
  ['outras',     'Outras Características',    'scroll'],
]

/* ══════════════════════════════════════════════════════════════════
   FILTROS
   ══════════════════════════════════════════════════════════════════ */
const FILTERS = [
  { id: 'combate',     label: 'Combate',     icon: <Icon name="sword" size={12} strokeWidth={1.75} /> },
  { id: 'habilidades', label: 'Habilidades', icon: <Icon name="book" size={12} strokeWidth={1.75} /> },
  { id: 'recursos',    label: 'Recursos',    icon: <Icon name="target" size={12} strokeWidth={1.75} /> },
]

/* ══════════════════════════════════════════════════════════════════
   HELPER: resolve a opção escolhida para features com escolha
   ══════════════════════════════════════════════════════════════════ */

/**
 * Se a feature `featureName` da classe `classIndex` tiver uma opção
 * escolhida em `chosenFeatures`, retorna { name, desc } da opção.
 * Retorna null se não houver escolha ou não houver correspondência.
 */
function resolveChosenFeature(classIndex, featureName, chosenFeatures, classChoices) {
  const choices = classChoices?.[classIndex]?.choices ?? []
  const match   = choices.find(c => c.featureName === featureName)
  if (!match) return null
  const chosen  = chosenFeatures?.[match.id]
  if (!chosen) return null
  const opt = match.options.find(o => o.value === chosen)
  if (!opt) return null
  return { name: opt.name, desc: opt.desc }
}

/* ══════════════════════════════════════════════════════════════════
   ESCOLHAS PENDENTES (backfill — para fichas criadas antes do picker)
   ══════════════════════════════════════════════════════════════════ */

/**
 * Renderiza escolhas de classe que JÁ deveriam estar feitas no nível
 * atual mas estão vazias. Usa o mesmo ChosenFeaturePicker do wizard.
 *
 * Caso clássico: guerreiro Mestre de Combate criado antes da gente
 * adicionar o picker de Manobras — `chosenFeatures.martial_archetype_maneuvers`
 * fica undefined e as manobras nunca aparecem em Habilidades.
 *
 * Aparece SÓ se houver escolhas pendentes; quando todas estão preenchidas,
 * a seção some.
 */
function PendingChoicesSection({
  classIndex, characterLevel, classChoices, multiclasses,
  chosenFeatures, onSetChosenFeature,
}) {
  // Coleta choices da classe primária + multiclasses
  const allEntries = []
  if (classIndex) {
    for (const ch of classChoices?.[classIndex]?.choices ?? []) {
      if (isOptionalChoice(ch)) continue // opcionais de Tasha não são pendência
      allEntries.push({ choice: ch, scopeLevel: characterLevel, scopeLabel: null })
    }
  }
  for (const mc of multiclasses ?? []) {
    for (const ch of classChoices?.[mc.class]?.choices ?? []) {
      if (isOptionalChoice(ch)) continue
      allEntries.push({ choice: ch, scopeLevel: mc.level, scopeLabel: mc.class })
    }
  }

  const pending = allEntries.filter(({ choice, scopeLevel }) => {
    if ((choice.level ?? 0) > scopeLevel) return false
    if (choice.requires) {
      const ok = Object.entries(choice.requires).every(([k, v]) => chosenFeatures?.[k] === v)
      if (!ok) return false
    }
    return !isChoiceDone(choice, chosenFeatures?.[choice.id], scopeLevel)
  })

  if (pending.length === 0) return null

  return (
    <section className="border border-amber-700/50 bg-amber-950/20 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span aria-hidden>⚠</span>
        <h3 className="text-xs font-bold text-amber-300 uppercase tracking-widest">
          Escolhas pendentes <span className="text-amber-500 font-normal normal-case">({pending.length})</span>
        </h3>
      </div>
      <p className="text-[13px] text-amber-200/70 leading-relaxed">
        Essas escolhas faltam pra ficha ficar completa. Pode escolher aqui mesmo —
        elas vão aparecer logo abaixo em Habilidades.
      </p>
      <div className="space-y-2 bg-parchment-50/95 rounded p-3">
        {pending.map(({ choice, scopeLevel, scopeLabel }) => (
          <div key={`${scopeLabel ?? 'main'}-${choice.id}`}>
            {scopeLabel && (
              <p className="text-xs uppercase tracking-wider text-ink-300 mb-1 font-display">
                Multiclasse: {scopeLabel}
              </p>
            )}
            <ChosenFeaturePicker
              choice={choice}
              value={chosenFeatures?.[choice.id]}
              effectiveMultiSelect={resolveMultiSelect(choice, scopeLevel)}
              onChange={v => onSetChosenFeature(choice.id, v)}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════
   VARIANTES OPCIONAIS DE TASHA (opt-in: liga substituição ou adição)
   ══════════════════════════════════════════════════════════════════ */
function OptionalVariantsSection({ classIndex, level, activeSources, chosenFeatures, classChoices, onSetChosenFeature }) {
  const [openId, setOpenId] = useState(null)
  const variants = getOptionalVariants(classChoices?.[classIndex], level, activeSources)
  if (variants.length === 0) return null

  return (
    <section className="border border-indigo-700/50 bg-indigo-950/20 rounded-lg p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span aria-hidden>✦</span>
        <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-widest">
          Variantes de Tasha <span className="text-indigo-500 font-normal normal-case">({variants.length})</span>
        </h3>
      </div>
      <p className="text-[13px] text-indigo-200/70 leading-relaxed">
        Características opcionais do Caldeirão de Tasha. Cada uma é liga/desliga — substituem ou
        adicionam uma característica. Combine com seu mestre antes de usar.
      </p>
      <div className="space-y-1.5">
        {variants.map(choice => {
          const opt = choice.options[0]
          const on = chosenFeatures?.[choice.id] === opt.value
          const isOpen = openId === choice.id
          return (
            <div key={choice.id} className="border border-gray-700 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-800/60">
                <button onClick={() => setOpenId(isOpen ? null : choice.id)} className="flex items-center gap-2 min-w-0 text-left">
                  <span className="text-indigo-400 shrink-0">{isOpen ? '▾' : '▸'}</span>
                  <span className="text-sm font-semibold text-gray-100 truncate">{opt.name}</span>
                  <span className="text-xs text-gray-500 ml-1">Nv {choice.level}{choice.featureName ? ` · substitui ${choice.featureName}` : ' · adiciona'}</span>
                </button>
                <button
                  role="switch"
                  aria-checked={on}
                  aria-label={`${on ? 'Desligar' : 'Ligar'} ${opt.name}`}
                  onClick={() => onSetChosenFeature(choice.id, on ? '' : opt.value)}
                  className={`shrink-0 w-11 h-6 rounded-full transition-colors relative ${on ? 'bg-indigo-600' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              {isOpen && (
                <div className="px-3 pb-3 pt-2 bg-gray-900/40">
                  <p className="text-sm text-gray-400 leading-relaxed whitespace-pre-line">{opt.desc}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════════════ */
export function FeaturesTab({ character, featureUses, onSpend, onRegain, onSetChosenFeature }) {
  const [activeFilter, setActiveFilter] = useState('combate')
  const [combatTierView, setCombatTierView] = useState('essencial')
  const { progression, races, classChoices } = useSrd()
  const allFeats = useLazySrdDataset('feats')
  const { info } = character

  const classIndex      = info?.class ?? ''
  const level           = info?.level ?? 1
  const selectedRace    = races.find(r => r.index === info?.race)
  const selectedSubrace = selectedRace?.subraces?.find(sr => sr.index === info?.subrace)

  const {
    combatFeatures, nonCombatFeatures, raceFeatures, featFeatures,
  } = useMemo(() => {
    const chosenFeatures = info?.chosenFeatures ?? {}
    const classData  = progression?.[classIndex]
    const levelsUpTo = classData?.levels?.filter(l => l.level <= level) ?? []

    /* ── Features da classe primária ──
     * collapseScalingFeatures funde variantes de nível do mesmo nome-base
     * (ex.: "Ataque Furtivo (1d6)…(10d6)") em um único card com o valor atual. */
    const classFeatures = collapseScalingFeatures(levelsUpTo.flatMap(lvl =>
      (lvl.features ?? []).map(f => {
        const chosen = resolveChosenFeature(classIndex, f.name, chosenFeatures, classChoices)
        return {
          id:     `${classIndex}-${f.name}`.toLowerCase().replace(/\s+/g, '-'),
          name:   chosen ? `${f.name}: ${chosen.name}` : f.name,
          desc:   chosen ? chosen.desc : f.desc,
          source: classData?.name ?? classIndex,
          level:  lvl.level,
          combat:     f.combat,
          category:   f.category,
          actionType: f.actionType,
          useId:      featureUseId(classIndex, f.name),
          // Só escondemos placeholders GENÉRICOS de subclasse (sem tag de
          // combate/categoria). Features ancoradas em escolha mas marcadas
          // (ex.: "Estilo de Combate" = essencial) continuam aparecendo.
          placeholder: Boolean((f.subclass || f.choice_id) && !chosen && !f.combat && !f.category),
        }
      })
    ))

    /* ── Features de multiclasses ── */
    const multiFeatures = (info?.multiclasses ?? []).flatMap(mc => {
      const mcData   = progression?.[mc.class]
      const mcLevels = mcData?.levels?.filter(l => l.level <= mc.level) ?? []
      return collapseScalingFeatures(mcLevels.flatMap(lvl =>
        (lvl.features ?? []).map(f => {
          const chosen = resolveChosenFeature(mc.class, f.name, chosenFeatures, classChoices)
          return {
            id:     `${mc.class}-${f.name}`.toLowerCase().replace(/\s+/g, '-'),
            name:   chosen ? `${f.name}: ${chosen.name}` : f.name,
            desc:   chosen ? chosen.desc : f.desc,
            source: mcData?.name ?? mc.class,
            level:  lvl.level,
            combat:     f.combat,
            category:   f.category,
            actionType: f.actionType,
            useId:      featureUseId(mc.class, f.name),
            // Só escondemos placeholders GENÉRICOS de subclasse (sem tag de
          // combate/categoria). Features ancoradas em escolha mas marcadas
          // (ex.: "Estilo de Combate" = essencial) continuam aparecendo.
          placeholder: Boolean((f.subclass || f.choice_id) && !chosen && !f.combat && !f.category),
          }
        })
      ))
    })

    /* ── Traços raciais ── */
    const rawTopics = [
      ...(selectedRace?.topics   ?? selectedRace?.traits?.map(t   => ({ title: t.name, desc: t.desc })) ?? []),
      ...(selectedSubrace?.topics ?? selectedSubrace?.traits?.map(t => ({ title: t.name, desc: t.desc })) ?? []),
    ]
    const raceTopics = info?.race === 'draconato'
      ? enrichDraconicTopics(rawTopics, info?.draconicAncestry)
      : rawTopics
    const raceTraitsAll = raceTopics
      .filter(t => (t.title ?? t.name) && t.desc)
      .map(t => ({
        id: `raca-${(t.title ?? t.name)}`.toLowerCase().replace(/\s+/g, '-'),
        name: t.title ?? t.name, desc: t.desc,
        source: selectedSubrace
          ? `${selectedRace?.name} / ${selectedSubrace.name}`
          : (selectedRace?.name ?? 'Raça'),
      }))
    /* Traços raciais não têm marcação de combate (fora do escopo da marcação
     * do SRD), então seguem a heurística atual: se a descrição denota uma ação,
     * o traço é de combate e vai pra aba Combate; senão fica em Habilidades. */
    const raceCombatFeatures = raceTraitsAll
      .filter(f => detectActionType(f.desc) !== null)
      .map(f => ({ ...f, tier: 'essencial', type: actionTypeOf(f) })) // tier alimenta o controle segmentado Essencial/Situacional
    const raceFeatures = raceTraitsAll.filter(f => detectActionType(f.desc) === null)

    /* ── Talentos ── */
    const featFeatures = (info?.feats ?? []).map(f => {
      const full = allFeats?.find(af => af.index === f.index) ?? f
      return {
        id: `feat-${f.index}`,
        name: f.name ?? full.name,
        desc: full.desc ?? full.description ?? '',
        source: 'Talento',
      }
    })

    /* ── Sub-escolhas condicionais (`requires`) ──
     * Algumas escolhas só fazem sentido depois que o jogador escolheu uma
     * opção parent (ex.: manobras do Mestre de Combate só aparecem se
     * martial_archetype === 'mestre_combate'; totens do Bárbaro só se
     * primal_path === 'totem'). Como elas não têm correspondência direta
     * em `levels[].features[]`, não são pegas por `resolveChosenFeature`.
     * Renderizamos aqui como cards individuais, enriquecidos com
     * combat/category/actionType vindos da `opt` quando existirem.
     */
    const subChoiceFeatures = []
    const allChoices        = classChoices?.[classIndex]?.choices ?? []
    for (const ch of allChoices) {
      if (!ch.requires) continue
      const value = chosenFeatures?.[ch.id]
      if (!value) continue
      const picked = Array.isArray(value) ? value : [value]
      for (const v of picked) {
        const opt = ch.options.find(o => o.value === v)
        if (!opt) continue
        const featureId = `${ch.id}-${v}`
        subChoiceFeatures.push({
          id: featureId,
          name: `${ch.featureName}: ${opt.name}`,
          desc: opt.desc,
          source: classData?.name ?? classIndex,
          level: ch.level,
          combat:     opt.combat,
          category:   opt.category,
          actionType: opt.actionType,
          placeholder: false,
        })
      }
    }
    /* ── Adições opcionais de Tasha LIGADAS (sem feature-base; viram card) ── */
    const additionFeatures = getChosenAdditions(classChoices?.[classIndex], level, chosenFeatures)
      .map(f => ({ ...f, source: classData?.name ?? classIndex, placeholder: false }))

    const classFeaturesAll = [...classFeatures, ...subChoiceFeatures, ...additionFeatures]

    /* ── Dois baldes derivados de uma única lista enriquecida ──
     * Placeholders genéricos de subclasse não-resolvidos (ex.: "Característica
     * do Arquétipo Marcial") são removidos pra não poluir nenhuma das listas. */
    const enriched = [...classFeaturesAll, ...multiFeatures].filter(f => !f.placeholder)
    // Talentos entram na aba Combate sempre como Situacional (e seguem
    // listados em Habilidades → Talentos). O tipo de ação é inferido da
    // descrição (ex.: "como reação" → reação), caindo em "passiva".
    const featCombatFeatures = featFeatures.map(f => ({ ...f, tier: 'situacional', type: actionTypeOf(f) }))
    const combatFeatures = [
      ...enriched
        .filter(f => combatTier(f) !== null)
        .map(f => ({ ...f, tier: combatTier(f), type: actionTypeOf(f) })), // tier alimenta o controle segmentado Essencial/Situacional
      ...raceCombatFeatures,
      ...featCombatFeatures,
    ]
    const nonCombatFeatures = enriched.filter(f => combatTier(f) === null)

    return { combatFeatures, nonCombatFeatures, raceFeatures, featFeatures }
  }, [
    progression, classIndex, level,
    info?.multiclasses, info?.feats, info?.race, info?.draconicAncestry, info?.chosenFeatures,
    selectedRace, selectedSubrace, allFeats,
    classChoices,
  ])

  const combatCount   = combatFeatures.length
  // Exclui ASI do contador para bater com o que a lista realmente exibe
  const habilidadesCount = nonCombatFeatures.filter(f => !isAttributeIncrease(f)).length
    + raceFeatures.length + featFeatures.length
  const trackedCount  = featureUses?.length ?? 0
  const usedCount     = featureUses?.filter(u => (u.used ?? 0) > 0).length ?? 0

  return (
    <div className="space-y-4">

      {/* ── Filtros ── */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const count =
            f.id === 'combate'     ? combatCount       :
            f.id === 'habilidades' ? habilidadesCount  :
            trackedCount
          const isActive = activeFilter === f.id

          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-700/50 border border-blue-600/60 text-blue-200'
                  : 'bg-gray-800/60 border border-gray-700 text-gray-400 hover:text-gray-200 hover:bg-gray-800',
              ].join(' ')}
            >
              <span aria-hidden>{f.icon}</span>
              {f.label}
              {count > 0 && (
                <span className={`text-xs px-1.5 rounded-full ${
                  f.id === 'recursos' && usedCount > 0
                    ? 'bg-amber-800/80 text-amber-200'
                    : 'bg-gray-700 text-gray-300'
                }`}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ══ Vista: Combate ══ */}
      {activeFilter === 'combate' && (
        <div className="space-y-6">
          {/* Controle segmentado Essencial / Situacional */}
          <div className="inline-flex rounded-lg border border-gray-700 overflow-hidden mb-4">
            {[['essencial', 'Essencial'], ['situacional', 'Situacional']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setCombatTierView(id)}
                className={[
                  'px-4 py-1.5 text-sm font-medium transition-colors',
                  combatTierView === id
                    ? 'bg-blue-700/50 text-blue-200'
                    : 'bg-gray-800/60 text-gray-400 hover:text-gray-200',
                ].join(' ')}
              >{label}</button>
            ))}
          </div>

          {/* Features do tier ativo, agrupadas por tipo de ação */}
          {(() => {
            const tierFeatures = combatFeatures.filter(f => f.tier === combatTierView)
            const byType = t => tierFeatures.filter(f => f.type === t)

            if (tierFeatures.length === 0) {
              return (
                <div className="text-center py-12 text-gray-600">
                  <div className="flex justify-center mb-3">
                    <Icon name="sword" size={36} strokeWidth={1.5} />
                  </div>
                  <p className="text-sm">
                    {combatTierView === 'situacional'
                      ? 'Nenhuma habilidade situacional ainda.'
                      : 'Nenhuma habilidade essencial de combate.'}
                  </p>
                  {combatTierView === 'situacional' && (
                    <p className="text-xs mt-1 text-gray-700">
                      Habilidades de nicho/condicionais e talentos aparecem aqui —
                      muitas chegam em níveis mais altos.
                    </p>
                  )}
                </div>
              )
            }

            return (
              <>
                <ActionGroup
                  title="Ações"
                  icon={<Icon name="sword" size={12} strokeWidth={1.75} />}
                  actions={byType('ação')}
                  featureUses={featureUses}
                  onSpend={onSpend}
                  onRegain={onRegain}
                />
                <ActionGroup
                  title="Ações Bônus"
                  icon={<Icon name="bolt" size={12} strokeWidth={1.75} />}
                  actions={byType('ação bônus')}
                  featureUses={featureUses}
                  onSpend={onSpend}
                  onRegain={onRegain}
                />
                <ActionGroup
                  title="Reações"
                  icon={<Icon name="shield" size={12} strokeWidth={1.75} />}
                  actions={byType('reação')}
                  featureUses={featureUses}
                  onSpend={onSpend}
                  onRegain={onRegain}
                />
                <ActionGroup
                  title="Passivas"
                  icon={<Icon name="sparkle" size={12} strokeWidth={1.75} />}
                  actions={byType('passiva')}
                  featureUses={featureUses}
                  onSpend={onSpend}
                  onRegain={onRegain}
                />
              </>
            )
          })()}
        </div>
      )}

      {/* ══ Vista: Habilidades ══ */}
      {activeFilter === 'habilidades' && (
        <div className="space-y-6">
          {onSetChosenFeature && (
            <PendingChoicesSection
              classIndex={classIndex}
              characterLevel={level}
              classChoices={classChoices}
              multiclasses={info?.multiclasses}
              chosenFeatures={info?.chosenFeatures ?? {}}
              onSetChosenFeature={onSetChosenFeature}
            />
          )}
          {onSetChosenFeature && (
            <OptionalVariantsSection
              classIndex={classIndex}
              level={level}
              activeSources={character.meta?.settings?.sources ?? ['phb']}
              chosenFeatures={info?.chosenFeatures ?? {}}
              classChoices={classChoices}
              onSetChosenFeature={onSetChosenFeature}
            />
          )}
          {(() => {
            // Agrupa nonCombatFeatures por categoria, excluindo ASI
            const nonCombatByCategory = {}
            for (const f of nonCombatFeatures) {
              if (isAttributeIncrease(f)) continue
              const cat = featureCategory(f)
              ;(nonCombatByCategory[cat] ??= []).push(f)
            }

            return CATEGORY_SECTIONS.map(([cat, label, iconName]) => (
              <FeatureGroup
                key={cat}
                title={label}
                icon={<Icon name={iconName} size={12} strokeWidth={1.75} />}
                features={nonCombatByCategory[cat] ?? []}
                featureUses={featureUses}
                onSpend={onSpend}
                onRegain={onRegain}
              />
            ))
          })()}
          <FeatureGroup
            title="Traços Raciais"
            icon={<Icon name="leaf" size={12} strokeWidth={1.75} />}
            features={raceFeatures} featureUses={featureUses} onSpend={onSpend} onRegain={onRegain}
          />
          {featFeatures.length > 0 && (
            <FeatureGroup
              title="Talentos"
              icon={<Icon name="sparkle" size={12} strokeWidth={1.75} />}
              features={featFeatures} featureUses={featureUses} onSpend={onSpend} onRegain={onRegain}
            />
          )}
          {habilidadesCount === 0 && (
            <div className="text-center py-12 text-gray-600">
              <div className="flex justify-center mb-3">
                <Icon name="scroll" size={36} strokeWidth={1.5} />
              </div>
              <p className="text-sm">Nenhuma característica encontrada.</p>
              <p className="text-xs mt-1">Selecione raça e classe para ver as habilidades.</p>
            </div>
          )}
        </div>
      )}

      {/* ══ Vista: Recursos ══ */}
      {activeFilter === 'recursos' && (
        <div className="space-y-4">
          {trackedCount > 0 ? (
            <>
              <p className="text-xs text-gray-500">
                {usedCount > 0 ? `${usedCount} em uso · ` : ''}{trackedCount} recursos rastreados
              </p>
              <div className="space-y-2">
                {featureUses.map(use => (
                  <ResourceTracker
                    key={use.id}
                    use={use}
                    onSpend={() => onSpend?.(use.id)}
                    onRegain={() => onRegain?.(use.id)}
                  />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-600">
              <div className="flex justify-center mb-3">
                <Icon name="target" size={36} strokeWidth={1.5} />
              </div>
              <p className="text-sm">Nenhum recurso rastreável.</p>
              <p className="text-xs mt-1 text-gray-700">
                Recursos limitados de classe (ex: Fúria, Canalizar Divindade) aparecem aqui.
              </p>
            </div>
          )}
        </div>
      )}

    </div>
  )
}

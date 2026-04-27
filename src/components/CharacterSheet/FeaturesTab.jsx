import { useState, useMemo } from 'react'
import { useSrd } from '../../providers/SrdProvider'

/* ══════════════════════════════════════════════════════════════════
   DETECTOR DE TIPO DE AÇÃO
   ══════════════════════════════════════════════════════════════════ */
const ACTION_KEYWORDS = [
  { type: 'reação',     patterns: ['como reação', 'como sua reação', 'usa sua reação', 'usa a reação'] },
  { type: 'ação bônus', patterns: ['ação bônus', 'como ação bônus', 'ação de bônus'] },
  { type: 'ação',       patterns: ['como ação', 'usar a ação', 'use sua ação', 'usar uma ação', 'como uma ação'] },
]

function detectActionType(desc = '') {
  const lower = desc.toLowerCase()
  for (const { type, patterns } of ACTION_KEYWORDS) {
    if (patterns.some(p => lower.includes(p))) return type
  }
  return null
}

/* ══════════════════════════════════════════════════════════════════
   META
   ══════════════════════════════════════════════════════════════════ */
const TYPE_META = {
  'ação':       { color: 'border-amber-600/40 bg-amber-900/10', badge: 'bg-amber-800/60 text-amber-200', icon: '⚔️', label: 'Ação' },
  'ação bônus': { color: 'border-blue-600/40 bg-blue-900/10',   badge: 'bg-blue-800/60 text-blue-200',   icon: '⚡', label: 'Ação Bônus' },
  'reação':     { color: 'border-purple-600/40 bg-purple-900/10', badge: 'bg-purple-800/60 text-purple-200', icon: '🛡️', label: 'Reação' },
}

const RECHARGE_META = {
  short:  { label: 'Desc. Curto', color: 'bg-sky-900/40 text-sky-300 border-sky-700' },
  long:   { label: 'Desc. Longo', color: 'bg-amber-900/40 text-amber-300 border-amber-700' },
  dawn:   { label: 'Amanhecer',   color: 'bg-orange-900/40 text-orange-300 border-orange-700' },
  manual: { label: 'Manual',      color: 'bg-gray-700 text-gray-300 border-gray-600' },
}

/* ══════════════════════════════════════════════════════════════════
   BLOCOS VISUAIS
   ══════════════════════════════════════════════════════════════════ */

/** Rastreador de uso com caixinhas clicáveis */
function ResourceTracker({ use, onSpend, onRegain }) {
  const remaining = use.max - (use.used ?? 0)
  const meta = RECHARGE_META[use.recharge] ?? RECHARGE_META.manual

  return (
    <div className="flex items-center justify-between gap-3 bg-gray-800/60 border border-gray-700 rounded-lg px-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-200">{use.name}</p>
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${meta.color}`}>
          {meta.label}
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex gap-1">
          {Array.from({ length: use.max }).map((_, i) => (
            <button
              key={i}
              onClick={() => i < (use.used ?? 0) ? onRegain?.() : onSpend?.()}
              title={i < (use.used ?? 0) ? 'Recuperar' : 'Gastar'}
              className={`w-5 h-5 rounded border transition-colors ${
                i < (use.used ?? 0)
                  ? 'bg-gray-600 border-gray-500 hover:bg-green-800 hover:border-green-600'
                  : 'bg-amber-600 border-amber-500 hover:bg-red-700 hover:border-red-500'
              }`}
              aria-label={i < (use.used ?? 0) ? `Recuperar uso ${i + 1}` : `Gastar uso ${i + 1}`}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 font-mono w-8 text-right">
          {remaining}/{use.max}
        </span>
      </div>
    </div>
  )
}

/** Card de ação de combate (ação / ação bônus / reação) */
function ActionCard({ name, type, desc, source, used, max, onSpend, onRegain }) {
  const meta = TYPE_META[type] ?? TYPE_META['ação']
  const remaining = max != null ? max - (used ?? 0) : null

  return (
    <div className={`border rounded-lg p-3 ${meta.color}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base shrink-0">{meta.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-100 leading-tight">{name}</p>
            {source && <p className="text-[10px] text-gray-500 capitalize mt-0.5">{source}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.badge}`}>
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
              <span className="text-[10px] text-gray-500 ml-2 capitalize">
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
          {desc && <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>}
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
          const tracker = featureUses?.find(u => u.id === a.id)
          return (
            <ActionCard
              key={a.id ?? `${a.name}-${i}`}
              {...a}
              used={tracker?.used}
              max={tracker?.max}
              onSpend={() => onSpend?.(a.id)}
              onRegain={() => onRegain?.(a.id)}
            />
          )
        })}
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════════════
   FILTROS
   ══════════════════════════════════════════════════════════════════ */
const FILTERS = [
  { id: 'acoes',       label: 'Ações',       icon: '⚔️' },
  { id: 'habilidades', label: 'Habilidades',  icon: '📖' },
  { id: 'recursos',    label: 'Recursos',     icon: '🎯' },
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
   COMPONENTE PRINCIPAL
   ══════════════════════════════════════════════════════════════════ */
export function FeaturesTab({ character, featureUses, onSpend, onRegain }) {
  const [activeFilter, setActiveFilter] = useState('acoes')
  const { progression, races, feats: allFeats, classChoices } = useSrd()
  const { info } = character

  const classIndex      = info?.class ?? ''
  const level           = info?.level ?? 1
  const chosenFeatures  = info?.chosenFeatures ?? {}
  const selectedRace    = races.find(r => r.index === info?.race)
  const selectedSubrace = selectedRace?.subraces?.find(sr => sr.index === info?.subrace)

  const {
    classActions, classBonusActions, classReactions, raceActions,
    classFeatures, multiFeatures, raceFeatures, featFeatures,
  } = useMemo(() => {
    const classData  = progression?.[classIndex]
    const levelsUpTo = classData?.levels?.filter(l => l.level <= level) ?? []

    /* ── Features da classe primária ── */
    const classFeatures = levelsUpTo.flatMap(lvl =>
      (lvl.features ?? []).map(f => {
        const chosen = resolveChosenFeature(classIndex, f.name, chosenFeatures, classChoices)
        return {
          id:     `${classIndex}-${f.name}`.toLowerCase().replace(/\s+/g, '-'),
          name:   chosen ? `${f.name}: ${chosen.name}` : f.name,
          desc:   chosen ? chosen.desc : f.desc,
          source: classData?.name ?? classIndex,
          level:  lvl.level,
        }
      })
    )

    /* ── Features de multiclasses ── */
    const multiFeatures = (info?.multiclasses ?? []).flatMap(mc => {
      const mcData   = progression?.[mc.class]
      const mcLevels = mcData?.levels?.filter(l => l.level <= mc.level) ?? []
      return mcLevels.flatMap(lvl =>
        (lvl.features ?? []).map(f => {
          const chosen = resolveChosenFeature(mc.class, f.name, chosenFeatures, classChoices)
          return {
            id:     `${mc.class}-${f.name}`.toLowerCase().replace(/\s+/g, '-'),
            name:   chosen ? `${f.name}: ${chosen.name}` : f.name,
            desc:   chosen ? chosen.desc : f.desc,
            source: mcData?.name ?? mc.class,
            level:  lvl.level,
          }
        })
      )
    })

    /* ── Traços raciais ── */
    const raceTopics = [
      ...(selectedRace?.topics   ?? selectedRace?.traits?.map(t   => ({ title: t.name, desc: t.desc })) ?? []),
      ...(selectedSubrace?.topics ?? selectedSubrace?.traits?.map(t => ({ title: t.name, desc: t.desc })) ?? []),
    ]
    const raceFeatures = raceTopics
      .filter(t => (t.title ?? t.name) && t.desc)
      .map(t => ({
        id: `raca-${(t.title ?? t.name)}`.toLowerCase().replace(/\s+/g, '-'),
        name: t.title ?? t.name, desc: t.desc,
        source: selectedSubrace
          ? `${selectedRace?.name} / ${selectedSubrace.name}`
          : (selectedRace?.name ?? 'Raça'),
      }))

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

    /* ── Ações de combate (classe + raça, SEM ações básicas do livro) ── */
    const allClassFeatures = [
      ...levelsUpTo.flatMap(lvl =>
        (lvl.features ?? []).map(f => ({ ...f, source: classIndex }))
      ),
      ...(info?.multiclasses ?? []).flatMap(mc => {
        const mcData = progression?.[mc.class]
        return (mcData?.levels?.filter(l => l.level <= mc.level) ?? [])
          .flatMap(lvl => (lvl.features ?? []).map(f => ({ ...f, source: mc.class })))
      }),
    ]

    const raceTraits = [
      ...(selectedRace?.topics   ?? selectedRace?.traits?.map(t   => ({ title: t.name, desc: t.desc })) ?? []),
      ...(selectedSubrace?.topics ?? selectedSubrace?.traits?.map(t => ({ title: t.name, desc: t.desc })) ?? []),
    ].map(t => ({ name: t.title ?? t.name, desc: t.desc, source: selectedRace?.name ?? 'Raça' }))

    const toAction = f => ({
      id:   `${f.source}-${f.name}`.toLowerCase().replace(/\s+/g, '-'),
      name: f.name, desc: f.desc, source: f.source,
      type: detectActionType(f.desc),
    })

    const classWithType = allClassFeatures.map(toAction).filter(a => a.type !== null)
    const raceWithType  = raceTraits.map(toAction).filter(a => a.type !== null)

    return {
      classActions:      classWithType.filter(a => a.type === 'ação'),
      classBonusActions: classWithType.filter(a => a.type === 'ação bônus'),
      classReactions:    classWithType.filter(a => a.type === 'reação'),
      raceActions:       raceWithType,
      classFeatures, multiFeatures, raceFeatures, featFeatures,
    }
  }, [
    progression, classIndex, level,
    info?.multiclasses, info?.feats,
    selectedRace, selectedSubrace, allFeats,
    chosenFeatures, classChoices,
  ])

  const totalActions  = classActions.length + classBonusActions.length + classReactions.length + raceActions.length
  const totalFeatures = classFeatures.length + multiFeatures.length + raceFeatures.length + featFeatures.length
  const trackedCount  = featureUses?.length ?? 0
  const usedCount     = featureUses?.filter(u => (u.used ?? 0) > 0).length ?? 0

  return (
    <div className="space-y-4">

      {/* ── Filtros ── */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const count =
            f.id === 'acoes'       ? totalActions  :
            f.id === 'habilidades' ? totalFeatures :
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
                <span className={`text-[10px] px-1.5 rounded-full ${
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

      {/* ══ Vista: Ações ══ */}
      {activeFilter === 'acoes' && (
        <div className="space-y-6">
          <ActionGroup title="Ações"       icon="⚔️" actions={classActions}      featureUses={featureUses} onSpend={onSpend} onRegain={onRegain} />
          <ActionGroup title="Ações Bônus" icon="⚡" actions={classBonusActions} featureUses={featureUses} onSpend={onSpend} onRegain={onRegain} />
          <ActionGroup title="Reações"     icon="🛡️" actions={classReactions}    featureUses={featureUses} onSpend={onSpend} onRegain={onRegain} />
          <ActionGroup title="Ações Raciais" icon="🌿" actions={raceActions}     featureUses={featureUses} onSpend={onSpend} onRegain={onRegain} />

          {totalActions === 0 && (
            <div className="text-center py-12 text-gray-600">
              <p className="text-4xl mb-3">⚔️</p>
              <p className="text-sm">Nenhuma ação de classe ou raça detectada.</p>
              <p className="text-xs mt-1 text-gray-700">
                As ações são detectadas automaticamente a partir das características da classe e raça.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ══ Vista: Habilidades ══ */}
      {activeFilter === 'habilidades' && (
        <div className="space-y-6">
          <FeatureGroup
            title="Características de Classe" icon="📖"
            features={classFeatures} featureUses={featureUses} onSpend={onSpend} onRegain={onRegain}
          />
          {multiFeatures.length > 0 && (
            <FeatureGroup
              title="Características de Multiclasse" icon="✦"
              features={multiFeatures} featureUses={featureUses} onSpend={onSpend} onRegain={onRegain}
            />
          )}
          <FeatureGroup
            title="Traços Raciais" icon="🌿"
            features={raceFeatures} featureUses={featureUses} onSpend={onSpend} onRegain={onRegain}
          />
          {featFeatures.length > 0 && (
            <FeatureGroup
              title="Talentos" icon="🌟"
              features={featFeatures} featureUses={featureUses} onSpend={onSpend} onRegain={onRegain}
            />
          )}
          {totalFeatures === 0 && (
            <div className="text-center py-12 text-gray-600">
              <p className="text-4xl mb-3">📜</p>
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
              <p className="text-4xl mb-3">🎯</p>
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

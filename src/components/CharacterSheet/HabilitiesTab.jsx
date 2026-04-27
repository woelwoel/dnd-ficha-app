import { useState, useMemo } from 'react'
import { useSrd } from '../../providers/SrdProvider'

/* ── Badge de recarga ──────────────────────────────────────────── */
const RECHARGE_META = {
  short:  { label: 'Desc. Curto', color: 'bg-sky-900/40 text-sky-300 border-sky-700' },
  long:   { label: 'Desc. Longo', color: 'bg-amber-900/40 text-amber-300 border-amber-700' },
  dawn:   { label: 'Amanhecer',   color: 'bg-orange-900/40 text-orange-300 border-orange-700' },
  manual: { label: 'Manual',      color: 'bg-gray-700 text-gray-300 border-gray-600' },
}

/* ── Card de recurso rastreável ────────────────────────────────── */
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
        {/* Caixinhas de uso */}
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

/* ── Card de característica/habilidade ─────────────────────────── */
function FeatureCard({ name, desc, source, level, tracker, onSpend, onRegain, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 bg-gray-800/60 hover:bg-gray-800 transition-colors text-left"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-amber-400 text-base shrink-0">
            {open ? '▾' : '▸'}
          </span>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-gray-100">{name}</span>
            {(source || level) && (
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
          {desc && (
            <p className="text-sm text-gray-400 leading-relaxed">{desc}</p>
          )}
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

/* ── Grupo de features por seção ────────────────────────────────── */
function FeatureGroup({ title, icon, features, featureUses, onSpend, onRegain }) {
  const [collapsed, setCollapsed] = useState(false)
  if (!features.length) return null

  return (
    <section>
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center gap-2 w-full text-left mb-2"
      >
        <span>{icon}</span>
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest">
          {title}
        </h3>
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

/* ═══════════════════════════════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════════════════════════════ */
export function HabilitiesTab({ character, featureUses, onSpend, onRegain }) {
  const { progression, races, feats: allFeats } = useSrd()
  const { info } = character

  const classIndex = info?.class ?? ''
  const level      = info?.level ?? 1

  const selectedRace    = races.find(r => r.index === info?.race)
  const selectedSubrace = selectedRace?.subraces?.find(sr => sr.index === info?.subrace)

  const { classFeatures, multiFeatures, raceFeatures, featFeatures } = useMemo(() => {
    /* ── Features da classe primária ── */
    const classData   = progression?.[classIndex]
    const levelsUpTo  = classData?.levels?.filter(l => l.level <= level) ?? []
    const classFeatures = levelsUpTo.flatMap(lvl =>
      (lvl.features ?? []).map(f => ({
        id: `${classIndex}-${f.name}`.toLowerCase().replace(/\s+/g, '-'),
        name: f.name,
        desc: f.desc,
        source: classData?.name ?? classIndex,
        level: lvl.level,
      }))
    )

    /* ── Features de multiclasses ── */
    const multiFeatures = (info?.multiclasses ?? []).flatMap(mc => {
      const mcData   = progression?.[mc.class]
      const mcLevels = mcData?.levels?.filter(l => l.level <= mc.level) ?? []
      return mcLevels.flatMap(lvl =>
        (lvl.features ?? []).map(f => ({
          id: `${mc.class}-${f.name}`.toLowerCase().replace(/\s+/g, '-'),
          name: f.name,
          desc: f.desc,
          source: mcData?.name ?? mc.class,
          level: lvl.level,
        }))
      )
    })

    /* ── Traços raciais ── */
    const raceTopics = [
      ...(selectedRace?.topics ?? selectedRace?.traits?.map(t => ({ title: t.name, desc: t.desc })) ?? []),
      ...(selectedSubrace?.topics ?? selectedSubrace?.traits?.map(t => ({ title: t.name, desc: t.desc })) ?? []),
    ]
    const raceFeatures = raceTopics
      .filter(t => (t.title ?? t.name) && t.desc)
      .map(t => ({
        id: `raca-${(t.title ?? t.name)}`.toLowerCase().replace(/\s+/g, '-'),
        name: t.title ?? t.name,
        desc: t.desc,
        source: selectedSubrace
          ? `${selectedRace?.name} / ${selectedSubrace.name}`
          : (selectedRace?.name ?? 'Raça'),
      }))

    /* ── Talentos (Feats) ── */
    const featFeatures = (info?.feats ?? []).map(f => {
      const full = allFeats?.find(af => af.index === f.index) ?? f
      return {
        id: `feat-${f.index}`,
        name: f.name ?? full.name,
        desc: full.desc ?? full.description ?? '',
        source: 'Talento',
      }
    })

    return { classFeatures, multiFeatures, raceFeatures, featFeatures }
  }, [progression, classIndex, level, info?.multiclasses, info?.feats, selectedRace, selectedSubrace, allFeats])

  /* Estatísticas rápidas */
  const totalFeatures  = classFeatures.length + multiFeatures.length + raceFeatures.length + featFeatures.length
  const trackedCount   = featureUses?.length ?? 0
  const usedCount      = featureUses?.filter(u => (u.used ?? 0) > 0).length ?? 0

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-amber-400">Talentos e Habilidades</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalFeatures} características · {trackedCount} recursos rastreados
            {usedCount > 0 && ` · ${usedCount} em uso`}
          </p>
        </div>
        {trackedCount > 0 && (
          <div className="flex flex-col items-end gap-0.5 text-xs text-gray-500">
            {featureUses?.map(u => (
              <span key={u.id}>
                {u.name}: <span className={u.used > 0 ? 'text-amber-400' : 'text-green-400'}>
                  {u.max - (u.used ?? 0)}/{u.max}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Recursos rastreáveis em destaque */}
      {featureUses && featureUses.length > 0 && (
        <section>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
            🎯 Recursos Limitados
          </h3>
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
        </section>
      )}

      <FeatureGroup
        title="Características de Classe"
        icon="📖"
        features={classFeatures}
        featureUses={featureUses}
        onSpend={onSpend}
        onRegain={onRegain}
      />

      {multiFeatures.length > 0 && (
        <FeatureGroup
          title="Características de Multiclasse"
          icon="✦"
          features={multiFeatures}
          featureUses={featureUses}
          onSpend={onSpend}
          onRegain={onRegain}
        />
      )}

      <FeatureGroup
        title="Traços Raciais"
        icon="🌿"
        features={raceFeatures}
        featureUses={featureUses}
        onSpend={onSpend}
        onRegain={onRegain}
      />

      {featFeatures.length > 0 && (
        <FeatureGroup
          title="Talentos"
          icon="🌟"
          features={featFeatures}
          featureUses={featureUses}
          onSpend={onSpend}
          onRegain={onRegain}
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
  )
}

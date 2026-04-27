import { useMemo } from 'react'
import { useSrd } from '../../providers/SrdProvider'

/* ── Ações padrão do D&D 5e (PHB p. 192-193) ─────────────────── */
const STANDARD_ACTIONS = [
  { name: 'Atacar',            type: 'ação',       desc: 'Faça um ou mais ataques corpo a corpo ou à distância. O número de ataques depende da característica Ataque Extra (se tiver).' },
  { name: 'Lançar Magia',      type: 'ação',       desc: 'Lance uma magia com tempo de conjuração de 1 ação. Algumas magias usam ação bônus ou reação.' },
  { name: 'Correr',            type: 'ação',       desc: 'Ganhe deslocamento extra igual ao seu deslocamento neste turno.' },
  { name: 'Recuar',            type: 'ação',       desc: 'Seu movimento não provoca ataques de oportunidade pelo resto do turno.' },
  { name: 'Esquivar',          type: 'ação',       desc: 'Até o início do seu próximo turno, ataques contra você têm desvantagem e você tem vantagem em testes de resistência de Destreza.' },
  { name: 'Ajudar',            type: 'ação',       desc: 'Conceda vantagem a um aliado em um teste de habilidade ou no próximo ataque contra um inimigo adjacente a você.' },
  { name: 'Esconder',          type: 'ação',       desc: 'Tente se esconder fazendo um teste de Furtividade (DES) contra a Percepção Passiva dos inimigos.' },
  { name: 'Preparar',          type: 'ação',       desc: 'Use sua ação para preparar uma reação a um gatilho específico que você descreve (ex.: "Se o goblin se aproximar, ataco").' },
  { name: 'Usar Objeto',       type: 'ação',       desc: 'Interaja com um segundo objeto no turno, como beber uma poção ou abrir uma porta.' },
  { name: 'Procurar',          type: 'ação',       desc: 'Dedique sua atenção a encontrar algo — teste de Percepção ou Investigação.' },
  { name: 'Investida (Opcional)', type: 'ação',    desc: 'Mova-se até 9m em linha reta até um inimigo e ataque com arma corpo a corpo. Se você mover pelo menos 3m, some +1d4 ao dano (regra opcional, PHB p. 272).' },
]

const STANDARD_BONUS_ACTIONS = [
  { name: 'Lançar Magia (Ação Bônus)', type: 'ação bônus', desc: 'Algumas magias têm tempo de conjuração de ação bônus (ex.: Onda Trovejante, Curar Ferimentos Menores via Cura Rápida do Bardo).' },
  { name: 'Ataque com Mão Secundária', type: 'ação bônus', desc: 'Se estiver empunhando duas armas leves, pode atacar com a arma da mão secundária. Não adiciona modificador de habilidade ao dano (a menos que seja negativo).' },
]

const STANDARD_REACTIONS = [
  { name: 'Ataque de Oportunidade', type: 'reação', desc: 'Quando uma criatura hostil que você possa ver sai do seu alcance, você pode gastar sua reação para fazer um ataque corpo a corpo contra ela.' },
  { name: 'Lançar Magia (Reação)',  type: 'reação', desc: 'Algumas magias são lançadas como reação, como Escudo, Absorver Elementos e Contrafeitiço.' },
]

/* ── Detector de tipo de ação por palavras-chave ────────────────── */
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

/* ── Cor e ícone por tipo ────────────────────────────────────────── */
const TYPE_META = {
  'ação':       { color: 'border-amber-600 bg-amber-900/20', badge: 'bg-amber-700 text-amber-100', icon: '⚔️',  label: 'Ação' },
  'ação bônus': { color: 'border-blue-600 bg-blue-900/20',   badge: 'bg-blue-700 text-blue-100',   icon: '⚡',  label: 'Ação Bônus' },
  'reação':     { color: 'border-purple-600 bg-purple-900/20', badge: 'bg-purple-700 text-purple-100', icon: '🛡️', label: 'Reação' },
  'livre':      { color: 'border-green-600 bg-green-900/20', badge: 'bg-green-700 text-green-100',  icon: '✦',  label: 'Livre' },
}

/* ── Card de ação individual ─────────────────────────────────────── */
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
            {source && (
              <p className="text-[10px] text-gray-500 capitalize mt-0.5">{source}</p>
            )}
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
              <span className="text-xs font-mono text-gray-300 w-8 text-center">
                {remaining}/{max}
              </span>
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
      {desc && (
        <p className="text-xs text-gray-400 mt-2 leading-relaxed">{desc}</p>
      )}
    </div>
  )
}

/* ── Seção agrupada ─────────────────────────────────────────────── */
function ActionSection({ title, icon, actions, featureUses, onSpend, onRegain }) {
  if (!actions.length) return null
  return (
    <section>
      <h3 className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
        <span>{icon}</span>{title}
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

/* ═══════════════════════════════════════════════════════════════════
   Componente principal
   ═══════════════════════════════════════════════════════════════════ */
export function ActionsTab({ character, featureUses, onSpend, onRegain }) {
  const { progression, races } = useSrd()
  const { info } = character
  const classIndex = info?.class ?? ''
  const level      = info?.level ?? 1

  const selectedRace    = races.find(r => r.index === info?.race)
  const selectedSubrace = selectedRace?.subraces?.find(sr => sr.index === info?.subrace)

  /* Agrupar ações da ficha */
  const { classActions, classBonusActions, classReactions, raceActions } = useMemo(() => {
    const classData = progression?.[classIndex]
    const levelsUpTo = classData?.levels?.filter(l => l.level <= level) ?? []

    // Juntar features de todas as multiclasses também
    const multiclassFeatures = []
    for (const mc of info?.multiclasses ?? []) {
      const mcData = progression?.[mc.class]
      const mcLevels = mcData?.levels?.filter(l => l.level <= mc.level) ?? []
      for (const lvl of mcLevels) {
        for (const f of lvl.features ?? []) {
          multiclassFeatures.push({ ...f, source: mc.class })
        }
      }
    }

    const classFeatures = []
    for (const lvl of levelsUpTo) {
      for (const f of lvl.features ?? []) {
        classFeatures.push({ ...f, source: classIndex })
      }
    }

    const allClassFeatures = [...classFeatures, ...multiclassFeatures]

    // Racial traits
    const raceTraits = [
      ...(selectedRace?.topics ?? selectedRace?.traits?.map(t => ({ title: t.name, desc: t.desc })) ?? []),
      ...(selectedSubrace?.topics ?? selectedSubrace?.traits?.map(t => ({ title: t.name, desc: t.desc })) ?? []),
    ].map(t => ({ name: t.title ?? t.name, desc: t.desc, source: selectedRace?.name ?? 'Raça' }))

    const toActionItem = (f) => ({
      id: `${f.source}-${f.name}`.toLowerCase().replace(/\s+/g, '-'),
      name: f.name,
      desc: f.desc,
      source: f.source,
      type: detectActionType(f.desc),
    })

    const withType = allClassFeatures.map(toActionItem).filter(a => a.type !== null)
    const raceWithType = raceTraits.map(toActionItem).filter(a => a.type !== null)

    return {
      classActions:       withType.filter(a => a.type === 'ação'),
      classBonusActions:  withType.filter(a => a.type === 'ação bônus'),
      classReactions:     withType.filter(a => a.type === 'reação'),
      raceActions:        raceWithType,
    }
  }, [progression, classIndex, level, info?.multiclasses, selectedRace, selectedSubrace])

  // Todas as ações bônus (padrão + classe)
  const allActions      = [...STANDARD_ACTIONS,      ...classActions]
  const allBonusActions = [...STANDARD_BONUS_ACTIONS, ...classBonusActions]
  const allReactions    = [...STANDARD_REACTIONS,     ...classReactions]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-amber-400">Ações Disponíveis</h2>
        <p className="text-xs text-gray-500">Turno · {info?.name || 'Personagem'}</p>
      </div>

      <ActionSection
        title="Ações"
        icon="⚔️"
        actions={allActions}
        featureUses={featureUses}
        onSpend={onSpend}
        onRegain={onRegain}
      />

      <ActionSection
        title="Ações Bônus"
        icon="⚡"
        actions={allBonusActions}
        featureUses={featureUses}
        onSpend={onSpend}
        onRegain={onRegain}
      />

      <ActionSection
        title="Reações"
        icon="🛡️"
        actions={allReactions}
        featureUses={featureUses}
        onSpend={onSpend}
        onRegain={onRegain}
      />

      {raceActions.length > 0 && (
        <ActionSection
          title="Ações Raciais"
          icon="🌿"
          actions={raceActions}
          featureUses={featureUses}
          onSpend={onSpend}
          onRegain={onRegain}
        />
      )}

      <p className="text-xs text-gray-600 pt-2 border-t border-gray-800">
        💡 As ações padrão estão sempre disponíveis. As ações de classe são detectadas automaticamente das características até o nível atual.
      </p>
    </div>
  )
}

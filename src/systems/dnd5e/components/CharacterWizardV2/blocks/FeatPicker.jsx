import { useState } from 'react'
import { SourceBadge } from '../../SourceBadge'
import { meetsRacePrereq, formatRacePrereq } from '../../../domain/featPrereqs'

/**
 * Picker de talento reutilizável (Humano Variante e ASI de classe).
 *
 * Permite LER a descrição e o pré-requisito de cada talento antes de escolher
 * (botão "o que faz?" expande inline, sem selecionar). Selecionar emite a forma
 * canônica usada no resto do wizard: { featIndex, featName, featAttrBonus,
 * featChosenAttr }. Quando o talento concede +1 a um atributo com mais de uma
 * opção, pede a sub-escolha.
 *
 * Props:
 *  - feats: catálogo (cada item: { index, name, desc, prereq, attrBonus? })
 *  - value: escolha atual { featIndex, featName, featAttrBonus, featChosenAttr } | null
 *  - onChange(next): chamado com a mesma forma de `value`
 */

const ATTR_ABR = { str: 'FOR', dex: 'DES', con: 'CON', int: 'INT', wis: 'SAB', cha: 'CAR' }

const PROF_LABEL = {
  'light-armor': 'armadura leve',
  'medium-armor': 'armadura média',
  'heavy-armor': 'armadura pesada',
}

function formatPrereq(prereq) {
  if (!prereq) return null
  switch (prereq.type) {
    case 'race':
      return formatRacePrereq(prereq)
    case 'spellcasting':
      return 'capaz de conjurar ao menos uma magia'
    case 'ability':
      return `${ATTR_ABR[prereq.ability] ?? prereq.ability} ${prereq.min} ou mais`
    case 'ability_or':
      return (prereq.abilities ?? [])
        .map(a => `${ATTR_ABR[a.ability] ?? a.ability} ${a.min}`)
        .join(' ou ') + ' ou mais'
    case 'proficiency':
      return `proficiência em ${PROF_LABEL[prereq.proficiency] ?? prereq.proficiency}`
    default:
      return null
  }
}

export function FeatPicker({ feats = [], value = null, onChange, raceInfo = null }) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(() => new Set())

  // Talentos raciais (Xanathar) só são oferecidos pra raça certa — mas apenas
  // quando o call site fornece `raceInfo`; sem ele, comportamento antigo.
  const filtered = feats.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
    && (!raceInfo || meetsRacePrereq(f.prereq, raceInfo))
  )

  function toggleExpanded(index) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function selectFeat(feat) {
    const attrBonus = feat.attrBonus ?? null
    const autoAttr = attrBonus && attrBonus.choices?.length === 1
      ? attrBonus.choices[0]
      : null
    onChange({
      featIndex: feat.index,
      featName: feat.name,
      featAttrBonus: attrBonus,
      featChosenAttr: autoAttr,
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        type="text"
        placeholder="Buscar talento..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-2.5 py-1 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-xs text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
      />

      <div className="max-h-72 overflow-y-auto flex flex-col gap-1 pr-0.5">
        {filtered.length === 0 && (
          <p className="text-xs text-ink-200 italic text-center py-3">Nenhum talento encontrado.</p>
        )}
        {filtered.map(feat => {
          const isSelected = value?.featIndex === feat.index
          const isOpen = expanded.has(feat.index)
          const prereqText = formatPrereq(feat.prereq)
          return (
            <div
              key={feat.index}
              className={[
                'rounded-sm border-2 text-xs transition-colors',
                isSelected
                  ? 'border-ink-500 bg-parchment-200'
                  : 'border-parchment-600 bg-parchment-50',
              ].join(' ')}
            >
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <span className={[
                  'w-3 h-3 rounded-full border-2 shrink-0',
                  isSelected ? 'border-ink-500 bg-ink-500' : 'border-parchment-600',
                ].join(' ')} aria-hidden />
                <span className="flex-1 min-w-0 font-display text-ink-500">
                  {feat.name}
                  <SourceBadge source={feat.source} />
                  {feat.attrBonus && (
                    <span className="ml-1.5 text-[13px] text-ink-300 italic">
                      +{feat.attrBonus.amount} {feat.attrBonus.choices.map(c => ATTR_ABR[c]).join('/')}
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => toggleExpanded(feat.index)}
                  aria-expanded={isOpen}
                  aria-label={`O que faz? ${feat.name}`}
                  className="shrink-0 px-1.5 py-0.5 rounded-sm border border-parchment-600 bg-parchment-100 text-[13px] text-ink-300 hover:border-ink-300 hover:text-ink-500"
                >
                  o que faz? {isOpen ? '▲' : '▼'}
                </button>
                <button
                  type="button"
                  onClick={() => selectFeat(feat)}
                  aria-label={`Selecionar ${feat.name}`}
                  aria-pressed={isSelected}
                  className={[
                    'shrink-0 px-2 py-0.5 rounded-sm border-2 text-[13px] font-display tracking-wide transition-colors',
                    isSelected
                      ? 'border-ink-500 bg-ink-500 text-parchment-50'
                      : 'border-parchment-600 bg-parchment-50 text-ink-500 hover:border-ink-300',
                  ].join(' ')}
                >
                  {isSelected ? 'Escolhido' : 'Selecionar'}
                </button>
              </div>

              {isOpen && (
                <div className="px-2.5 pb-2 pt-0.5 text-xs text-ink-500 leading-relaxed border-t border-parchment-600/50">
                  {prereqText && (
                    <p className="text-[13px] text-amber-800 italic mb-1">
                      Pré-requisito: {prereqText}
                    </p>
                  )}
                  {feat.desc}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {value?.featAttrBonus && (value.featAttrBonus.choices?.length ?? 0) > 1 && (
        <div className="mt-1 pt-2 border-t-2 border-parchment-600/50 flex flex-col gap-1.5">
          <p className="text-xs font-display text-ink-500">
            Onde aplicar +{value.featAttrBonus.amount}? <span className="text-red-700">*</span>
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {value.featAttrBonus.choices.map(attrKey => {
              const isSel = value.featChosenAttr === attrKey
              return (
                <button
                  key={attrKey}
                  type="button"
                  onClick={() => onChange({ ...value, featChosenAttr: attrKey })}
                  className={[
                    'px-2.5 py-1 text-[13px] rounded-sm border-2 font-display transition-colors',
                    isSel
                      ? 'border-ink-500 bg-parchment-200 text-ink-500'
                      : 'border-parchment-600 bg-parchment-50 text-ink-300 hover:border-ink-300',
                  ].join(' ')}
                >
                  {ATTR_ABR[attrKey]}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

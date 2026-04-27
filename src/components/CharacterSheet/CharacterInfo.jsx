import { useState, useEffect } from 'react'
import { DetailsModal } from '../DetailsModal'
import { FormFieldError } from '../FormFieldError'
import { TopicList, FullDescriptionToggle } from '../TopicList'
import { ABBR_TO_KEY, ALIGNMENTS, DND_LANGUAGES, RACE_LANGUAGES, parseBackgroundLanguageCount } from '../../utils/calculations'

/* ── Modal: Raça ── */
function RaceModalContent({ race }) {
  const topics = race.topics
    ?? race.traits?.map(t => ({ title: t.name, desc: t.desc }))
    ?? []
  const summary         = race.summary || ''
  const fullDescription = race.fullDescription || race.description || ''

  return (
    <>
      {summary && (
        <p className="text-sm text-gray-200 leading-relaxed font-medium">{summary}</p>
      )}
      <div className="flex flex-wrap gap-2 text-xs">
        {race.size && (
          <span className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full">
            Tamanho: <span className="text-amber-300">{race.size}</span>
          </span>
        )}
        {race.speed && (
          <span className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full">
            Deslocamento: <span className="text-amber-300">{race.speed}m</span>
          </span>
        )}
        {race.ability_bonuses?.map((b, i) => (
          <span key={i} className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full">
            <span className="text-amber-300">+{b.bonus}</span> {b.ability}
          </span>
        ))}
      </div>
      {topics.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">Traços Raciais</h3>
          <TopicList items={topics} initialLimit={5} emptyMessage="Sem traços disponíveis." />
        </div>
      )}
      {race.subraces?.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">Sub-raças</h3>
          <div className="space-y-4">
            {race.subraces.map((sr, i) => {
              const srTopics = sr.topics ?? sr.traits?.map(t => ({ title: t.name, desc: t.desc })) ?? []
              return (
                <div key={i} className="bg-gray-800 rounded-lg p-3">
                  <p className="font-semibold text-amber-300 mb-1">{sr.name}</p>
                  {(sr.fullDescription || sr.description) && (
                    <p className="text-xs text-gray-400 mb-2">{sr.fullDescription || sr.description}</p>
                  )}
                  {sr.ability_bonuses?.length > 0 && (
                    <p className="text-xs text-gray-400 mb-2">
                      Bônus: {sr.ability_bonuses.map(b => `+${b.bonus} ${b.ability}`).join(', ')}
                    </p>
                  )}
                  <TopicList items={srTopics} emptyMessage="" />
                </div>
              )
            })}
          </div>
        </div>
      )}
      <FullDescriptionToggle text={fullDescription} />
    </>
  )
}

/* ── Modal: Classe ── */
function ClassModalContent({ cls }) {
  const topics = cls.topics
    ?? cls.level1_features?.map(f => ({ title: f.name, desc: f.desc }))
    ?? []
  const summary         = cls.summary || ''
  const fullDescription = cls.fullDescription || cls.description || ''

  return (
    <>
      {summary && (
        <p className="text-sm text-gray-200 leading-relaxed font-medium">{summary}</p>
      )}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
          <p className="text-gray-400 mb-1">Dado de Vida</p>
          <p className="text-2xl font-bold text-amber-400">d{cls.hit_die}</p>
        </div>
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3">
          <p className="text-gray-400 mb-1">Habilidade de Magia</p>
          <p className="text-base font-bold text-amber-400">{cls.spellcasting_ability || '—'}</p>
        </div>
      </div>
      {cls.saving_throws?.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Testes de Resistência</h3>
          <div className="flex flex-wrap gap-2">
            {cls.saving_throws.map((s, i) => (
              <span key={i} className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full text-xs text-amber-300">{s}</span>
            ))}
          </div>
        </div>
      )}
      {(cls.armor_proficiencies?.length > 0 || cls.weapon_proficiencies?.length > 0) && (
        <div className="space-y-1">
          {cls.armor_proficiencies?.length > 0 && (
            <p className="text-xs text-gray-400">
              <span className="text-amber-400 font-semibold">Armaduras: </span>
              {cls.armor_proficiencies.join(', ')}
            </p>
          )}
          {cls.weapon_proficiencies?.length > 0 && (
            <p className="text-xs text-gray-400">
              <span className="text-amber-400 font-semibold">Armas: </span>
              {cls.weapon_proficiencies.join(', ')}
            </p>
          )}
        </div>
      )}
      {cls.skill_choices?.from?.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
            Perícias (escolha {cls.skill_choices.count})
          </h3>
          <div className="flex flex-wrap gap-1">
            {cls.skill_choices.from.map((s, i) => (
              <span key={i} className="bg-gray-800 border border-gray-600 px-2 py-0.5 rounded text-xs text-gray-300">{s}</span>
            ))}
          </div>
        </div>
      )}
      {topics.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">Características de Nível 1</h3>
          <TopicList items={topics} initialLimit={4} emptyMessage="Sem características disponíveis." />
        </div>
      )}
      <FullDescriptionToggle text={fullDescription} />
    </>
  )
}

/* ── Modal: Antecedente ── */
function BackgroundModalContent({ bg }) {
  return (
    <>
      {bg.description && (
        <p className="text-sm text-gray-300 leading-relaxed">{bg.description}</p>
      )}
      <div className="grid grid-cols-1 gap-2 text-sm">
        {bg.skill_proficiencies?.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Proficiência em Perícias</p>
            <p className="text-amber-300">{bg.skill_proficiencies.join(', ')}</p>
          </div>
        )}
        {bg.tool_proficiencies?.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Proficiência em Ferramentas</p>
            <p className="text-amber-300">{bg.tool_proficiencies.join(', ')}</p>
          </div>
        )}
        {bg.languages && (
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Idiomas</p>
            <p className="text-amber-300">{bg.languages}</p>
          </div>
        )}
        {bg.equipment && (
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Equipamento</p>
            <p className="text-gray-300 text-xs leading-relaxed">{bg.equipment}</p>
          </div>
        )}
      </div>
      {bg.feature?.name && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">
            Característica: {bg.feature.name}
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed">{bg.feature.desc}</p>
        </div>
      )}
      {bg.personality_traits?.length > 0 && <TableSection title="Traços de Personalidade" items={bg.personality_traits} />}
      {bg.ideals?.length > 0 && <TableSection title="Ideais" items={bg.ideals} />}
      {bg.bonds?.length > 0 && <TableSection title="Vínculos" items={bg.bonds} />}
      {bg.flaws?.length > 0 && <TableSection title="Defeitos" items={bg.flaws} />}
    </>
  )
}

function TableSection({ title, items }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">{title}</h3>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2 text-xs bg-gray-800 rounded px-3 py-2">
            <span className="text-amber-600 font-bold shrink-0 w-4">{i + 1}</span>
            <span className="text-gray-300">{item}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Seletor de Idiomas ── */
function LanguageSelector({ raceIndex, backgroundLanguages, selectedLanguages, onToggle, maxCount }) {
  const [showAll, setShowAll] = useState(false)
  const raceLangs  = RACE_LANGUAGES[raceIndex] ?? []
  const atLimit    = maxCount > 0 && selectedLanguages.length >= maxCount
  const hasSlots   = maxCount > 0

  return (
    <div className="col-span-2 sm:col-span-3 bg-gray-800 border border-gray-600 rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Idiomas</span>
          {hasSlots && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
              atLimit ? 'bg-amber-900/40 text-amber-400 border border-amber-700' : 'bg-gray-700 text-gray-400'
            }`}>
              {selectedLanguages.length}/{maxCount} extras
            </span>
          )}
        </div>
        {hasSlots && (
          <button
            onClick={() => setShowAll(v => !v)}
            disabled={atLimit && !showAll}
            className="text-xs text-gray-400 hover:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {showAll ? 'Recolher' : atLimit ? 'Limite atingido' : 'Selecionar idiomas'}
          </button>
        )}
      </div>

      {/* Idiomas fixos da raça */}
      {raceLangs.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {raceLangs.map(lang => (
            <span key={lang} className="text-xs bg-gray-700 border border-gray-500 px-2 py-0.5 rounded-full text-amber-300">
              {lang} <span className="text-gray-500 text-[10px]">(raça)</span>
            </span>
          ))}
        </div>
      )}

      {/* Nota do antecedente */}
      {backgroundLanguages && (
        <p className="text-xs text-gray-400">
          <span className="text-amber-500">Antecedente:</span> {backgroundLanguages}
          {!hasSlots && <span className="text-gray-600 ml-1">(sem seleção livre)</span>}
        </p>
      )}

      {/* Chips dos idiomas escolhidos */}
      {selectedLanguages.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedLanguages.map(lang => (
            <button
              key={lang}
              onClick={() => onToggle(lang)}
              title="Remover"
              className="text-xs bg-amber-900/40 border border-amber-700 px-2 py-0.5 rounded-full text-amber-300 hover:bg-red-900/40 hover:border-red-700 hover:text-red-300 transition-colors"
            >
              {lang} ×
            </button>
          ))}
        </div>
      )}

      {/* Painel de seleção — só aparece se houver slots e o usuário abrir */}
      {hasSlots && showAll && (
        <div className="flex flex-wrap gap-1 pt-1 border-t border-gray-700">
          {DND_LANGUAGES.filter(l => !raceLangs.includes(l)).map(lang => {
            const selected  = selectedLanguages.includes(lang)
            const blocked   = !selected && atLimit
            return (
              <button
                key={lang}
                onClick={() => !blocked && onToggle(lang)}
                disabled={blocked}
                className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                  selected
                    ? 'bg-amber-800 border-amber-600 text-amber-200'
                    : blocked
                    ? 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed opacity-50'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-amber-500 hover:text-amber-300'
                }`}
              >
                {lang}
              </button>
            )
          })}
        </div>
      )}

      {/* Mensagem quando antecedente não concede idiomas selecionáveis */}
      {!hasSlots && !backgroundLanguages && raceLangs.length === 0 && (
        <p className="text-xs text-gray-600 italic">Selecione raça e antecedente para ver os idiomas.</p>
      )}
    </div>
  )
}

/* ── XP Thresholds D&D 5e (PHB p.15) ── */
const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
]

/* ── Retrato do personagem ── */
function PortraitUpload({ portrait, onUpload }) {
  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = ev => onUpload(ev.target.result)
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <label className="cursor-pointer group relative" title="Clique para alterar retrato">
        <div className={`w-20 h-20 rounded-full border-2 overflow-hidden flex items-center justify-center transition-colors ${
          portrait ? 'border-amber-600' : 'border-gray-600 border-dashed hover:border-amber-500'
        }`}>
          {portrait ? (
            <img src={portrait} alt="Retrato" className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl text-gray-600 group-hover:text-gray-400">👤</span>
          )}
        </div>
        {portrait && (
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <span className="text-xs text-white font-semibold">Alterar</span>
          </div>
        )}
        <input type="file" accept="image/*" onChange={handleFile} className="sr-only" />
      </label>
      {portrait && (
        <button
          onClick={() => onUpload(null)}
          className="text-[10px] text-gray-600 hover:text-red-400 transition-colors"
        >
          remover
        </button>
      )}
    </div>
  )
}

/* ── Tracker de XP ── */
function XpTracker({ xp = 0, level = 1, onUpdate }) {
  const currentThreshold = XP_THRESHOLDS[level - 1] ?? 0
  const nextThreshold    = XP_THRESHOLDS[level] ?? null  // null = nível 20
  const progress = nextThreshold
    ? Math.min(100, ((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100

  return (
    <div className="col-span-2 sm:col-span-3 space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 font-semibold">XP</span>
        {nextThreshold && (
          <span className="text-[10px] text-gray-500">
            {xp.toLocaleString()} / {nextThreshold.toLocaleString()} para Nível {level + 1}
          </span>
        )}
        {!nextThreshold && (
          <span className="text-[10px] text-amber-500">Nível máximo ✦</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={xp}
          onChange={e => onUpdate('xp', Math.max(0, parseInt(e.target.value) || 0))}
          onWheel={e => e.currentTarget.blur()}
          className="w-28 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <div className="flex-1 bg-gray-700 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-amber-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-gray-500 w-8 text-right">{Math.round(progress)}%</span>
      </div>
    </div>
  )
}

/* ── Componente principal ── */
export function CharacterInfo({ info, onUpdate, races, classes, backgrounds, errors = {}, onRaceChange, onSubraceChange, onBackgroundChange, onClassChange, onToggleLanguage }) {
  const [modal, setModal] = useState(null)
  const [classChoices, setClassChoices] = useState({})

  useEffect(() => {
    fetch('/srd-data/phb-class-choices-pt.json').then(r => r.json()).then(setClassChoices).catch(() => {})
  }, [])

  const selectedRace    = races.find(r => r.index === info.race)
  const selectedClass   = classes.find(c => c.index === info.class)
  const selectedBg      = backgrounds.find(b => b.index === info.background)
  const selectedSubrace = selectedRace?.subraces?.find(sr => sr.index === info.subrace)

  const fieldCls = (hasErr) =>
    `w-full bg-gray-800 border rounded px-3 py-2 text-white focus:outline-none focus:ring-1 ${
      hasErr
        ? 'border-red-500 focus:border-red-400 focus:ring-red-400'
        : 'border-gray-600 focus:border-amber-400 focus:ring-amber-400'
    }`

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {/* Retrato do personagem */}
      <div className="row-span-2 flex items-start justify-center pt-1">
        <PortraitUpload
          portrait={info.portrait ?? null}
          onUpload={v => onUpdate('portrait', v)}
        />
      </div>

      {/* Nome do Personagem */}
      <div className="col-span-1 sm:col-span-2">
        <label htmlFor="field-name" className="block text-xs text-gray-400 mb-1">Nome do Personagem</label>
        <input
          id="field-name"
          type="text"
          value={info.name}
          onChange={e => onUpdate('name', e.target.value)}
          placeholder="Ex: Thorin Ironforge"
          aria-describedby={errors.name ? 'err-name' : undefined}
          className={`${fieldCls(!!errors.name)} text-lg font-semibold`}
        />
        <FormFieldError id="err-name" message={errors.name} />
      </div>

      {/* Nome do Jogador */}
      <div className="col-span-1">
        <label htmlFor="field-player-name" className="block text-xs text-gray-400 mb-1">Nome do Jogador</label>
        <input
          id="field-player-name"
          type="text"
          value={info.playerName ?? ''}
          onChange={e => onUpdate('playerName', e.target.value)}
          placeholder="Seu nome"
          className={fieldCls(false)}
        />
      </div>

      {/* Raça */}
      <div>
        <label htmlFor="field-race" className="block text-xs text-gray-400 mb-1">Raça</label>
        <div className="flex gap-1">
          <select
            id="field-race"
            value={info.race}
            onChange={e => onRaceChange?.(e.target.value) ?? onUpdate('race', e.target.value)}
            aria-describedby={errors.race ? 'err-race' : undefined}
            className={fieldCls(!!errors.race)}
          >
            <option value="">Escolher...</option>
            {races.map(r => (
              <option key={r.index} value={r.index}>{r.name}</option>
            ))}
          </select>
          {selectedRace && (
            <button
              onClick={() => setModal('race')}
              title="Ver detalhes"
              className="px-2 py-1 bg-gray-700 hover:bg-amber-700 text-amber-400 hover:text-white rounded transition-colors text-sm"
            >
              ?
            </button>
          )}
        </div>
        <FormFieldError id="err-race" message={errors.race} />
      </div>

      {/* Sub-raça */}
      {selectedRace?.subraces?.length > 0 && (
        <div>
          <label htmlFor="field-subrace" className="block text-xs text-gray-400 mb-1">
            Sub-raça{' '}
            {selectedRace.optionalSubrace
              ? <span className="text-gray-500 ml-0.5">(opcional)</span>
              : <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>}
          </label>
          <div className="flex gap-1">
            <select
              id="field-subrace"
              value={info.subrace || ''}
              onChange={e => onSubraceChange?.(e.target.value) ?? onUpdate('subrace', e.target.value)}
              aria-describedby={errors.subrace ? 'err-subrace' : undefined}
              className={fieldCls(!!errors.subrace)}
            >
              <option value="">{selectedRace.optionalSubrace ? 'Nenhuma (raça base)' : 'Escolher sub-raça...'}</option>
              {selectedRace.subraces.map(sr => (
                <option key={sr.index} value={sr.index}>{sr.name}</option>
              ))}
            </select>
            {selectedSubrace && (
              <button
                onClick={() => setModal('subrace')}
                title="Ver traços da sub-raça"
                className="px-2 py-1 bg-gray-700 hover:bg-amber-700 text-amber-400 hover:text-white rounded transition-colors text-sm"
              >
                ?
              </button>
            )}
          </div>
          <FormFieldError id="err-subrace" message={errors.subrace} />
        </div>
      )}

      {/* Classe */}
      <div>
        <label htmlFor="field-class" className="block text-xs text-gray-400 mb-1">Classe</label>
        <div className="flex gap-1">
          <select
            id="field-class"
            value={info.class}
            onChange={e => onClassChange?.(e.target.value) ?? onUpdate('class', e.target.value)}
            aria-describedby={errors.class ? 'err-class' : undefined}
            className={fieldCls(!!errors.class)}
          >
            <option value="">Escolher...</option>
            {classes.map(c => (
              <option key={c.index} value={c.index}>{c.name}</option>
            ))}
          </select>
          {selectedClass && (
            <button
              onClick={() => setModal('class')}
              title="Ver detalhes"
              className="px-2 py-1 bg-gray-700 hover:bg-amber-700 text-amber-400 hover:text-white rounded transition-colors text-sm"
            >
              ?
            </button>
          )}
        </div>
        <FormFieldError id="err-class" message={errors.class} />
      </div>

      {/* Nível */}
      <div>
        <label htmlFor="field-level" className="block text-xs text-gray-400 mb-1">
          Nível
          {(info.multiclasses?.length > 0) && (() => {
            const totalLevel = info.level + (info.multiclasses ?? []).reduce((s, m) => s + (m.level ?? 0), 0)
            const parts = (info.multiclasses ?? []).map(m => `${m.class} ${m.level}`).join(' / ')
            return (
              <span className="ml-2 text-amber-500 font-normal">
                Total: {totalLevel} <span className="text-gray-500 text-[10px]">({info.class} {info.level} / {parts})</span>
              </span>
            )
          })()}
        </label>
        <select
          id="field-level"
          value={info.level}
          onChange={e => onUpdate('level', Number(e.target.value))}
          aria-describedby={errors.level ? 'err-level' : undefined}
          className={fieldCls(!!errors.level)}
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
            <option key={n} value={n}>Nível {n}</option>
          ))}
        </select>
        <FormFieldError id="err-level" message={errors.level} />
      </div>

      {/* Características escolhidas da classe */}
      {info.class && (() => {
        const choices = classChoices[info.class]?.choices ?? []
        const chosen = info.chosenFeatures ?? {}
        const filled = choices.filter(c => c.level <= info.level && chosen[c.id])
        if (!filled.length) return null
        return (
          <div className="bg-gray-800/50 border border-amber-800/30 rounded-lg px-3 py-2 space-y-1">
            <p className="text-[10px] text-amber-600 uppercase tracking-widest font-semibold">Características de Classe</p>
            {filled.map(c => {
              const opt = c.options.find(o => o.value === chosen[c.id])
              return (
                <p key={c.id} className="text-xs text-gray-300">
                  <span className="text-amber-400">{c.featureName}:</span> {opt?.name ?? chosen[c.id]}
                </p>
              )
            })}
          </div>
        )
      })()}

      {/* Antecedente */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Antecedente</label>
        <div className="flex gap-1">
          <select
            value={info.background}
            onChange={e => onBackgroundChange?.(e.target.value) ?? onUpdate('background', e.target.value)}
            className="flex-1 bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
          >
            <option value="">Escolher...</option>
            {backgrounds.map(b => (
              <option key={b.index} value={b.index}>{b.name}</option>
            ))}
          </select>
          {selectedBg && (
            <button
              onClick={() => setModal('background')}
              title="Ver detalhes"
              className="px-2 py-1 bg-gray-700 hover:bg-amber-700 text-amber-400 hover:text-white rounded transition-colors text-sm"
            >
              ?
            </button>
          )}
        </div>
      </div>

      {/* Alinhamento */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Alinhamento</label>
        <select
          value={info.alignment}
          onChange={e => onUpdate('alignment', e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
        >
          <option value="">Escolher...</option>
          {ALIGNMENTS.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* XP Tracker */}
      <XpTracker xp={info.xp ?? 0} level={info.level ?? 1} onUpdate={onUpdate} />

      {/* Seletor de Idiomas */}
      {(info.race || info.background) && (
        <LanguageSelector
          raceIndex={info.race}
          backgroundLanguages={selectedBg?.languages ?? null}
          selectedLanguages={info.languages ?? []}
          onToggle={onToggleLanguage}
          maxCount={parseBackgroundLanguageCount(selectedBg?.languages)}
        />
      )}

      {/* Modais */}
      <DetailsModal isOpen={modal === 'race'} onClose={() => setModal(null)} title={selectedRace?.name || ''}>
        {selectedRace && <RaceModalContent race={selectedRace} />}
      </DetailsModal>

      <DetailsModal isOpen={modal === 'class'} onClose={() => setModal(null)} title={selectedClass?.name || ''}>
        {selectedClass && <ClassModalContent cls={selectedClass} />}
      </DetailsModal>

      <DetailsModal isOpen={modal === 'background'} onClose={() => setModal(null)} title={selectedBg?.name || ''}>
        {selectedBg && <BackgroundModalContent bg={selectedBg} />}
      </DetailsModal>

      <DetailsModal isOpen={modal === 'subrace'} onClose={() => setModal(null)} title={selectedSubrace?.name || ''}>
        {selectedSubrace && (
          <>
            {(selectedSubrace.fullDescription || selectedSubrace.description) && (
              <p className="text-sm text-gray-300 leading-relaxed">
                {selectedSubrace.fullDescription || selectedSubrace.description}
              </p>
            )}
            {selectedSubrace.ability_bonuses?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedSubrace.ability_bonuses.map((b, i) => (
                  <span key={i} className="bg-gray-800 border border-gray-600 px-3 py-1 rounded-full text-xs">
                    <span className="text-amber-300">+{b.bonus}</span> {b.ability}
                  </span>
                ))}
              </div>
            )}
            <TopicList
              items={selectedSubrace.topics ?? selectedSubrace.traits?.map(t => ({ title: t.name, desc: t.desc })) ?? []}
              emptyMessage="Consulte o Livro do Jogador para os traços desta sub-raça."
            />
          </>
        )}
      </DetailsModal>
    </div>
  )
}

import { useState } from 'react'
import { DetailsModal } from '../DetailsModal'
import { FormFieldError } from '../FormFieldError'
import { TopicList, FullDescriptionToggle } from '../TopicList'
import { ABBR_TO_KEY, ALIGNMENTS } from '../../utils/calculations'

/* ── Conteúdo do modal de Raça ── */
function RaceModalContent({ race }) {
  // Suporta tanto o formato novo (topics/summary/fullDescription)
  // quanto o fallback do SRD inglês (traits/description)
  const topics = race.topics
    ?? race.traits?.map(t => ({ title: t.name, desc: t.desc }))
    ?? []
  const summary         = race.summary || ''
  const fullDescription = race.fullDescription || race.description || ''

  return (
    <>
      {/* Resumo curto */}
      {summary && (
        <p className="text-sm text-gray-200 leading-relaxed font-medium">{summary}</p>
      )}

      {/* Chips de stats */}
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

      {/* Traços como tópicos estruturados */}
      {topics.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">Traços Raciais</h3>
          <TopicList items={topics} initialLimit={5} emptyMessage="Sem traços disponíveis." />
        </div>
      )}

      {/* Sub-raças */}
      {race.subraces?.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">Sub-raças</h3>
          <div className="space-y-4">
            {race.subraces.map((sr, i) => {
              const srTopics = sr.topics
                ?? sr.traits?.map(t => ({ title: t.name, desc: t.desc }))
                ?? []
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

      {/* Lore completo colapsável */}
      <FullDescriptionToggle text={fullDescription} />
    </>
  )
}

/* ── Conteúdo do modal de Classe ── */
function ClassModalContent({ cls }) {
  const topics = cls.topics
    ?? cls.level1_features?.map(f => ({ title: f.name, desc: f.desc }))
    ?? []
  const summary         = cls.summary || ''
  const fullDescription = cls.fullDescription || cls.description || ''

  return (
    <>
      {/* Resumo curto */}
      {summary && (
        <p className="text-sm text-gray-200 leading-relaxed font-medium">{summary}</p>
      )}

      {/* Stats principais */}
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

      {/* Chips de proficiências */}
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

      {/* Características como tópicos estruturados */}
      {topics.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3">
            Características de Nível 1
          </h3>
          <TopicList items={topics} initialLimit={4} emptyMessage="Sem características disponíveis." />
        </div>
      )}

      {/* Lore completo colapsável */}
      <FullDescriptionToggle text={fullDescription} />
    </>
  )
}

/* ── Conteúdo do modal de Antecedente ── */
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

      {bg.personality_traits?.length > 0 && (
        <TableSection title="Traços de Personalidade" items={bg.personality_traits} />
      )}
      {bg.ideals?.length > 0 && (
        <TableSection title="Ideais" items={bg.ideals} />
      )}
      {bg.bonds?.length > 0 && (
        <TableSection title="Vínculos" items={bg.bonds} />
      )}
      {bg.flaws?.length > 0 && (
        <TableSection title="Defeitos" items={bg.flaws} />
      )}
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

/* ── Componente principal ── */
export function CharacterInfo({ info, onUpdate, races, classes, backgrounds, errors = {}, onRaceChange, onSubraceChange, onBackgroundChange, onClassChange }) {
  const [modal, setModal] = useState(null) // 'race' | 'class' | 'background' | null

  const selectedRace    = races.find(r => r.index === info.race)
  const selectedClass   = classes.find(c => c.index === info.class)
  const selectedBg      = backgrounds.find(b => b.index === info.background)
  const selectedSubrace = selectedRace?.subraces?.find(sr => sr.index === info.subrace)

  // Bônus combinados: raça + sub-raça selecionada
  const allBonuses = [
    ...(selectedRace?.ability_bonuses ?? []),
    ...(selectedSubrace?.ability_bonuses ?? []),
  ]
  // Agrupa por chave somando bônus (ex: Humano +1 em todos)
  const bonusesByKey = {}
  for (const b of allBonuses) {
    const key = ABBR_TO_KEY[b.ability]
    if (key) bonusesByKey[key] = (bonusesByKey[key] ?? 0) + b.bonus
  }

  // Delega troca de raça ao CharacterSheet (reverte bônus antigos, aplica novos)
  function handleRaceChange(value) {
    onRaceChange?.(value) ?? onUpdate('race', value)
  }

  // Classe base dos campos — vermelha quando há erro
  const fieldCls = (hasErr) =>
    `w-full bg-gray-800 border rounded px-3 py-2 text-white focus:outline-none focus:ring-1 ${
      hasErr
        ? 'border-red-500 focus:border-red-400 focus:ring-red-400'
        : 'border-gray-600 focus:border-amber-400 focus:ring-amber-400'
    }`

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="col-span-2 sm:col-span-3">
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

      {/* Raça */}
      <div>
        <label htmlFor="field-race" className="block text-xs text-gray-400 mb-1">Raça</label>
        <div className="flex gap-1">
          <select
            id="field-race"
            value={info.race}
            onChange={e => handleRaceChange(e.target.value)}
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

      {/* Sub-raça — aparece apenas quando a raça selecionada tem sub-raças */}
      {selectedRace?.subraces?.length > 0 && (
        <div>
          <label htmlFor="field-subrace" className="block text-xs text-gray-400 mb-1">
            Sub-raça
            <span className="text-red-400 ml-0.5" aria-hidden="true">*</span>
          </label>
          <div className="flex gap-1">
            <select
              id="field-subrace"
              value={info.subrace || ''}
              onChange={e => onSubraceChange?.(e.target.value) ?? onUpdate('subrace', e.target.value)}
              aria-describedby={errors.subrace ? 'err-subrace' : undefined}
              className={fieldCls(!!errors.subrace)}
            >
              <option value="">Escolher sub-raça...</option>
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

      {/* Bônus de raça — exibidos automaticamente quando raça/sub-raça é selecionada */}
      {allBonuses.length > 0 && (
        <div className="col-span-2 sm:col-span-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-400 shrink-0">Bônus aplicados:</span>
          {allBonuses.map((b, i) => (
            <span key={i} className="text-xs bg-gray-700 border border-gray-600 px-2 py-0.5 rounded-full text-amber-300">
              +{b.bonus} {b.ability}
            </span>
          ))}
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

      {/* Nível — select fixo 1-20: evita scroll acidental e typos */}
      <div>
        <label htmlFor="field-level" className="block text-xs text-gray-400 mb-1">Nível</label>
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

      {/* Modais */}
      <DetailsModal
        isOpen={modal === 'race'}
        onClose={() => setModal(null)}
        title={selectedRace?.name || ''}
      >
        {selectedRace && <RaceModalContent race={selectedRace} />}
      </DetailsModal>

      <DetailsModal
        isOpen={modal === 'class'}
        onClose={() => setModal(null)}
        title={selectedClass?.name || ''}
      >
        {selectedClass && <ClassModalContent cls={selectedClass} />}
      </DetailsModal>

      <DetailsModal
        isOpen={modal === 'background'}
        onClose={() => setModal(null)}
        title={selectedBg?.name || ''}
      >
        {selectedBg && <BackgroundModalContent bg={selectedBg} />}
      </DetailsModal>

      {/* Modal de sub-raça */}
      <DetailsModal
        isOpen={modal === 'subrace'}
        onClose={() => setModal(null)}
        title={selectedSubrace?.name || ''}
      >
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

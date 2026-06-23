import { Modal } from '../../../components/ui/Modal'
import { Icon } from '../../../components/ui/Icon'

const SCHOOL_PT = {
  abjuração: 'Abjuração', conjuração: 'Conjuração', adivinhação: 'Adivinhação',
  encantamento: 'Encantamento', evocação: 'Evocação', ilusão: 'Ilusão',
  necromancia: 'Necromancia', transmutação: 'Transmutação',
  abjuration: 'Abjuração', conjuration: 'Conjuração', divination: 'Adivinhação',
  enchantment: 'Encantamento', evocation: 'Evocação', illusion: 'Ilusão',
  necromancy: 'Necromancia', transmutation: 'Transmutação',
}

/* Pill por escola com cor pastel sépia — distingue sem destoar do tema parchment. */
function schoolColor(school) {
  const s = (school || '').toLowerCase()
  if (s.includes('evoc'))   return 'bg-red-100 text-red-800 border-red-600'
  if (s.includes('abj'))    return 'bg-blue-100 text-blue-800 border-blue-600'
  if (s.includes('conj'))   return 'bg-purple-100 text-purple-800 border-purple-600'
  if (s.includes('enc'))    return 'bg-amber-100 text-amber-800 border-amber-600'
  if (s.includes('ilu'))    return 'bg-purple-100 text-purple-800 border-purple-600'
  if (s.includes('necro'))  return 'bg-parchment-200 text-ink-500 border-parchment-600'
  if (s.includes('trans'))  return 'bg-yellow-100 text-yellow-800 border-yellow-600'
  if (s.includes('adiv') || s.includes('divin')) return 'bg-sky-100 text-sky-800 border-sky-600'
  return 'bg-parchment-200 text-ink-500 border-parchment-600'
}

export function SpellDetailModal({ spell, onClose }) {
  if (!spell) return null

  const school     = (spell.school?.name || spell.school || '').toLowerCase()
  const schoolName = SCHOOL_PT[school] || spell.school || ''
  const levelLabel = spell.level === 0 ? 'Truque' : `${spell.level}º Nível`

  const desc        = Array.isArray(spell.desc) ? spell.desc.join('\n\n') : (spell.desc || '')
  const higherLevel = Array.isArray(spell.higher_level) ? spell.higher_level.join(' ') : (spell.higher_level || spell.higherLevel || '')
  const castingTime = spell.casting_time || spell.castingTime || ''
  const components  = Array.isArray(spell.components) ? spell.components.join(', ') : (spell.components || '')

  return (
    <Modal
      open={true}
      onClose={onClose}
      size="md"
      closeLabel="Fechar detalhes da magia"
      title={(
        <span className="flex items-center gap-2 min-w-0">
          <span className="font-display tracking-wide text-ink-500 truncate">{spell.name}</span>
        </span>
      )}
      footer={null}
    >
      {/* Badges de meta (escola, nível, ritual, concentração) */}
      <div className="flex items-center gap-1.5 flex-wrap mb-3 pb-3 border-b border-parchment-600">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-sm border ${schoolColor(school)}`}>
          {schoolName}
        </span>
        <span className="text-xs ink-italic text-ink-300">{levelLabel}</span>
        {spell.ritual && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-sm border bg-green-100 text-green-800 border-green-600">
            <Icon name="scroll" size={11} strokeWidth={2} />
            Ritual
          </span>
        )}
        {spell.concentration && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-sm border bg-blue-100 text-blue-800 border-blue-600">
            <Icon name="target" size={11} strokeWidth={2} />
            Concentração
          </span>
        )}
      </div>

      {/* Stats em grid 2x2 */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-3 mb-3 border-b border-parchment-600">
        {castingTime && (
          <div>
            <p className="text-xs font-display tracking-widest uppercase text-ink-300">Tempo</p>
            <p className="text-sm text-ink-500">{castingTime}</p>
          </div>
        )}
        {spell.range && (
          <div>
            <p className="text-xs font-display tracking-widest uppercase text-ink-300">Alcance</p>
            <p className="text-sm text-ink-500">{spell.range}</p>
          </div>
        )}
        {components && (
          <div>
            <p className="text-xs font-display tracking-widest uppercase text-ink-300">Componentes</p>
            <p className="text-sm text-ink-500">{components}</p>
          </div>
        )}
        {spell.duration && (
          <div>
            <p className="text-xs font-display tracking-widest uppercase text-ink-300">Duração</p>
            <p className="text-sm text-ink-500">{spell.duration}</p>
          </div>
        )}
        {spell.material && (
          <div className="col-span-2">
            <p className="text-xs font-display tracking-widest uppercase text-ink-300">Material</p>
            <p className="text-sm ink-italic text-ink-300">{spell.material}</p>
          </div>
        )}
      </div>

      {/* Descrição */}
      {desc && (
        <p className="text-sm text-ink-500 leading-relaxed whitespace-pre-wrap">{desc}</p>
      )}
      {higherLevel && (
        <div className="mt-3 pt-3 border-t border-parchment-600">
          <p className="text-xs font-display uppercase tracking-widest text-ink-500 mb-1">
            Em Nível Superior
          </p>
          <p className="text-sm ink-italic text-ink-300 leading-relaxed">{higherLevel}</p>
        </div>
      )}
    </Modal>
  )
}

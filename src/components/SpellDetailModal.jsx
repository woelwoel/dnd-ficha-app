import { useEffect } from 'react'

const SCHOOL_PT = {
  abjuração: 'Abjuração', conjuração: 'Conjuração', adivinhação: 'Adivinhação',
  encantamento: 'Encantamento', evocação: 'Evocação', ilusão: 'Ilusão',
  necromancia: 'Necromancia', transmutação: 'Transmutação',
  abjuration: 'Abjuração', conjuration: 'Conjuração', divination: 'Adivinhação',
  enchantment: 'Encantamento', evocation: 'Evocação', illusion: 'Ilusão',
  necromancy: 'Necromancia', transmutation: 'Transmutação',
}

function schoolColor(school) {
  const s = (school || '').toLowerCase()
  if (s.includes('evoc'))   return 'bg-red-900/60 text-red-300 border-red-700'
  if (s.includes('abj'))    return 'bg-blue-900/60 text-blue-300 border-blue-700'
  if (s.includes('conj'))   return 'bg-purple-900/60 text-purple-300 border-purple-700'
  if (s.includes('enc'))    return 'bg-pink-900/60 text-pink-300 border-pink-700'
  if (s.includes('ilu'))    return 'bg-indigo-900/60 text-indigo-300 border-indigo-700'
  if (s.includes('necro'))  return 'bg-gray-800 text-gray-400 border-gray-600'
  if (s.includes('trans'))  return 'bg-yellow-900/60 text-yellow-300 border-yellow-700'
  if (s.includes('adiv') || s.includes('divin')) return 'bg-teal-900/60 text-teal-300 border-teal-700'
  return 'bg-gray-800 text-gray-400 border-gray-600'
}

export function SpellDetailModal({ spell, onClose }) {
  // Fechar com Escape
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!spell) return null

  const school     = (spell.school?.name || spell.school || '').toLowerCase()
  const schoolName = SCHOOL_PT[school] || spell.school || ''
  const levelLabel = spell.level === 0 ? 'Truque' : `${spell.level}º Nível`

  const desc        = Array.isArray(spell.desc) ? spell.desc.join('\n\n') : (spell.desc || '')
  const higherLevel = Array.isArray(spell.higher_level) ? spell.higher_level.join(' ') : (spell.higher_level || spell.higherLevel || '')
  const castingTime = spell.casting_time || spell.castingTime || ''
  const components  = Array.isArray(spell.components) ? spell.components.join(', ') : (spell.components || '')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-gray-900 border border-amber-700/50 rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-gray-700">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${schoolColor(school)}`}>
                {schoolName}
              </span>
              <span className="text-[10px] text-gray-500">{levelLabel}</span>
              {spell.ritual && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-green-900/50 text-green-300 border-green-700">
                  📿 Ritual
                </span>
              )}
              {spell.concentration && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded border bg-blue-900/50 text-blue-300 border-blue-700">
                  ⊙ Concentração
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-amber-300 font-display leading-tight">{spell.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-xl leading-none flex-shrink-0 mt-0.5 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Stats rápidos */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 border-b border-gray-700/60 bg-gray-800/40">
          {castingTime && (
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Tempo</span>
              <p className="text-xs text-gray-200">{castingTime}</p>
            </div>
          )}
          {spell.range && (
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Alcance</span>
              <p className="text-xs text-gray-200">{spell.range}</p>
            </div>
          )}
          {components && (
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Componentes</span>
              <p className="text-xs text-gray-200">{components}</p>
            </div>
          )}
          {spell.duration && (
            <div>
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Duração</span>
              <p className="text-xs text-gray-200">{spell.duration}</p>
            </div>
          )}
          {spell.material && (
            <div className="col-span-2">
              <span className="text-[10px] text-gray-500 uppercase tracking-wide">Material</span>
              <p className="text-xs text-gray-400 italic">{spell.material}</p>
            </div>
          )}
        </div>

        {/* Descrição — scrollável */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {desc && (
            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{desc}</p>
          )}
          {higherLevel && (
            <div>
              <p className="text-[10px] text-amber-600 uppercase tracking-wide font-semibold mb-1">Em Nível Superior</p>
              <p className="text-sm text-gray-400 italic leading-relaxed">{higherLevel}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'

/**
 * Renderiza uma lista de tópicos estruturados {title, desc}.
 *
 * Props:
 * - items          : {title: string, desc: string}[] — lista de tópicos
 * - emptyMessage   : string — texto quando não há tópicos válidos
 * - initialLimit   : number — quantos tópicos mostrar antes de "Ver mais" (0 = todos)
 */
export function TopicList({ items = [], emptyMessage = 'Sem informações disponíveis.', initialLimit = 0 }) {
  const [expanded, setExpanded] = useState(false)

  // Filtra tópicos com título e descrição não vazios
  const valid = items.filter(t => t.title?.trim() && t.desc?.trim())

  if (!valid.length) {
    return <p className="text-xs text-gray-500 italic">{emptyMessage}</p>
  }

  const visible = (initialLimit > 0 && !expanded)
    ? valid.slice(0, initialLimit)
    : valid

  const hasMore = initialLimit > 0 && valid.length > initialLimit

  return (
    <div className="divide-y divide-gray-700/60">
      {visible.map((item, i) => (
        <div key={i} className="py-2 first:pt-0 last:pb-0">
          <p className="text-xs font-bold text-amber-300 uppercase tracking-wide mb-0.5">{item.title}</p>
          <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
        </div>
      ))}

      {hasMore && (
        <button
          onClick={() => setExpanded(v => !v)}
          className="text-xs text-amber-500 hover:text-amber-300 underline mt-1"
        >
          {expanded ? '▲ Mostrar menos' : `▼ Ver mais ${valid.length - initialLimit} características`}
        </button>
      )}
    </div>
  )
}

/**
 * Bloco colapsável para exibir o texto completo (fullDescription).
 * Oculto por padrão — o usuário abre com "Ver texto completo".
 */
export function FullDescriptionToggle({ text }) {
  const [open, setOpen] = useState(false)

  if (!text?.trim()) return null

  return (
    <div className="border-t border-gray-700 pt-3">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-xs text-gray-500 hover:text-gray-300 underline"
      >
        {open ? '▲ Ocultar texto completo' : '▼ Ver texto completo (lore)'}
      </button>
      {open && (
        <p className="mt-2 text-xs text-gray-500 leading-relaxed whitespace-pre-wrap">
          {text}
        </p>
      )}
    </div>
  )
}

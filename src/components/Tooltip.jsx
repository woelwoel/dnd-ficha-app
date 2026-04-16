/**
 * Tooltip simples baseado em CSS hover.
 * Aparece acima do elemento por padrão.
 *
 * Props:
 * - content  : string | ReactNode — conteúdo do tooltip
 * - children : ReactNode          — elemento que dispara o tooltip
 * - position : 'top'|'bottom'     — posicionamento (padrão: 'top')
 */
export function Tooltip({ content, children, position = 'top' }) {
  if (!content) return children

  const posClass = position === 'bottom'
    ? 'top-full mt-1'
    : 'bottom-full mb-1'

  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className={`
          pointer-events-none absolute ${posClass} left-1/2 -translate-x-1/2
          z-50 hidden group-hover:flex
          bg-gray-900 border border-gray-600 rounded px-2 py-1
          text-xs text-gray-200 whitespace-nowrap shadow-lg
          flex-col items-center gap-0.5
        `}
      >
        {content}
        {/* Seta */}
        <span className={`absolute ${position === 'bottom' ? '-top-1.5 border-b-gray-600' : '-bottom-1.5 border-t-gray-600'} left-1/2 -translate-x-1/2 w-0 h-0 border-x-4 border-x-transparent ${position === 'bottom' ? 'border-b-4' : 'border-t-4'}`} />
      </span>
    </span>
  )
}

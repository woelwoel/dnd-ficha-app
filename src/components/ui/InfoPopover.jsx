import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

/**
 * Botão de informação (ℹ) que abre um popover com o conteúdo ao CLICAR.
 *
 * Substitui o padrão antigo de `title={desc}` (tooltip nativo no hover), que
 * em telas de toque não funcionava e atrapalhava ao passar o mouse. Agora a
 * descrição só aparece sob demanda, no clique.
 *
 * O popover é renderizado via portal no <body> com posição `fixed`, calculada
 * a partir do retângulo do botão — assim não é cortado por containers com
 * `overflow` (ex.: a lista de progressão de níveis, que tem scroll interno).
 *
 * Props:
 *  - content   : string | ReactNode — conteúdo exibido (obrigatório p/ render)
 *  - label     : string             — aria-label do botão (padrão "Ver descrição")
 *  - title     : string             — título opcional no topo do popover
 *  - className  : classes extras no botão
 *  - iconSize  : tamanho do ícone (padrão 14)
 */
export function InfoPopover({ content, label = 'Ver descrição', title, className = '', iconSize = 14 }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState(null)
  const btnRef = useRef(null)
  const popRef = useRef(null)

  // Não renderiza nada se não há conteúdo — evita botão "morto".
  if (!content) return null

  function toggle(e) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(o => !o)
  }

  // Posiciona o popover relativo ao botão, com clamp pras bordas da viewport.
  // Abre pra baixo por padrão; se faltar espaço embaixo, abre pra cima.
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return
    const r = btnRef.current.getBoundingClientRect()
    const W = 288 // largura máx do popover (w-72)
    const margin = 8
    let left = r.left + r.width / 2 - W / 2
    left = Math.max(margin, Math.min(left, window.innerWidth - W - margin))
    const spaceBelow = window.innerHeight - r.bottom
    const flipUp = spaceBelow < 200 && r.top > spaceBelow
    setPos(flipUp
      ? { bottom: window.innerHeight - r.top + 6, left, width: W }
      : { top: r.bottom + 6, left, width: W })
  }, [open])

  // Fecha ao clicar fora, rolar a página, ou apertar Esc.
  useEffect(() => {
    if (!open) return
    function onDocClick(e) {
      if (btnRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return
      setOpen(false)
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    // Fecha em scroll de página/ancestral (o popover é position:fixed e
    // descolaria do botão), mas NÃO quando o scroll acontece dentro do próprio
    // popover — ele tem overflow-y-auto e precisa rolar pra ler texto longo.
    function onScroll(e) {
      if (popRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-label={label}
        aria-expanded={open}
        className={[
          'shrink-0 inline-flex items-center justify-center rounded-full transition-colors',
          'text-ink-300 hover:text-ink-600 hover:bg-parchment-200',
          open ? 'text-ink-600 bg-parchment-200' : '',
          className,
        ].join(' ')}
      >
        <Icon name="info" size={iconSize} strokeWidth={2} />
      </button>

      {open && pos && createPortal(
        <div
          ref={popRef}
          role="tooltip"
          onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width }}
          className="z-[100] max-h-[60vh] overflow-y-auto rounded-md border-2 border-ink-600 bg-ink-500 px-3 py-2 text-xs leading-relaxed text-parchment-50 shadow-xl whitespace-pre-line"
        >
          {title && (
            <p className="mb-1 font-display tracking-wide text-parchment-100 text-[13px]">{title}</p>
          )}
          {content}
        </div>,
        document.body,
      )}
    </>
  )
}

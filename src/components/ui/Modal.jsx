import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'

/**
 * Modal primitivo do tema pergaminho.
 *
 * Substitui as ~8 implementações de modal espalhadas pela app
 * (BlockEditorModal, SpellDetailModal, SrdSearchModal, BestiaryModal,
 * DamageModal, MoveToCampaignModal, DeleteAccountModal, MulticlassModal),
 * cada uma reimplementando portal/esc/backdrop/foco com pequenas
 * diferenças e acessibilidade desigual.
 *
 * Características:
 *  - Portal em document.body (sobrevive a transforms ancestrais)
 *  - Esc fecha
 *  - Click no backdrop fecha (opcional via dismissOnBackdrop=false)
 *  - role="dialog", aria-modal="true", aria-labelledby vinculado ao title
 *  - Foco inicial no botão de fechar (ou ref via initialFocusRef)
 *  - Body scroll travado enquanto aberto
 *  - Tema pergaminho: header parchment-100 + body parchment-50 +
 *    footer parchment-100 + borda parchment-600
 *  - Tamanhos: sm (max-w-sm) · md (max-w-md) · lg (max-w-2xl)
 *
 * Props:
 *  - open             boolean — controla renderização
 *  - onClose          () => void — chamado em Esc, click backdrop, click "✕"
 *  - title            string | ReactNode — título do header
 *  - children         ReactNode — body
 *  - footer           ReactNode (opcional) — substitui o footer; default = só "Fechar"
 *  - size             'sm' | 'md' | 'lg' — default 'md'
 *  - dismissOnBackdrop boolean — default true
 *  - initialFocusRef  ref — onde colocar foco ao abrir (default: botão ✕)
 *  - hideCloseButton  boolean — esconde o ✕ no header (raro)
 *  - closeLabel       string — aria-label do botão ✕ (default "Fechar modal")
 */
// Pilha de modais abertos: só o modal do topo responde ao Esc, pra que
// modais aninhados (ex.: info de classe sobre a MulticlassModal) não fechem
// os dois de uma vez. Nível de módulo = compartilhado por todas as instâncias.
const modalStack = []

const SIZE_CLS = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  dismissOnBackdrop = true,
  initialFocusRef,
  hideCloseButton = false,
  closeLabel = 'Fechar modal',
}) {
  const closeRef = useRef(null)
  const titleId = useRef(`modal-title-${Math.random().toString(36).slice(2, 9)}`).current

  // onClose via ref: o pai costuma passar uma arrow inline (referência nova a
  // cada render). Se o efeito de foco dependesse de onClose, ele re-executaria
  // a cada keystroke do conteúdo e roubaria o foco do input de volta pro "✕"
  // ("digitando letra por letra"). A ref dá acesso ao onClose mais recente sem
  // entrar nas dependências do efeito.
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  // Esc fecha (só se este for o modal do topo) + foco inicial — roda só na
  // transição de open.
  useEffect(() => {
    if (!open) return
    modalStack.push(titleId)
    function onKey(e) {
      if (e.key === 'Escape' && modalStack[modalStack.length - 1] === titleId) {
        onCloseRef.current?.()
      }
    }
    document.addEventListener('keydown', onKey)
    const t = setTimeout(() => {
      (initialFocusRef?.current ?? closeRef.current)?.focus()
    }, 50)
    return () => {
      document.removeEventListener('keydown', onKey)
      clearTimeout(t)
      const i = modalStack.indexOf(titleId)
      if (i !== -1) modalStack.splice(i, 1)
    }
  }, [open, initialFocusRef, titleId])

  // Trava scroll do body
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-700/70 backdrop-blur-sm p-4"
      onClick={dismissOnBackdrop ? (e => { if (e.target === e.currentTarget) onClose?.() }) : undefined}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
        className={`w-full ${SIZE_CLS[size] ?? SIZE_CLS.md} max-h-[90vh] flex flex-col bg-parchment-50 border-2 border-parchment-600 rounded-sm shadow-parchment-lg overflow-hidden`}
      >
        {(title || !hideCloseButton) && (
          <header className="flex items-center justify-between gap-3 px-5 py-3 border-b-2 border-parchment-600 bg-parchment-100 shrink-0">
            <h2
              id={titleId}
              className="text-base font-display text-ink-500 tracking-widest uppercase leading-tight min-w-0 truncate"
            >
              {title}
            </h2>
            {!hideCloseButton && (
              <button
                ref={closeRef}
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="text-ink-300 hover:text-ink-500 transition-colors shrink-0 inline-flex items-center justify-center w-6 h-6 -mr-1"
              >
                <Icon name="close" size={18} strokeWidth={1.75} />
              </button>
            )}
          </header>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {children}
        </div>

        {footer !== undefined ? (
          footer && (
            <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t-2 border-parchment-600 bg-parchment-100 shrink-0">
              {footer}
            </footer>
          )
        ) : (
          <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t-2 border-parchment-600 bg-parchment-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-sm border-2 border-ink-300 hover:border-ink-500 text-ink-500 text-sm font-display tracking-wide bg-parchment-50 hover:bg-parchment-100"
            >
              Fechar
            </button>
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}

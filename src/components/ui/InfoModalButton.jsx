import { useState } from 'react'
import { Modal } from './Modal'
import { Icon } from './Icon'

/**
 * Botão de informação (ℹ) que abre um MODAL em pergaminho com o conteúdo.
 *
 * Mesma API do [InfoPopover], mas troca o balão escuro (estreito, ruim pra
 * texto longo e com bug de scroll) por um `Modal` largo e rolável. Use pra
 * conteúdo LONGO/estruturado (ex.: descrição de subclasse + "Features por
 * nível"); pra descrição curta o InfoPopover continua adequado.
 *
 * O clique faz `stopPropagation` — o ℹ costuma ficar dentro de uma linha
 * clicável (ex.: opção de subclasse), e abrir a info não deve selecioná-la.
 *
 * Props:
 *  - content  : string | ReactNode — conteúdo do modal (obrigatório p/ render)
 *  - title    : string             — título do modal (nome da feature/subclasse)
 *  - label    : string             — aria-label do botão (padrão "Ver descrição")
 *  - className: classes extras no botão
 *  - iconSize : tamanho do ícone (padrão 14)
 */
export function InfoModalButton({ content, label = 'Ver descrição', title, className = '', iconSize = 14 }) {
  const [open, setOpen] = useState(false)

  // Não renderiza nada sem conteúdo — evita botão "morto".
  if (!content) return null

  function handleClick(e) {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
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

      <Modal open={open} onClose={() => setOpen(false)} title={title} size="lg">
        <div className="text-sm text-ink-500 leading-relaxed whitespace-pre-line">
          {content}
        </div>
      </Modal>
    </>
  )
}

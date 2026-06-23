import { Modal } from '../../../../components/ui/Modal'
import { Icon } from '../../../../components/ui/Icon'

/**
 * Modal de confirmação antes de imprimir / exportar PDF.
 *
 * Antes: clicar "Imprimir" disparava window.print() na hora — sem
 * chance de revisar antes de gastar tinta/papel ou de escolher quais
 * páginas incluir.
 *
 * Agora: lista as páginas que vão sair + toggles pra opcionais
 * (personalidade, magias) + botão Imprimir que chama o print real.
 *
 * Props:
 *  - open                : boolean
 *  - onClose             : () => void
 *  - onConfirm           : () => void — chamado após o user decidir,
 *                          dispara window.print()
 *  - isSpellcaster       : boolean — se false, esconde toggle de magias
 *  - options             : { includePersonality, includeSpells } — estado
 *  - onChangeOptions     : (next) => void — patch parcial das opções
 */
export function PrintPreviewModal({
  open, onClose, onConfirm,
  characterName,
  isSpellcaster,
  options,
  onChangeOptions,
}) {
  const pages = [
    { id: 'p1', label: 'Atributos, perícias, combate, inventário', always: true },
    { id: 'personality', label: 'Características & Personalidade', toggle: 'includePersonality' },
    ...(isSpellcaster ? [{ id: 'spells', label: 'Magias', toggle: 'includeSpells' }] : []),
  ]

  const enabledCount = pages.filter(p => p.always || options[p.toggle] !== false).length

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Imprimir ficha"
      size="md"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-sm border-2 border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 text-sm font-display tracking-wide"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-5 py-1.5 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 text-sm font-display tracking-wide inline-flex items-center gap-1.5"
          >
            <Icon name="print" size={14} strokeWidth={2} />
            Imprimir agora
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-ink-500">
          A ficha de <strong>{characterName || 'seu personagem'}</strong> será impressa em A4 com paleta sépia (pergaminho).
          Vai abrir o diálogo do sistema — escolha impressora ou "Salvar como PDF".
        </p>

        <div className="border-2 border-parchment-600 rounded-sm bg-parchment-50 p-3 space-y-1.5">
          <p className="text-xs font-display tracking-widest uppercase text-ink-500 mb-1">
            Páginas incluídas <span className="ink-italic font-normal text-ink-300 normal-case tracking-normal">({enabledCount})</span>
          </p>
          {pages.map((p, i) => {
            const enabled = p.always || (options[p.toggle] !== false)
            return (
              <label
                key={p.id}
                className={[
                  'flex items-center gap-2 text-sm cursor-pointer',
                  p.always ? 'cursor-default' : '',
                  enabled ? 'text-ink-500' : 'text-ink-300 line-through',
                ].join(' ')}
              >
                <input
                  type="checkbox"
                  checked={enabled}
                  disabled={p.always}
                  onChange={e => p.toggle && onChangeOptions({ [p.toggle]: e.target.checked })}
                  className="w-4 h-4 accent-ink-500"
                  aria-label={`Página ${i + 1}: ${p.label}`}
                />
                <span className="font-display tracking-wide text-xs uppercase shrink-0">
                  Pág {i + 1}
                </span>
                <span className="text-sm">{p.label}</span>
                {p.always && (
                  <span className="ml-auto text-[11px] ink-italic text-ink-300">obrigatória</span>
                )}
              </label>
            )
          })}
        </div>

        <p className="text-xs ink-italic text-ink-300">
          Dica: pra exportar como PDF, escolha "Salvar como PDF" como impressora no diálogo do sistema.
        </p>
      </div>
    </Modal>
  )
}

import { useRef, useState } from 'react'
import { safeParseCharacter } from '../../domain/characterSchema'
import { SheetCombatBar } from './SheetCombatBar'
import { MoveToCampaignModal } from './MoveToCampaignModal'
import { Icon } from '../ui/Icon'

// Razões de falha de save → mensagem amigável no tooltip do "Sem salvar".
const SAVE_ERROR_MESSAGES = {
  limit: 'Limite de 100 fichas por conta atingido.',
  'too-large': 'Ficha grande demais para salvar (limite ~200 KB).',
  invalid: 'A ficha tem dados inválidos e não pôde ser salva.',
  conflict: 'Ficha alterada em outro dispositivo — recarregando a versão mais recente.',
  unknown: 'Não foi possível salvar. Verifique a conexão.',
}

/**
 * Barra superior única da ficha (header + combat bar fundidos).
 *
 * Linha 1 : voltar / nome / saved / Exportar Importar Imprimir
 * Linha 2 : HP bar + −/+ inline / CA / INIT / VEL / recurso de classe / condições
 *
 * O conteúdo combat-related vem do CharacterContext via SheetCombatBar.
 * `quickStats` ainda é aceito mas só é usado se queremos um modo legado;
 * no fluxo atual da ficha ele não é mais necessário (a sub-row já cobre).
 */
export function SheetHeader({
  characterName,
  characterId,
  saving = false,
  saved,
  saveError,
  onBack,
  onImport,
  onExport,
  onPrint,
  showPrint,
  onImportError,
  onMoved,
  readOnly = false,
  campaignId = null,
  // eslint-disable-next-line no-unused-vars
  quickStats = null,
}) {
  const importRef = useRef(null)
  const [moveOpen, setMoveOpen] = useState(false)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      try {
        const raw = JSON.parse(ev.target.result)
        const parsed = safeParseCharacter(raw)
        if (!parsed.success) throw new Error('schema')
        onImport(parsed.data)
      } catch {
        onImportError('Arquivo inválido. Importe uma ficha exportada pelo app.')
      } finally {
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  return (
    <header className="shrink-0 border-b-2 border-parchment-600 bg-parchment-100 z-10 shadow-parchment">
      {/* ── Linha 1: navegação + nome + ações ─────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-ink-200 hover:text-ink-500 transition-colors text-sm shrink-0"
            >
              <span>←</span>
              <span className="hidden sm:inline font-display text-xs tracking-wide">Personagens</span>
            </button>
          )}
          {onBack && <div className="w-px h-4 bg-parchment-600 shrink-0" />}
          <h1 className="text-sm font-bold text-ink-500 font-display truncate tracking-wide">
            {characterName || 'Ficha de Personagem'}
          </h1>
          {!readOnly && characterId && (
            <button
              onClick={() => setMoveOpen(true)}
              className={
                'hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs uppercase tracking-wider shrink-0 transition-colors ' +
                (campaignId
                  ? 'bg-amber-900 text-amber-200 hover:bg-amber-800'
                  : 'bg-parchment-300 text-ink-300 hover:bg-parchment-400')
              }
              title={campaignId ? 'Vinculada a uma mesa — clique pra mover' : 'Ficha pessoal — clique pra vincular a uma mesa'}
            >
              {campaignId ? 'Mesa ▾' : 'Pessoal ▾'}
            </button>
          )}
          {readOnly && campaignId && (
            <span
              className="hidden sm:inline-flex items-center px-2 py-0.5 rounded bg-amber-900 text-amber-200 text-xs uppercase tracking-wider shrink-0"
              title="Ficha vinculada a uma mesa"
            >
              Mesa
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {readOnly ? (
            <span
              className="text-xs px-2 py-1 rounded bg-amber-200 text-amber-900 font-display"
              aria-label="Modo leitura"
            >
              Modo leitura
            </span>
          ) : saveError ? (
            <span
              className="text-xs text-red-700 font-display"
              title={SAVE_ERROR_MESSAGES[saveError] ?? `Erro: ${saveError}`}
              aria-label="Falha ao salvar"
              aria-live="polite"
            >⚠ Sem salvar</span>
          ) : saving ? (
            <span
              className="text-xs text-ink-300 font-display opacity-80"
              aria-live="polite"
            >Salvando…</span>
          ) : (
            <span
              className={`text-xs transition-opacity duration-500 font-display ${saved ? 'opacity-100 text-ink-300' : 'opacity-0'}`}
              aria-live="polite"
            >✓ Salvo</span>
          )}
          <button
            onClick={onExport}
            className="text-xs px-2 sm:px-2.5 py-1.5 min-h-[36px] rounded border border-parchment-600 hover:border-ink-200 text-ink-200 hover:text-ink-500 font-display tracking-wide transition-colors inline-flex items-center justify-center"
            title="Exportar como JSON"
          >
            <span className="hidden sm:inline">Exportar</span>
            <span className="sm:hidden"><Icon name="download" size={16} strokeWidth={1.75} /></span>
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="text-xs px-2 sm:px-2.5 py-1.5 min-h-[36px] rounded border border-parchment-600 hover:border-ink-200 text-ink-200 hover:text-ink-500 font-display tracking-wide transition-colors inline-flex items-center justify-center"
            title="Importar de JSON"
          >
            <span className="hidden sm:inline">Importar</span>
            <span className="sm:hidden"><Icon name="upload" size={16} strokeWidth={1.75} /></span>
          </button>
          <input ref={importRef} type="file" accept=".json" onChange={handleFile} className="hidden" />
          {showPrint && (
            <button
              onClick={onPrint}
              className="text-xs px-2 sm:px-2.5 py-1.5 min-h-[36px] rounded border border-ink-200 hover:border-ink-500 text-ink-300 hover:text-ink-600 font-display tracking-wide transition-colors inline-flex items-center justify-center"
              title="Imprimir / Exportar PDF"
            >
              <span className="hidden sm:inline">Imprimir</span>
              <span className="sm:hidden"><Icon name="print" size={16} strokeWidth={1.75} /></span>
            </button>
          )}
        </div>
      </div>

      {/* ── Linha 2: barra de combate (HP + chips + condições) ────
          Quando readOnly, o fieldset desabilita botões de dano/cura/condição
          nativamente (DM lendo ficha de jogador). */}
      <fieldset
        disabled={readOnly}
        className={`border-0 m-0 p-0 min-w-0 ${readOnly ? 'opacity-70 cursor-not-allowed' : ''}`}
      >
        <SheetCombatBar />
      </fieldset>

      {moveOpen && (
        <MoveToCampaignModal
          characterId={characterId}
          currentCampaignId={campaignId}
          onClose={() => setMoveOpen(false)}
          onMoved={(newCampaignId) => {
            setMoveOpen(false)
            onMoved?.(newCampaignId)
          }}
        />
      )}
    </header>
  )
}

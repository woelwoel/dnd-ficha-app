import { useRef } from 'react'
import { safeParseCharacter } from '../../domain/characterSchema'
import { formatModifier } from '../../utils/calculations'

/**
 * Barra superior fixa da ficha.
 *
 * Esquerda : botão "← Personagens" + nome do personagem
 * Centro   : mini-stats de HP / CA / Iniciativa (md+)
 * Direita  : indicador de salvamento + Exportar / Importar
 */
export function SheetHeader({
  characterName,
  saved,
  saveError,
  onBack,
  onImport,
  onExport,
  onPrint,
  showPrint,
  onImportError,
  quickStats = null,
}) {
  const importRef = useRef(null)

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

  const { currentHp, maxHp, armorClass, initiative, hpPercent } = quickStats ?? {}
  const showStats = quickStats && (maxHp ?? 0) > 0

  return (
    <header className="flex items-center gap-2 px-4 py-2.5 shrink-0 border-b-2 border-parchment-600 bg-parchment-100 z-10"
      style={{ boxShadow: 'var(--shadow-parchment)' }}>

      {/* ── Esquerda: navegação + nome ─────────────────────── */}
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
      </div>

      {/* ── Centro: mini-stats HP / CA / Iniciativa ────────── */}
      {showStats && (
        <div className="hidden md:flex items-center gap-5 text-xs shrink-0">

          {/* HP com barra */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-parchment-400 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${hpPercent}%`, backgroundColor: 'var(--color-ink-300)' }}
              />
            </div>
            <span className="font-mono tabular-nums text-[11px]">
              <span className="font-bold text-ink-500">{currentHp}</span>
              <span className="text-ink-200">/{maxHp}</span>
              <span className="text-ink-200 ml-0.5 font-display">PV</span>
            </span>
          </div>

          <div className="w-px h-4 bg-parchment-600" />

          {/* CA */}
          <div className="flex items-center gap-1.5">
            <span className="text-ink-300 text-sm" aria-hidden>🛡</span>
            <span className="text-ink-500 font-bold">{armorClass}</span>
            <span className="text-ink-200 text-[10px] font-display">CA</span>
          </div>

          <div className="w-px h-4 bg-parchment-600" />

          {/* Iniciativa */}
          <div className="flex items-center gap-1.5">
            <span className="text-ink-300 text-sm" aria-hidden>⚡</span>
            <span className="text-ink-500 font-bold">{formatModifier(initiative ?? 0)}</span>
            <span className="text-ink-200 text-[10px] font-display">INIT</span>
          </div>
        </div>
      )}

      {/* ── Direita: salvo + ações ─────────────────────────── */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {saveError && (
          <span className="text-xs text-ink-500" title={`Erro: ${saveError}`} aria-label="Falha ao salvar">⚠</span>
        )}
        <span
          className={`text-xs transition-opacity duration-500 font-display ${saved ? 'opacity-100 text-ink-300' : 'opacity-0'}`}
          aria-live="polite"
        >✓</span>

        <button
          onClick={onExport}
          className="text-xs px-2 sm:px-2.5 py-1.5 min-h-[36px] rounded border border-parchment-600 hover:border-ink-200 text-ink-200 hover:text-ink-500 font-display tracking-wide transition-colors"
          title="Exportar como JSON"
        >
          <span className="hidden sm:inline">Exportar</span>
          <span className="sm:hidden">⬇</span>
        </button>
        <button
          onClick={() => importRef.current?.click()}
          className="text-xs px-2 sm:px-2.5 py-1.5 min-h-[36px] rounded border border-parchment-600 hover:border-ink-200 text-ink-200 hover:text-ink-500 font-display tracking-wide transition-colors"
          title="Importar de JSON"
        >
          <span className="hidden sm:inline">Importar</span>
          <span className="sm:hidden">⬆</span>
        </button>
        <input ref={importRef} type="file" accept=".json" onChange={handleFile} className="hidden" />

        {showPrint && (
          <button
            onClick={onPrint}
            className="text-xs px-2 sm:px-2.5 py-1.5 min-h-[36px] rounded border border-ink-200 hover:border-ink-500 text-ink-300 hover:text-ink-600 font-display tracking-wide transition-colors"
            title="Imprimir / Exportar PDF"
          >
            <span className="hidden sm:inline">Imprimir</span>
            <span className="sm:hidden">🖨</span>
          </button>
        )}
      </div>
    </header>
  )
}

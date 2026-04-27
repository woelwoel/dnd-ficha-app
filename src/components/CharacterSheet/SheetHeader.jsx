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

  const { currentHp, maxHp, armorClass, initiative, hpPercent, hpColor } = quickStats ?? {}
  const showStats = quickStats && (maxHp ?? 0) > 0

  return (
    <header className="flex items-center gap-2 px-4 py-2.5 shrink-0 border-b border-gray-700/70 bg-gray-900/70 backdrop-blur-sm z-10">

      {/* ── Esquerda: navegação + nome ─────────────────────── */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-gray-500 hover:text-amber-400 transition-colors text-sm shrink-0"
          >
            <span>←</span>
            <span className="hidden sm:inline font-display text-xs tracking-wide">Personagens</span>
          </button>
        )}
        {onBack && <div className="w-px h-4 bg-gray-700/60 shrink-0" />}
        <h1 className="text-sm font-bold text-amber-400 font-display truncate tracking-wide">
          {characterName || 'Ficha de Personagem'}
        </h1>
      </div>

      {/* ── Centro: mini-stats HP / CA / Iniciativa ────────── */}
      {showStats && (
        <div className="hidden md:flex items-center gap-5 text-xs shrink-0">

          {/* HP com barra */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-gray-700/80 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${hpPercent}%`, backgroundColor: hpColor }}
              />
            </div>
            <span className="font-mono tabular-nums text-[11px]">
              <span style={{ color: hpColor }} className="font-bold">{currentHp}</span>
              <span className="text-gray-600">/{maxHp}</span>
              <span className="text-gray-600 ml-0.5">PV</span>
            </span>
          </div>

          <div className="w-px h-4 bg-gray-700/60" />

          {/* CA */}
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 text-sm" aria-hidden>🛡</span>
            <span className="text-gray-300 font-bold">{armorClass}</span>
            <span className="text-gray-600 text-[10px]">CA</span>
          </div>

          <div className="w-px h-4 bg-gray-700/60" />

          {/* Iniciativa */}
          <div className="flex items-center gap-1.5">
            <span className="text-amber-400 text-sm" aria-hidden>⚡</span>
            <span className="text-gray-300 font-bold">{formatModifier(initiative ?? 0)}</span>
            <span className="text-gray-600 text-[10px]">INIT</span>
          </div>
        </div>
      )}

      {/* ── Direita: salvo + ações ─────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        {saveError && (
          <span className="text-xs text-red-400" title={`Erro: ${saveError}`} aria-label="Falha ao salvar">
            ⚠
          </span>
        )}
        <span
          className={`text-xs transition-opacity duration-500 ${saved ? 'opacity-100 text-green-400' : 'opacity-0'}`}
          aria-live="polite"
        >
          ✓
        </span>

        <button
          onClick={onExport}
          className="text-xs px-2.5 py-1.5 rounded border border-gray-700/80 hover:border-gray-500 text-gray-400 hover:text-gray-100 transition-colors"
          title="Exportar como JSON"
        >
          Exportar
        </button>
        <button
          onClick={() => importRef.current?.click()}
          className="text-xs px-2.5 py-1.5 rounded border border-gray-700/80 hover:border-gray-500 text-gray-400 hover:text-gray-100 transition-colors"
          title="Importar de JSON"
        >
          Importar
        </button>
        <input ref={importRef} type="file" accept=".json" onChange={handleFile} className="hidden" />

        {showPrint && (
          <button
            onClick={onPrint}
            className="text-xs px-2.5 py-1.5 rounded border border-amber-700/60 hover:border-amber-500 text-amber-400 hover:text-amber-200 transition-colors"
            title="Imprimir / Exportar PDF"
          >
            Imprimir
          </button>
        )}
      </div>
    </header>
  )
}

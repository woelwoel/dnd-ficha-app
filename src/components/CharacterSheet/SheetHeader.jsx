import { useRef } from 'react'
import { safeParseCharacter } from '../../domain/characterSchema'

/**
 * Cabeçalho da ficha: título, indicador "salvo", export/import/imprimir.
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

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-500 hover:text-amber-400 transition-colors text-sm shrink-0"
          >
            ← Personagens
          </button>
        )}
        <h1 className="text-xl font-bold text-amber-400 font-display truncate">
          {characterName || 'Ficha de Personagem'}
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {saveError && (
          <span className="text-xs text-red-400 mr-1" title={`Erro: ${saveError}`}>
            ⚠ Falha ao salvar
          </span>
        )}
        <span className={`text-xs transition-opacity mr-1 ${saved ? 'opacity-100 text-green-400' : 'opacity-0'}`}>
          ✓ Salvo
        </span>
        <button
          onClick={onExport}
          className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          title="Exportar como JSON"
        >
          Exportar
        </button>
        <button
          onClick={() => importRef.current?.click()}
          className="text-xs px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
          title="Importar de JSON"
        >
          Importar
        </button>
        <input ref={importRef} type="file" accept=".json" onChange={handleFile} className="hidden" />
        {showPrint && (
          <button
            onClick={onPrint}
            className="text-xs px-3 py-1.5 rounded bg-amber-700 hover:bg-amber-600 text-amber-100 transition-colors"
            title="Imprimir / Exportar PDF"
          >
            Imprimir
          </button>
        )}
      </div>
    </div>
  )
}

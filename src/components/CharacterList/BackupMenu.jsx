import { useRef, useState } from 'react'
import { Button } from '../ui/Button'
import { exportAllCharacters, importAllCharacters } from '../../utils/storage'

function downloadJson(filename, payload) {
  const json = JSON.stringify(payload, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function todayStamp() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const REASON_MESSAGES = {
  'invalid-format': 'Arquivo não parece ser um backup do app.',
  'no-valid-characters': 'Nenhum personagem válido encontrado no arquivo.',
  'quota': 'Sem espaço no armazenamento do navegador.',
  'save-failed': 'Falha ao gravar no armazenamento.',
  'limit': 'Você atingiu o limite de 100 fichas por conta.',
  'too-large': 'Uma das fichas é grande demais para salvar (limite ~200 KB).',
}

export function BackupMenu({ characterCount, onImported }) {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const fileRef = useRef(null)

  async function handleExport() {
    const payload = await exportAllCharacters()
    downloadJson(`dnd-ficha-backup-${todayStamp()}.json`, payload)
    setFeedback({ tone: 'success', text: `Backup gerado com ${payload.count} personagem(ns).` })
  }

  function handlePickFile(mode) {
    fileRef.current.dataset.mode = mode
    fileRef.current.click()
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    const mode = e.target.dataset.mode === 'replace' ? 'replace' : 'merge'
    e.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = async ev => {
      let raw
      try {
        raw = JSON.parse(ev.target.result)
      } catch {
        setFeedback({ tone: 'error', text: 'Arquivo inválido (JSON malformado).' })
        return
      }
      const result = await importAllCharacters(raw, mode)
      if (!result.ok) {
        setFeedback({ tone: 'error', text: REASON_MESSAGES[result.reason] ?? 'Falha ao importar.' })
        return
      }
      const extras = result.invalid > 0 ? ` (${result.invalid} descartado(s) por schema inválido)` : ''
      setFeedback({
        tone: 'success',
        text: `${result.imported} personagem(ns) importado(s)${extras}.`,
      })
      onImported?.()
    }
    reader.onerror = () => setFeedback({ tone: 'error', text: 'Falha ao ler o arquivo.' })
    reader.readAsText(file)
  }

  function handleClose() {
    setOpen(false)
    setFeedback(null)
  }

  return (
    <>
      <Button variant="ghost-dark" size="sm" onClick={() => setOpen(true)} aria-label="Backup de personagens">
        💾 Backup
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="backup-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.6)]"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md rounded-lg shadow-xl p-5 space-y-4 border border-shell-border bg-bg-elevated text-ink-primary"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="backup-title" className="text-lg font-bold font-display">
                  Backup de Personagens
                </h2>
                <p className="text-xs opacity-70 mt-1">
                  Backup local da sua conta. Útil pra arquivamento ou transferir entre contas.
                </p>
              </div>
              <button
                onClick={handleClose}
                aria-label="Fechar"
                className="text-xl leading-none opacity-60 hover:opacity-100"
              >×</button>
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Exportar</h3>
              <p className="text-xs opacity-70">
                Baixa um arquivo JSON com {characterCount} personagem(ns).
              </p>
              <Button variant="gold" size="md" onClick={handleExport} disabled={characterCount === 0}>
                ⬇ Baixar backup
              </Button>
            </section>

            <hr className="border-shell-border" />

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Importar</h3>
              <p className="text-xs opacity-70">
                <strong>Mesclar</strong> mantém os atuais e sobrescreve os de mesmo ID.{' '}
                <strong>Substituir</strong> apaga tudo e usa apenas o que vier no arquivo.
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button variant="primary" size="sm" onClick={() => handlePickFile('merge')}>
                  ⬆ Mesclar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handlePickFile('replace')}>
                  ⚠ Substituir tudo
                </Button>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFile}
                className="hidden"
              />
            </section>

            {feedback && (
              <div
                role="status"
                aria-live="polite"
                className={`text-sm px-3 py-2 rounded border ${
                  feedback.tone === 'error'
                    ? 'bg-[rgba(180,40,40,0.15)] border-[rgba(180,40,40,0.45)]'
                    : 'bg-[rgba(60,140,80,0.15)] border-[rgba(60,140,80,0.45)]'
                }`}
              >
                {feedback.text}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

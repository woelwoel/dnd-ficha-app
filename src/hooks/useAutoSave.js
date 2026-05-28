import { useEffect, useRef, useState } from 'react'
import { upsertCharacter } from '../utils/storage'

/**
 * Salva `character` no Supabase com debounce de `delayMs`.
 *
 * Opções:
 *   - delayMs (default 500) — debounce
 *   - enabled (default true) — quando false, não dispara save (modo readonly,
 *     ex: DM lendo ficha de jogador)
 *
 * Retorna `{ saving, saved, error }` para feedback visual:
 * - saving:  true enquanto a request está em vôo
 * - saved:   true brevemente após sucesso (1.5s); útil pra mostrar "✓ Salvo"
 * - error:   string com a razão da falha (null quando ok)
 */
export function useAutoSave(character, { delayMs = 500, enabled = true } = {}) {
  const [status, setStatus] = useState({ saving: false, saved: false, error: null })
  const debounceRef = useRef(null)
  const flashRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => () => {
    mountedRef.current = false
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (flashRef.current) clearTimeout(flashRef.current)
  }, [])

  useEffect(() => {
    if (!enabled) return
    if (!character?.id) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      if (mountedRef.current) setStatus(s => ({ ...s, saving: true }))
      const result = await upsertCharacter(character)
      if (!mountedRef.current) return
      if (result.ok) {
        setStatus({ saving: false, saved: true, error: null })
        if (flashRef.current) clearTimeout(flashRef.current)
        flashRef.current = setTimeout(() => {
          if (mountedRef.current) setStatus(s => ({ ...s, saved: false }))
        }, 1500)
      } else {
        setStatus({ saving: false, saved: false, error: result.reason ?? 'unknown' })
      }
    }, delayMs)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [character, delayMs, enabled])

  return status
}

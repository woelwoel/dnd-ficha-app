import { useEffect, useRef, useState } from 'react'
import { upsertCharacter } from '../utils/storage'

/**
 * Salva `character` em localStorage com debounce de `delayMs`.
 * Retorna `{ saved, error }` para feedback visual.
 */
export function useAutoSave(character, delayMs = 500) {
  const [status, setStatus] = useState({ saved: false, error: null })
  const timerRef = useRef(null)

  useEffect(() => {
    if (!character?.id) return
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      const result = upsertCharacter(character)
      if (result.ok) {
        setStatus({ saved: true, error: null })
        setTimeout(() => setStatus(s => ({ ...s, saved: false })), 1500)
      } else {
        setStatus({ saved: false, error: result.reason ?? 'unknown' })
      }
    }, delayMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [character, delayMs])

  return status
}

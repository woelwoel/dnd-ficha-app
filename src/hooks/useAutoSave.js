import { useEffect, useRef, useState } from 'react'
import { upsertCharacter } from '../utils/storage'

/**
 * Salva `character` no Supabase com debounce de `delayMs`.
 * Retorna `{ saved, error }` para feedback visual.
 */
export function useAutoSave(character, delayMs = 500) {
  const [status, setStatus] = useState({ saved: false, error: null })
  const debounceRef = useRef(null)
  const flashRef = useRef(null)
  const mountedRef = useRef(true)

  useEffect(() => () => {
    mountedRef.current = false
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (flashRef.current) clearTimeout(flashRef.current)
  }, [])

  useEffect(() => {
    if (!character?.id) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      const result = await upsertCharacter(character)
      if (!mountedRef.current) return
      if (result.ok) {
        setStatus({ saved: true, error: null })
        if (flashRef.current) clearTimeout(flashRef.current)
        flashRef.current = setTimeout(() => {
          if (mountedRef.current) setStatus(s => ({ ...s, saved: false }))
        }, 1500)
      } else {
        setStatus({ saved: false, error: result.reason ?? 'unknown' })
      }
    }, delayMs)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [character, delayMs])

  return status
}

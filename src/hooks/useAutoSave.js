import { useCallback, useEffect, useRef, useState } from 'react'
import { upsertCharacter } from '../utils/storage'
import { reportError } from '../lib/report'

/**
 * Salva `character` no Supabase com debounce de `delayMs`.
 *
 * Opções:
 *   - delayMs (default 500) — debounce
 *   - enabled (default true) — quando false, não dispara save (modo readonly,
 *     ex: DM lendo ficha de jogador)
 *
 * Garantias:
 *   - NÃO salva no carregamento inicial (abrir uma ficha não reescreve o que
 *     acabou de ser lido — evita escrita redundante e disparo do realtime do DM).
 *   - No unmount, faz FLUSH de uma edição pendente (<delayMs) em vez de só
 *     cancelar o timeout — não perde a última alteração feita antes de sair.
 *   - Re-tenta o save pendente quando a conexão volta (evento `online`), pra
 *     cumprir o que o OfflineBanner promete.
 *
 * Retorna `{ saving, saved, error }` para feedback visual.
 */
export function useAutoSave(character, { delayMs = 500, enabled = true } = {}) {
  const [status, setStatus] = useState({ saving: false, saved: false, error: null })
  const debounceRef = useRef(null)
  const flashRef = useRef(null)
  const mountedRef = useRef(true)
  const isFirstRun = useRef(true)
  // Char com save AGENDADO (timeout pendente, ainda não disparado).
  const pendingRef = useRef(null)
  // Char cujo último save FALHOU — alvo do retry no reconnect.
  const lastFailedRef = useRef(null)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  const doSave = useCallback(async (char) => {
    // Limpa o pendente já no início: se desmontarmos durante o save em vôo,
    // o flush não dispara um segundo save do mesmo char.
    pendingRef.current = null
    if (mountedRef.current) setStatus(s => ({ ...s, saving: true }))
    const result = await upsertCharacter(char)
    if (result.ok) {
      lastFailedRef.current = null
      if (!mountedRef.current) return
      setStatus({ saving: false, saved: true, error: null })
      if (flashRef.current) clearTimeout(flashRef.current)
      flashRef.current = setTimeout(() => {
        if (mountedRef.current) setStatus(s => ({ ...s, saved: false }))
      }, 1500)
    } else {
      // Guarda o char pra re-tentar quando a conexão voltar.
      lastFailedRef.current = char
      if (!mountedRef.current) return
      setStatus({ saving: false, saved: false, error: result.reason ?? 'unknown' })
      reportError('autosave_failed', new Error(result.reason ?? 'unknown'), {
        characterId: char?.id,
        errors: result.errors?.slice?.(0, 3),
      })
    }
  }, [])

  // Cleanup no unmount: cancela timers e FAZ FLUSH do save pendente.
  useEffect(() => () => {
    mountedRef.current = false
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (flashRef.current) clearTimeout(flashRef.current)
    if (pendingRef.current) {
      // Fire-and-forget: o componente já está desmontando.
      upsertCharacter(pendingRef.current)
      pendingRef.current = null
    }
  }, [])

  // Retry quando a conexão volta (cumpre a promessa do OfflineBanner).
  useEffect(() => {
    function onOnline() {
      if (enabledRef.current && lastFailedRef.current) {
        doSave(lastFailedRef.current)
      }
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [doSave])

  // Debounce do save em cada mudança de `character`.
  useEffect(() => {
    if (!enabled) return
    if (!character?.id) return
    // Pula o save inicial — só agenda a partir da segunda execução do efeito,
    // que corresponde a uma edição real do usuário.
    if (isFirstRun.current) {
      isFirstRun.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    pendingRef.current = character
    debounceRef.current = setTimeout(() => { doSave(character) }, delayMs)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [character, delayMs, enabled, doSave])

  return status
}

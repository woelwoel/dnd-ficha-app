import { useCallback, useEffect, useRef, useState } from 'react'
import { saveCharacterVersioned } from '../utils/storage'
import { reportError } from '../lib/report'

/**
 * Salva `character` no Supabase com debounce de `delayMs`.
 *
 * Opções:
 *   - delayMs (default 500) — debounce
 *   - enabled (default true) — quando false, não dispara save (modo readonly,
 *     ex: DM lendo ficha de jogador)
 *   - onConflict — chamado quando o save falha por conflito de versão (#3:
 *     outro dispositivo da mesma conta salvou no meio). O caller deve
 *     refetchar a ficha e avisar o usuário.
 *
 * Garantias:
 *   - NÃO salva no carregamento inicial (abrir uma ficha não reescreve o que
 *     acabou de ser lido — evita escrita redundante e disparo do realtime do DM).
 *   - No unmount, faz FLUSH de uma edição pendente (<delayMs) em vez de só
 *     cancelar o timeout — não perde a última alteração feita antes de sair.
 *   - Re-tenta o save pendente quando a conexão volta (evento `online`), pra
 *     cumprir o que o OfflineBanner promete.
 *   - Lock otimista: cada save envia a versão esperada; conflito → onConflict
 *     em vez de sobrescrever silenciosamente (last-write-wins).
 *
 * Retorna `{ saving, saved, error }` para feedback visual.
 */
export function useAutoSave(character, { delayMs = 500, enabled = true, onConflict = null } = {}) {
  const [status, setStatus] = useState({ saving: false, saved: false, error: null })
  const debounceRef = useRef(null)
  const flashRef = useRef(null)
  const mountedRef = useRef(true)
  const isFirstRun = useRef(true)
  // Char com save AGENDADO (timeout pendente, ainda não disparado).
  const pendingRef = useRef(null)
  // Char cujo último save FALHOU — alvo do retry no reconnect.
  const lastFailedRef = useRef(null)
  // Última versão confirmada pelo servidor. O state do React não recebe a
  // versão nova após cada save (este hook não tem setCharacter), então
  // rastreamos aqui. O componente remonta por characterId (SheetBody é
  // keyed), então a ref nunca mistura fichas diferentes.
  const versionRef = useRef(null)
  const enabledRef = useRef(enabled)
  const onConflictRef = useRef(onConflict)
  useEffect(() => {
    enabledRef.current = enabled
    onConflictRef.current = onConflict
  })

  // Versão esperada = max(ref, character.version). O max cobre o refetch
  // pós-conflito: a ficha fresca (versão maior) entra pelo state, enquanto a
  // ref ainda guarda a versão antiga. Versões só crescem, então max é seguro.
  const withKnownVersion = useCallback((char) => {
    const fromChar = Number.isInteger(char?.version) ? char.version : null
    const known = versionRef.current
    const expected = known == null ? fromChar : (fromChar == null ? known : Math.max(known, fromChar))
    return expected == null ? char : { ...char, version: expected }
  }, [])

  const doSave = useCallback(async (char) => {
    // Limpa o pendente já no início: se desmontarmos durante o save em vôo,
    // o flush não dispara um segundo save do mesmo char.
    pendingRef.current = null
    if (mountedRef.current) setStatus(s => ({ ...s, saving: true }))
    const result = await saveCharacterVersioned(withKnownVersion(char))
    if (result.ok) {
      if (Number.isInteger(result.version)) versionRef.current = result.version
      lastFailedRef.current = null
      if (!mountedRef.current) return
      setStatus({ saving: false, saved: true, error: null })
      if (flashRef.current) clearTimeout(flashRef.current)
      flashRef.current = setTimeout(() => {
        if (mountedRef.current) setStatus(s => ({ ...s, saved: false }))
      }, 1500)
    } else if (result.reason === 'conflict') {
      // Outro dispositivo salvou no meio. Retry não resolve (a versão local
      // continua velha) — quem resolve é o refetch do caller via onConflict.
      lastFailedRef.current = null
      if (!mountedRef.current) return
      setStatus({ saving: false, saved: false, error: 'conflict' })
      onConflictRef.current?.()
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
  }, [withKnownVersion])

  // Cleanup no unmount: cancela timers e FAZ FLUSH do save pendente.
  useEffect(() => () => {
    mountedRef.current = false
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (flashRef.current) clearTimeout(flashRef.current)
    if (pendingRef.current) {
      // Fire-and-forget: o componente já está desmontando. Conflito aqui é
      // irrecuperável (não há mais UI pra avisar) — aceito como perda rara.
      saveCharacterVersioned(withKnownVersion(pendingRef.current))
      pendingRef.current = null
    }
  }, [withKnownVersion])

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

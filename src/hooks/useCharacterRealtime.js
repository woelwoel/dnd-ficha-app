import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { loadCharacterById } from '../utils/storage'

/**
 * Inscreve em UPDATEs em `characters.id = ${characterId}` e dispara
 * `onUpdate(freshCharacter)` quando algo mudar no banco.
 *
 * Caso de uso principal: DM com a ficha do player aberta (modo leitura)
 * — quer ver HP, condições, etc atualizando ao vivo conforme o player
 * edita. Por isso o hook é controlado por `enabled` (passa true só
 * quando readOnly).
 *
 * Por que não ativar sempre? O auto-save local é a fonte de verdade
 * enquanto o user dono está digitando. Refetch concorrente sobrescreveria
 * estado não-commitado. Já readOnly não tem estado local a perder.
 *
 * Pré-requisito: tabela `characters` na publicação `supabase_realtime`.
 */
export function useCharacterRealtime(characterId, enabled, onUpdate) {
  const onUpdateRef = useRef(onUpdate)
  useEffect(() => { onUpdateRef.current = onUpdate })

  useEffect(() => {
    if (!enabled || !characterId) return
    const channel = supabase
      .channel(`character:${characterId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'characters',
          filter: `id=eq.${characterId}`,
        },
        async () => {
          // Refetch completo — o payload do postgres_changes não vem
          // normalizado por rowToCharacter, então mais simples (e seguro)
          // ir buscar via loadCharacterById.
          const fresh = await loadCharacterById(characterId)
          if (fresh) onUpdateRef.current?.(fresh)
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [characterId, enabled])
}

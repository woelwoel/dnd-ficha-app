import { supabase } from './supabase'

/**
 * Escritas do MESTRE em fichas de jogadores da própria mesa (migration 0015).
 * A RLS de `characters` é owner-only no UPDATE (0007) — estas duas RPCs
 * `security definer` são o único caminho, e cada uma checa is_campaign_dm.
 */
function reasonFor(error) {
  const msg = error?.message ?? ''
  if (error?.code === 'P0010' || /version_conflict/.test(msg)) return 'conflict'
  if (/not_dm_of_campaign/.test(msg)) return 'forbidden'
  if (/illegal_patch_key|invalid_patch/.test(msg)) return 'illegal-patch'
  // PGRST202 = função fora do schema cache; 42883 = undefined_function.
  if (error?.code === 'PGRST202' || error?.code === '42883') return 'rpc-missing'
  return 'unknown'
}

/** Patch estreito em data->'combat'. Ver DM_COMBAT_KEYS. */
export async function dmApplyCombatState(characterId, patch, expectedVersion) {
  const { data, error } = await supabase.rpc('dm_apply_combat_state', {
    p_character_id: characterId,
    p_patch: patch,
    p_expected_version: expectedVersion,
  })
  if (error) return { ok: false, reason: reasonFor(error), message: error.message }
  return { ok: true, version: data }
}

/** Doc completo. ÚNICO uso legítimo: descanso em lote. */
export async function dmSaveCharacter(characterId, data, expectedVersion) {
  const { data: version, error } = await supabase.rpc('dm_save_character', {
    p_character_id: characterId,
    p_data: data,
    p_expected_version: expectedVersion,
  })
  if (error) return { ok: false, reason: reasonFor(error), message: error.message }
  return { ok: true, version }
}

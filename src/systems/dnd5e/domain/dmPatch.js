/**
 * Ponte entre as funções puras da ficha e a RPC estreita do Mestre.
 *
 * O fluxo é sempre: rodar a regra em JS (applyDamage/applyHealing de rules.js),
 * e mandar pro banco APENAS estas chaves. A lista aqui espelha
 * `v_allowed` em supabase/migrations/0015_encounters.sql — mudar uma exige
 * mudar a outra, senão a RPC recusa com illegal_patch_key.
 */
export const DM_COMBAT_KEYS = ['currentHp', 'tempHp', 'deathSaves', 'isStable', 'isDead', 'conditions']

export function combatPatchFrom(character) {
  const c = character?.combat ?? {}
  return {
    currentHp: c.currentHp ?? 0,
    tempHp: c.tempHp ?? 0,
    deathSaves: c.deathSaves ?? { successes: 0, failures: 0 },
    isStable: !!c.isStable,
    isDead: !!c.isDead,
    conditions: c.conditions ?? [],
  }
}

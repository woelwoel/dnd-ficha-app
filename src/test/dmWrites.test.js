import { describe, it, expect, vi, beforeEach } from 'vitest'
import { combatPatchFrom, DM_COMBAT_KEYS } from '../systems/dnd5e/domain/dmPatch'

const calls = vi.hoisted(() => ({ list: [], nextError: null, nextData: 7 }))

vi.mock('../lib/supabase', () => ({
  supabase: {
    rpc: (name, args) => {
      calls.list.push({ name, args })
      return Promise.resolve(
        calls.nextError ? { data: null, error: calls.nextError } : { data: calls.nextData, error: null },
      )
    },
  },
}))

const { dmApplyCombatState, dmSaveCharacter } = await import('../lib/dmWrites')

beforeEach(() => { calls.list = []; calls.nextError = null; calls.nextData = 7 })

describe('combatPatchFrom', () => {
  it('extrai só as chaves da lista fechada, com defaults', () => {
    const patch = combatPatchFrom({ combat: { currentHp: 4, maxHp: 20, tempHp: 2, attacks: [1] } })
    expect(Object.keys(patch).sort()).toEqual([...DM_COMBAT_KEYS].sort())
    expect(patch).toMatchObject({ currentHp: 4, tempHp: 2, isStable: false, isDead: false, conditions: [] })
    expect(patch.maxHp).toBeUndefined()
    expect(patch.attacks).toBeUndefined()
  })

  it('ficha sem bloco combat não explode', () => {
    expect(combatPatchFrom({})).toMatchObject({ currentHp: 0, tempHp: 0, conditions: [] })
  })
})

describe('dmApplyCombatState', () => {
  it('chama a RPC com os nomes de parâmetro do Postgres', async () => {
    const res = await dmApplyCombatState('char-1', { currentHp: 3 }, 5)
    expect(res).toEqual({ ok: true, version: 7 })
    expect(calls.list[0]).toEqual({
      name: 'dm_apply_combat_state',
      args: { p_character_id: 'char-1', p_patch: { currentHp: 3 }, p_expected_version: 5 },
    })
  })

  it('traduz version_conflict', async () => {
    calls.nextError = { code: 'P0010', message: 'version_conflict' }
    expect((await dmApplyCombatState('c', {}, 1)).reason).toBe('conflict')
  })

  it('traduz not_dm_of_campaign', async () => {
    calls.nextError = { code: '42501', message: 'not_dm_of_campaign' }
    expect((await dmApplyCombatState('c', {}, 1)).reason).toBe('forbidden')
  })

  it('traduz illegal_patch_key', async () => {
    calls.nextError = { code: '22023', message: 'illegal_patch_key: maxHp' }
    expect((await dmApplyCombatState('c', {}, 1)).reason).toBe('illegal-patch')
  })

  it('traduz RPC ausente (migration não aplicada)', async () => {
    calls.nextError = { code: 'PGRST202', message: 'not found' }
    expect((await dmApplyCombatState('c', {}, 1)).reason).toBe('rpc-missing')
  })
})

describe('dmSaveCharacter', () => {
  it('manda o doc completo', async () => {
    const doc = { id: 'char-1', combat: { currentHp: 10 } }
    const res = await dmSaveCharacter('char-1', doc, 3)
    expect(res).toEqual({ ok: true, version: 7 })
    expect(calls.list[0].name).toBe('dm_save_character')
    expect(calls.list[0].args).toEqual({ p_character_id: 'char-1', p_data: doc, p_expected_version: 3 })
  })
})

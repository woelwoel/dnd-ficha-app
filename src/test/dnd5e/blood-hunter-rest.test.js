import { describe, it, expect } from 'vitest'
import { performLongRest, performShortRest } from '../../systems/dnd5e/utils/rest'
import { BLOOD_HUNTER } from '../../systems/dnd5e/domain/bloodHunter'

function ficha() {
  return {
    info: { level: 5, class: BLOOD_HUNTER, multiclasses: [] },
    attributes: { str: 14, dex: 12, con: 14, int: 10, wis: 14, cha: 10 },
    combat: {
      maxHp: 44,
      currentHp: 20,
      hitDice: { pool: { d10: { total: 5, used: 2 } } },
      crimsonRites: [{ attackId: 'espada', rite: 'chamas' }],
      hybridForm: true,
      classFeatureUses: [],
    },
  }
}

describe('descanso longo e Ritual Vermelho', () => {
  it('reverte a forma hibrida', () => {
    expect(performLongRest(ficha()).combat.hybridForm).toBe(false)
  })

  it('desfaz os ritos ativos', () => {
    expect(performLongRest(ficha()).combat.crimsonRites).toEqual([])
  })

  it('cura até o teto CHEIO, já que o rito acabou junto', () => {
    expect(performLongRest(ficha()).combat.currentHp).toBe(44)
  })

  it('não inventa o campo numa ficha que nunca teve rito', () => {
    const mago = {
      info: { level: 5, class: 'mago', multiclasses: [] },
      attributes: { con: 12 },
      combat: { maxHp: 30, currentHp: 10, hitDice: { pool: { d6: { total: 5, used: 0 } } } },
    }
    expect(performLongRest(mago).combat.crimsonRites).toEqual([])
  })
})

describe('descanso curto e Ritual Vermelho', () => {
  /**
   * O rito dura até ser desfeito, a arma sair do controle, ou o descanso
   * longo. O PDF não o encerra no descanso curto — e encerrar devolveria PV
   * máximo de graça no meio da aventura.
   */
  it('mantém o rito ativo', () => {
    const out = performShortRest(ficha(), { spent: [] })
    expect(out.combat.crimsonRites).toEqual([{ attackId: 'espada', rite: 'chamas' }])
  })
})

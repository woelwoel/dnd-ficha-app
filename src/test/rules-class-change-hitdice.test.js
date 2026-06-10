// src/test/rules-class-change-hitdice.test.js
//
// Garante que `applyClassChange` RECONSTRÓI o pool de dados de vida a partir
// das classes atuais, em vez de só adicionar o dado da nova classe sobre o
// pool antigo. Antes do fix, trocar Mago 5 (d6) → Guerreiro deixava o pool
// como { d6:5, d10:5 } = 10 HD num personagem de nível 5 (descanso curto com
// o dobro de dados).
import { describe, it, expect } from 'vitest'
import { applyClassChange } from '../domain/rules'

const CLASS_DATA = {
  mago:      { index: 'mago',      hit_die: 6,  saving_throws: ['Inteligência', 'Sabedoria'] },
  guerreiro: { index: 'guerreiro', hit_die: 10, saving_throws: ['Força', 'Constituição'] },
  ladino:    { index: 'ladino',    hit_die: 8,  saving_throws: ['Destreza', 'Inteligência'] },
}

function makeChar({ primary, level, multiclasses = [], pool = {} }) {
  return {
    info: { class: primary, level, multiclasses },
    attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    proficiencies: {},
    spellcasting: {},
    combat: { hitDice: { pool } },
  }
}

describe('applyClassChange — reconstrução do pool de HD', () => {
  it('Mago 5 (d6) → Guerreiro: pool vira só {d10:5}, sem vazar o d6', () => {
    const char = makeChar({ primary: 'mago', level: 5, pool: { d6: { total: 5, used: 2 } } })
    const next = applyClassChange(char, CLASS_DATA.guerreiro, CLASS_DATA)
    expect(next.combat.hitDice.pool).toEqual({ d10: { total: 5, used: 0 } })
    expect(next.combat.hitDice.pool.d6).toBeUndefined()
  })

  it('preserva used do mesmo tipo de dado (Guerreiro d10 → Guerreiro continua)', () => {
    const char = makeChar({ primary: 'guerreiro', level: 5, pool: { d10: { total: 5, used: 3 } } })
    const next = applyClassChange(char, CLASS_DATA.guerreiro, CLASS_DATA)
    expect(next.combat.hitDice.pool).toEqual({ d10: { total: 5, used: 3 } })
  })

  it('inclui os HD das multiclasses no pool reconstruído', () => {
    // Primário Mago 5 + multiclasse Ladino 3 (d8). Troca primário → Guerreiro.
    const char = makeChar({
      primary: 'mago',
      level: 5,
      multiclasses: [{ class: 'ladino', level: 3 }],
      pool: { d6: { total: 5, used: 0 }, d8: { total: 3, used: 1 } },
    })
    const next = applyClassChange(char, CLASS_DATA.guerreiro, CLASS_DATA)
    expect(next.combat.hitDice.pool).toEqual({
      d10: { total: 5, used: 0 },
      d8:  { total: 3, used: 1 }, // preserva o used do ladino
    })
  })

  it('clampa used ao novo total quando o dado encolhe', () => {
    const char = makeChar({ primary: 'guerreiro', level: 3, pool: { d10: { total: 5, used: 5 } } })
    const next = applyClassChange(char, CLASS_DATA.guerreiro, CLASS_DATA)
    expect(next.combat.hitDice.pool.d10).toEqual({ total: 3, used: 3 })
  })
})

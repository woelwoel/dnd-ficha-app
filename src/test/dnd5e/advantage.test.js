import { describe, it, expect } from 'vitest'
import { combineAdvantage } from '../../systems/dnd5e/domain/advantage'

describe('combineAdvantage', () => {
  it('null com null continua null (sem opinião nenhuma)', () => {
    expect(combineAdvantage(null, null)).toBeNull()
  })

  it('null com adv devolve adv (a outra fonte decide)', () => {
    expect(combineAdvantage(null, 'adv')).toBe('adv')
  })

  it('dis com null devolve dis (a outra fonte decide)', () => {
    expect(combineAdvantage('dis', null)).toBe('dis')
  })

  it('adv com adv permanece adv (não empilha, mas não cancela)', () => {
    expect(combineAdvantage('adv', 'adv')).toBe('adv')
  })

  it('dis com dis permanece dis (não empilha, mas não cancela)', () => {
    expect(combineAdvantage('dis', 'dis')).toBe('dis')
  })

  it('adv com dis se anulam para null (PHB p.173)', () => {
    expect(combineAdvantage('adv', 'dis')).toBeNull()
  })

  it('dis com adv se anulam para null, na ordem inversa', () => {
    expect(combineAdvantage('dis', 'adv')).toBeNull()
  })

  it('entrada invalida ("normal", undefined, 0, "ADV") é tratada como sem opinião', () => {
    expect(combineAdvantage('normal', 'adv')).toBe('adv')
    expect(combineAdvantage(undefined, 'dis')).toBe('dis')
    expect(combineAdvantage(0, 'dis')).toBe('dis')
    expect(combineAdvantage('ADV', 'dis')).toBe('dis')
    expect(combineAdvantage('normal', undefined)).toBeNull()
    expect(combineAdvantage(0, 'ADV')).toBeNull()
  })
})

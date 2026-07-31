import { describe, it, expect } from 'vitest'
import {
  PASSWORD_MIN,
  PASSWORD_MAX,
  PASSWORD_RULES,
  passwordChecks,
  describePasswordProblem,
} from '../../auth/passwordPolicy'

describe('passwordPolicy', () => {
  it('exige de 8 a 50 caracteres', () => {
    expect(PASSWORD_MIN).toBe(8)
    expect(PASSWORD_MAX).toBe(50)
  })

  it('aprova uma senha que cumpre todos os requisitos', () => {
    expect(passwordChecks('Segredo12!')).toEqual({
      length: true, lower: true, upper: true, digit: true, symbol: true,
    })
    expect(describePasswordProblem('Segredo12!')).toBeNull()
  })

  it('reprova senha curta demais', () => {
    expect(passwordChecks('Ab1!').length).toBe(false)
  })

  it('reprova senha acima de 50 caracteres', () => {
    const longa = 'A1!' + 'a'.repeat(48)
    expect(longa.length).toBeGreaterThan(PASSWORD_MAX)
    expect(passwordChecks(longa).length).toBe(false)
  })

  it('detecta cada classe de caractere que falta', () => {
    expect(passwordChecks('segredo12!').upper).toBe(false)
    expect(passwordChecks('SEGREDO12!').lower).toBe(false)
    expect(passwordChecks('SegredoAA!').digit).toBe(false)
    expect(passwordChecks('Segredo123').symbol).toBe(false)
  })

  it('trata senha vazia ou nula sem quebrar', () => {
    expect(passwordChecks('')).toEqual({
      length: false, lower: false, upper: false, digit: false, symbol: false,
    })
    expect(passwordChecks(undefined).length).toBe(false)
  })

  it('descreve em português tudo que falta, em uma frase só', () => {
    const msg = describePasswordProblem('segredo12')
    expect(msg).toMatch(/senha/i)
    expect(msg).toMatch(/maiúscula/i)
    expect(msg).toMatch(/símbolo/i)
    expect(msg).not.toMatch(/minúscula/i)
  })

  it('expõe a lista de regras para a UI, cada uma com rótulo em português', () => {
    expect(PASSWORD_RULES.map(r => r.key)).toEqual(['length', 'lower', 'upper', 'digit', 'symbol'])
    for (const rule of PASSWORD_RULES) expect(rule.label).toBeTruthy()
    expect(PASSWORD_RULES[0].label).toMatch(/8.*50/)
  })
})

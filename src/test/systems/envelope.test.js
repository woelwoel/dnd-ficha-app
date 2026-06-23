// src/test/systems/envelope.test.js
import { describe, it, expect } from 'vitest'
import { parseEnvelope, systemOf, DEFAULT_SYSTEM } from '../../systems/envelope'

describe('envelope', () => {
  it('default de system é dnd5e quando ausente', () => {
    const r = parseEnvelope({ id: 'abc', meta: { createdAt: 'x', updatedAt: 'y' } })
    expect(r.success).toBe(true)
    expect(r.data.system).toBe('dnd5e')
  })

  it('preserva system explícito', () => {
    const r = parseEnvelope({ id: 'abc', system: 'daggerheart', meta: {} })
    expect(r.success).toBe(true)
    expect(r.data.system).toBe('daggerheart')
  })

  it('systemOf devolve default pra objeto sem system', () => {
    expect(systemOf({ id: 'abc' })).toBe(DEFAULT_SYSTEM)
    expect(systemOf({ id: 'abc', system: 'daggerheart' })).toBe('daggerheart')
  })

  it('rejeita envelope sem id', () => {
    expect(parseEnvelope({ system: 'dnd5e' }).success).toBe(false)
  })
})

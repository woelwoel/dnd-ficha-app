// src/test/wizardV2-useBlockStatus.test.js
import { describe, it, expect } from 'vitest'
import { getBlockStatus } from '../components/CharacterWizardV2/hooks/useBlockStatus'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const empty = INITIAL_DRAFT_V2

describe('getBlockStatus', () => {
  it('race vazio quando não preenchido', () => {
    expect(getBlockStatus('race', empty).status).toBe('vazio')
  })

  it('race completo quando preenchido', () => {
    expect(getBlockStatus('race', { ...empty, race: 'meio-elfo' }).status).toBe('completo')
  })

  it('attributes bloqueado quando race vazio', () => {
    const r = getBlockStatus('attributes', empty)
    expect(r.status).toBe('bloqueado')
    expect(r.blockedBy).toContain('race')
  })

  it('attributes vazio quando race preenchido mas atributos zerados', () => {
    expect(getBlockStatus('attributes', { ...empty, race: 'humano' }).status).toBe('vazio')
  })

  it('attributes parcial quando alguns atributos preenchidos', () => {
    const draft = {
      ...empty, race: 'humano',
      baseAttributes: { str: 15, dex: 14, con: 0, int: 0, wis: 0, cha: 0 },
    }
    expect(getBlockStatus('attributes', draft).status).toBe('parcial')
  })

  it('attributes completo quando todos os 6 preenchidos', () => {
    const draft = {
      ...empty, race: 'humano',
      baseAttributes: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
    }
    expect(getBlockStatus('attributes', draft).status).toBe('completo')
  })

  it('skills bloqueado se class ou background vazios', () => {
    const r1 = getBlockStatus('skills', { ...empty, background: 'soldado' })
    expect(r1.status).toBe('bloqueado')
    expect(r1.blockedBy).toContain('class')
    const r2 = getBlockStatus('skills', { ...empty, class: 'guerreiro' })
    expect(r2.status).toBe('bloqueado')
    expect(r2.blockedBy).toContain('background')
  })

  it('spells bloqueado se class vazio', () => {
    expect(getBlockStatus('spells', empty).status).toBe('bloqueado')
  })

  it('concept completo só com name preenchido', () => {
    expect(getBlockStatus('concept', empty).status).toBe('vazio')
    expect(getBlockStatus('concept', { ...empty, name: 'Heitor' }).status).toBe('completo')
  })

  it('review bloqueado enquanto draft está vazio', () => {
    expect(getBlockStatus('review', empty).status).toBe('bloqueado')
  })

  it('review completo quando todos os outros não-bloqueados estão completos', () => {
    const draft = {
      ...empty,
      race: 'humano', class: 'guerreiro', background: 'soldado',
      baseAttributes: { str: 15, dex: 14, con: 13, int: 12, wis: 10, cha: 8 },
      chosenSkills: ['atletismo'],
      spells: [{ index: 'mage-hand' }],
      name: 'Heitor',
    }
    expect(getBlockStatus('review', draft).status).toBe('completo')
  })
})

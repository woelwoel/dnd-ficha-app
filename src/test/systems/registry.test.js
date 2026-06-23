import { describe, it, expect } from 'vitest'
import { getSystemCore, listSystems } from '../../systems'

describe('registry de sistemas', () => {
  it('resolve o core do dnd5e', () => {
    const core = getSystemCore('dnd5e')
    expect(core).toBeTruthy()
    expect(core.id).toBe('dnd5e')
    expect(typeof core.parseCharacter).toBe('function')
    expect(typeof core.summarize).toBe('function')
  })

  it('devolve null pra sistema desconhecido', () => {
    expect(getSystemCore('xpto')).toBeNull()
  })

  it('listSystems inclui dnd5e', () => {
    expect(listSystems().some(s => s.id === 'dnd5e')).toBe(true)
  })

  it('summarize do dnd5e monta title/subtitle/badges', () => {
    const core = getSystemCore('dnd5e')
    const s = core.summarize({ info: { name: 'Aragorn', race: 'Humano', class: 'Guerreiro', level: 5 } })
    expect(s.title).toBe('Aragorn')
    expect(s.subtitle).toBe('Humano · Guerreiro')
    expect(s.badges).toContain('Nv 5')
  })

  it('createCharacter carimba system=dnd5e', () => {
    const core = getSystemCore('dnd5e')
    expect(core.createCharacter({ id: 'x' }).system).toBe('dnd5e')
  })
})

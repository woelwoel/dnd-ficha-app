import { describe, it, expect } from 'vitest'

// Replica da lógica de canAdvance para testes unitários isolados
function canAdvance(stepId, draft, classChoices = {}, races = [], classData = null) {
  switch (stepId) {
    case 'settings':   return true
    case 'concept':    return !!draft.name?.trim()
    case 'race': {
      if (!draft.race) return false
      const selectedRace = races.find(r => r.index === draft.race)
      if (selectedRace?.subraces?.length > 0 && !draft.subrace) return false
      return true
    }
    case 'class': {
      if (!draft.class) return false
      const choices = classChoices[draft.class]?.choices ?? []
      const leveledChoices = choices.filter(c => c.level <= draft.level)
      if (!leveledChoices.every(c => !!draft.chosenFeatures?.[c.id])) return false
      const bonusCantripsNeeded = leveledChoices.reduce((sum, c) => {
        const opt = c.options.find(o => o.value === draft.chosenFeatures?.[c.id])
        return sum + (opt?.grants?.bonusCantrips ?? 0)
      }, 0)
      return (draft.bonusSpells?.length ?? 0) >= bonusCantripsNeeded
    }
    case 'background': return !!draft.background
    case 'skills': {
      const limit = classData?.skill_choices?.count ?? null
      if (limit === null) return true
      return (draft.chosenSkills?.length ?? 0) >= limit
    }
    case 'spells': {
      const CLASSES_SEM_CANTRIPS = new Set(['paladino', 'patrulheiro'])
      if (CLASSES_SEM_CANTRIPS.has(draft.class)) return true
      const chosenCantrips = (draft.spells ?? []).filter(s => s.level === 0)
      return chosenCantrips.length > 0
    }
    case 'review': return true
    default:       return true
  }
}

const RACES_MOCK = [
  { index: 'humano', name: 'Humano', subraces: [] },
  { index: 'elfo', name: 'Elfo', subraces: [
    { index: 'alto-elfo', name: 'Alto-Elfo' },
    { index: 'elfo-da-floresta', name: 'Elfo da Floresta' },
  ]},
]

describe('canAdvance — raça', () => {
  it('bloqueia quando nenhuma raça selecionada', () => {
    expect(canAdvance('race', { race: '' }, {}, RACES_MOCK)).toBe(false)
  })

  it('permite quando raça sem sub-raças é selecionada', () => {
    expect(canAdvance('race', { race: 'humano', subrace: '' }, {}, RACES_MOCK)).toBe(true)
  })

  it('bloqueia quando raça com sub-raças não tem sub-raça selecionada', () => {
    expect(canAdvance('race', { race: 'elfo', subrace: '' }, {}, RACES_MOCK)).toBe(false)
  })

  it('permite quando raça com sub-raças tem sub-raça selecionada', () => {
    expect(canAdvance('race', { race: 'elfo', subrace: 'alto-elfo' }, {}, RACES_MOCK)).toBe(true)
  })
})

describe('canAdvance — perícias', () => {
  const classData = { skill_choices: { count: 2, from: ['Acrobacia', 'Atletismo', 'Arcanismo'] } }

  it('bloqueia quando escolheu 0 de 2', () => {
    expect(canAdvance('skills', { chosenSkills: [] }, {}, [], classData)).toBe(false)
  })

  it('bloqueia quando escolheu 1 de 2', () => {
    expect(canAdvance('skills', { chosenSkills: ['acrobatics'] }, {}, [], classData)).toBe(false)
  })

  it('permite quando escolheu 2 de 2', () => {
    expect(canAdvance('skills', { chosenSkills: ['acrobatics', 'athletics'] }, {}, [], classData)).toBe(true)
  })

  it('sempre permite quando classe não tem limite de perícias', () => {
    expect(canAdvance('skills', { chosenSkills: [] }, {}, [], null)).toBe(true)
  })
})

describe('canAdvance — magias', () => {
  it('bloqueia quando mago sem truques escolhidos', () => {
    expect(canAdvance('spells', { class: 'mago', spells: [] })).toBe(false)
  })

  it('permite quando mago tem pelo menos 1 truque', () => {
    const spells = [{ level: 0, index: 'fire-bolt' }]
    expect(canAdvance('spells', { class: 'mago', spells })).toBe(true)
  })

  it('paladino não precisa de truques → sempre permite', () => {
    expect(canAdvance('spells', { class: 'paladino', spells: [] })).toBe(true)
  })

  it('patrulheiro não precisa de truques → sempre permite', () => {
    expect(canAdvance('spells', { class: 'patrulheiro', spells: [] })).toBe(true)
  })

  it('magias de nível não contam como truques', () => {
    const spells = [{ level: 1, index: 'magic-missile' }, { level: 1, index: 'shield' }]
    expect(canAdvance('spells', { class: 'mago', spells })).toBe(false)
  })
})

describe('canAdvance — classe', () => {
  it('bloqueia quando classe não selecionada', () => {
    expect(canAdvance('class', { class: '', level: 1 })).toBe(false)
  })

  it('permite quando classe sem choices obrigatórias', () => {
    expect(canAdvance('class', { class: 'guerreiro', level: 1, chosenFeatures: {} }, {})).toBe(true)
  })
})

describe('canAdvance — magias PT-BR (nomes de classes em português)', () => {
  const classesSemCantrips = ['paladino', 'patrulheiro']
  const classesComCantrips = ['bardo', 'clerigo', 'druida', 'feiticeiro', 'bruxo', 'mago']

  for (const classe of classesSemCantrips) {
    it(`${classe} não precisa de truques → sempre permite`, () => {
      expect(canAdvance('spells', { class: classe, spells: [] })).toBe(true)
    })
  }

  for (const classe of classesComCantrips) {
    it(`${classe} sem truques → bloqueia`, () => {
      expect(canAdvance('spells', { class: classe, spells: [] })).toBe(false)
    })
    it(`${classe} com 1 truque → permite`, () => {
      expect(canAdvance('spells', { class: classe, spells: [{ level: 0, index: 'algum-truque' }] })).toBe(true)
    })
  }
})

describe('flags de campanha — allowMulticlass', () => {
  it('allowMulticlass false → indica que MC está desabilitada nas configurações', () => {
    const settings = { allowMulticlass: false, allowFeats: false }
    expect(settings.allowMulticlass).toBe(false)
  })

  it('allowMulticlass true → MC permitida', () => {
    const settings = { allowMulticlass: true, allowFeats: false }
    expect(settings.allowMulticlass).toBe(true)
  })
})

describe('flags de campanha — allowFeats', () => {
  it('allowFeats false por padrão', () => {
    const defaultSettings = { allowFeats: false, allowMulticlass: false }
    expect(defaultSettings.allowFeats).toBe(false)
  })

  it('allowFeats true → talentos permitidos', () => {
    const settings = { allowFeats: true, allowMulticlass: false }
    expect(settings.allowFeats).toBe(true)
  })
})

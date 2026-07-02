import { describe, it, expect } from 'vitest'
import {
  mergeMonster,
  translateType,
  translateSize,
  translateAlignment,
  translateLabel,
  translateSpeedKey,
  translateSenseKey,
  indexOverrides,
} from '../systems/dnd5e/utils/monsters-i18n'

describe('mergeMonster', () => {
  const goblinEn = {
    index: 'goblin',
    name: 'Goblin',
    size: 'Small',
    type: 'humanoid',
    alignment: 'neutral evil',
    hit_points: 7,
    actions: [
      { name: 'Scimitar', desc: 'Melee weapon attack...' },
      { name: 'Shortbow',  desc: 'Ranged weapon attack...' },
    ],
    special_abilities: [
      { name: 'Nimble Escape', desc: 'The goblin can take...' },
    ],
  }

  it('retorna EN inalterado quando override é nulo', () => {
    expect(mergeMonster(goblinEn, null)).toBe(goblinEn)
    expect(mergeMonster(goblinEn, undefined)).toBe(goblinEn)
  })

  it('substitui strings traduzidas e mantém numéricos', () => {
    const out = mergeMonster(goblinEn, {
      index: 'goblin',
      name: 'Goblin',
      size: 'Pequeno',
      type: 'humanoide',
      alignment: 'neutro mau',
    })
    expect(out.size).toBe('Pequeno')
    expect(out.type).toBe('humanoide')
    expect(out.alignment).toBe('neutro mau')
    expect(out.hit_points).toBe(7) // preserva numérico
  })

  it('mescla actions casando pelo nome em EN (case-insensitive)', () => {
    const out = mergeMonster(goblinEn, {
      index: 'goblin',
      actions: [
        { name_en: 'Scimitar', name: 'Cimitarra', desc: 'Ataque corpo a corpo...' },
        { name_en: 'shortbow', name: 'Arco Curto', desc: 'Ataque à distância...' },
      ],
    })
    expect(out.actions).toHaveLength(2)
    expect(out.actions[0].name).toBe('Cimitarra')
    expect(out.actions[0].desc).toBe('Ataque corpo a corpo...')
    expect(out.actions[1].name).toBe('Arco Curto')
  })

  it('cai para EN quando override de item não casa', () => {
    const out = mergeMonster(goblinEn, {
      actions: [{ name_en: 'NonExistent', name: 'Inexistente', desc: 'foo' }],
    })
    // Item órfão é mantido com o que o PT forneceu
    expect(out.actions[0].name).toBe('Inexistente')
  })

  it('mescla special_abilities preservando campos não traduzidos', () => {
    const out = mergeMonster(goblinEn, {
      special_abilities: [{ name_en: 'Nimble Escape', name: 'Fuga Ágil' }],
    })
    expect(out.special_abilities[0].name).toBe('Fuga Ágil')
    // desc não foi traduzida → mantém EN do item original
    expect(out.special_abilities[0].desc).toBe('The goblin can take...')
  })

  it('não modifica EN quando override existe mas é vazio', () => {
    const out = mergeMonster(goblinEn, { index: 'goblin' })
    expect(out.name).toBe('Goblin')
    expect(out.actions[0].name).toBe('Scimitar')
  })
})

describe('translateType', () => {
  it('mapeia tipos conhecidos para PT-BR', () => {
    expect(translateType('humanoid', 'pt')).toBe('humanoide')
    expect(translateType('Dragon', 'pt')).toBe('dragão')
    expect(translateType('beast', 'pt')).toBe('besta')
  })

  it('retorna original quando lang !== pt', () => {
    expect(translateType('humanoid', 'en')).toBe('humanoid')
  })

  it('retorna original em tipo desconhecido', () => {
    expect(translateType('alienform', 'pt')).toBe('alienform')
  })
})

describe('translateSize / translateAlignment', () => {
  it('traduz tamanhos', () => {
    expect(translateSize('Small', 'pt')).toBe('Pequeno')
    expect(translateSize('Gargantuan', 'pt')).toBe('Colossal')
    expect(translateSize('Small', 'en')).toBe('Small')
  })

  it('traduz alinhamentos compostos por tokens', () => {
    expect(translateAlignment('chaotic evil', 'pt')).toBe('caótico mau')
    expect(translateAlignment('lawful good', 'pt')).toBe('leal bom')
    expect(translateAlignment('unaligned', 'pt')).toBe('sem alinhamento')
    expect(translateAlignment('any chaotic alignment', 'pt')).toBe('qualquer caótico alinhamento')
  })

  it('preserva tokens desconhecidos', () => {
    expect(translateAlignment('typically neutral', 'pt')).toBe('typically neutro')
  })
})

describe('translateLabel / Speed / Sense', () => {
  it('traduz labels do statblock', () => {
    expect(translateLabel('Armor Class', 'pt')).toBe('Classe de Armadura')
    expect(translateLabel('Challenge', 'pt')).toBe('Nível de Desafio')
    expect(translateLabel('Armor Class', 'en')).toBe('Armor Class')
  })

  it('traduz tipos de deslocamento', () => {
    expect(translateSpeedKey('walk', 'pt')).toBe('caminhar')
    expect(translateSpeedKey('fly', 'pt')).toBe('voar')
    expect(translateSpeedKey('walk', 'en')).toBe('walk')
  })

  it('traduz nomes de sentidos', () => {
    expect(translateSenseKey('darkvision', 'pt')).toBe('visão no escuro')
    expect(translateSenseKey('passive_perception', 'pt')).toBe('Percepção passiva')
  })
})

describe('indexOverrides', () => {
  it('indexa por chave index', () => {
    const m = indexOverrides([{ index: 'goblin' }, { index: 'aboleth' }])
    expect(m.size).toBe(2)
    expect(m.get('goblin').index).toBe('goblin')
  })

  it('ignora entradas inválidas', () => {
    expect(indexOverrides(null).size).toBe(0)
    expect(indexOverrides([null, { foo: 'bar' }, { index: 'goblin' }]).size).toBe(1)
  })
})

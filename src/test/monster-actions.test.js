import { describe, it, expect } from 'vitest'
import { monsterActions } from '../systems/dnd5e/domain/monsterActions'

const GOBLIN = {
  index: 'goblin', name: 'Goblin',
  actions: [
    {
      name: 'Scimitar',
      desc: 'Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.',
      attack_bonus: 4,
      damage: [{ damage_dice: '1d6+2', damage_type: { index: 'slashing', name: 'Slashing' } }],
    },
    {
      name: 'Shortbow',
      desc: 'Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 2) piercing damage.',
      attack_bonus: 4,
      damage: [{ damage_dice: '1d6+2', damage_type: { index: 'piercing', name: 'Piercing' } }],
    },
  ],
}

// O caso que motivou a regra: `success_type` diz "none", a descrição diz
// "half as much", e o PHB concorda com a descrição.
const SOPRO = {
  name: 'Fire Breath',
  desc: 'The dragon exhales fire in a 60-foot cone. Each creature in that area must make a DC 21 Dexterity saving throw, taking 63 (18d6) fire damage on a failed save, or half as much damage on a successful one.',
  dc: { dc_type: { index: 'dex', name: 'DEX' }, dc_value: 21, success_type: 'none' },
  damage: [{ damage_dice: '18d6', damage_type: { index: 'fire', name: 'Fire' } }],
}

describe('monsterActions — ataques', () => {
  it('devolve uma ação rolável por ataque, com bônus e dano', () => {
    const acoes = monsterActions(GOBLIN)

    expect(acoes).toHaveLength(2)
    expect(acoes[0]).toMatchObject({
      name: 'Scimitar', kind: 'attack', attackBonus: 4, attackNotation: '1d20+4',
    })
    expect(acoes[0].damage).toEqual([{ notation: '1d6+2', type: 'Slashing' }])
  })

  it('bônus negativo vira notação subtraindo', () => {
    const [a] = monsterActions({
      actions: [{ name: 'Soco fraco', attack_bonus: -1, damage: [{ damage_dice: '1d4' }] }],
    })
    expect(a.attackNotation).toBe('1d20-1')
  })

  it('duas linhas de dano viram duas entradas, cada uma com seu tipo', () => {
    const [a] = monsterActions({
      actions: [{
        name: 'Bite', attack_bonus: 7,
        damage: [
          { damage_dice: '2d6+4', damage_type: { name: 'Piercing' } },
          { damage_dice: '3d6', damage_type: { name: 'Poison' } },
        ],
      }],
    })

    // Somar as duas esconderia que resistência a veneno vale só pra segunda.
    expect(a.damage).toEqual([
      { notation: '2d6+4', type: 'Piercing' },
      { notation: '3d6', type: 'Poison' },
    ])
  })
})

describe('monsterActions — salvaguardas', () => {
  it('lê CD e atributo', () => {
    const [a] = monsterActions({ actions: [SOPRO] })

    expect(a).toMatchObject({ kind: 'save', name: 'Fire Breath' })
    expect(a.save).toMatchObject({ ability: 'DES', dc: 21 })
    expect(a.damage).toEqual([{ notation: '18d6', type: 'Fire' }])
  })

  it('confia na descrição quando success_type diz "none" mas o texto diz metade', () => {
    const [a] = monsterActions({ actions: [SOPRO] })
    expect(a.save.half).toBe(true)
  })

  it('aceita o campo estruturado quando ele afirma metade', () => {
    const [a] = monsterActions({
      actions: [{
        name: 'Onda', desc: 'A wave crashes.',
        dc: { dc_type: { name: 'CON' }, dc_value: 15, success_type: 'half' },
        damage: [{ damage_dice: '4d8', damage_type: { name: 'Bludgeoning' } }],
      }],
    })
    expect(a.save.half).toBe(true)
  })

  it('sem nenhum dos dois afirmando, não é metade', () => {
    const [a] = monsterActions({
      actions: [{
        name: 'Olhar', desc: 'The creature must succeed on a save or be petrified.',
        dc: { dc_type: { name: 'CON' }, dc_value: 13, success_type: 'none' },
        damage: [{ damage_dice: '2d6', damage_type: { name: 'Force' } }],
      }],
    })
    expect(a.save.half).toBe(false)
  })
})

describe('monsterActions — o que NÃO vira botão', () => {
  it('multiataque fica de fora', () => {
    const acoes = monsterActions({
      actions: [
        { name: 'Multiattack', desc: 'The dragon makes three attacks.', multiattack_type: 'actions' },
        { name: 'Claw', attack_bonus: 5, damage: [{ damage_dice: '1d8' }] },
      ],
    })

    expect(acoes.map(a => a.name)).toEqual(['Claw'])
  })

  it('dano por escolha não vira botão de dano, mas a ação continua listada', () => {
    const [a] = monsterActions({
      actions: [{
        name: 'Elemental Touch', attack_bonus: 6,
        damage: [{ choose: 1, type: 'damage', from: [] }],
      }],
    })

    expect(a.kind).toBe('attack')
    expect(a.damage).toEqual([])
  })

  it('notação de dano que o motor não entende é descartada', () => {
    const [a] = monsterActions({
      actions: [{ name: 'Estranho', attack_bonus: 3, damage: [{ damage_dice: 'muitos d6' }] }],
    })
    expect(a.damage).toEqual([])
  })

  it('monstro sem ações devolve lista vazia', () => {
    expect(monsterActions(null)).toEqual([])
    expect(monsterActions({ index: 'x' })).toEqual([])
  })

  it('inclui ações lendárias, marcadas pela origem', () => {
    const acoes = monsterActions({
      actions: [{ name: 'Claw', attack_bonus: 5, damage: [{ damage_dice: '1d8' }] }],
      legendary_actions: [{ name: 'Tail Attack', attack_bonus: 9, damage: [{ damage_dice: '2d8+6' }] }],
    })

    expect(acoes.map(a => [a.name, a.source])).toEqual([
      ['Claw', 'action'],
      ['Tail Attack', 'legendary'],
    ])
  })

  it('cada ação tem id estável e único', () => {
    const ids = monsterActions(GOBLIN).map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(monsterActions(GOBLIN).map(a => a.id)).toEqual(ids)
  })
})

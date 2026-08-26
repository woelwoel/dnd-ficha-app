import { describe, it, expect } from 'vitest'
import equip from '../../../public/srd-data/tasha-class-equipment-pt.json'
import phbEquip from '../../../public/srd-data/phb-class-equipment-pt.json'
import { resolveClassEquipmentItems } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { allPicksDone } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/class/equipment-helpers'

const ARTIFICE = 'artifice'
const art = equip[ARTIFICE]

/** Valores de `pick` que a UI de equipamento sabe resolver. */
const PICKS_VALIDOS = new Set(
  JSON.stringify(phbEquip).match(/"pick":"[^"]+"/g).map(m => m.split('"')[3])
)

describe('equipamento inicial do Artífice', () => {
  it('existe no catálogo do Tasha', () => {
    expect(art).toBeDefined()
    expect(art.choices.length).toBeGreaterThan(0)
  })

  it('tem a escolha de armadura do PDF', () => {
    expect(art.choices.map(c => c.id)).toEqual(['artifice_armadura'])
    expect(art.choices[0].options.map(o => o.value)).toEqual(['a', 'b'])
    expect(art.choices[0].options.map(o => o.items[0].name)).toEqual(['Couro Batido', 'Brunea'])
  })

  it('inclui besta leve, virotes, ferramentas de ladrão e pacote como itens fixos', () => {
    const fixos = art.fixed.filter(i => !i.pick).map(i => i.name)
    expect(fixos).toEqual(['Besta Leve', 'Virote', 'Ferramentas de Ladrão', 'Pacote do Explorador'])
    expect(art.fixed.find(i => i.name === 'Virote').qty).toBe(20)
  })

  it('deixa o jogador escolher DUAS armas simples', () => {
    const picks = art.fixed.filter(i => i.pick)
    expect(picks).toHaveLength(2)
    for (const p of picks) expect(p.pick).toBe('simple')
  })

  /**
   * A chave de um pick fixo é `fixed:${item.name}` — dois itens fixos com o
   * MESMO nome colidiriam e o jogador só conseguiria escolher uma arma.
   */
  it('dá nomes distintos às duas armas simples', () => {
    const nomes = art.fixed.filter(i => i.pick).map(i => i.name)
    expect(new Set(nomes).size).toBe(nomes.length)
  })

  /**
   * `pick` fora do vocabulário existente vira um item que a UI não sabe
   * resolver — o jogador escolhe a opção e não recebe arma nenhuma.
   */
  it('só usa valores de pick que a UI conhece', () => {
    const todos = JSON.stringify(art).match(/"pick":"[^"]+"/g) ?? []
    expect(todos.length).toBeGreaterThan(0)
    for (const p of todos) {
      expect(PICKS_VALIDOS, p).toContain(p.split('"')[3])
    }
  })
})

describe('o wizard resolve o equipamento do Artífice', () => {
  const PICKS = { 'fixed:1ª Arma Simples': 'Clava', 'fixed:2ª Arma Simples': 'Adaga' }

  function draft(escolhas, picks = PICKS) {
    return {
      class: ARTIFICE,
      classEquipmentChoice: 'equipment',
      classEquipmentChoices: escolhas,
      classEquipmentPicks: picks,
    }
  }

  it('entrega os itens da armadura escolhida mais os fixos e as armas escolhidas', () => {
    const itens = resolveClassEquipmentItems(draft({ artifice_armadura: 'b' }), equip)
    const nomes = itens.map(i => i.name)
    expect(nomes).toContain('Brunea')
    expect(nomes).not.toContain('Couro Batido')
    expect(nomes).toContain('Besta Leve')
    expect(nomes).toContain('Ferramentas de Ladrão')
    expect(nomes).toContain('Pacote do Explorador')
    expect(nomes).toContain('Clava')
    expect(nomes).toContain('Adaga')
    expect(itens.find(i => i.name === 'Virote').qty).toBe(20)
  })

  it('não entrega nada quando o jogador optou por ouro', () => {
    const d = draft({ artifice_armadura: 'a' })
    d.classEquipmentChoice = 'gold'
    expect(resolveClassEquipmentItems(d, equip)).toEqual([])
  })

  it('só considera o bloco completo depois das duas armas escolhidas', () => {
    const escolhas = { artifice_armadura: 'a' }
    expect(allPicksDone(art, escolhas, {})).toBe(false)
    expect(allPicksDone(art, escolhas, { 'fixed:1ª Arma Simples': 'Clava' })).toBe(false)
    expect(allPicksDone(art, escolhas, PICKS)).toBe(true)
  })
})

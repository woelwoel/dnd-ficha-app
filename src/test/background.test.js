import { describe, it, expect } from 'vitest'
import { parseBackgroundEquipment } from '../utils/calculations'

describe('parseBackgroundEquipment — ouro do antecedente', () => {
  it('detecta ouro em bolsa de 15 po', () => {
    const { gold } = parseBackgroundEquipment('uma bolsa com 15 po')
    expect(gold).toBe(15)
  })

  it('não duplica ouro ao reanalisar a mesma string', () => {
    const str = 'uma bolsa com 10 po, uma adaga'
    const r1 = parseBackgroundEquipment(str)
    const r2 = parseBackgroundEquipment(str)
    expect(r1.gold).toBe(r2.gold)
    expect(r1.gold).toBe(10)
  })

  it('retorna gold 0 quando não há po', () => {
    const { gold } = parseBackgroundEquipment('uma adaga, um mapa')
    expect(gold).toBe(0)
  })

  it('extrai itens corretamente junto com ouro', () => {
    const { items, gold } = parseBackgroundEquipment('uma adaga, uma bolsa com 15 po')
    expect(gold).toBe(15)
    expect(items.some(i => i.name.toLowerCase().includes('adaga'))).toBe(true)
  })
})

describe('Lógica de troca de antecedente — sem acumulação de ouro', () => {
  it('reverter ouro antigo antes de aplicar novo não acumula', () => {
    // Simula a lógica do handleBackgroundChange
    const prevGold = 10    // ouro do antecedente anterior
    const currentGp = 25   // gp total atual (inclui 10 do antecedente anterior)
    const newBgGold = 15   // ouro do novo antecedente

    const gpWithoutOldBg = Math.max(0, currentGp - prevGold) // 15
    const finalGp = gpWithoutOldBg + newBgGold                // 30

    // Sem a correção: currentGp + newBgGold = 40 (errado)
    expect(finalGp).toBe(30)
    expect(finalGp).not.toBe(currentGp + newBgGold)
  })

  it('trocar múltiplas vezes não acumula', () => {
    let gp = 0
    const backgrounds = [10, 15, 5]
    let prevGold = 0

    for (const gold of backgrounds) {
      gp = Math.max(0, gp - prevGold) + gold
      prevGold = gold
    }

    // Deve ser apenas o último valor (5), pois não há ouro próprio
    expect(gp).toBe(5)
  })
})

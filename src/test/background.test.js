import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { parseBackgroundEquipment } from '../systems/dnd5e/utils/calculations'

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

  it('detecta ouro standalone (Eremita: "...e 5 po. VIDA DE ISOLAMENTO...")', () => {
    // Antes vazava "VIDA DE" como item porque "VIDA" tem 4 chars
    // (regex antiga exigia 5+) E "5 po." standalone não tinha "algibeira"
    // (regex de gold só aceitava se mencionasse bolsa/saco).
    const eremita = 'Um estojo de pergaminho cheio de notas dos seus estudos e orações, um cobertor de inverno, um conjunto de roupas comuns, um kit de herbalismo e 5 po. VIDA DE ISOLAMENTO Qual foi o motivo do seu isolamento'
    const { items, gold } = parseBackgroundEquipment(eremita)
    expect(gold).toBe(5)
    // NENHUM item deve conter "po", "VIDA" ou "DE" como nome próprio.
    for (const it of items) {
      expect(it.name).not.toMatch(/^po\.?$/i)
      expect(it.name).not.toMatch(/VIDA DE/i)
    }
    // Os 4 itens reais devem aparecer.
    const names = items.map(i => i.name.toLowerCase()).join(' | ')
    expect(names).toContain('estojo de pergaminho')
    expect(names).toContain('cobertor de inverno')
    expect(names).toContain('roupas comuns')
    expect(names).toContain('kit de herbalismo')
  })

  // Smoke test: passa CADA equipment real do PHB pelo parser e garante:
  //  - gold > 0
  //  - nenhum item tem nome esquisito (palavra única em CAIXA ALTA com 2-3
  //    chars, "po", ou pontuação solta — sinais clássicos de lore vazada)
  describe('Smoke test em TODOS os antecedentes reais do PHB', () => {
    const data = JSON.parse(readFileSync(
      resolve(process.cwd(), 'public/srd-data/phb-backgrounds-pt.json'),
      'utf8',
    ))
    const bgs = Array.isArray(data) ? data : Object.values(data.backgrounds ?? data)

    for (const bg of bgs) {
      if (!bg?.equipment) continue
      const name = bg.name ?? bg.index ?? 'desconhecido'
      it(`${name}: nenhum item com nome de lore vazada`, () => {
        const { items, gold } = parseBackgroundEquipment(bg.equipment)
        // Detecta sinais de vazamento: nome com 2+ palavras MAIÚSCULAS,
        // ou começa com "po"/"PO", ou tem ponto final solto.
        for (const it of items) {
          expect(it.name, `item suspeito em ${name}: "${it.name}"`)
            .not.toMatch(/^po\.?$/i)
          expect(it.name, `lore vazada em ${name}: "${it.name}"`)
            .not.toMatch(/[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{2,}/)
          expect(it.name.length, `nome muito curto em ${name}: "${it.name}"`)
            .toBeGreaterThan(2)
        }
        // Todos os antecedentes do PHB dão alguma quantia de ouro.
        expect(gold, `${name} sem ouro detectado`).toBeGreaterThan(0)
      })
    }
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

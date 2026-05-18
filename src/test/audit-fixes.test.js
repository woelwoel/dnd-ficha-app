// Testes para os 3 bugs críticos identificados na auditoria de regras
// (docs/audits/2026-05-17-rules-engine-gap-analysis.md).
import { describe, it, expect } from 'vitest'
import { findArmorByName } from '../domain/equipment'
import {
  evaluateMulticlassPrerequisites, applyLevelUp,
} from '../domain/rules'

/* ─────────────────────────────────────────────────────────────────────
 * Bug 1: findArmorByName — substring-collision
 * ───────────────────────────────────────────────────────────────────── */
describe('findArmorByName — sem falsos positivos por substring', () => {
  it('cota de escamas vira scale-mail (exato)', () => {
    expect(findArmorByName('Cota de Escamas')).toMatchObject({ key: 'scale-mail', baseAC: 14 })
  })

  it('cota de malha vira chain-mail', () => {
    expect(findArmorByName('Cota de Malha')).toMatchObject({ key: 'chain-mail', baseAC: 16 })
  })

  it('cota (sozinho) vira chain-mail (fallback genérico)', () => {
    expect(findArmorByName('Cota')).toMatchObject({ key: 'chain-mail' })
  })

  it('cota de escamas dracônica (prefixo) vira scale-mail, não chain-mail', () => {
    // Antes: "cota" matching via includes faria chain-mail. Agora: prefixo
    // de "cota de escamas " vence.
    expect(findArmorByName('Cota de Escamas Dracônica')).toMatchObject({ key: 'scale-mail' })
  })

  it('item totalmente desconhecido retorna null', () => {
    expect(findArmorByName('Manto do Vento')).toBeNull()
  })

  it('NÃO faz match por substring no meio (longa cota dos heróis)', () => {
    // Antes (com includes): "cota" matching no meio → chain-mail. Agora: null.
    expect(findArmorByName('Longa Cota dos Heróis')).toBeNull()
  })

  it('aliases de placas e armadura de placas funcionam', () => {
    expect(findArmorByName('Placa')).toMatchObject({ key: 'plate' })
    expect(findArmorByName('Armadura de Placas')).toMatchObject({ key: 'plate' })
    expect(findArmorByName('Placas')).toMatchObject({ key: 'plate' })
  })

  it('chave EN direta funciona (item da SRD em inglês)', () => {
    expect(findArmorByName('chain-mail')).toMatchObject({ key: 'chain-mail' })
    expect(findArmorByName('half plate')).toMatchObject({ key: 'half-plate' })
  })

  it('aceita variações de caixa e espaços', () => {
    expect(findArmorByName('  PLACA  ')).toMatchObject({ key: 'plate' })
  })

  it('null/undefined/empty retornam null sem erro', () => {
    expect(findArmorByName(null)).toBeNull()
    expect(findArmorByName(undefined)).toBeNull()
    expect(findArmorByName('')).toBeNull()
  })
})

/* ─────────────────────────────────────────────────────────────────────
 * Bug 2: evaluateMulticlassPrerequisites — parser robusto AND/OR
 * ───────────────────────────────────────────────────────────────────── */
describe('evaluateMulticlassPrerequisites — AND/OR', () => {
  const attrs = (overrides) => ({ str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10, ...overrides })

  it('reqs null/undefined: passa', () => {
    expect(evaluateMulticlassPrerequisites(attrs(), null).ok).toBe(true)
    expect(evaluateMulticlassPrerequisites(attrs(), undefined).ok).toBe(true)
  })

  it('AND com 1 chave: Bárbaro STR 13', () => {
    expect(evaluateMulticlassPrerequisites(attrs({ str: 13 }), { str: 13 }).ok).toBe(true)
    expect(evaluateMulticlassPrerequisites(attrs({ str: 12 }), { str: 13 }).ok).toBe(false)
  })

  it('AND com 2 chaves: Paladino STR 13 E CHA 13', () => {
    const reqs = { str: 13, cha: 13 }
    expect(evaluateMulticlassPrerequisites(attrs({ str: 13, cha: 13 }), reqs).ok).toBe(true)
    const r = evaluateMulticlassPrerequisites(attrs({ str: 13, cha: 10 }), reqs)
    expect(r.ok).toBe(false)
    expect(r.missing).toContain('CHA ≥ 13')
  })

  it('AND com 2 chaves: Monge DEX 13 E WIS 13', () => {
    const reqs = { dex: 13, wis: 13 }
    expect(evaluateMulticlassPrerequisites(attrs({ dex: 13, wis: 13 }), reqs).ok).toBe(true)
    const r = evaluateMulticlassPrerequisites(attrs({ dex: 13, wis: 12 }), reqs)
    expect(r.ok).toBe(false)
    expect(r.missing).toContain('WIS ≥ 13')
  })

  it('OR: Guerreiro STR 13 OU DEX 13', () => {
    const reqs = { str: 13, or: 'dex' }
    expect(evaluateMulticlassPrerequisites(attrs({ str: 13, dex: 8 }), reqs).ok).toBe(true)
    expect(evaluateMulticlassPrerequisites(attrs({ str: 8, dex: 13 }), reqs).ok).toBe(true)
    expect(evaluateMulticlassPrerequisites(attrs({ str: 12, dex: 12 }), reqs).ok).toBe(false)
  })

  it('OR com array: STR 13 OU DEX 13 OU CHA 13 (extensão futura)', () => {
    const reqs = { str: 13, or: ['dex', 'cha'] }
    expect(evaluateMulticlassPrerequisites(attrs({ cha: 13 }), reqs).ok).toBe(true)
    expect(evaluateMulticlassPrerequisites(attrs({ dex: 13 }), reqs).ok).toBe(true)
    expect(evaluateMulticlassPrerequisites(attrs({ str: 13 }), reqs).ok).toBe(true)
    expect(evaluateMulticlassPrerequisites(attrs(), reqs).ok).toBe(false)
  })

  it('mensagem de erro humana no OR', () => {
    const r = evaluateMulticlassPrerequisites(attrs(), { str: 13, or: 'dex' })
    expect(r.missing[0]).toBe('STR ≥ 13 ou DEX ≥ 13')
  })

  it('ignora chaves não-numéricas no AND', () => {
    const reqs = { str: 13, comentario: 'requer força' }
    expect(evaluateMulticlassPrerequisites(attrs({ str: 13 }), reqs).ok).toBe(true)
  })
})

/* ─────────────────────────────────────────────────────────────────────
 * Bug 3: asiOrFeatByLevel chaveado por classIndex:classLevel
 * ───────────────────────────────────────────────────────────────────── */
describe('applyLevelUp — asiOrFeatByLevel por classe', () => {
  function makeChar(overrides = {}) {
    return {
      id: 'c1',
      meta: { settings: { allowFeats: true } },
      info: {
        name: 'Heitor',
        class: 'guerreiro',
        level: 3,
        multiclasses: [],
        asiOrFeatByLevel: {},
        ...overrides.info,
      },
      attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
      combat: { maxHp: 30, currentHp: 30, tempHp: 0, armorClass: 14, speed: 30 },
      proficiencies: {},
      spellcasting: {},
      inventory: { currency: {} },
      traits: {},
    }
  }

  it('Guerreiro nível 4: chave "guerreiro:4"', () => {
    const c = makeChar()
    const next = applyLevelUp(c, {
      newLevel: 4,
      hpIncrease: 6,
      attrBoosts: { str: 2 },
    })
    expect(next.info.asiOrFeatByLevel).toEqual({ 'guerreiro:4': 'asi' })
  })

  it('Feat em vez de ASI: registra "feat"', () => {
    const c = makeChar()
    const next = applyLevelUp(c, {
      newLevel: 4,
      hpIncrease: 6,
      attrBoosts: {},
      chosenFeat: { index: 'alerta', name: 'Alerta' },
    })
    expect(next.info.asiOrFeatByLevel['guerreiro:4']).toBe('feat')
  })

  it('Multiclasse: chave usa o classIndex da MC, não a primária', () => {
    const c = makeChar({
      info: {
        class: 'guerreiro',
        level: 5,
        multiclasses: [{ class: 'mago', level: 3 }],
        asiOrFeatByLevel: { 'guerreiro:4': 'asi' },
      },
    })
    const next = applyLevelUp(c, {
      newLevel: 4,
      hpIncrease: 4,
      attrBoosts: { int: 2 },
      multiclassIndex: 0, // sobe o Mago, não o Guerreiro
    })
    expect(next.info.asiOrFeatByLevel).toEqual({
      'guerreiro:4': 'asi', // preservado
      'mago:4':       'asi', // novo
    })
  })

  it('Sem ASI/Feat: não toca asiOrFeatByLevel', () => {
    const c = makeChar({ info: { asiOrFeatByLevel: { 'guerreiro:4': 'asi' } } })
    const next = applyLevelUp(c, {
      newLevel: 5,
      hpIncrease: 6,
      attrBoosts: {},
    })
    expect(next.info.asiOrFeatByLevel).toEqual({ 'guerreiro:4': 'asi' })
  })
})

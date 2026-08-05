import { describe, it, expect } from 'vitest'
import { applyLevelUp, addMulticlass } from '../systems/dnd5e/domain/rules'

/**
 * Flags de mesa: o Mestre pode desligar multiclasse e talentos por ficha
 * (`meta.settings.allowMulticlass` / `allowFeats`). Quem decide é o domínio —
 * `useSheetHandlers` só embrulha estas duas funções no `setCharacter`.
 *
 * Este arquivo tinha 245 linhas e testava REPLICAS: uma cópia de `canAdvance`
 * (do wizard antigo, já apagado — 15 casos validando código inexistente) e
 * cópias de `applyLevelUp`/`addMulticlass` sob o rótulo "lógica real do
 * handler". As cópias já divergiam: `addMulticlass` hoje devolve
 * `{ ok, character, error, missing }`, não o personagem direto.
 */

// `combat` é obrigatório: o applyLevelUp real também soma PV ao subir de nível
// (a réplica antiga nem tocava nisso, então esse caminho nunca era exercitado).
const makeChar = (settings = {}) => ({
  info: { class: 'guerreiro', level: 4, multiclasses: [], feats: [], chosenFeatures: {} },
  attributes: { str: 16, dex: 16, con: 16, int: 16, wis: 16, cha: 16 },
  combat: { maxHp: 30, currentHp: 30, tempHp: 0, hitDice: {}, classFeatureUses: [] },
  spellcasting: { spells: [], slots: [], usedSlots: {} },
  meta: { settings },
})

describe('flag allowMulticlass', () => {
  it('true → multiclasse é adicionada', () => {
    const r = addMulticlass(makeChar({ allowMulticlass: true }), { classIndex: 'ladino' })
    expect(r.ok).toBe(true)
    expect(r.character.info.multiclasses).toHaveLength(1)
    expect(r.character.info.multiclasses[0].class).toBe('ladino')
  })

  it('false → recusa e devolve a ficha intocada', () => {
    const antes = makeChar({ allowMulticlass: false })
    const r = addMulticlass(antes, { classIndex: 'ladino' })
    expect(r.ok).toBe(false)
    expect(r.character).toBe(antes)
    expect(r.error).toMatch(/desabilitado/i)
  })

  it('ausente → padrão é permitir', () => {
    const r = addMulticlass(makeChar({}), { classIndex: 'ladino' })
    expect(r.ok).toBe(true)
    expect(r.character.info.multiclasses).toHaveLength(1)
  })
})

describe('flag allowFeats', () => {
  const talento = { index: 'alert', name: 'Alerta' }

  it('true → o talento entra na ficha ao subir de nível', () => {
    const next = applyLevelUp(makeChar({ allowFeats: true }), { newLevel: 5, chosenFeat: talento })
    expect(next.info.feats).toHaveLength(1)
    expect(next.info.feats[0].index).toBe('alert')
  })

  it('false → o talento é descartado mesmo vindo no payload', () => {
    const next = applyLevelUp(makeChar({ allowFeats: false }), { newLevel: 5, chosenFeat: talento })
    expect(next.info.feats ?? []).toHaveLength(0)
  })

  it('ausente → padrão é descartar', () => {
    const next = applyLevelUp(makeChar({}), { newLevel: 5, chosenFeat: talento })
    expect(next.info.feats ?? []).toHaveLength(0)
  })

  it('subir de nível sem talento não mexe na lista', () => {
    const next = applyLevelUp(makeChar({ allowFeats: true }), { newLevel: 5 })
    expect(next.info.feats ?? []).toHaveLength(0)
  })

  // PHB p.165: ASI e talento são mutuamente exclusivos. O domínio mantém o ASI
  // e descarta o talento — regra que a réplica antiga nem conhecia.
  it('ASI e talento juntos → mantém o ASI e descarta o talento', () => {
    const next = applyLevelUp(makeChar({ allowFeats: true }), {
      newLevel: 5,
      attrBoosts: { str: 2 },
      chosenFeat: talento,
    })
    expect(next.attributes.str).toBe(18)
    expect(next.info.feats ?? []).toHaveLength(0)
  })
})

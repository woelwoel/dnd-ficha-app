import { describe, it, expect } from 'vitest'
import { syncGrantedSpells } from '../../systems/dnd5e/domain/rules'

// Espelha a transformação que setChosenFeature deve aplicar (set + sync).
function setAndSync(prev, choiceId, value) {
  return syncGrantedSpells({
    ...prev,
    info: { ...prev.info, chosenFeatures: { ...(prev.info?.chosenFeatures ?? {}), [choiceId]: value } },
  })
}

describe('setChosenFeature deve sincronizar magias concedidas', () => {
  const ranger = { info: { class: 'patrulheiro', level: 7, chosenFeatures: {} }, spellcasting: { spells: [] } }

  it('ligar Consciência Primordial injeta as magias até o nível', () => {
    const out = setAndSync(ranger, 'ranger_primal_awareness', 'consciencia_primordial')
    expect((out.spellcasting.spells ?? []).map(s => s.index).sort())
      .toEqual(['falar-com-animais', 'sentido-bestial'].sort())
  })
  it('desligar remove', () => {
    const on = setAndSync(ranger, 'ranger_primal_awareness', 'consciencia_primordial')
    const off = setAndSync(on, 'ranger_primal_awareness', '')
    expect(off.spellcasting.spells ?? []).toEqual([])
  })
})

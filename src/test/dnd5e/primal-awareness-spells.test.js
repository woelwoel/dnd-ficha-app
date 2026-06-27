import { describe, it, expect } from 'vitest'
import { syncGrantedSpells } from '../../systems/dnd5e/domain/rules'

function ranger(level, chosen = {}, spells = []) {
  return {
    info: { class: 'patrulheiro', level, chosenFeatures: chosen },
    spellcasting: { spells },
  }
}
const indices = c => (c.spellcasting?.spells ?? []).map(s => s.index)

describe('syncGrantedSpells — Consciência Primordial (Patrulheiro)', () => {
  it('toggle ligado no nv3 injeta só Falar com Animais', () => {
    const out = syncGrantedSpells(ranger(3, { ranger_primal_awareness: 'consciencia_primordial' }))
    expect(indices(out)).toEqual(['falar-com-animais'])
    const sp = out.spellcasting.spells[0]
    expect(sp.alwaysPrepared).toBe(true)
    expect(sp.sourceLabel).toBe('Consciência Primordial')
  })

  it('no nv13 injeta as magias até o nível (3 falar-animais,5 sentido,9 plantas,13 localizar)', () => {
    const out = syncGrantedSpells(ranger(13, { ranger_primal_awareness: 'consciencia_primordial' }))
    expect(indices(out).sort()).toEqual(
      ['falar-com-animais', 'sentido-bestial', 'falar-com-plantas', 'localizar-criatura'].sort()
    )
  })

  it('é idempotente (rodar 2x não duplica)', () => {
    const once = syncGrantedSpells(ranger(5, { ranger_primal_awareness: 'consciencia_primordial' }))
    const twice = syncGrantedSpells(once)
    expect(indices(twice).sort()).toEqual(['falar-com-animais', 'sentido-bestial'].sort())
  })

  it('desligar o toggle REMOVE as magias concedidas (por tag)', () => {
    const on = syncGrantedSpells(ranger(5, { ranger_primal_awareness: 'consciencia_primordial' }))
    const off = syncGrantedSpells({ ...on, info: { ...on.info, chosenFeatures: {} } })
    expect(indices(off)).toEqual([])
  })

  it('não remove uma magia homônima adicionada manualmente (sem tag)', () => {
    const manual = ranger(5, {}, [{ index: 'falar-com-animais', name: 'Falar com Animais', level: 1 }])
    const out = syncGrantedSpells(manual)
    expect(indices(out)).toEqual(['falar-com-animais']) // intacta
  })

  it('classe não-patrulheiro nunca recebe as magias', () => {
    const mago = { info: { class: 'mago', level: 13, chosenFeatures: { ranger_primal_awareness: 'consciencia_primordial' } }, spellcasting: { spells: [] } }
    expect(indices(syncGrantedSpells(mago))).toEqual([])
  })

  it('preserva o familiar do Pacto da Corrente (não regride)', () => {
    const bruxo = { info: { class: 'bruxo', chosenFeatures: { pact_boon: 'corrente' } }, spellcasting: { spells: [] } }
    expect(indices(syncGrantedSpells(bruxo))).toContain('find-familiar')
  })
})

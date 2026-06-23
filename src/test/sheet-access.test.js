import { describe, it, expect } from 'vitest'
import { isSheetReadOnly, canOpenSheet } from '../systems/dnd5e/components/CharacterSheet/sheet-access'

describe('isSheetReadOnly', () => {
  it('dono edita a própria ficha', () => {
    expect(isSheetReadOnly({ ownerId: 'u1', currentUserId: 'u1' })).toBe(false)
  })
  it('não-dono (ex: DM lendo ficha de jogador) fica em readOnly', () => {
    expect(isSheetReadOnly({ ownerId: 'u1', currentUserId: 'u2' })).toBe(true)
  })
  it('admin em CONTEXTO admin edita ficha de qualquer dono', () => {
    expect(isSheetReadOnly({ ownerId: 'u1', currentUserId: 'u2', adminContext: true })).toBe(false)
  })
  it('admin FORA do contexto admin (jogando) não edita ficha alheia', () => {
    // is_admin não entra mais aqui — só adminContext. Sem ele, vira readOnly.
    expect(isSheetReadOnly({ ownerId: 'u1', currentUserId: 'u2', adminContext: false })).toBe(true)
  })
  it('sem ownerId/usuário não trava (ficha nova local)', () => {
    expect(isSheetReadOnly({ ownerId: null, currentUserId: 'u1' })).toBe(false)
  })
})

describe('canOpenSheet', () => {
  it('dono abre a própria ficha', () => {
    expect(canOpenSheet({ ownerId: 'u1', currentUserId: 'u1' })).toBe(true)
  })
  it('jogador comum NÃO abre ficha alheia', () => {
    expect(canOpenSheet({ ownerId: 'u1', currentUserId: 'u2' })).toBe(false)
  })
  it('DM da mesa abre ficha de membro', () => {
    expect(canOpenSheet({ ownerId: 'u1', currentUserId: 'u2', isDmHere: true })).toBe(true)
  })
  it('admin jogando como jogador (sem contexto admin) NÃO abre ficha alheia', () => {
    expect(canOpenSheet({ ownerId: 'u1', currentUserId: 'u2', isDmHere: false, adminContext: false })).toBe(false)
  })
  it('admin em contexto admin abre qualquer ficha', () => {
    expect(canOpenSheet({ ownerId: 'u1', currentUserId: 'u2', adminContext: true })).toBe(true)
  })
  it('ficha nova local (sem ownerId) é acessível', () => {
    expect(canOpenSheet({ ownerId: null, currentUserId: 'u1' })).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { isSheetReadOnly } from '../components/CharacterSheet/sheet-access'

describe('isSheetReadOnly', () => {
  it('dono edita a própria ficha', () => {
    expect(isSheetReadOnly({ ownerId: 'u1', currentUserId: 'u1', isAdmin: false })).toBe(false)
  })
  it('não-dono fica em readOnly', () => {
    expect(isSheetReadOnly({ ownerId: 'u1', currentUserId: 'u2', isAdmin: false })).toBe(true)
  })
  it('admin edita ficha de qualquer dono', () => {
    expect(isSheetReadOnly({ ownerId: 'u1', currentUserId: 'u2', isAdmin: true })).toBe(false)
  })
  it('sem ownerId/usuário não trava (ficha nova local)', () => {
    expect(isSheetReadOnly({ ownerId: null, currentUserId: 'u1', isAdmin: false })).toBe(false)
  })
})

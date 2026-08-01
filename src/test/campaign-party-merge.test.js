import { describe, it, expect } from 'vitest'
import { mergeParty } from '../lib/campaignParty'

const membroMestre = {
  user_id: 'u1', role: 'dm', profiles: { display_name: 'Gustavo', avatar_url: null },
}
const membroAna = {
  user_id: 'u2', role: 'player', profiles: { display_name: 'Ana', avatar_url: 'a.png' },
}
const membroBruno = {
  user_id: 'u3', role: 'player', profiles: { display_name: 'Bruno', avatar_url: null },
}

function ficha(id, ownerId, nome, extra = {}) {
  return {
    id, owner_id: ownerId, short_id: `S${id}`,
    data: { info: { name: nome, race: 'elfo', class: 'ladino', level: 5 }, combat: { currentHp: 30, maxHp: 34 } },
    ...extra,
  }
}

describe('mergeParty', () => {
  it('casa ficha e membro pelo dono', () => {
    const { rows } = mergeParty([membroAna], [ficha('c1', 'u2', 'Sahir')], { currentUserId: 'u1' })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ userId: 'u2', displayName: 'Ana', role: 'player', isSelf: false })
    expect(rows[0].characters.map(c => c.name)).toEqual(['Sahir'])
  })

  it('membro sem ficha continua na lista', () => {
    const { rows } = mergeParty([membroAna, membroBruno], [ficha('c1', 'u2', 'Sahir')], {})

    expect(rows.map(r => r.displayName)).toEqual(['Ana', 'Bruno'])
    expect(rows[1].characters).toEqual([])
  })

  it('agrupa duas fichas do mesmo dono sem escolher uma em silêncio', () => {
    const { rows } = mergeParty(
      [membroAna],
      [ficha('c1', 'u2', 'Sahir'), ficha('c2', 'u2', 'Teste')],
      {},
    )

    expect(rows[0].characters.map(c => c.name)).toEqual(['Sahir', 'Teste'])
  })

  it('ficha de quem não é mais membro sai separada', () => {
    const { rows, orphanCharacters } = mergeParty(
      [membroAna],
      [ficha('c1', 'u2', 'Sahir'), ficha('c9', 'u404', 'Esquecido')],
      {},
    )

    expect(rows).toHaveLength(1)
    expect(orphanCharacters.map(c => c.name)).toEqual(['Esquecido'])
  })

  it('marca quem é o próprio usuário e põe o Mestre primeiro', () => {
    const { rows } = mergeParty([membroAna, membroMestre], [], { currentUserId: 'u2' })

    expect(rows[0]).toMatchObject({ role: 'dm', displayName: 'Gustavo' })
    expect(rows.find(r => r.userId === 'u2').isSelf).toBe(true)
  })

  it('usuário sem nome de perfil cai no prefixo do id, não em vazio', () => {
    const { rows } = mergeParty(
      [{ user_id: 'abcdefgh-1234', role: 'player', profiles: null }],
      [], {},
    )

    expect(rows[0].displayName).toBe('abcdefgh…')
  })

  it('aceita o formato do roster (camelCase, sem owner_id) do lado do jogador', () => {
    const doRoster = [{ id: 'c1', ownerId: 'u2', shortId: 'X', info: { name: 'Sahir', race: 'elfo', class: 'ladino', level: 5 }, combat: { currentHp: 30, maxHp: 34 } }]

    const { rows } = mergeParty([membroAna], doRoster, {})

    expect(rows[0].characters[0]).toMatchObject({ name: 'Sahir', level: 5, currentHp: 30 })
  })

  it('não quebra quando a leitura de fichas falhou e veio vazia', () => {
    const { rows, orphanCharacters } = mergeParty([membroAna], [], {})

    expect(rows[0].characters).toEqual([])
    expect(orphanCharacters).toEqual([])
  })
})

import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SetupPanel } from '../systems/dnd5e/components/Encounter/SetupPanel'

vi.mock('../systems/dnd5e/components/Bestiary/BestiaryModal', () => ({
  BestiaryModal: ({ isOpen, onPick }) => isOpen
    ? <button onClick={() => onPick({ index: 'goblin', name: 'Goblin', hit_points: 7, dexterity: 14, xp: 50, armor_class: [{ value: 15 }] })}>stub-add-goblin</button>
    : null,
}))

const tpl = vi.hoisted(() => ({ list: [] }))
vi.mock('../lib/encounterTemplates', () => ({
  listTemplates: vi.fn(async () => tpl.list),
}))

vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useLazySrdDataset: () => ([{ index: 'goblin', name: 'Goblin', hit_points: 7, dexterity: 14, xp: 50, armor_class: [{ value: 15 }] }]),
}))

const party = [
  { characterId: 'a', name: 'Ana',   initiativeBonus: 2 },
  { characterId: 'b', name: 'Bruno', initiativeBonus: 0 },
]

function setup(props = {}) {
  const onStart = vi.fn()
  const utils = render(
    <SetupPanel party={party} onStart={onStart} rng={() => 0.5} {...props} />,
  )
  return { onStart, ...utils }
}

describe('SetupPanel', () => {
  it('lista a companhia com todos marcados', () => {
    setup()
    expect(screen.getByLabelText('Ana')).toBeChecked()
    expect(screen.getByLabelText('Bruno')).toBeChecked()
  })

  it('desmarcar tira o PJ do combate montado', async () => {
    const { onStart } = setup()
    await userEvent.click(screen.getByLabelText('Bruno'))
    await userEvent.click(screen.getByRole('button', { name: /rolar iniciativa/i }))
    const state = onStart.mock.calls[0][0]
    expect(state.combatants.map(c => c.name)).toEqual(['Ana'])
  })

  it('adiciona monstro pelo bestiário e mostra na lista da cena', async () => {
    setup()
    await userEvent.click(screen.getByRole('button', { name: /adicionar monstros/i }))
    await userEvent.click(screen.getByText('stub-add-goblin'))
    await userEvent.click(screen.getByText('stub-add-goblin'))
    expect(screen.getByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText('Goblin 2')).toBeInTheDocument()
  })

  it('rolar iniciativa entrega o state já iniciado e ordenado', async () => {
    const { onStart } = setup()
    await userEvent.click(screen.getByRole('button', { name: /rolar iniciativa/i }))
    const state = onStart.mock.calls[0][0]
    expect(state.started).toBe(true)
    expect(state.round).toBe(1)
    // d20 = 11 pra todos → Ana (+2) na frente de Bruno (+0)
    expect(state.combatants.map(c => c.name)).toEqual(['Ana', 'Bruno'])
    expect(state.activeId).toBe(state.combatants[0].id)
  })

  it('sem ninguém na cena o botão fica desabilitado', async () => {
    setup({ party: [] })
    expect(screen.getByRole('button', { name: /rolar iniciativa/i })).toBeDisabled()
  })

  it('mostra a dificuldade contra quem está marcado na cena', async () => {
    const { rerender } = render(
      <SetupPanel
        party={[
          { characterId: 'a', name: 'Ana', initiativeBonus: 2, level: 3 },
          { characterId: 'b', name: 'Bruno', initiativeBonus: 0, level: 3 },
        ]}
        onStart={() => {}}
        rng={() => 0.5}
      />,
    )
    void rerender
    // Sem monstros ainda.
    expect(screen.getByText(/sem monstros/i)).toBeInTheDocument()
  })

  it('desmarcar um PJ muda a companhia usada no medidor', async () => {
    render(
      <SetupPanel
        party={[
          { characterId: 'a', name: 'Ana', initiativeBonus: 2, level: 3 },
          { characterId: 'b', name: 'Bruno', initiativeBonus: 0, level: 3 },
        ]}
        onStart={() => {}}
        rng={() => 0.5}
      />,
    )
    expect(screen.getByLabelText(/quantidade de personagens/i)).toHaveValue(2)
    await userEvent.click(screen.getByLabelText('Bruno'))
    expect(screen.getByLabelText(/quantidade de personagens/i)).toHaveValue(1)
  })

  it('sem encontros salvos não oferece carregar', async () => {
    tpl.list = []
    setup()
    await waitFor(() => expect(screen.queryByRole('button', { name: /carregar encontro salvo/i })).toBeNull())
  })

  it('carregar um salvo injeta os monstros na cena', async () => {
    tpl.list = [{ id: 't1', name: 'Emboscada', monsters: [{ monsterIndex: 'goblin', count: 2 }] }]
    setup({ campaignId: 'camp-1' })
    await userEvent.click(await screen.findByRole('button', { name: /carregar encontro salvo/i }))
    await userEvent.click(screen.getByRole('button', { name: /^emboscada$/i }))
    expect(await screen.findByText('Goblin')).toBeInTheDocument()
    expect(screen.getByText('Goblin 2')).toBeInTheDocument()
  })
})

describe('SetupPanel — preload da biblioteca', () => {
  it('carrega o encontro pedido pelo id assim que o catálogo resolve', async () => {
    tpl.list = [{ id: 't1', name: 'Emboscada', monsters: [{ monsterIndex: 'goblin', count: 2 }] }]
    render(<SetupPanel party={party} campaignId="camp-1" preloadId="t1" onStart={() => {}} />)

    expect(await screen.findByText(/"Emboscada" carregado/i)).toBeInTheDocument()
    expect(await screen.findByText(/monstros \(2\)/i)).toBeInTheDocument()
  })

  it('id que não existe mais avisa em vez de abrir vazio em silêncio', async () => {
    tpl.list = []
    render(<SetupPanel party={party} campaignId="camp-1" preloadId="sumiu" onStart={() => {}} />)

    expect(await screen.findByText(/não existe mais/i)).toBeInTheDocument()
  })
})

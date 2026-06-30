import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Inventory } from '../../systems/dnd5e/components/CharacterSheet/Inventory'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { getActiveMagicEffects, getEffectiveAttributes } from '../../systems/dnd5e/domain/magicItems'
import { mockSrdFetch } from './helpers'

/* ─────────────────────────────────────────────────────────────────────
   E2E — Itens Mágicos + Atunement

   Cobre:
   - Painel "Efeitos Mágicos Ativos" computa CA/Saves/atributos.
   - Toggle de atunamento liga/desliga efeitos.
   - Limite de 3 itens atunados bloqueia o 4º.
   - getEffectiveAttributes em integração: Cinto de Força do Gigante
     altera FOR efetiva usada nos cálculos derivados.
   ────────────────────────────────────────────────────────────────────*/

function makeInventory(items = []) {
  return {
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    items: items.map((it, i) => ({ id: it.id ?? `i-${i}`, qty: 1, ...it })),
  }
}

function Controlled({ initialInventory, attributes = { str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 8 } }) {
  const [inventory, setInventory] = useState(initialInventory)
  // Inventory agora lê o catálogo de itens via useLazySrdDataset → precisa do
  // SrdProvider em volta (o fetch é servido por mockSrdFetch no beforeEach).
  return (
    <SrdProvider>
      <Inventory
        inventory={inventory}
        attributes={attributes}
        onUpdateCurrency={(k, v) => setInventory(prev => ({ ...prev, currency: { ...prev.currency, [k]: v } }))}
        onAddItem={(item) => setInventory(prev => ({ ...prev, items: [...prev.items, { id: `new-${prev.items.length}`, ...item }] }))}
        onRemoveItem={(id) => setInventory(prev => ({ ...prev, items: prev.items.filter(i => i.id !== id) }))}
        onUpdateItem={(id, patch) => setInventory(prev => ({
          ...prev,
          items: prev.items.map(i => i.id === id ? { ...i, ...patch } : i),
        }))}
      />
    </SrdProvider>
  )
}

describe('Magic Items E2E', () => {
  beforeEach(() => {
    mockSrdFetch()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('atunar Anel de Proteção → painel mostra CA +1 e Saves +1; contador 1/3', async () => {
    const user = userEvent.setup()
    const inv = makeInventory([
      {
        id: 'anel', name: 'Anel de Proteção', requiresAttunement: true, attuned: false,
        magicItemIndex: 'anel-protecao', rarity: 'raro',
        effects: [{ type: 'ac', value: 1 }, { type: 'saves', value: 1 }],
      },
    ])
    render(<Controlled initialInventory={inv} />)

    // Painel "Efeitos Mágicos Ativos" ainda não está visível (item não atunado)
    expect(screen.queryByText(/Efeitos M[áa]gicos Ativos/)).not.toBeInTheDocument()
    expect(screen.getByText('0/3')).toBeInTheDocument()

    // Clicar no botão de atunar (○) na linha do anel
    const btnAtunar = screen.getAllByTitle(/^Atunar$/i)[0]
    await user.click(btnAtunar)

    // Contador deve virar 1/3
    await waitFor(() => {
      expect(screen.getByText('1/3')).toBeInTheDocument()
    })

    // Painel agora visível com CA +1 e Saves +1
    expect(screen.getByText(/Efeitos M[áa]gicos Ativos/)).toBeInTheDocument()
    expect(screen.getByText('CA +1')).toBeInTheDocument()
    expect(screen.getByText('Saves +1')).toBeInTheDocument()
  })

  it('desatunar item remove os efeitos do painel', async () => {
    const user = userEvent.setup()
    const inv = makeInventory([
      {
        id: 'anel', name: 'Anel de Proteção', requiresAttunement: true, attuned: true,
        magicItemIndex: 'anel-protecao', rarity: 'raro',
        effects: [{ type: 'ac', value: 1 }, { type: 'saves', value: 1 }],
      },
    ])
    render(<Controlled initialInventory={inv} />)

    // Painel inicial mostra os efeitos
    expect(screen.getByText('CA +1')).toBeInTheDocument()

    // Clicar no 💎 para desatunar
    const btnDesatunar = screen.getAllByTitle(/Remover atunamento/i)[0]
    await user.click(btnDesatunar)

    // Painel some
    await waitFor(() => {
      expect(screen.queryByText('CA +1')).not.toBeInTheDocument()
    })
    expect(screen.getByText('0/3')).toBeInTheDocument()
  })

  it('limite de 3 atunados — botão do 4º item fica desabilitado', async () => {
    const inv = makeInventory([
      { id: 'a', name: 'Anel A', requiresAttunement: true, attuned: true,  effects: [] },
      { id: 'b', name: 'Anel B', requiresAttunement: true, attuned: true,  effects: [] },
      { id: 'c', name: 'Anel C', requiresAttunement: true, attuned: true,  effects: [] },
      { id: 'd', name: 'Anel D', requiresAttunement: true, attuned: false, effects: [] },
    ])
    render(<Controlled initialInventory={inv} />)

    expect(screen.getByText('3/3')).toBeInTheDocument()

    // Procurar o botão de atunar do Anel D — deve estar desabilitado.
    // Em mobile e desktop o título muda quando limite atingido.
    const btnsLimite = screen.getAllByTitle(/Limite atingido/i)
    expect(btnsLimite.length).toBeGreaterThan(0)
    btnsLimite.forEach(b => expect(b).toBeDisabled())
  })

  it('Cinto de Força do Gigante atunado → getEffectiveAttributes muda FOR para 27', () => {
    // Integração da engine: o Inventory exibe o painel, mas a regra de
    // atributo efetivo é consumida no hook central. Aqui validamos a
    // engine pura (sem precisar montar a ficha inteira).
    const items = [
      {
        id: 'cinto', name: 'Cinto de Força do Gigante das Nuvens',
        requiresAttunement: true, attuned: true,
        magicItemIndex: 'cinto-forca-gigante-nuvem', rarity: 'lendario',
        effects: [{ type: 'attrSet', ability: 'str', value: 27 }],
      },
    ]
    const effects = getActiveMagicEffects(items)
    expect(effects.attrSet.str).toBe(27)

    const effective = getEffectiveAttributes({ str: 14, dex: 12, con: 13, int: 10, wis: 10, cha: 8 }, effects)
    expect(effective.str).toBe(27)

    // Modificador esperado: floor((27-10)/2) = 8
    // (calculo feito pelo getModifier no hook real)
  })

  it('painel agrega FOR de Cinto + Resistência de Anel', async () => {
    const inv = makeInventory([
      {
        id: 'cinto', name: 'Cinto de Força', requiresAttunement: true, attuned: true,
        rarity: 'raro', effects: [{ type: 'attrSet', ability: 'str', value: 21 }],
      },
      {
        id: 'anel-fogo', name: 'Anel de Resistência (Fogo)', requiresAttunement: true, attuned: true,
        rarity: 'raro', effects: [{ type: 'resistance', damage: 'fogo' }],
      },
    ])
    render(<Controlled initialInventory={inv} />)

    expect(screen.getByText('STR 21')).toBeInTheDocument()
    expect(screen.getByText(/Resist[êe]ncia:\s*fogo/i)).toBeInTheDocument()
  })
})

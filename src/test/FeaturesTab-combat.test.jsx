import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FeaturesTab } from '../components/CharacterSheet/FeaturesTab'

// Fixture mínima de progressão (Ladino nv 5): âncora Ataque Furtivo + ruído ASI.
const PROGRESSION = {
  ladino: {
    name: 'Ladino',
    levels: [
      { level: 1, features: [
        { name: 'Ataque Furtivo (1d6)', desc: 'Dano extra 1x por turno.', combat: 'essencial' },
        { name: 'Gíria dos Ladrões', desc: 'Idioma secreto.', category: 'social' },
      ] },
      { level: 3, features: [
        { name: 'Ataque Furtivo (2d6)', desc: 'Aumenta para 2d6.', combat: 'essencial' },
        { name: 'Característica do Arquétipo de Gatuno', desc: 'Você recebe uma característica do seu arquétipo.', subclass: true },
        // Feature ancorada em escolha (choice_id) MAS marcada como combate:
        // não pode ser tratada como placeholder genérico.
        { name: 'Estilo de Combate', desc: 'Escolha um estilo.', choice_id: 'fighting_style', combat: 'essencial' },
      ] },
      { level: 4, features: [
        { name: 'Aumento de Atributo', desc: 'Suba atributos.' },
      ] },
      { level: 5, features: [
        { name: 'Ataque Furtivo (3d6)', desc: 'Aumenta para 3d6.', combat: 'essencial' },
        { name: 'Esquiva Instintiva', desc: 'Como reação, reduz dano pela metade.', combat: 'essencial' },
        { name: 'Sentido Cego', desc: 'Percebe invisíveis a 3m.', combat: 'situacional' },
      ] },
    ],
  },
  barbaro: {
    name: 'Bárbaro',
    levels: [
      { level: 1, features: [
        { name: 'Fúria', desc: 'Como ação bônus, você entra em fúria.', combat: 'essencial' },
      ] },
    ],
  },
}

// Raça Draconato: traço de combate (heurística "Como ação") + traço passivo.
const RACES = [
  { index: 'draconato', name: 'Draconato', traits: [
    { name: 'Sopro do Dragão', desc: 'Como ação, você exala energia destrutiva.' },
    { name: 'Resistência a Dano', desc: 'Você tem resistência ao tipo de dano da sua ascendência.' },
  ] },
]

vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useSrd: () => ({ progression: PROGRESSION, races: RACES, classChoices: {} }),
  useLazySrdDataset: () => [],
}))

const character = { info: { class: 'ladino', level: 5, race: 'draconato', multiclasses: [], feats: [], chosenFeatures: {} } }

describe('FeaturesTab — aba Combate', () => {
  it('abre na aba Combate por padrão e mostra a feature essencial', () => {
    render(<FeaturesTab character={character} featureUses={[]} />)
    expect(screen.getByRole('button', { name: /Combate/i })).toBeInTheDocument()
    expect(screen.getByText(/Ataque Furtivo/i)).toBeInTheDocument()
  })

  it('feature de combate passiva mostra selo "Passiva" (não "Ação")', () => {
    // Ataque Furtivo (essencial, desc sem verbo de ação) → tipo "passiva".
    render(<FeaturesTab character={character} featureUses={[]} />)
    const card = screen.getByText(/Ataque Furtivo/i).closest('.border')
    expect(card).toHaveTextContent(/Passiva/)
    expect(card).not.toHaveTextContent(/Ação/)
  })

  it('colapsa variantes escalonadas: só um Ataque Furtivo, com o valor do nível atual', () => {
    // Ladino nv 5: (1d6)/(2d6)/(3d6) viram um único card "(3d6)".
    render(<FeaturesTab character={character} featureUses={[]} />)
    expect(screen.getByText('Ataque Furtivo (3d6)')).toBeInTheDocument()
    expect(screen.queryByText('Ataque Furtivo (1d6)')).not.toBeInTheDocument()
    expect(screen.queryByText('Ataque Furtivo (2d6)')).not.toBeInTheDocument()
    // descrição preserva as regras completas do 1º nível, não só "Aumenta para 3d6"
    const card = screen.getByText('Ataque Furtivo (3d6)').closest('.border')
    expect(card).toHaveTextContent(/Dano extra 1x por turno/)
  })

  it('na aba Combate mostra só features de combate, não as de habilidades', () => {
    render(<FeaturesTab character={character} featureUses={[]} />)
    // Segunda feature de combate aparece
    expect(screen.getByText(/Esquiva Instintiva/i)).toBeInTheDocument()
    // Features não-combate não vazam pra aba Combate
    expect(screen.queryByText(/Gíria dos Ladrões/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Aumento de Atributo/i)).not.toBeInTheDocument()
  })

  it('segmenta essencial vs situacional', async () => {
    const user = userEvent.setup()
    render(<FeaturesTab character={character} featureUses={[]} />)
    // Essencial (padrão): Ataque Furtivo visível, Sentido Cego não
    expect(screen.getByText(/Ataque Furtivo/i)).toBeInTheDocument()
    expect(screen.queryByText(/Sentido Cego/i)).not.toBeInTheDocument()
    // Trocar pro segmento Situacional
    await user.click(screen.getByRole('button', { name: /Situacional/i }))
    expect(screen.getByText(/Sentido Cego/i)).toBeInTheDocument()
    expect(screen.queryByText(/Ataque Furtivo/i)).not.toBeInTheDocument()
  })

  it('talentos aparecem na aba Combate como Situacional (e seguem em Habilidades)', async () => {
    const user = userEvent.setup()
    const comFeat = { info: {
      class: 'ladino', level: 5, race: 'draconato', multiclasses: [],
      feats: [{ index: 'sentinela', name: 'Sentinela', desc: 'Como reação, você ataca quem sai do seu alcance.' }],
      chosenFeatures: {},
    } }
    render(<FeaturesTab character={comFeat} featureUses={[]} />)
    // Essencial não mostra o talento
    expect(screen.queryByText('Sentinela')).not.toBeInTheDocument()
    // Situacional mostra
    await user.click(screen.getByRole('button', { name: /Situacional/i }))
    expect(screen.getByText('Sentinela')).toBeInTheDocument()
    // E continua em Habilidades → Talentos
    await user.click(screen.getByRole('button', { name: /Habilidades/i }))
    expect(screen.getByText('Sentinela')).toBeInTheDocument()
    expect(screen.getByText(/^Talentos$/i)).toBeInTheDocument()
  })

  it('tier Situacional vazio mostra aviso com dica de nível', async () => {
    const user = userEvent.setup()
    // Bárbaro nv 1: só tem Fúria (essencial), nada situacional, sem talentos.
    const barb = { info: { class: 'barbaro', level: 1, race: '', multiclasses: [], feats: [], chosenFeatures: {} } }
    render(<FeaturesTab character={barb} featureUses={[]} />)
    await user.click(screen.getByRole('button', { name: /Situacional/i }))
    expect(screen.getByText(/níveis mais altos/i)).toBeInTheDocument()
  })

  it('feature de combate ancorada em escolha (choice_id) aparece mesmo sem escolha feita', () => {
    render(<FeaturesTab character={character} featureUses={[]} />)
    // "Estilo de Combate" tem choice_id mas é combat:essencial → não é placeholder
    expect(screen.getByText('Estilo de Combate')).toBeInTheDocument()
  })

  it('placeholder de subclasse não-resolvido não vaza pra nenhuma aba', async () => {
    const user = userEvent.setup()
    render(<FeaturesTab character={character} featureUses={[]} />)
    // Aba Combate (padrão): placeholder genérico não aparece
    expect(screen.queryByText(/Característica do Arquétipo de Gatuno/i)).not.toBeInTheDocument()
    // Troca pra Habilidades: também não aparece
    await user.click(screen.getByRole('button', { name: /Habilidades/i }))
    expect(screen.queryByText(/Característica do Arquétipo de Gatuno/i)).not.toBeInTheDocument()
  })

  it('traço racial de combate (heurística) aparece em Combate; passivo fica em Habilidades', async () => {
    const user = userEvent.setup()
    render(<FeaturesTab character={character} featureUses={[]} />)

    // Aba Combate (padrão): traço racial com "Como ação" é detectado pela heurística
    expect(screen.getByText(/Sopro do Dragão/i)).toBeInTheDocument()
    // Traço racial passivo NÃO aparece em Combate
    expect(screen.queryByText(/Resistência a Dano/i)).not.toBeInTheDocument()

    // Troca pra Habilidades
    await user.click(screen.getByRole('button', { name: /Habilidades/i }))

    // Traço passivo aparece em Traços Raciais
    expect(screen.getByText(/Resistência a Dano/i)).toBeInTheDocument()
    // O traço de combate não deve estar duplicado em Habilidades
    expect(screen.queryByText(/Sopro do Dragão/i)).not.toBeInTheDocument()
  })
})

describe('FeaturesTab — tracker inline na aba Combate', () => {
  const barbaro = { info: { class: 'barbaro', level: 1, race: '', multiclasses: [], feats: [], chosenFeatures: {} } }

  it('Fúria mostra o contador de usos inline mesmo com id de recurso divergente', () => {
    // O recurso da Fúria tem id "barbaro-rage" (≠ id da feature). O useId liga os dois.
    const featureUses = [{ id: 'barbaro-rage', name: 'Fúria', max: 3, used: 1, recharge: 'long' }]
    render(<FeaturesTab character={barbaro} featureUses={featureUses} />)
    expect(screen.getByText('Fúria')).toBeInTheDocument()
    // ActionCard mostra "restantes/max" = (3-1)/3 = 2/3
    expect(screen.getByText('2/3')).toBeInTheDocument()
  })

  it('gastar um uso da Fúria chama onSpend com o id do recurso (barbaro-rage)', async () => {
    const user = userEvent.setup()
    const onSpend = vi.fn()
    const featureUses = [{ id: 'barbaro-rage', name: 'Fúria', max: 3, used: 0, recharge: 'long' }]
    render(<FeaturesTab character={barbaro} featureUses={featureUses} onSpend={onSpend} />)
    await user.click(screen.getByRole('button', { name: /Gastar uso/i }))
    expect(onSpend).toHaveBeenCalledWith('barbaro-rage')
  })
})

describe('FeaturesTab — aba Recursos (pools grandes)', () => {
  it('pool grande (Imposição das Mãos 65) usa stepper, não 65 caixinhas', async () => {
    const user = userEvent.setup()
    const featureUses = [
      { id: 'lay', name: 'Imposição das Mãos', max: 65, used: 0, recharge: 'long' },
      { id: 'rage', name: 'Fúria', max: 3, used: 0, recharge: 'long' },
    ]
    render(<FeaturesTab character={character} featureUses={featureUses} />)
    await user.click(screen.getByRole('button', { name: /Recursos/i }))

    expect(screen.getByText('65/65')).toBeInTheDocument()
    // O pool grande tem UM botão "Gastar uso" (stepper); as caixinhas da Fúria
    // têm aria-label numerado ("Gastar uso 1"), então o match exato é só o stepper.
    expect(screen.getAllByRole('button', { name: /^Gastar uso$/ })).toHaveLength(1)
    // A Fúria (max 3) continua em caixinhas: 3 botões "Gastar uso N"
    expect(screen.getAllByRole('button', { name: /^Gastar uso \d+$/ })).toHaveLength(3)
  })

  it('stepper do pool grande gasta um ponto via onSpend', async () => {
    const user = userEvent.setup()
    const onSpend = vi.fn()
    const featureUses = [{ id: 'lay', name: 'Imposição das Mãos', max: 65, used: 0, recharge: 'long' }]
    render(<FeaturesTab character={character} featureUses={featureUses} onSpend={onSpend} />)
    await user.click(screen.getByRole('button', { name: /Recursos/i }))
    await user.click(screen.getByRole('button', { name: /^Gastar uso$/ }))
    expect(onSpend).toHaveBeenCalledWith('lay')
  })
})

describe('FeaturesTab — aba Habilidades', () => {
  it('agrupa não-combate por categoria e esconde Aumento de Atributo', async () => {
    const user = userEvent.setup()
    render(<FeaturesTab character={character} featureUses={[]} />)
    await user.click(screen.getByRole('button', { name: /Habilidades/i }))
    // Gíria dos Ladrões (social) aparece
    expect(screen.getByText(/Gíria dos Ladrões/i)).toBeInTheDocument()
    // Cabeçalho de seção Social & Conhecimento
    expect(screen.getByText(/Social & Conhecimento/i)).toBeInTheDocument()
    // ASI não aparece
    expect(screen.queryByText(/^Aumento de Atributo$/i)).not.toBeInTheDocument()
  })
})

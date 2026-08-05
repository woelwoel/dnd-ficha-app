import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SrdSearchModal } from '../systems/dnd5e/components/SrdSearchModal'
import { SpellDetailModal } from '../systems/dnd5e/components/SpellDetailModal'

/* ─────────────────────────────────────────────────────────────────────────
   Acessibilidade — SrdSearchModal
   ──────────────────────────────────────────────────────────────────────── */
describe('SrdSearchModal — acessibilidade', () => {
  const items = [
    { index: 'bola-de-fogo', name: 'Bola de Fogo' },
    { index: 'missil-magico', name: 'Míssil Mágico' },
  ]
  const noop = () => {}

  function renderOpen(overrides = {}) {
    return render(
      <SrdSearchModal
        isOpen
        onClose={noop}
        title="Buscar Magia"
        items={items}
        onSelect={noop}
        renderItem={item => item.name}
        {...overrides}
      />
    )
  }

  it('não renderiza nada quando isOpen=false', () => {
    render(
      <SrdSearchModal
        isOpen={false}
        onClose={noop}
        title="Buscar Magia"
        items={items}
        onSelect={noop}
        renderItem={item => item.name}
      />
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renderiza com role="dialog"', () => {
    renderOpen()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('dialog tem aria-modal="true"', () => {
    renderOpen()
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('dialog tem aria-labelledby apontando para o título', () => {
    renderOpen()
    const dialog = screen.getByRole('dialog')
    const labelId = dialog.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    const titleEl = document.getElementById(labelId)
    expect(titleEl).toBeInTheDocument()
    expect(titleEl.textContent).toMatch(/Buscar Magia/i)
  })

  it('botão de fechar tem aria-label', () => {
    renderOpen()
    expect(screen.getByLabelText(/fechar/i)).toBeInTheDocument()
  })

  it('chama onClose ao pressionar Escape', async () => {
    const onClose = vi.fn()
    renderOpen({ onClose })
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('exibe itens disponíveis', () => {
    renderOpen()
    expect(screen.getByText('Bola de Fogo')).toBeInTheDocument()
    expect(screen.getByText('Míssil Mágico')).toBeInTheDocument()
  })
})

/* ─────────────────────────────────────────────────────────────────────────
   Acessibilidade — SpellDetailModal
   ──────────────────────────────────────────────────────────────────────── */
describe('SpellDetailModal — acessibilidade', () => {
  const spell = {
    name: 'Bola de Fogo',
    level: 3,
    school: 'Evocação',
    desc: 'Uma esfera de fogo explode.',
    ritual: false,
    concentration: false,
  }
  const noop = () => {}

  it('não renderiza nada quando spell=null', () => {
    render(<SpellDetailModal spell={null} onClose={noop} />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renderiza com role="dialog"', () => {
    render(<SpellDetailModal spell={spell} onClose={noop} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('dialog tem aria-modal="true"', () => {
    render(<SpellDetailModal spell={spell} onClose={noop} />)
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
  })

  it('dialog tem aria-labelledby apontando para o nome da magia', () => {
    render(<SpellDetailModal spell={spell} onClose={noop} />)
    const dialog = screen.getByRole('dialog')
    const labelId = dialog.getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    const titleEl = document.getElementById(labelId)
    expect(titleEl).toBeInTheDocument()
    expect(titleEl.textContent).toMatch(/Bola de Fogo/i)
  })

  it('botão de fechar tem aria-label descritivo', () => {
    render(<SpellDetailModal spell={spell} onClose={noop} />)
    expect(screen.getByLabelText(/fechar detalhes/i)).toBeInTheDocument()
  })

  it('chama onClose ao pressionar Escape', async () => {
    const onClose = vi.fn()
    render(<SpellDetailModal spell={spell} onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('exibe o nome da magia', () => {
    render(<SpellDetailModal spell={spell} onClose={noop} />)
    expect(screen.getByText('Bola de Fogo')).toBeInTheDocument()
  })

  it('exibe nível em formato PT-BR', () => {
    render(<SpellDetailModal spell={spell} onClose={noop} />)
    expect(screen.getByText(/3º nível/i)).toBeInTheDocument()
  })

  it('truque exibe "Truque"', () => {
    render(<SpellDetailModal spell={{ ...spell, level: 0 }} onClose={noop} />)
    expect(screen.getByText(/Truque/i)).toBeInTheDocument()
  })
})

/* ─────────────────────────────────────────────────────────────────────────
   Bônus de proficiência usa o nível TOTAL (PHB p.163: multiclasse soma os
   níveis de todas as classes para proficiência).

   Este bloco chamava uma reimplementação local da soma e se dizia teste da
   CharacterView — um componente que já não tinha importador e foi apagado.
   Agora bate no caminho real da ficha: useCharacterCalculations, que é quem
   entrega `calc.profBonus` para salvaguardas, perícias, CD de magia e ataques.
   ──────────────────────────────────────────────────────────────────────── */
import { renderHook } from '@testing-library/react'
import { useCharacterCalculations } from '../systems/dnd5e/hooks/useCharacterCalculations'

describe('profBonus usa o nível total (multiclasse)', () => {
  function fichaCom(level, multiclasses = []) {
    return {
      info: { name: 'M', class: 'guerreiro', level, race: 'humano', multiclasses, chosenFeatures: {} },
      attributes: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
      combat: {
        maxHp: 20, currentHp: 20, tempHp: 0, armorClass: 12, speed: 9, activeEffects: [],
        concentrating: { spellIndex: null, spellName: null }, deathSaves: { successes: 0, failures: 0 },
      },
      proficiencies: { savingThrows: [], skills: [], expertiseSkills: [], armor: [] },
      spellcasting: { ability: null, usedSlots: {}, pactSlotsUsed: 0, spells: [] },
      inventory: { currency: {}, items: [] },
      traits: {},
    }
  }

  function profDe(level, multiclasses = []) {
    return renderHook(() => useCharacterCalculations(fichaCom(level, multiclasses))).result.current.profBonus
  }

  it('monoclasse nível 3 → +2', () => {
    expect(profDe(3, [])).toBe(2)
  })

  it('guerreiro 3 / mago 2 (total 5) → +3, não +2 do nível primário', () => {
    expect(profDe(3, [{ level: 2 }])).toBe(3)
  })

  it('nível primário 1 / multiclasse 8 (total 9) → +4', () => {
    expect(profDe(1, [{ level: 8 }])).toBe(4)
  })

  it('nível primário 4 sem multiclasse → +2', () => {
    expect(profDe(4)).toBe(2)
  })

  it('nível primário 4 / multiclasse 4 (total 8) → +3', () => {
    expect(profDe(4, [{ level: 4 }])).toBe(3)
  })

  it('nível primário 10 / multiclasse 7 (total 17) → +6', () => {
    expect(profDe(10, [{ level: 7 }])).toBe(6)
  })
})

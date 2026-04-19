import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SrdSearchModal } from '../components/SrdSearchModal'
import { SpellDetailModal } from '../components/SpellDetailModal'

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
   CharacterView — profBonus com nível total (multiclasse)
   Testa a lógica de cálculo extraída (sem render do componente inteiro)
   ──────────────────────────────────────────────────────────────────────── */
import { getProficiencyBonus } from '../utils/calculations'

describe('CharacterView — profBonus usa nível total', () => {
  function calcProfView(infoLevel, multiclasses = []) {
    const totalLevel = infoLevel + (multiclasses ?? []).reduce((s, m) => s + (m.level ?? 0), 0)
    return getProficiencyBonus(totalLevel)
  }

  it('monoclasse nível 3 → +2', () => {
    expect(calcProfView(3, [])).toBe(2)
  })

  it('guerreiro 3 / mago 2 (total 5) → +3, não +2 do nível primário', () => {
    expect(calcProfView(3, [{ level: 2 }])).toBe(3)
  })

  it('nível primário 1 / multiclasse 8 (total 9) → +4', () => {
    expect(calcProfView(1, [{ level: 8 }])).toBe(4)
  })

  it('nível primário 4 sem multiclasse → +2', () => {
    expect(calcProfView(4)).toBe(2)
  })

  it('nível primário 4 / multiclasse 4 (total 8) → +3', () => {
    expect(calcProfView(4, [{ level: 4 }])).toBe(3)
  })

  it('nível primário 10 / multiclasse 7 (total 17) → +6', () => {
    expect(calcProfView(10, [{ level: 7 }])).toBe(6)
  })
})

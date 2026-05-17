import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MulticlassModal } from '../components/CharacterWizardV2/MulticlassModal'
import { INITIAL_DRAFT_V2 } from '../components/CharacterWizardV2/hooks/useDraft'

const classes = [
  { index: 'guerreiro', name: 'Guerreiro', hit_die: 10 },
  { index: 'mago', name: 'Mago', hit_die: 6 },
  { index: 'monge', name: 'Monge', hit_die: 8 },
]

const multiclassData = {
  guerreiro: {
    prerequisites: { str: 13, or: 'dex' },
    proficiencies: { armor: ['leve', 'média'], weapons: ['simples'], tools: [], skills: 0 },
  },
  mago: {
    prerequisites: { int: 13 },
    proficiencies: { armor: [], weapons: [], tools: [], skills: 0 },
  },
  monge: {
    prerequisites: { dex: 13, wis: 13 },
    proficiencies: { armor: [], weapons: ['simples'], tools: [], skills: 0 },
  },
}

const baseDraft = {
  ...INITIAL_DRAFT_V2,
  class: 'guerreiro',
  level: 3,
  baseAttributes: { str: 15, dex: 14, con: 13, int: 14, wis: 10, cha: 8 },
}

describe('MulticlassModal', () => {
  it('não renderiza quando open=false', () => {
    render(<MulticlassModal open={false} draft={baseDraft} classes={classes}
      multiclassData={multiclassData} onAdd={() => {}} onCancel={() => {}} />)
    expect(screen.queryByText(/adicionar classe/i)).not.toBeInTheDocument()
  })

  it('renderiza select de classes (excluindo a primária)', () => {
    render(<MulticlassModal open={true} draft={baseDraft} classes={classes}
      multiclassData={multiclassData} onAdd={() => {}} onCancel={() => {}} />)
    const select = screen.getByLabelText(/^classe/i)
    const options = select.querySelectorAll('option')
    const values = Array.from(options).map(o => o.value)
    expect(values).toContain('mago')
    expect(values).toContain('monge')
    expect(values).not.toContain('guerreiro')  // primária excluída
  })

  it('mostra prereq atendido quando ok', async () => {
    render(<MulticlassModal open={true} draft={baseDraft} classes={classes}
      multiclassData={multiclassData} onAdd={() => {}} onCancel={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText(/^classe/i), 'mago')
    expect(screen.getByText(/pré-requisito/i)).toBeInTheDocument()
    expect(screen.getByText(/INT 13/i)).toBeInTheDocument()
  })

  it('botão Adicionar desabilitado quando prereq falha', async () => {
    const draftBaixaINT = { ...baseDraft, baseAttributes: { str: 15, dex: 14, con: 13, int: 8, wis: 10, cha: 8 } }
    render(<MulticlassModal open={true} draft={draftBaixaINT} classes={classes}
      multiclassData={multiclassData} onAdd={() => {}} onCancel={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText(/^classe/i), 'mago')
    expect(screen.getByRole('button', { name: /adicionar/i })).toBeDisabled()
  })

  it('confirmar dispara onAdd com class + level + hitDie', async () => {
    const onAdd = vi.fn()
    render(<MulticlassModal open={true} draft={baseDraft} classes={classes}
      multiclassData={multiclassData} onAdd={onAdd} onCancel={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText(/^classe/i), 'mago')
    await userEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      class: 'mago', level: 1, hitDie: 6,
    }))
  })

  it('cancelar dispara onCancel sem chamar onAdd', async () => {
    const onAdd = vi.fn()
    const onCancel = vi.fn()
    render(<MulticlassModal open={true} draft={baseDraft} classes={classes}
      multiclassData={multiclassData} onAdd={onAdd} onCancel={onCancel} />)
    await userEvent.click(screen.getByRole('button', { name: /cancelar/i }))
    expect(onCancel).toHaveBeenCalled()
    expect(onAdd).not.toHaveBeenCalled()
  })

  it('mostra aviso se total de níveis exceder 20', async () => {
    const draftLvl19 = { ...baseDraft, level: 19 }
    render(<MulticlassModal open={true} draft={draftLvl19} classes={classes}
      multiclassData={multiclassData} onAdd={() => {}} onCancel={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText(/^classe/i), 'mago')
    // level default = 1, total = 19+1 = 20 (OK)
    await userEvent.selectOptions(screen.getByLabelText(/^nível/i), '5')
    expect(screen.getByText(/excederia 20/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^adicionar$/i })).toBeDisabled()
  })
})

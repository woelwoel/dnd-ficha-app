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

  it('onAdd inclui proficiencies e chosenSkills da classe', async () => {
    const onAdd = vi.fn()
    render(<MulticlassModal open={true} draft={baseDraft} classes={classes}
      multiclassData={multiclassData} onAdd={onAdd} onCancel={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText(/^classe/i), 'mago')
    await userEvent.click(screen.getByRole('button', { name: /^adicionar$/i }))
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
      proficiencies: expect.objectContaining({ armor: [], weapons: [], tools: [], skills: 0 }),
      chosenSkills: [],
    }))
  })

  it('bloqueia se o pré-requisito da classe de ORIGEM não for atendido (PHB p.163)', async () => {
    // Guerreiro primário com FOR 8 e DES 8 não atende o próprio pré-requisito
    // (FOR ou DES 13). Adicionar Mago (INT 14, ok) deve ser bloqueado.
    const draftFracaOrigem = {
      ...baseDraft,
      baseAttributes: { str: 8, dex: 8, con: 13, int: 14, wis: 10, cha: 8 },
    }
    render(<MulticlassModal open={true} draft={draftFracaOrigem} classes={classes}
      multiclassData={multiclassData} onAdd={() => {}} onCancel={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText(/^classe/i), 'mago')
    expect(screen.getByText(/classe atual não atendido/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^adicionar$/i })).toBeDisabled()
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

  it('limita os níveis disponíveis para não passar de 20 no total', async () => {
    // Primária nível 19 → só sobra 1 nível disponível.
    const draftLvl19 = { ...baseDraft, level: 19 }
    render(<MulticlassModal open={true} draft={draftLvl19} classes={classes}
      multiclassData={multiclassData} onAdd={() => {}} onCancel={() => {}} />)
    const levelSelect = screen.getByLabelText(/^nível/i)
    const values = Array.from(levelSelect.querySelectorAll('option')).map(o => o.value)
    expect(values).toEqual(['1'])
  })

  it('oferece níveis até o restante (primária 16 → até 4)', async () => {
    const draftLvl16 = { ...baseDraft, level: 16 }
    render(<MulticlassModal open={true} draft={draftLvl16} classes={classes}
      multiclassData={multiclassData} onAdd={() => {}} onCancel={() => {}} />)
    const levelSelect = screen.getByLabelText(/^nível/i)
    const values = Array.from(levelSelect.querySelectorAll('option')).map(o => o.value)
    expect(values).toEqual(['1', '2', '3', '4'])
  })
})

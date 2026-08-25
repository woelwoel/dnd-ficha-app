import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CrimsonRitePanel } from '../../systems/dnd5e/components/CharacterSheet/v2/CrimsonRitePanel'
import { BLOOD_HUNTER } from '../../systems/dnd5e/domain/bloodHunter'

function ficha({ level = 5, rites = [], ritosConhecidos = 'chamas', classe = BLOOD_HUNTER } = {}) {
  return {
    info: {
      level, class: classe, multiclasses: [],
      chosenFeatures: { cacador_de_sangue_primal_rite: ritosConhecidos },
    },
    attributes: { str: 16, dex: 10, con: 14, int: 10, wis: 14, cha: 10 },
    combat: {
      maxHp: 44, currentHp: 44, crimsonRites: rites,
      attacks: [{ id: 'espada', name: 'Espada Longa', damageDice: '1d8' }],
    },
  }
}

describe('CrimsonRitePanel', () => {
  it('não renderiza para quem não é caçador de sangue', () => {
    const { container } = render(
      <CrimsonRitePanel character={ficha({ classe: 'mago' })} onChange={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lista as armas registradas e o custo do rito', () => {
    render(<CrimsonRitePanel character={ficha()} onChange={vi.fn()} />)
    expect(screen.getByText('Espada Longa')).toBeInTheDocument()
    expect(screen.getByText(/5 PV máximo/)).toBeInTheDocument()
  })

  it('ativa o rito na arma e grava em combat.crimsonRites', () => {
    const onChange = vi.fn()
    render(<CrimsonRitePanel character={ficha()} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /ativar ritual em espada longa/i }))
    expect(onChange).toHaveBeenCalledWith([{ attackId: 'espada', rite: 'chamas' }])
  })

  it('respeita o rito escolhido no seletor', () => {
    const onChange = vi.fn()
    render(<CrimsonRitePanel character={ficha({ ritosConhecidos: 'chamas,tempestade' })} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: /ritual para espada longa/i }),
      { target: { value: 'tempestade' } })
    fireEvent.click(screen.getByRole('button', { name: /ativar ritual em espada longa/i }))
    expect(onChange).toHaveBeenCalledWith([{ attackId: 'espada', rite: 'tempestade' }])
  })

  it('desfaz o rito ativo', () => {
    const onChange = vi.fn()
    const char = ficha({ rites: [{ attackId: 'espada', rite: 'chamas' }] })
    render(<CrimsonRitePanel character={char} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /desfazer ritual em espada longa/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('mostra o teto de PV já reduzido enquanto há rito ativo', () => {
    const char = ficha({ rites: [{ attackId: 'espada', rite: 'chamas' }] })
    render(<CrimsonRitePanel character={char} onChange={vi.fn()} />)
    expect(screen.getByText(/39 de 44/)).toBeInTheDocument()
  })

  it('no 20º nível avisa que a Maestria Sanguinária dispensa o sacrifício', () => {
    render(<CrimsonRitePanel character={ficha({ level: 20 })} onChange={vi.fn()} />)
    expect(screen.getByText(/Maestria Sanguinária/)).toBeInTheDocument()
    expect(screen.queryByText(/PV máximo\./)).not.toBeInTheDocument()
  })

  it('avisa quando o personagem ainda não escolheu ritual nenhum', () => {
    render(<CrimsonRitePanel character={ficha({ ritosConhecidos: '' })} onChange={vi.fn()} />)
    expect(screen.getByText(/Nenhum ritual conhecido/)).toBeInTheDocument()
  })
})

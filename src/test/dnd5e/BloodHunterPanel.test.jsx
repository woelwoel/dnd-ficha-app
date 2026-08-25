import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BloodHunterPanel } from '../../systems/dnd5e/components/CharacterSheet/v2/BloodHunterPanel'
import { BLOOD_HUNTER, LYCAN, ORDER_CHOICE_ID } from '../../systems/dnd5e/domain/bloodHunter'
import { MUTANT, FORMULAS_CHOICE_ID } from '../../systems/dnd5e/domain/mutagens'

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

describe('BloodHunterPanel', () => {
  it('não renderiza para quem não é caçador de sangue', () => {
    const { container } = render(
      <BloodHunterPanel character={ficha({ classe: 'mago' })} onChange={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('lista as armas registradas e o custo do rito', () => {
    render(<BloodHunterPanel character={ficha()} onChange={vi.fn()} />)
    expect(screen.getByText('Espada Longa')).toBeInTheDocument()
    expect(screen.getByText(/5 PV máximo/)).toBeInTheDocument()
  })

  it('ativa o rito na arma e grava em combat.crimsonRites', () => {
    const onChange = vi.fn()
    render(<BloodHunterPanel character={ficha()} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /ativar ritual em espada longa/i }))
    expect(onChange).toHaveBeenCalledWith([{ attackId: 'espada', rite: 'chamas' }])
  })

  it('respeita o rito escolhido no seletor', () => {
    const onChange = vi.fn()
    render(<BloodHunterPanel character={ficha({ ritosConhecidos: 'chamas,tempestade' })} onChange={onChange} />)
    fireEvent.change(screen.getByRole('combobox', { name: /ritual para espada longa/i }),
      { target: { value: 'tempestade' } })
    fireEvent.click(screen.getByRole('button', { name: /ativar ritual em espada longa/i }))
    expect(onChange).toHaveBeenCalledWith([{ attackId: 'espada', rite: 'tempestade' }])
  })

  it('desfaz o rito ativo', () => {
    const onChange = vi.fn()
    const char = ficha({ rites: [{ attackId: 'espada', rite: 'chamas' }] })
    render(<BloodHunterPanel character={char} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /desfazer ritual em espada longa/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('mostra o teto de PV já reduzido enquanto há rito ativo', () => {
    const char = ficha({ rites: [{ attackId: 'espada', rite: 'chamas' }] })
    render(<BloodHunterPanel character={char} onChange={vi.fn()} />)
    expect(screen.getByText(/39 de 44/)).toBeInTheDocument()
  })

  it('no 20º nível avisa que a Maestria Sanguinária dispensa o sacrifício', () => {
    render(<BloodHunterPanel character={ficha({ level: 20 })} onChange={vi.fn()} />)
    expect(screen.getByText(/Maestria Sanguinária/)).toBeInTheDocument()
    expect(screen.queryByText(/PV máximo\./)).not.toBeInTheDocument()
  })

  it('avisa quando o personagem ainda não escolheu ritual nenhum', () => {
    render(<BloodHunterPanel character={ficha({ ritosConhecidos: '' })} onChange={vi.fn()} />)
    expect(screen.getByText(/Nenhum ritual conhecido/)).toBeInTheDocument()
  })
})

describe('BloodHunterPanel — Sangue Maldito', () => {
  const tracker = { id: 'cacador-de-sangue-blood-maledict', name: 'Sangue Maldito', max: 2, used: 0, recharge: 'short' }

  it('mostra os usos restantes', () => {
    render(<BloodHunterPanel character={ficha()} featureUses={[tracker]} onChange={vi.fn()} />)
    expect(screen.getByText('Sangue Maldito')).toBeInTheDocument()
    expect(screen.getByText('2/2')).toBeInTheDocument()
  })

  it('gasta um uso', () => {
    const onSpend = vi.fn()
    render(<BloodHunterPanel character={ficha()} featureUses={[tracker]} onChange={vi.fn()} onSpend={onSpend} />)
    fireEvent.click(screen.getByRole('button', { name: /gastar um uso de sangue maldito/i }))
    expect(onSpend).toHaveBeenCalledWith('cacador-de-sangue-blood-maledict')
  })

  it('não deixa gastar quando os usos acabaram', () => {
    const esgotado = { ...tracker, used: 2 }
    render(<BloodHunterPanel character={ficha()} featureUses={[esgotado]} onChange={vi.fn()} onSpend={vi.fn()} />)
    expect(screen.getByRole('button', { name: /gastar um uso de sangue maldito/i })).toBeDisabled()
  })

  it('some quando o personagem ainda não tem a feature', () => {
    render(<BloodHunterPanel character={ficha({ level: 1 })} featureUses={[]} onChange={vi.fn()} />)
    expect(screen.queryByText('Sangue Maldito')).not.toBeInTheDocument()
  })
})

describe('BloodHunterPanel — Forma Hibrida (Ordem do Licantropo)', () => {
  const TRACKER = 'cacador-de-sangue-hybrid-transformation'

  function lican({ level = 5, hybrid = false, order = LYCAN, used = 0 } = {}) {
    return {
      info: {
        level, class: BLOOD_HUNTER, multiclasses: [],
        chosenFeatures: { [ORDER_CHOICE_ID]: order, cacador_de_sangue_primal_rite: 'chamas' },
      },
      attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 14, cha: 10 },
      combat: {
        maxHp: 44, currentHp: 44, crimsonRites: [], hybridForm: hybrid,
        attacks: [{ id: 'espada', name: 'Espada Longa', damageDice: '1d8' }],
      },
    }
  }
  const usos = (used = 0) => [
    { id: TRACKER, name: 'Transformacao Hibrida', max: 2, used, recharge: 'short' },
  ]

  function montar(props = {}) {
    const onToggleHybrid = vi.fn()
    const onSpend = vi.fn()
    render(
      <BloodHunterPanel
        character={props.character ?? lican()}
        featureUses={props.featureUses ?? usos()}
        onChange={vi.fn()}
        onSpend={onSpend}
        onRegain={vi.fn()}
        onToggleHybrid={onToggleHybrid}
      />
    )
    return { onToggleHybrid, onSpend }
  }

  it('nao mostra a forma hibrida para outra Ordem', () => {
    render(
      <BloodHunterPanel
        character={lican({ order: 'cacador-de-espectros' })}
        featureUses={[]}
        onChange={vi.fn()}
      />
    )
    expect(screen.queryByText(/Forma H[ií]brida/i)).not.toBeInTheDocument()
  })

  it('transformar liga o estado e gasta um uso', () => {
    const { onToggleHybrid, onSpend } = montar()
    fireEvent.click(screen.getByRole('button', { name: /transformar em forma h[ií]brida/i }))
    expect(onToggleHybrid).toHaveBeenCalledWith(true)
    expect(onSpend).toHaveBeenCalledWith(TRACKER)
  })

  it('reverter desliga o estado sem devolver o uso', () => {
    const { onToggleHybrid, onSpend } = montar({ character: lican({ hybrid: true }), featureUses: usos(1) })
    fireEvent.click(screen.getByRole('button', { name: /reverter da forma h[ií]brida/i }))
    expect(onToggleHybrid).toHaveBeenCalledWith(false)
    expect(onSpend).not.toHaveBeenCalled()
  })

  it('sem usos restantes, nao da pra transformar', () => {
    montar({ featureUses: usos(2) })
    expect(screen.getByRole('button', { name: /transformar em forma h[ií]brida/i })).toBeDisabled()
  })

  it('transformado, mostra os beneficios ativos', () => {
    montar({ character: lican({ hybrid: true }), featureUses: usos(1) })
    expect(screen.getByText(/\+1 de CA/)).toBeInTheDocument()
    expect(screen.getByText(/1d6/)).toBeInTheDocument()
  })
})

describe('BloodHunterPanel — Mutagenicos (Ordem do Mutante)', () => {
  function mutante({ level = 8, ativos = [], conhecidas = 'potencia,sagacidade', order = MUTANT } = {}) {
    return {
      info: {
        level, class: BLOOD_HUNTER, multiclasses: [],
        chosenFeatures: {
          [ORDER_CHOICE_ID]: order,
          [FORMULAS_CHOICE_ID]: conhecidas,
          cacador_de_sangue_primal_rite: 'chamas',
        },
      },
      attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 12, cha: 10 },
      combat: { maxHp: 60, currentHp: 60, crimsonRites: [], mutagens: ativos, attacks: [] },
    }
  }

  function montar(char) {
    const onChangeMutagens = vi.fn()
    render(
      <BloodHunterPanel
        character={char}
        featureUses={[]}
        onChange={vi.fn()}
        onChangeMutagens={onChangeMutagens}
      />
    )
    return { onChangeMutagens }
  }

  it('nao mostra mutagenicos para outra Ordem', () => {
    montar(mutante({ order: LYCAN }))
    expect(screen.queryByText(/Mutag[eê]nicos/)).not.toBeInTheDocument()
  })

  it('lista as formulas conhecidas e o nivel de mutacao', () => {
    montar(mutante())
    expect(screen.getByText(/N[ií]vel de muta[çc][ãa]o 2/)).toBeInTheDocument()
    expect(screen.getByText('Potência')).toBeInTheDocument()
    expect(screen.getByText('Sagacidade')).toBeInTheDocument()
  })

  it('beber um mutagenico o acrescenta aos ativos', () => {
    const { onChangeMutagens } = montar(mutante())
    fireEvent.click(screen.getByRole('button', { name: /beber pot[eê]ncia/i }))
    expect(onChangeMutagens).toHaveBeenCalledWith(['potencia'])
  })

  it('expelir remove so aquele, preservando os outros', () => {
    const { onChangeMutagens } = montar(mutante({ ativos: ['potencia', 'sagacidade'] }))
    fireEvent.click(screen.getByRole('button', { name: /expelir pot[eê]ncia/i }))
    expect(onChangeMutagens).toHaveBeenCalledWith(['sagacidade'])
  })

  it('mostra o efeito colateral enquanto o mutagenico esta ativo', () => {
    montar(mutante({ ativos: ['potencia'] }))
    expect(screen.getByText(/Sua Destreza diminui/)).toBeInTheDocument()
  })

  it('avisa quando nao ha formula escolhida', () => {
    montar(mutante({ conhecidas: '' }))
    expect(screen.getByText(/Nenhuma f[óo]rmula conhecida/)).toBeInTheDocument()
  })
})

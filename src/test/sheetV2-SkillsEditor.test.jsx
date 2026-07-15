import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext, makeCharacter, makeUpdaters } from './helpers/sheetV2TestContext'
import { SKILLS } from '../systems/dnd5e/utils/calculations'

// O dataset de multiclasse é lazy no SrdProvider; aqui ele é injetado
// direto (mesmo padrão dos testes do FeaturesTab).
let mcData = {}
vi.mock('../systems/dnd5e/data/SrdProvider', () => ({
  useLazySrdDataset: () => mcData,
}))

import { SkillsEditor } from '../systems/dnd5e/components/CharacterSheet/v2/SkillsEditor'

// Bardo N1: 3 perícias de classe. O personagem do helper tem 4 marcadas —
// serve tanto pro caso "no limite" quanto pro "excedido".
const bardClassData = { skill_choices: { count: 3 } }

beforeEach(() => { mcData = {} })

// makeCharacter substitui info inteiro; estes só precisam de raça/multiclasse.
function withInfo(info) {
  const c = makeCharacter()
  c.info = { ...c.info, ...info }
  return c
}

describe('SkillsEditor', () => {
  it('renderiza as 18 perícias com o nome inteiro', () => {
    renderWithSheetContext(<SkillsEditor />)
    expect(SKILLS).toHaveLength(18)
    for (const s of SKILLS) {
      expect(screen.getByText(s.name)).toBeInTheDocument()
    }
  })

  it('marcar a perícia chama toggleSkillProficiency com a chave', async () => {
    const user = userEvent.setup()
    const toggleSkillProficiency = vi.fn()
    renderWithSheetContext(<SkillsEditor />, {
      updaters: makeUpdaters({ toggleSkillProficiency }),
    })
    await user.click(screen.getByRole('checkbox', { name: 'Proficiência em Acrobacia' }))
    expect(toggleSkillProficiency).toHaveBeenCalledWith('acrobatics')
  })

  it('★ de perícia não-proficiente não chama toggleExpertiseSkill', async () => {
    const user = userEvent.setup()
    const toggleExpertiseSkill = vi.fn()
    renderWithSheetContext(<SkillsEditor />, {
      updaters: makeUpdaters({ toggleExpertiseSkill }),
    })
    // 'deception' não está em skills nem em backgroundSkills no helper.
    await user.click(screen.getByRole('button', { name: 'Especialização em Enganação' }))
    expect(toggleExpertiseSkill).not.toHaveBeenCalled()
  })

  it('★ de perícia proficiente chama toggleExpertiseSkill', async () => {
    const user = userEvent.setup()
    const toggleExpertiseSkill = vi.fn()
    renderWithSheetContext(<SkillsEditor />, {
      updaters: makeUpdaters({ toggleExpertiseSkill }),
    })
    await user.click(screen.getByRole('button', { name: 'Especialização em Arcanismo' }))
    expect(toggleExpertiseSkill).toHaveBeenCalledWith('arcana')
  })

  it('perícia do antecedente não tem checkbox (vem travada)', () => {
    const character = makeCharacter()
    character.proficiencies = { ...character.proficiencies, backgroundSkills: ['survival'] }
    renderWithSheetContext(<SkillsEditor />, { character })
    expect(screen.queryByRole('checkbox', { name: 'Proficiência em Sobrevivência' })).not.toBeInTheDocument()
    expect(screen.getByTitle('Proficiência do antecedente')).toBeInTheDocument()
    // ...e as outras seguem editáveis
    expect(screen.getByRole('checkbox', { name: 'Proficiência em Acrobacia' })).toBeInTheDocument()
  })

  it('filtrar por atributo estreita a lista', async () => {
    const user = userEvent.setup()
    renderWithSheetContext(<SkillsEditor />)
    await user.click(screen.getByRole('button', { name: 'Filtrar por SAB' }))
    expect(screen.getByText('Percepção')).toBeInTheDocument()
    expect(screen.queryByText('Acrobacia')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Mostrar todas' }))
    expect(screen.getByText('Acrobacia')).toBeInTheDocument()
  })

  it('no limite, checkbox de perícia não marcada vem desabilitado', () => {
    renderWithSheetContext(<SkillsEditor />, { classData: bardClassData })
    // 4 marcadas >= limite 3 → não dá pra marcar mais...
    expect(screen.getByRole('checkbox', { name: 'Proficiência em Enganação' })).toBeDisabled()
    // ...mas dá pra desmarcar as que já estão.
    expect(screen.getByRole('checkbox', { name: 'Proficiência em Acrobacia' })).toBeEnabled()
  })

  it('conta as escolhidas e avisa quando passou do limite', () => {
    renderWithSheetContext(<SkillsEditor />, { classData: bardClassData })
    expect(screen.getByText('4 de 3 escolhidas')).toBeInTheDocument()
    expect(screen.getByText('1 excedida')).toBeInTheDocument()
  })

  it('sem limite de classe, não mostra contador', () => {
    renderWithSheetContext(<SkillsEditor />, { classData: null })
    expect(screen.queryByText(/escolhidas/)).not.toBeInTheDocument()
  })
})

// As perícias de raça/multiclasse são achatadas em proficiencies.skills junto
// com as da classe (build-character.js), então o limite tem que somar o que
// cada origem concede — senão toda ficha legal dessas acusa excesso.
describe('SkillsEditor — orçamento por origem', () => {
  it('Humano Variante: a 4a perícia do bardo é legal, não excesso', () => {
    const character = withInfo({ race: 'humano', subrace: 'tracos-raciais-alternativos' })
    renderWithSheetContext(<SkillsEditor />, { character, classData: bardClassData })
    expect(screen.getByText('4 de 4 escolhidas')).toBeInTheDocument()
    expect(screen.queryByText(/excedida/)).not.toBeInTheDocument()
  })

  it('Meio-Elfo: +2 de Versatilidade sobram escolhas', () => {
    const character = withInfo({ race: 'meio-elfo', subrace: '' })
    renderWithSheetContext(<SkillsEditor />, { character, classData: bardClassData })
    expect(screen.getByText('4 de 5 escolhidas')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Proficiência em Enganação' })).toBeEnabled()
  })

  it('multiclasse soma o que a classe de entrada concede', () => {
    mcData = { ladino: { proficiencies: { skills: 1 } } }
    const character = withInfo({ race: 'humano', subrace: '', multiclasses: [{ class: 'ladino', level: 1 }] })
    renderWithSheetContext(<SkillsEditor />, { character, classData: bardClassData })
    expect(screen.getByText('4 de 4 escolhidas')).toBeInTheDocument()
    expect(screen.queryByText(/excedida/)).not.toBeInTheDocument()
  })

  it('multiclasse com dataset lazy ainda vazio: cala em vez de acusar', () => {
    mcData = {}
    const character = withInfo({ race: 'humano', subrace: '', multiclasses: [{ class: 'ladino', level: 1 }] })
    renderWithSheetContext(<SkillsEditor />, { character, classData: bardClassData })
    expect(screen.queryByText(/escolhidas/)).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Proficiência em Enganação' })).toBeEnabled()
  })

  it('humano comum segue acusando excesso de verdade', () => {
    const character = withInfo({ race: 'humano', subrace: '' })
    renderWithSheetContext(<SkillsEditor />, { character, classData: bardClassData })
    expect(screen.getByText('4 de 3 escolhidas')).toBeInTheDocument()
    expect(screen.getByText('1 excedida')).toBeInTheDocument()
  })
})

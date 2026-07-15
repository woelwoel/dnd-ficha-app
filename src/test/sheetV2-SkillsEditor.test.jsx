import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithSheetContext, makeCharacter, makeUpdaters } from './helpers/sheetV2TestContext'
import { SKILLS } from '../systems/dnd5e/utils/calculations'

import { SkillsEditor } from '../systems/dnd5e/components/CharacterSheet/v2/SkillsEditor'

// Bardo N1: 3 perícias de classe. O personagem do helper tem 4 marcadas —
// serve tanto pro caso "no limite" quanto pro "excedido".
const bardClassData = { skill_choices: { count: 3 } }

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

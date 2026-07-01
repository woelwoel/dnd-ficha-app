import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// useBlockStatus mockado: força TODOS os blocos "completo" (inclusive review),
// pra habilitar o botão "Inscrever Herói" sem precisar preencher os 8 blocos.
vi.mock('../systems/dnd5e/components/CharacterWizardV2/hooks/useBlockStatus', () => ({
  useBlockStatus: () => new Proxy({}, { get: () => ({ status: 'completo', blockedBy: [] }) }),
}))

// upsertCharacter mockado pra FALHAR — reproduz o save que não persiste.
vi.mock('../utils/storage', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, upsertCharacter: vi.fn(async () => ({ ok: false, reason: 'limit' })) }
})

import { CharacterWizardV2, finalizeErrorMessage } from '../systems/dnd5e/components/CharacterWizardV2/CharacterWizardV2'
import { SrdProvider } from '../systems/dnd5e/data/SrdProvider'

describe('finalizeErrorMessage', () => {
  it('mapeia razões conhecidas', () => {
    expect(finalizeErrorMessage('limit')).toMatch(/limite de 100/i)
    expect(finalizeErrorMessage('too-large')).toMatch(/grande demais/i)
    expect(finalizeErrorMessage('invalid')).toMatch(/inválidos/i)
  })
  it('cai no fallback pra razão desconhecida', () => {
    expect(finalizeErrorMessage('qualquer')).toMatch(/não foi possível salvar/i)
    expect(finalizeErrorMessage(undefined)).toMatch(/não foi possível salvar/i)
  })
})

describe('Inscrever Herói — falha de save mostra erro (não fica em silêncio)', () => {
  beforeEach(() => sessionStorage.clear())

  it('exibe um alerta ao usuário quando o save falha', async () => {
    render(
      <SrdProvider>
        <CharacterWizardV2 onBack={() => {}} onComplete={() => {}} />
      </SrdProvider>
    )
    // Setup → grid
    await userEvent.click(screen.getByRole('button', { name: /começar/i }))
    // Botão habilitado (blocos mockados como completos)
    const finalize = screen.getByRole('button', { name: /inscrever herói/i })
    expect(finalize).toBeEnabled()
    await userEvent.click(finalize)
    // Antes: nada acontecia. Agora: alerta visível pro usuário.
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})

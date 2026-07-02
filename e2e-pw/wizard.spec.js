import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'

/**
 * Wizard de criação — fluxo autenticado (sessão + backend stub).
 *
 * Cobre a espinha dorsal da criação: abrir o wizard, preencher os blocos de
 * identidade (Conceito/Raça/Classe/Antecedente), ver o progresso avançar e o
 * gating do "Inscrever Herói" (desabilitado enquanto incompleto). Protege a
 * classe de bug do wizard (blocos, block-status, gating do finalize).
 */

async function openWizardGrid(page) {
  await page.goto('/')
  await page.getByRole('button', { name: /Recrutar Aventureiro/i }).click()
  await page.getByRole('button', { name: /^Começar$/ }).click()
  await expect(page.getByRole('button', { name: /✦ Inscrever Herói ✦/ })).toBeVisible()
}

async function openBlock(page, id) {
  await page.locator(`[data-testid="block-card-${id}"]`).click()
}
async function closeBlock(page) {
  // Dois botões "Fechar" (× e rodapé) → Esc evita ambiguidade. O draft
  // já autosalva na mudança, então fechar não perde nada.
  await page.keyboard.press('Escape')
}

test.describe('Wizard de criação', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
    await installAuthedApp(context)
  })

  test('grid abre com todos os blocos e Inscrever Herói desabilitado', async ({ page }) => {
    await openWizardGrid(page)
    for (const id of ['concept', 'race', 'class', 'background', 'attributes', 'skills', 'spells', 'review']) {
      await expect(page.locator(`[data-testid="block-card-${id}"]`)).toBeVisible()
    }
    // Gating: nada preenchido → finalize desabilitado.
    await expect(page.getByRole('button', { name: /✦ Inscrever Herói ✦/ })).toBeDisabled()
  })

  test('preencher identidade avança o progresso (blocos completam)', async ({ page }) => {
    await openWizardGrid(page)

    // Conceito: nome.
    await openBlock(page, 'concept')
    await page.locator('#concept-name').fill('Aragorn E2E')
    await closeBlock(page)
    await expect(page.locator('[data-testid="block-card-concept"]')).toContainText('✓')

    // Raça: Humano (select).
    await openBlock(page, 'race')
    await page.locator('#race-select').selectOption('humano')
    await closeBlock(page)
    await expect(page.locator('[data-testid="block-card-race"]')).toContainText('✓')

    // Classe: Bárbaro (a seleção registra; o bloco tem sub-passos além do nv1,
    // então fica em progresso "●" — o que importa aqui é a seleção pegar).
    await openBlock(page, 'class')
    await page.locator('#class-select').selectOption('barbaro')
    await closeBlock(page)
    await expect(page.locator('[data-testid="block-card-class"]')).toContainText('barbaro')

    // Antecedente: Soldado (select).
    await openBlock(page, 'background')
    await page.locator('#background-select').selectOption('soldado')
    await closeBlock(page)
    await expect(page.locator('[data-testid="block-card-background"]')).toContainText('✓')

    // Ainda incompleto (faltam atributos/perícias) → finalize travado.
    await expect(page.getByRole('button', { name: /✦ Inscrever Herói ✦/ })).toBeDisabled()
  })
})

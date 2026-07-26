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

  test('a escolha de atributo do talento fica visível no tema escuro', async ({ page }) => {
    await openWizardGrid(page)
    await openBlock(page, 'race')
    await page.locator('#race-select').selectOption('humano')
    await page.locator('#subrace-select').selectOption('tracos-raciais-alternativos')

    // Humano Variante escolhe 1 talento; Atleta concede +1 em FOR ou DES.
    await page.getByPlaceholder(/buscar talento/i).fill('Atleta')
    await page.getByRole('button', { name: /^Selecionar Atleta$/ }).click()

    const forca = page.getByRole('button', { name: /^FOR$/ })
    const destreza = page.getByRole('button', { name: /^DES$/ })
    await forca.click()
    await expect(forca).toHaveAttribute('aria-pressed', 'true')

    // Regressão: a ponte CSS achatava escolhido e não-escolhido na mesma cor,
    // então clicar não mudava nada na tela e a escolha parecia não registrar.
    const skin = el => el.evaluate(n => {
      const s = getComputedStyle(n)
      return `${s.backgroundColor}|${s.borderTopColor}`
    })
    expect(await skin(forca)).not.toBe(await skin(destreza))
  })
})

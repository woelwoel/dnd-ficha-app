import { test, expect } from '@playwright/test'

/**
 * Smoke test — app carrega, lista renderiza, navegação básica funciona.
 *
 * Cobrir o fluxo "feliz" de:
 *   1. Página inicial mostra Tomo dos Heróis
 *   2. Botão "Inscrever Novo Herói" abre o wizard
 *   3. Botão "Anterior" / fechar volta para a lista
 *   4. Painel de dados (🎲 flutuante) está acessível
 */

test.describe('Smoke', () => {
  test.beforeEach(async ({ context }) => {
    // Limpa localStorage para começar do zero
    await context.clearCookies()
    await context.addInitScript(() => window.localStorage.clear())
  })

  test('página inicial mostra Tomo dos Heróis e botão de criar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Tomo dos Heróis/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Inscrever Novo Herói/ })).toBeVisible()
  })

  test('clicar em Inscrever Novo Herói abre o Wizard', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Inscrever Novo Herói/ }).click()
    // Header do wizard
    await expect(page.getByRole('heading', { name: /Criar Personagem/i })).toBeVisible()
    // Passo 1 = Campanha (settings)
    await expect(page.getByText(/Passo 1 de/)).toBeVisible()
  })

  test('botão flutuante de dados 🎲 abre o painel', async ({ page }) => {
    await page.goto('/')
    const diceBtn = page.getByLabel(/Abrir histórico de rolagens/i)
    await expect(diceBtn).toBeVisible()
    await diceBtn.click()
    // Painel aberto: mostra título "Rolagens"
    await expect(page.getByRole('heading', { name: /Rolagens/i })).toBeVisible()
    // Toggle de modo aparece
    await expect(page.getByRole('button', { name: /↑ Vant\./ })).toBeVisible()
  })

  test('voltar do wizard retorna ao Tomo dos Heróis', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Inscrever Novo Herói/ }).click()
    await expect(page.getByRole('heading', { name: /Criar Personagem/i })).toBeVisible()
    await page.getByRole('button', { name: /← Personagens/i }).click()
    await expect(page.getByRole('heading', { name: /Tomo dos Heróis/i })).toBeVisible()
  })
})

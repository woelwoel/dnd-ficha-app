import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'

/**
 * Smoke test — app carrega autenticado (sessão + backend stub), lista
 * renderiza, navegação básica do wizard funciona.
 *
 * O app é auth-only Supabase; installAuthedApp semeia a sessão e intercepta
 * a rede (ver support/supabase-stub.js) — nenhum backend real é contatado.
 */

test.describe('Smoke', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
    await installAuthedApp(context) // lista vazia
  })

  test('lista vazia mostra estado inicial e botão de recrutar', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Sua história começa aqui/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Recrutar Aventureiro/i })).toBeVisible()
  })

  test('Recrutar Aventureiro abre o setup do wizard', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Recrutar Aventureiro/i }).click()
    await expect(page.getByRole('heading', { name: /Como vai ser.*campanha/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /^Começar$/ })).toBeVisible()
  })

  test('botão flutuante de dados 🎲 abre o painel', async ({ page }) => {
    await page.goto('/')
    const diceBtn = page.getByLabel(/Abrir histórico de rolagens/i)
    await expect(diceBtn).toBeVisible()
    await diceBtn.click()
    await expect(page.getByRole('heading', { name: /Rolagens/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /↑ Vant\./ })).toBeVisible()
  })

  test('voltar do wizard retorna à lista', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Recrutar Aventureiro/i }).click()
    await page.getByRole('button', { name: /^Começar$/ }).click()
    // Grid do wizard ("Forjar Herói")
    await expect(page.getByRole('button', { name: /✦ Inscrever Herói ✦/ })).toBeVisible()
    await page.getByRole('button', { name: /← Personagens/i }).click()
    await expect(page.getByRole('button', { name: /Recrutar Aventureiro/i })).toBeVisible()
  })
})

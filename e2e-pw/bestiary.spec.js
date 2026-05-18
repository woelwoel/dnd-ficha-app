import { test, expect } from '@playwright/test'

/**
 * Bestiário — fluxos que dependem de browser real.
 *
 * Movidos de src/test/integration/bestiary.test.jsx por flakiness em jsdom:
 * a lista do bestiário tem centenas de monstros e o `userEvent.type/click`
 * + re-render estouravam timeout sob contenção de CPU. No browser real é
 * instantâneo.
 */

async function openBestiary(page) {
  await page.goto('/')
  await page.getByLabel(/Abrir bestiário/i).click()
  await expect(page.getByRole('heading', { name: /Bestiário SRD/i })).toBeVisible()
}

test.describe('Bestiário', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
    await context.addInitScript(() => window.localStorage.clear())
  })

  test('busca textual filtra a lista', async ({ page }) => {
    await openBestiary(page)
    await expect(page.getByRole('button', { name: /^Goblin\b/i }).first()).toBeVisible()

    await page.getByPlaceholder(/Buscar monstro/i).fill('goblin')

    await expect(page.getByRole('button', { name: /^Goblin\b/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /^Skeleton$/i })).toHaveCount(0)
  })

  test('clicar em monstro mostra stat block', async ({ page }) => {
    await openBestiary(page)

    const buttons = await page.getByRole('button', { name: /^Goblin/i }).all()
    let target = buttons[0]
    for (const b of buttons) {
      const t = (await b.textContent()) ?? ''
      if (/^Goblin\b(?!\s+(Boss|Statue))/i.test(t)) {
        target = b
        break
      }
    }
    await target.click()

    await expect(page.getByText('Armor Class')).toBeVisible()
  })

  test('botão "Limpar filtros" reseta filtros', async ({ page }) => {
    await openBestiary(page)
    await expect(page.getByRole('button', { name: /^Goblin\b/i }).first()).toBeVisible()

    await page.getByRole('button', { name: /^Filtros$/i }).click()
    await page.getByRole('button', { name: /^dragon$/i }).click()
    await expect(page.getByRole('button', { name: /Filtros · 1/i })).toBeVisible()

    await page.getByText(/Limpar filtros/i).click()
    await expect(page.getByRole('button', { name: /^Filtros$/i })).toBeVisible()
  })

  test('toggle PT/EN traduz nomes dos monstros', async ({ page }) => {
    await openBestiary(page)
    await expect(page.getByRole('button', { name: /^Skeleton\b/i }).first()).toBeVisible()

    await page.getByRole('button', { name: /Mostrar nomes em portugu/i }).click()

    await expect(page.getByRole('button', { name: /^Esqueleto\b/i }).first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Mostrar nomes em ingl/i })).toBeVisible()
  })

  test('toggle PT traduz labels do stat block', async ({ page }) => {
    await openBestiary(page)
    await expect(page.getByRole('button', { name: /^Goblin\b/i }).first()).toBeVisible()

    await page.getByRole('button', { name: /Mostrar nomes em portugu/i }).click()

    await page.getByRole('button', { name: /^Goblin/i }).first().click()

    await expect(page.getByText('Classe de Armadura')).toBeVisible()
    await expect(page.getByText('Pontos de Vida')).toBeVisible()
  })
})

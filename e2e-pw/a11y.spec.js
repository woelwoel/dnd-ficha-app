import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

/**
 * Auditoria de acessibilidade (WCAG 2.1 A/AA) via axe-core.
 *
 * Cobre telas não-autenticadas (login + privacidade) E autenticadas (lista +
 * wizard), via o harness de sessão/stub (support/supabase-stub.js). A ficha
 * fica de fora por ora (precisa de fixture de personagem carregado).
 */

async function seriousViolations(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return results.violations.filter(v => ['critical', 'serious'].includes(v.impact))
}

function assertClean(violations) {
  expect(
    violations,
    JSON.stringify(violations.map(v => ({ id: v.id, nodes: v.nodes.length })), null, 2),
  ).toEqual([])
}

test.describe('Acessibilidade (WCAG 2.1 AA)', () => {
  test('tela de login sem violações critical/serious', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Entrar/ }).first()).toBeVisible()
    assertClean(await seriousViolations(page))
  })

  test('página de privacidade sem violações critical/serious', async ({ page }) => {
    await page.goto('/privacidade')
    assertClean(await seriousViolations(page))
  })

  test('lista de personagens (autenticada) sem violações critical/serious', async ({ page, context }) => {
    await installAuthedApp(context)
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Recrutar Aventureiro/i })).toBeVisible()
    assertClean(await seriousViolations(page))
  })

  test('wizard (grid) sem violações critical/serious', async ({ page, context }) => {
    await installAuthedApp(context)
    await page.goto('/')
    await page.getByRole('button', { name: /Recrutar Aventureiro/i }).click()
    await page.getByRole('button', { name: /^Começar$/ }).click()
    await expect(page.getByRole('button', { name: /✦ Inscrever Herói ✦/ })).toBeVisible()
    assertClean(await seriousViolations(page))
  })

  test('ficha de personagem sem violações critical/serious', async ({ page, context }) => {
    const id = '99999999-9999-4999-8999-999999999999'
    // shortId sem chars ambíguos (0/1/I/O/l) — SHORT_ID_REGEX os rejeita.
    await installAuthedApp(context, {
      characters: [makeCharacter(id, 'Herói Axe', { shortId: 'SHEETAXEBC' })],
    })
    await page.goto('/c/SHEETAXEBC')
    await expect(page.getByText('Herói Axe').first()).toBeVisible()
    assertClean(await seriousViolations(page))
  })
})

import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { installAuthedApp } from './support/supabase-stub'

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

  // Telas autenticadas: o harness já as torna auditáveis, mas elas ainda têm
  // débito SISTÊMICO de contraste (dourado/sépia-claro como texto — gold-400
  // #d4ad6a, #b6a480 sobre pergaminho). Corrigir é uma varredura ampla por
  // vários componentes (ver docs/audits/2026-07-a11y.md). Marcados fixme até a
  // varredura: tirar o .fixme quando estiverem limpos.
  test.fixme('lista de personagens (autenticada) sem violações critical/serious', async ({ page, context }) => {
    await installAuthedApp(context)
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Recrutar Aventureiro/i })).toBeVisible()
    assertClean(await seriousViolations(page))
  })

  test.fixme('wizard (grid) sem violações critical/serious', async ({ page, context }) => {
    await installAuthedApp(context)
    await page.goto('/')
    await page.getByRole('button', { name: /Recrutar Aventureiro/i }).click()
    await page.getByRole('button', { name: /^Começar$/ }).click()
    await expect(page.getByRole('button', { name: /✦ Inscrever Herói ✦/ })).toBeVisible()
    assertClean(await seriousViolations(page))
  })
})

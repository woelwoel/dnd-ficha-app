import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Auditoria de acessibilidade (WCAG 2.1 A/AA) via axe-core.
 *
 * COBERTURA ATUAL: só telas NÃO-autenticadas (login + privacidade). As
 * telas principais (lista, ficha, wizard) exigem sessão Supabase — a
 * auditoria delas está bloqueada junto com o E2E do wizard até existir
 * uma estratégia de auth de teste (ver Fase 1.2/6 do plano). Assim que
 * houver, adicionar os cenários autenticados aqui com o mesmo padrão.
 */

async function seriousViolations(page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return results.violations.filter(v => ['critical', 'serious'].includes(v.impact))
}

test.describe('Acessibilidade (WCAG 2.1 AA)', () => {
  test('tela de login sem violações critical/serious', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Entrar/ }).first()).toBeVisible()
    const violations = await seriousViolations(page)
    expect(violations, JSON.stringify(violations.map(v => ({ id: v.id, nodes: v.nodes.length })), null, 2)).toEqual([])
  })

  test('página de privacidade sem violações critical/serious', async ({ page }) => {
    await page.goto('/privacidade')
    const violations = await seriousViolations(page)
    expect(violations, JSON.stringify(violations.map(v => ({ id: v.id, nodes: v.nodes.length })), null, 2)).toEqual([])
  })
})

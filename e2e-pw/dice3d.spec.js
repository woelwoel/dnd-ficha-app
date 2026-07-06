import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

// Com dice3d=off semeado pelo stub, rolar usa o fluxo clássico: o painel
// ROLAGENS abre na hora com o total — determinístico em CI. O toggle 3D só
// aparece se o browser do runner tiver WebGL, então a visibilidade é
// verificada condicionalmente.
test('rolagem clássica funciona e toggle 3D condiz com o suporte', async ({ context, page }) => {
  const id = '88888888-8888-4888-8888-888888888888'
  await installAuthedApp(context, {
    characters: [makeCharacter(id, 'Rolador 3D', { shortId: 'DADSTREBCA' })],
  })
  await page.goto('/c/DADSTREBCA')
  await expect(page.getByText('Rolador 3D').first()).toBeVisible()

  // Clica na linha de salvaguarda de FOR (a linha inteira é um botão) → o
  // painel ROLAGENS abre no fluxo clássico.
  await page.getByRole('button', { name: /^Rolar salvaguarda de FOR/ }).first().click()
  await expect(page.getByRole('heading', { name: 'Rolagens' })).toBeVisible()

  const supported = await page.evaluate(() => {
    try {
      const c = document.createElement('canvas')
      return !!(c.getContext('webgl2') || c.getContext('webgl'))
    } catch { return false }
  })
  const toggle = page.getByRole('button', { name: 'Ativar dados 3D' })
  if (supported) {
    await expect(toggle).toBeVisible()
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
  } else {
    await expect(toggle).toHaveCount(0)
  }
})

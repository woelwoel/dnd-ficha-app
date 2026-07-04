import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

/**
 * Retrato — upload redimensiona/comprime client-side antes de guardar, pra
 * não inflar o JSON da ficha (base64 de vários MB reenviado a cada autosave).
 *
 * Gera uma imagem grande em memória (2000×2000), sobe pelo input de retrato e
 * confirma que o data URL persistido ficou pequeno (avatar ~256px).
 */
test('upload de retrato é redimensionado para um data URL pequeno', async ({ page, context }) => {
  const id = '88888888-8888-4888-8888-888888888888'
  const uploads = []
  await installAuthedApp(context, {
    characters: [makeCharacter(id, 'Retratado', { shortId: 'RETRATABCD' })],
    onUpsert: row => uploads.push(row),
  })
  // Fluxo de retrato é UI do v1 (seção Identidade colapsável); com o soft cut
  // o default virou v2, então pedimos o v1 explicitamente. (Reescrito p/ v2 na etapa B.)
  await page.goto('/c/RETRATABCD?sheetV2=0')
  await expect(page.getByText('Retratado').first()).toBeVisible()
  // A seção "Identidade" (que contém o retrato) é colapsada por padrão.
  await page.getByRole('button', { name: /Identidade/i }).click()

  // Gera um PNG 2000×2000 real (grande) como Buffer.
  const bigPng = await page.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = 2000; c.height = 2000
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#8b3a2b'; ctx.fillRect(0, 0, 2000, 2000)
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(400, 400, 1200, 1200)
    const blob = await new Promise(r => c.toBlob(r, 'image/png'))
    const buf = await blob.arrayBuffer()
    return Array.from(new Uint8Array(buf))
  })
  const buffer = Buffer.from(bigPng)
  expect(buffer.length).toBeGreaterThan(10_000) // o original é grande

  // Sobe pelo input de arquivo do retrato (sr-only, dentro do label).
  await page.locator('input[type="file"][accept="image/*"]').setInputFiles({
    name: 'foto.png', mimeType: 'image/png', buffer,
  })

  // Lê o data URL efetivamente aplicado no <img> do retrato.
  const portraitSrc = await page.locator('img[alt="Retrato"]').getAttribute('src')
  expect(portraitSrc).toMatch(/^data:image\/(webp|jpeg)/) // comprimido, não png cru
  // 256px comprimido deve ser bem menor que o PNG original (megabytes).
  expect(portraitSrc.length).toBeLessThan(60_000)
})

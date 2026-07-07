import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

// Conjurar Bola de Fogo no Nv 3: gasta o slot e o painel ROLAGENS (fluxo
// clássico — dice3d off semeado pelo stub) mostra o dano com a CD anunciada.
// Mago nv 5, INT 16: CD 14 (8 + prof 3 + mod 3).
test('conjurar magia gasta slot e rola dano com CD anunciada', async ({ context, page }) => {
  const id = '77777777-7777-4777-8777-777777777777'
  await installAuthedApp(context, {
    characters: [makeCharacter(id, 'Mago Conjurador', {
      shortId: 'MAGECASTBC',
      info: { name: 'Mago Conjurador', race: 'humano', class: 'mago', level: 5, alignment: '', multiclasses: [], feats: [], chosenFeatures: {}, asiOrFeatByLevel: {}, background: 'sabio' },
      attributes: { str: 8, dex: 14, con: 12, int: 16, wis: 10, cha: 10 },
      spellcasting: {
        ability: 'int', usedSlots: {}, pactSlotsUsed: 0,
        spells: [{ id: 'sp1', index: 'bola-de-fogo', name: 'Bola de Fogo', level: 3, school: 'Evocação', prepared: true }],
      },
    })],
  })
  await page.goto('/c/MAGECASTBC')
  await expect(page.getByText('Mago Conjurador').first()).toBeVisible()

  // Aba Magias do MainBox v2
  await page.getByRole('tab', { name: 'Magias' }).first().click()
  await expect(page.getByText('Bola de Fogo').first()).toBeVisible()

  // Conjurar → escolher o espaço de Nv 3
  await page.getByRole('button', { name: 'Conjurar' }).first().click()
  await page.getByRole('button', { name: /^Nv 3/ }).first().click()

  // Painel clássico abre com o dano e a CD anunciada no label
  await expect(page.getByRole('heading', { name: 'Rolagens' })).toBeVisible()
  await expect(page.getByText(/Bola de Fogo · dano \(Nv 3\) · CD 14 · salvaguarda de DES/).first()).toBeVisible()

  // Slot de Nv 3 gasto: tracker mostra 1/2 (mago nv 5 tem 2 espaços de Nv 3)
  await expect(page.getByText('1/2').first()).toBeVisible()
})

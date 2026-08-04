import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

// Fogo das Fadas é magia de bardo (PHB p.239) mas o SRD 5.1 carimba a magia
// só como de druida, e o catálogo PT herdou isso — o bardo não achava a magia
// no catálogo, em nenhum nível.
const SHORT = 'BARDFEYFRX'

test('bardo acha Fogo das Fadas no catálogo de nível 1', async ({ context, page }) => {
  const id = '77777777-7777-4777-8777-777777777777'
  await installAuthedApp(context, {
    characters: [makeCharacter(id, 'Bardo Feérico', {
      shortId: SHORT,
      info: { name: 'Bardo Feérico', race: 'humano', class: 'bardo', level: 3, alignment: '', multiclasses: [], feats: [], chosenFeatures: {}, asiOrFeatByLevel: {}, background: 'artista' },
      attributes: { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 17 },
      spellcasting: {
        ability: 'cha', usedSlots: {}, pactSlotsUsed: 0,
        spells: [{ id: 'sp1', index: 'curar-ferimentos', name: 'Curar Ferimentos', level: 1, school: 'Evocação' }],
      },
    })],
  })
  await page.goto(`/c/${SHORT}`)
  await expect(page.getByText('Bardo Feérico').first()).toBeVisible()

  await page.getByRole('tab', { name: 'Magias' }).first().click()
  await page.getByRole('button', { name: /Adicionar magia/ }).click()
  await page.getByRole('button', { name: 'Nv 1', exact: true }).click()
  await page.getByPlaceholder('Buscar magia...').fill('Fogo')

  await expect(page.getByText('Fogo Das Fadas')).toBeVisible()
})

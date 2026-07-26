import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

// Guerreiro drow nv5 salvo SEM as magias do traço: ao abrir a ficha elas
// aparecem, e a de nível conjura pelo uso 1×/descanso (ele não tem espaço).
// ATENÇÃO: short_id não aceita os ambíguos 0/O/1/I/L (SHORT_ID_REGEX em
// utils/storage.js) — um 'O' no meio do id faz a rota nem consultar o banco.
test('drow ganha as magias do traço e conjura pelo uso do descanso', async ({ context, page }) => {
  const id = '55555555-5555-4555-8555-555555555555'
  await installAuthedApp(context, {
    characters: [makeCharacter(id, 'Zaknafein', {
      shortId: 'ZAKNAFEENB',
      info: { name: 'Zaknafein', race: 'elfo', subrace: 'elfo-negro-drow', class: 'guerreiro', level: 5, alignment: '', multiclasses: [], feats: [], chosenFeatures: {}, asiOrFeatByLevel: {}, background: 'soldado' },
      attributes: { str: 16, dex: 16, con: 14, int: 10, wis: 12, cha: 14 },
      spellcasting: { ability: null, usedSlots: {}, pactSlotsUsed: 0, spells: [] },
    })],
  })
  await page.goto('/c/ZAKNAFEENB')
  await expect(page.getByText('Zaknafein').first()).toBeVisible()

  await page.getByRole('tab', { name: 'Magias' }).first().click()
  // Retrofit: a ficha foi salva sem magia nenhuma e ganhou as três ao abrir.
  // A lista tem sub-abas por nível — o truque fica em "Truques".
  await expect(page.getByText('Globos De Luz').first()).toBeVisible()
  await page.getByRole('tab', { name: /Nível 1/ }).click()
  await expect(page.getByText('Fogo Das Fadas').first()).toBeVisible()

  // Sem espaço nenhum, o botão de conjurar continua clicável pelo uso do traço.
  await page.getByTitle(/Conjurar/i).first().click()
  await page.getByRole('button', { name: /1×\/desc\. longo \(1\)/i }).click()
  await page.getByTitle(/Conjurar/i).first().click()
  await expect(page.getByRole('button', { name: /1×\/desc\. longo \(0\)/i })).toBeDisabled()
})

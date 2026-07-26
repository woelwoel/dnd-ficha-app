import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

// O bug relatado: paladino nv2 com Estilo de Combate "Defesa" e armadura
// equipada não via o +1 na CA. A escolha ficava presa em chosenFeatures.
test('estilo Defesa: CA sugerida do paladino sobe de 16 para 17', async ({ context, page }) => {
  const id = '77777777-7777-4777-8777-777777777777'
  await installAuthedApp(context, {
    characters: [makeCharacter(id, 'Paladino Defensor', {
      shortId: 'PALADEFS22',
      info: {
        name: 'Paladino Defensor', race: 'humano', class: 'paladino', level: 2,
        alignment: '', multiclasses: [], feats: [],
        chosenFeatures: { fighting_style_paladin: 'defesa' },
        asiOrFeatByLevel: {}, background: 'soldado',
      },
      attributes: { str: 16, dex: 10, con: 14, int: 10, wis: 10, cha: 14 },
      combat: {
        maxHp: 20, currentHp: 20, tempHp: 0, armorClass: 16, speed: 9,
        hitDice: { pool: { d10: { total: 2, used: 0 } } }, attacks: [],
        concentrating: { spellIndex: null, spellName: null }, activeEffects: [],
        deathSaves: { successes: 0, failures: 0 }, classFeatureUses: [],
        conditions: [], inspiration: false, exhaustion: 0,
      },
      proficiencies: {
        savingThrows: ['wis', 'cha'], skills: [], expertiseSkills: [], backgroundSkills: [],
        armor: ['light', 'medium', 'heavy', 'shield'], weapons: [], tools: [], languages: [],
      },
      inventory: {
        currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
        items: [{ id: 'it1', name: 'Cota de Malha', qty: 1, weight: 0, equipped: true, armorKey: 'chain-mail', armorType: 'heavy' }],
      },
    })],
  })
  await page.goto('/c/PALADEFS22')
  await expect(page.getByText('Paladino Defensor').first()).toBeVisible()

  // CA persistida na ficha antiga continua 16 até o jogador aceitar a sugestão.
  const acButton = page.getByRole('button', { name: 'Editar CA', exact: true })
  await expect(acButton.locator('.v2-ability-mod')).toHaveText('16')

  // A sugestão agora inclui o +1 do estilo Defesa (cota de malha 16 + 1).
  await acButton.click()
  const sugerido = page.getByRole('button', { name: /Sugerido: 17/ })
  await expect(sugerido).toBeVisible()
  await sugerido.click()
  await page.getByRole('button', { name: 'Aplicar' }).click()

  await expect(page.getByRole('button', { name: 'Editar CA', exact: true }).locator('.v2-ability-mod')).toHaveText('17')
})

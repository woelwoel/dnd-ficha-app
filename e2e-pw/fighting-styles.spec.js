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

// Campeão nv10 ganha um SEGUNDO Estilo de Combate. O picker não existia; agora
// existe, não repete o estilo de nível 1, e o que for escolhido muda o ataque.
test('Campeao nv10: escolher o segundo estilo muda o bonus de ataque', async ({ context, page }) => {
  const id = '88888888-8888-4888-8888-888888888888'
  await installAuthedApp(context, {
    characters: [makeCharacter(id, 'Campeao Arqueiro', {
      shortId: 'CAMPARQE23',
      info: {
        name: 'Campeao Arqueiro', race: 'humano', class: 'guerreiro', level: 10,
        alignment: '', multiclasses: [], feats: [],
        chosenFeatures: { fighting_style: 'defesa', martial_archetype: 'campeao' },
        asiOrFeatByLevel: {}, background: 'soldado',
      },
      attributes: { str: 12, dex: 16, con: 14, int: 10, wis: 12, cha: 10 },
      combat: {
        maxHp: 84, currentHp: 84, tempHp: 0, armorClass: 15, speed: 9,
        hitDice: { pool: { d10: { total: 10, used: 0 } } },
        attacks: [{
          id: 'atk1', name: 'Arco Longo', damageDice: '1d8', damageType: 'perfurante',
          properties: ['ranged'], proficient: true, magicBonus: 0,
        }],
        concentrating: { spellIndex: null, spellName: null }, activeEffects: [],
        deathSaves: { successes: 0, failures: 0 }, classFeatureUses: [],
        conditions: [], inspiration: false, exhaustion: 0,
      },
    })],
  })
  await page.goto('/c/CAMPARQE23')
  await expect(page.getByText('Campeao Arqueiro').first()).toBeVisible()

  // DES 16 (+3) + BP 4 = +7, sem estilo que se aplique ao arco.
  const linhaArco = page.locator('.v2-row').filter({ hasText: 'Arco Longo' }).first()
  await expect(linhaArco).toContainText('+7')

  // A escolha pendente aparece em Características > Habilidades...
  await page.getByRole('tab', { name: 'Características' }).first().click()
  await page.getByRole('button', { name: /Habilidades/ }).first().click()
  await expect(page.getByText('Escolha um segundo Estilo de Combate')).toBeVisible()

  // ...sem repetir Defesa, o estilo já escolhido no nível 1.
  const picker = page.getByText('Escolha um segundo Estilo de Combate').locator('..')
  await expect(picker.getByRole('button', { name: /Defesa/ })).toHaveCount(0)
  await picker.getByRole('button', { name: /Arqueiro/ }).click()

  // Escolhido Arqueiro, o arco passa a +9.
  await page.getByRole('tab', { name: 'Ações' }).first().click()
  await expect(page.locator('.v2-row').filter({ hasText: 'Arco Longo' }).first()).toContainText('+9')
})

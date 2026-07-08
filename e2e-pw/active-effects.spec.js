import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

// Escudo da Fé (alcance 18m → prompt): conjurar, aplicar em você → chip
// aparece e a CA efetiva sobe (16 → 18); romper concentração → tudo volta.
test('efeito ativo: conjurar Escudo da Fe, aplicar, CA sobe e expira ao romper', async ({ context, page }) => {
  const id = '66666666-6666-4666-8666-666666666666'
  await installAuthedApp(context, {
    characters: [makeCharacter(id, 'Clerigo Buffado', {
      shortId: 'BUFFCLERBC',
      info: { name: 'Clerigo Buffado', race: 'humano', class: 'clerigo', level: 3, alignment: '', multiclasses: [], feats: [], chosenFeatures: {}, asiOrFeatByLevel: {}, background: 'sabio' },
      attributes: { str: 10, dex: 10, con: 12, int: 10, wis: 16, cha: 10 },
      combat: {
        maxHp: 21, currentHp: 21, tempHp: 0, armorClass: 16, speed: 9,
        hitDice: { pool: { d8: { total: 3, used: 0 } } }, attacks: [],
        concentrating: { spellIndex: null, spellName: null }, activeEffects: [],
        deathSaves: { successes: 0, failures: 0 }, classFeatureUses: [],
        conditions: [], inspiration: false, exhaustion: 0,
      },
      spellcasting: {
        ability: 'wis', usedSlots: {}, pactSlotsUsed: 0,
        spells: [{ id: 'sp1', index: 'escudo-da-fe', name: 'Escudo da Fé', level: 1, school: 'Abjuração', prepared: true, range: '18 metros', concentration: true }],
      },
    })],
  })
  await page.goto('/c/BUFFCLERBC')
  await expect(page.getByText('Clerigo Buffado').first()).toBeVisible()

  // CA base visível (bloco "Editar CA" da AbilityStrip; texto "18" aparece
  // em prosa de feature de classe em outro lugar da página, então o valor
  // de CA precisa ser lido dentro do próprio bloco de CA, não em getByText livre)
  const acValue = page.getByRole('button', { name: 'Editar CA' }).locator('.v2-ability-mod')
  await expect(acValue).toHaveText('16')

  // Conjura no Nv 1 e aplica o efeito em si
  await page.getByRole('tab', { name: 'Magias' }).first().click()
  await page.getByRole('button', { name: 'Conjurar' }).first().click()
  await page.getByRole('button', { name: /^Nv 1/ }).first().click()
  await page.getByRole('button', { name: /Aplicar em você/ }).first().click()

  // Chip aparece e CA efetiva sobe pra 18
  await expect(page.getByText('Escudo da Fé').first()).toBeVisible()
  await expect(acValue).toHaveText('18')

  // Romper concentração (chip/banner da aba Magias) → efeito expira
  await page.getByRole('button', { name: 'Romper' }).first().click()
  await expect(acValue).toHaveText('16')
})

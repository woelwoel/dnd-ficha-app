import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'

/**
 * Persistência — fichas vindas do backend (stub) renderizam na lista e
 * sobrevivem ao refresh.
 *
 * NOTA: o app persiste no Supabase (não mais em localStorage — o mecanismo
 * antigo `dnd-app-characters` foi removido). Este spec agora semeia fichas
 * no store do stub (ver support/supabase-stub.js) em vez de localStorage.
 */

function makeCharacter(id, name) {
  return {
    id,
    meta: { createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', version: '1.0', schemaVersion: 4 },
    info: { name, race: 'humano', class: 'mago', level: 3, alignment: '', multiclasses: [], feats: [], chosenFeatures: {}, asiOrFeatByLevel: {} },
    attributes: { str: 10, dex: 14, con: 12, int: 16, wis: 10, cha: 10 },
    appliedRacialBonuses: {},
    combat: {
      maxHp: 18, currentHp: 18, tempHp: 0, armorClass: 12, speed: 9,
      hitDice: { pool: { d6: { total: 3, used: 0 } } }, attacks: [],
      concentrating: { spellIndex: null, spellName: null },
      deathSaves: { successes: 0, failures: 0 }, classFeatureUses: [],
      conditions: [], inspiration: false, exhaustion: 0,
    },
    proficiencies: { savingThrows: ['int', 'wis'], skills: [], expertiseSkills: [], backgroundSkills: [], armor: [], weapons: [], tools: [], languages: [] },
    spellcasting: { ability: 'int', usedSlots: {}, spells: [], pactSlotsUsed: 0 },
    inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
    traits: { personalityTraits: '', ideals: '', bonds: '', flaws: '', featuresAndTraits: '', notes: '' },
  }
}

test.describe('Persistência (backend stub)', () => {
  // Vai pra view "Lista" (nomes como texto visível; a "Mapa" mostra tokens
  // com o nome colapsado até hover).
  async function gotoListView(page) {
    await page.goto('/')
    await page.getByRole('button', { name: /≡ Lista/i }).click()
  }

  test('fichas do backend renderizam na lista', async ({ page, context }) => {
    await installAuthedApp(context, {
      characters: [makeCharacter('11111111-1111-4111-8111-111111111111', 'Tasha'),
                   makeCharacter('22222222-2222-4222-8222-222222222222', 'Mordenkainen')],
    })
    await gotoListView(page)
    await expect(page.getByText('Tasha', { exact: true })).toBeVisible()
    await expect(page.getByText('Mordenkainen', { exact: true })).toBeVisible()
  })

  test('refresh do browser mantém as fichas', async ({ page, context }) => {
    await installAuthedApp(context, {
      characters: [makeCharacter('33333333-3333-4333-8333-333333333333', 'Elminster')],
    })
    await gotoListView(page)
    await expect(page.getByText('Elminster', { exact: true })).toBeVisible()
    await page.reload()
    await page.getByRole('button', { name: /≡ Lista/i }).click()
    await expect(page.getByText('Elminster', { exact: true })).toBeVisible()
  })

  test('lista vazia → estado inicial', async ({ page, context }) => {
    await installAuthedApp(context) // sem fichas
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Sua história começa aqui/i })).toBeVisible()
    await expect(page.getByText('Tasha')).not.toBeVisible()
  })
})

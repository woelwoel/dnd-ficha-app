import { test, expect } from '@playwright/test'

/**
 * Persistence test — dados em localStorage sobrevivem ao refresh.
 *
 * Cria uma ficha sintética via JS no localStorage, depois recarrega
 * a página e verifica que a lista mostra a ficha. Também testa o
 * caminho contrário: limpar localStorage e ver a lista voltar a vazio.
 */

const STORAGE_KEY = 'dnd-app-characters'

function makeCharacter(id, name) {
  return {
    id,
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0',
      schemaVersion: 2,
    },
    info: {
      name,
      race: 'humano',
      class: 'mago',
      level: 3,
      alignment: '',
      multiclasses: [],
      feats: [],
    },
    attributes: { str: 10, dex: 14, con: 12, int: 16, wis: 10, cha: 10 },
    appliedRacialBonuses: {},
    combat: {
      maxHp: 18, currentHp: 18, tempHp: 0,
      armorClass: 12, speed: 30,
      hitDice: { pool: { d6: { total: 3, used: 0 } } },
      attacks: [],
      concentrating: { spellIndex: null, spellName: null },
      deathSaves: { successes: 0, failures: 0 },
      classFeatureUses: [],
    },
    proficiencies: {
      savingThrows: ['int', 'wis'],
      skills: [],
      expertiseSkills: [],
      backgroundSkills: [],
      armor: [],
      weapons: [],
      tools: [],
      languages: [],
    },
    spellcasting: { ability: 'int', usedSlots: {}, spells: [], pactSlotsUsed: 0 },
    inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
    traits: { personalityTraits: '', ideals: '', bonds: '', flaws: '', featuresAndTraits: '', notes: '' },
  }
}

test.describe('Persistência', () => {
  test('localStorage com 2 fichas → lista renderiza ambas após carregar', async ({ page, context }) => {
    const fichas = [
      makeCharacter('pw-test-1', 'Tasha'),
      makeCharacter('pw-test-2', 'Mordenkainen'),
    ]
    await context.addInitScript(({ key, data }) => {
      window.localStorage.setItem(key, JSON.stringify(data))
    }, { key: STORAGE_KEY, data: fichas })

    await page.goto('/')
    await expect(page.getByText('Tasha')).toBeVisible()
    await expect(page.getByText('Mordenkainen')).toBeVisible()
  })

  test('refresh do browser mantém as fichas', async ({ page, context }) => {
    const ficha = makeCharacter('pw-persist', 'Elminster')
    await context.addInitScript(({ key, data }) => {
      window.localStorage.setItem(key, JSON.stringify(data))
    }, { key: STORAGE_KEY, data: [ficha] })

    await page.goto('/')
    await expect(page.getByText('Elminster')).toBeVisible()
    await page.reload()
    await expect(page.getByText('Elminster')).toBeVisible()
  })

  test('localStorage vazio → estado vazio mostrado', async ({ page, context }) => {
    await context.addInitScript(() => window.localStorage.clear())
    await page.goto('/')
    await expect(page.getByRole('heading', { name: /Tomo dos Heróis/i })).toBeVisible()
    // Botão de criar aparece como destaque (estado vazio)
    await expect(page.getByRole('button', { name: /Inscrever Novo Herói/ })).toBeVisible()
    // Não deve haver entradas de personagem
    await expect(page.getByText('Tasha')).not.toBeVisible()
  })
})

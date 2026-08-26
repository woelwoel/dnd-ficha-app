import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

/**
 * Eixo de ruleset (2014 vs 2024) ponta a ponta.
 *
 * O que importa provar no navegador:
 *  1. Ficha 2024 mostra o selo `5e24` e a exaustão usa a tabela cumulativa
 *     do 2024 (título do chip cita "-4").
 *  2. Ficha 2014 (a metade que MAIS importa: não-regressão) não mostra selo
 *     nenhum e a exaustão continua na tabela clássica ("metade").
 *  3. O escape hatch `?ruleset=2024` é a única porta pro seletor de regras
 *     no setup — sem ele, o seletor nem existe no DOM.
 *
 * NÃO coberto aqui, de propósito: rolar um dado pra ver o -4 aparecer na
 * notação. Isso depende do painel de dados + fila 3D e é sensível a tempo;
 * a penalidade já está coberta deterministicamente pelos testes unitários
 * `diceRoller-effects` e `effectsSync`.
 *
 * NOTA: as versões mobile e desktop da ficha coexistem no DOM (só uma fica
 * visível). Por isso todo texto aqui é buscado com `visible: true`.
 */
const ID = '99999999-9999-4999-9999-999999999999'

/** Primeiro nó VISÍVEL com este texto (evita a cópia mobile/desktop oculta). */
function visivel(page, texto) {
  return page.getByText(texto).filter({ visible: true }).first()
}

function personagemExausto(ruleset, shortId) {
  return makeCharacter(ID, 'Vex Sombranoite', {
    shortId,
    meta: {
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      version: '1.0', schemaVersion: 5, ruleset,
    },
    info: {
      name: 'Vex Sombranoite', race: 'humano', class: 'guerreiro', level: 3,
      alignment: '', multiclasses: [], feats: [], chosenFeatures: {},
      asiOrFeatByLevel: {}, background: 'soldado',
    },
    attributes: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 10 },
    combat: {
      maxHp: 28, currentHp: 28, tempHp: 0, armorClass: 16, speed: 9,
      hitDice: { pool: { d10: { total: 3, used: 0 } } }, attacks: [],
      concentrating: { spellIndex: null, spellName: null },
      deathSaves: { successes: 0, failures: 0 }, classFeatureUses: [],
      conditions: [], inspiration: false, exhaustion: 2,
    },
    proficiencies: { savingThrows: ['str', 'con'], skills: ['atletismo'], expertiseSkills: [], backgroundSkills: [], armor: [], weapons: [], tools: [], languages: [] },
    spellcasting: { ability: null, usedSlots: {}, spells: [], pactSlotsUsed: 0 },
    inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
    traits: { personalityTraits: '', ideals: '', bonds: '', flaws: '', featuresAndTraits: '', notes: '' },
  })
}

test('ficha 2024: selo 5e24 visível e exaustão usa a tabela do 2024', async ({ context, page }) => {
  await installAuthedApp(context, { characters: [personagemExausto('2024', 'RULEVEXNEW')] })
  await page.goto('/c/RULEVEXNEW')
  await expect(visivel(page, 'Vex Sombranoite')).toBeVisible()

  await expect(visivel(page, '5e24')).toBeVisible()

  const chip = visivel(page, 'Exaustão 2')
  await expect(chip).toBeVisible()
  await expect(chip).toHaveAttribute('title', /−4|-4/)
})

test('ficha 2014 (não-regressão): sem selo nenhum e exaustão na tabela clássica', async ({ context, page }) => {
  await installAuthedApp(context, { characters: [personagemExausto('2014', 'RULEVEXAGE')] })
  await page.goto('/c/RULEVEXAGE')
  await expect(visivel(page, 'Vex Sombranoite')).toBeVisible()

  await expect(page.getByText('5e24')).toHaveCount(0)

  const chip = visivel(page, 'Exaustão 2')
  await expect(chip).toBeVisible()
  await expect(chip).toHaveAttribute('title', /metade/i)
})

test.describe('escape hatch ?ruleset=2024', () => {
  test.beforeEach(async ({ context }) => {
    await context.clearCookies()
    await installAuthedApp(context) // lista vazia
  })

  test('sem o parâmetro, o seletor de regras não aparece no setup', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: /Recrutar Aventureiro/i }).click()
    await expect(page.getByRole('heading', { name: /Como vai ser.*campanha/i })).toBeVisible()
    await expect(page.getByText('Conjunto de regras')).toHaveCount(0)
    await expect(page.getByRole('radio', { name: 'D&D 5e (2024)' })).toHaveCount(0)
  })

  test('com ?ruleset=2024, o seletor de regras aparece no setup', async ({ page }) => {
    // O botão "Recrutar Aventureiro" navega pra `/new` sem herdar querystring
    // (ver App.jsx: `navigate('/new')` é fixo), então o flag só é lido se a
    // URL de destino já carregar o parâmetro.
    await page.goto('/new?ruleset=2024')
    await expect(page.getByRole('heading', { name: /Como vai ser.*campanha/i })).toBeVisible()
    await expect(page.getByText('Conjunto de regras')).toBeVisible()
    await expect(page.getByRole('radio', { name: 'D&D 5e (2024)' })).toBeVisible()
  })
})

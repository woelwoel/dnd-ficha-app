import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

/**
 * Caçador de Sangue (conteúdo de terceiros, fonte `homebrew`).
 *
 * A prova que interessa é a do Ritual Vermelho, porque ele é a única mecânica
 * da classe que atravessa três camadas de uma vez: grava em
 * `combat.crimsonRites`, soma um dado de OUTRO tipo de dano só na arma
 * imbuída, e derruba o teto de pontos de vida enquanto está ativo.
 */
const ID = '88888888-8888-4888-8888-888888888888'

function cacadorDeSangue() {
  return makeCharacter(ID, 'Gilda Corvo', {
    shortId: 'CACSANG555',
    info: {
      name: 'Gilda Corvo', race: 'humano', class: 'cacador-de-sangue', level: 5,
      alignment: '', multiclasses: [], feats: [],
      chosenFeatures: { cacador_de_sangue_primal_rite: 'chamas' },
      asiOrFeatByLevel: {}, background: 'soldado',
    },
    attributes: { str: 16, dex: 12, con: 14, int: 10, wis: 14, cha: 10 },
    combat: {
      maxHp: 44, currentHp: 44, tempHp: 0, armorClass: 16, speed: 9,
      hitDice: { pool: { d10: { total: 5, used: 0 } } },
      attacks: [
        { id: 'espada', name: 'Espada Longa', damageDice: '1d8', damageType: 'cortante', properties: [], proficient: true, magicBonus: 0, fightingStyle: 'none', offHand: false, notes: '' },
        { id: 'adaga', name: 'Adaga', damageDice: '1d4', damageType: 'perfurante', properties: ['finesse'], proficient: true, magicBonus: 0, fightingStyle: 'none', offHand: false, notes: '' },
      ],
      concentrating: { spellIndex: null, spellName: null }, activeEffects: [],
      deathSaves: { successes: 0, failures: 0 }, classFeatureUses: [],
      conditions: [], inspiration: false, exhaustion: 0, crimsonRites: [],
    },
    proficiencies: {
      savingThrows: ['str', 'wis'], skills: ['atletismo', 'sobrevivencia'], expertiseSkills: [],
      backgroundSkills: [], armor: ['light', 'medium', 'shield'], weapons: [], tools: [], languages: [],
    },
  })
}

test('a ficha do Caçador de Sangue abre com as features da classe', async ({ context, page }) => {
  await installAuthedApp(context, { characters: [cacadorDeSangue()] })
  await page.goto('/c/CACSANG555')

  await expect(page.getByText('Gilda Corvo').first()).toBeVisible()
  await expect(page.getByText(/Caçador de Sangue/i).first()).toBeVisible()
})

test('Ritual Vermelho: soma o dado na arma imbuída e derruba o teto de PV', async ({ context, page }) => {
  await installAuthedApp(context, { characters: [cacadorDeSangue()] })
  await page.goto('/c/CACSANG555')
  await expect(page.getByText('Gilda Corvo').first()).toBeVisible()

  const acoes = page.getByRole('tab', { name: /Ações/i })
  if (await acoes.count()) await acoes.first().click()

  // Antes do rito: dano só da arma (1d8 + 3 de Força).
  await expect(page.getByText('1d8 + 3').first()).toBeVisible()

  await page.getByRole('button', { name: /ativar ritual em espada longa/i }).click()

  // A arma imbuída passa a somar o dado de fogo do 5º nível (1d4).
  await expect(page.getByText('1d8 + 3 + 1d4 fogo').first()).toBeVisible()

  // A outra arma NÃO é afetada — o rito vale só na arma imbuída.
  await expect(page.getByText('1d4 + 1', { exact: false }).first()).toBeVisible()
  await expect(page.getByText(/1d4 \+ 1 \+ 1d4 fogo/)).toHaveCount(0)

  // O sacrifício aparece: teto de 44 cai para 39 (nível de personagem 5).
  await expect(page.getByText(/39 de 44/)).toBeVisible()

  // Desfazer devolve o dano e o teto.
  await page.getByRole('button', { name: /desfazer ritual em espada longa/i }).click()
  await expect(page.getByText('1d8 + 3').first()).toBeVisible()
  await expect(page.getByText(/39 de 44/)).toHaveCount(0)
})

test('Sangue Maldito aparece como recurso com 1 uso no 5º nível', async ({ context, page }) => {
  await installAuthedApp(context, { characters: [cacadorDeSangue()] })
  await page.goto('/c/CACSANG555')
  await expect(page.getByText('Gilda Corvo').first()).toBeVisible()

  const acoes = page.getByRole('tab', { name: /Ações/i })
  if (await acoes.count()) await acoes.first().click()

  await expect(page.getByText('Sangue Maldito').first()).toBeVisible()
})

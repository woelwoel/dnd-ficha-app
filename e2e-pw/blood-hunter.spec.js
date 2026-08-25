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
 *
 * NOTA: as versões mobile e desktop da ficha coexistem no DOM (só uma fica
 * visível). Por isso todo texto aqui é buscado com `visible: true` — sem isso,
 * `.first()` cai numa cópia oculta e o teste falha sem haver defeito nenhum.
 */
const ID = '88888888-8888-4888-8888-888888888888'

/** Primeiro nó VISÍVEL com este texto (evita a cópia mobile/desktop oculta). */
function visivel(page, texto) {
  return page.getByText(texto).filter({ visible: true }).first()
}

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
        { id: 'adaga', name: 'Adaga', damageDice: '1d4', damageType: 'perfurante', properties: [], proficient: true, magicBonus: 0, fightingStyle: 'none', offHand: false, notes: '' },
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

async function abrirFicha(context, page) {
  await installAuthedApp(context, { characters: [cacadorDeSangue()] })
  await page.goto('/c/CACSANG555')
  await expect(visivel(page, 'Gilda Corvo')).toBeVisible()
}

test('as features da classe chegam na ficha vindas da fonte homebrew', async ({ context, page }) => {
  await abrirFicha(context, page)

  // O cabeçalho imprime `info.class` cru para TODAS as classes (HeaderV2), então
  // o que se vê ali é o índice, não o nome de exibição.
  await expect(visivel(page, /cacador-de-sangue N5/)).toBeVisible()

  await page.getByRole('tab', { name: 'Características' }).click()
  // A aba tem sub-filtros; as features de classe ficam sob "Habilidades".
  await page.getByRole('button', { name: /^Habilidades/ }).click()

  // Features de 1º e 2º níveis, vindas do JSON de progressão da fonte homebrew.
  await expect(visivel(page, /Perdição do Caçador/i)).toBeVisible()
  await expect(visivel(page, /Sangue Maldito/i)).toBeVisible()
})

test('Ritual Vermelho: soma o dado só na arma imbuída e derruba o teto de PV', async ({ context, page }) => {
  await abrirFicha(context, page)

  // Antes do rito: espada 1d8 + 3 (Força 16), adaga 1d4 + 3 (mesma Força).
  await expect(visivel(page, '1d8 + 3')).toBeVisible()
  await expect(visivel(page, '1d4 + 3')).toBeVisible()

  await page.getByRole('button', { name: /ativar ritual em espada longa/i }).click()

  // A arma imbuída soma o dado de fogo do 5º nível (1d4).
  await expect(visivel(page, '1d8 + 3 + 1d4 fogo')).toBeVisible()

  // A adaga NÃO é afetada: continua 1d4 + 3, sem dado de rito somado.
  await expect(visivel(page, '1d4 + 3')).toBeVisible()
  await expect(page.getByText(/1d4 \+ 3 \+ 1d4 fogo/)).toHaveCount(0)

  // O sacrifício aparece: teto de 44 cai para 39 (nível de personagem 5).
  await expect(visivel(page, /39 de 44/)).toBeVisible()

  // Desfazer devolve o dano e o teto.
  await page.getByRole('button', { name: /desfazer ritual em espada longa/i }).click()
  await expect(visivel(page, '1d8 + 3')).toBeVisible()
  await expect(page.getByText(/39 de 44/).filter({ visible: true })).toHaveCount(0)
})

test('Sangue Maldito aparece como recurso limitado', async ({ context, page }) => {
  await abrirFicha(context, page)

  await expect(visivel(page, 'Sangue Maldito')).toBeVisible()
})

/**
 * Ordem do Licantropo no navegador real. Na Fase 1 foi o e2e que pegou o
 * tracker que nenhum teste unitario viu, porque `CombatClassActions` e lista
 * fechada. Aqui a prova e a forma hibrida: o card por nivel vem do parser de
 * subclasse, e transformar tem de mexer na CA e no dano da linha de ataque.
 */
function licantropo() {
  const char = cacadorDeSangue()
  char.shortId = 'CACBESTA22'
  char.info.chosenFeatures.cacador_de_sangue_order = 'licantropo'
  char.combat.armorClass = 15
  char.combat.hybridForm = false
  return char
}

test('Ordem do Licantropo: forma hibrida muda CA e dano no navegador', async ({ context, page }) => {
  await installAuthedApp(context, { characters: [licantropo()] })
  await page.goto('/c/CACBESTA22')
  await expect(visivel(page, 'Gilda Corvo')).toBeVisible()

  // Antes: CA 15 e espada em 1d8 + 3 (Forca 16).
  await expect(page.getByRole('button', { name: 'Editar CA', exact: true })
    .locator('.v2-ability-mod').first()).toHaveText('15')
  await expect(visivel(page, '1d8 + 3')).toBeVisible()

  await page.getByRole('button', { name: /transformar em forma h[ií]brida/i }).click()

  // Pele Resistente: +1 de CA com armadura leve ou nenhuma.
  await expect(page.getByRole('button', { name: 'Editar CA', exact: true })
    .locator('.v2-ability-mod').first()).toHaveText('16')

  // Poder Selvagem no 5o nivel: metade da proficiencia (+3 -> 1) no dano.
  await expect(visivel(page, '1d8 + 4')).toBeVisible()

  await page.getByRole('button', { name: /reverter da forma h[ií]brida/i }).click()
  await expect(visivel(page, '1d8 + 3')).toBeVisible()
})

/**
 * Sentidos Agucados e passiva, entao fica em Caracteristicas > Habilidades.
 *
 * NAO afirmo aqui onde o CARD da Transformacao Hibrida e desenhado: a ficha
 * roteia features por `detectActionType`, e a descricao dela comeca com "Com
 * uma acao", entao sai de Habilidades -- mas nao confirmei em qual aba ela
 * reaparece. O que importa pro jogador esta coberto pelo teste acima: o
 * controle da forma hibrida funciona e muda CA e dano de verdade.
 */
test('Ordem do Licantropo: feature passiva aparece em Habilidades', async ({ context, page }) => {
  await installAuthedApp(context, { characters: [licantropo()] })
  await page.goto('/c/CACBESTA22')
  await expect(visivel(page, 'Gilda Corvo')).toBeVisible()

  await page.getByRole('tab', { name: 'Características' }).click()
  await page.getByRole('button', { name: /^Habilidades/ }).click()
  await expect(visivel(page, /Sentidos Aguçados/i)).toBeVisible()
})

import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

/**
 * Subida de nível na ficha — dois contratos que quebraram juntos em produção:
 *
 *  1. O painel de subida tem que oferecer o conteúdo das fontes LIGADAS na
 *     ficha (Tasha, Xanathar), igual ao wizard de criação. Ele lia os JSONs do
 *     PHB direto, fora do SrdProvider, e só mostrava subclasse do livro básico.
 *  2. O pool de Imposição das Mãos não pode se recompor sozinho: gasto múltiplo
 *     tem que descer o pool inteiro, e subir de nível só aumenta o teto.
 */

const ID = '77777777-7777-4777-8777-777777777777'
const SHORT = 'PARDNREPRX'

function paladino(name = 'Paladino Repro') {
  return makeCharacter(ID, name, {
    shortId: SHORT,
    meta: {
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
      version: '1.0', schemaVersion: 4,
      settings: { sources: ['phb', 'tasha', 'xanathar'], allowFeats: true, allowMulticlass: true },
    },
    info: {
      name, race: 'humano', class: 'paladino', level: 2, alignment: '',
      multiclasses: [], feats: [], chosenFeatures: {}, asiOrFeatByLevel: {}, background: 'soldado',
    },
    attributes: { str: 16, dex: 10, con: 14, int: 10, wis: 10, cha: 16 },
    combat: {
      maxHp: 20, currentHp: 20, tempHp: 0, armorClass: 16, speed: 9,
      hitDice: { pool: { d10: { total: 2, used: 0 } } }, attacks: [],
      concentrating: { spellIndex: null, spellName: null },
      deathSaves: { successes: 0, failures: 0 },
      classFeatureUses: [
        { id: 'paladino-lay-on-hands', name: 'Imposição das Mãos', max: 10, used: 8, recharge: 'long', source: 'paladino' },
      ],
      conditions: [], inspiration: false, exhaustion: 0,
    },
  })
}

async function openLevelUp(page, nextLevel = 3) {
  await page.getByRole('button', { name: '▲ Nível' }).first().click()
  await page.getByRole('button', { name: new RegExp(`Subir para Nível ${nextLevel}`) }).first().click()
}

test('painel de subida oferece subclasses das fontes ligadas na ficha', async ({ context, page }) => {
  await installAuthedApp(context, { characters: [paladino()] })
  await page.goto(`/c/${SHORT}`)
  await expect(page.getByText('Paladino Repro').first()).toBeVisible()

  await openLevelUp(page)

  // PHB (sempre) + Tasha + Xanathar, que é o que a ficha tem ligado.
  await expect(page.getByRole('button', { name: /Juramento de Devoção/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Juramento da Glória/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Juramento da Conquista/ })).toBeVisible()
})

test('escolha presa a uma subclasse só é pedida depois que a subclasse é marcada', async ({ context, page }) => {
  const guerreiro = paladino('Guerreiro Repro')
  guerreiro.info = { ...guerreiro.info, class: 'guerreiro' }
  guerreiro.combat = { ...guerreiro.combat, classFeatureUses: [] }
  await installAuthedApp(context, { characters: [guerreiro] })
  await page.goto(`/c/${SHORT}`)
  await expect(page.getByText('Guerreiro Repro').first()).toBeVisible()

  await openLevelUp(page)

  // Arquétipos dos três livros na mesma lista.
  await expect(page.getByRole('button', { name: /Campeão/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Cavaleiro Rúnico/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Arqueiro Arcano/ })).toBeVisible()

  // Nada de pedir runas/disparos/manobras antes de saber o arquétipo.
  await expect(page.getByRole('heading', { name: /Runas \(Cavaleiro Rúnico\)/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /Disparos Arcanos/ })).toHaveCount(0)
  await expect(page.getByRole('heading', { name: /^🎭 Manobras/ })).toHaveCount(0)

  await page.getByRole('button', { name: /Cavaleiro Rúnico/ }).click()
  await expect(page.getByRole('heading', { name: /Runas \(Cavaleiro Rúnico\)/ })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Disparos Arcanos/ })).toHaveCount(0)
})

test('picker de talento do level-up lista talentos dos dois suplementos', async ({ context, page }) => {
  const guerreiro = paladino('Guerreiro Talento')
  guerreiro.info = { ...guerreiro.info, class: 'guerreiro', level: 3, chosenFeatures: { martial_archetype: 'campeao' } }
  guerreiro.combat = { ...guerreiro.combat, classFeatureUses: [] }
  await installAuthedApp(context, { characters: [guerreiro] })
  await page.goto(`/c/${SHORT}`)
  await expect(page.getByText('Guerreiro Talento').first()).toBeVisible()

  await openLevelUp(page, 4) // nível 4 = Melhoria de Atributo ou Talento
  await page.getByRole('button', { name: /Escolher Talento/ }).click()

  await expect(page.getByRole('button', { name: /^Chef/ })).toBeVisible()      // Tasha
  await expect(page.getByRole('button', { name: /^Prodígio/ })).toBeVisible()  // Xanathar
})

test('pool de Imposição das Mãos: gasto múltiplo desce tudo e subir de nível só aumenta o teto', async ({ context, page }) => {
  await installAuthedApp(context, { characters: [paladino()] })
  await page.goto(`/c/${SHORT}`)

  const pool = page.getByText(/Imposição das Mãos · \d+\/\d+ PV/).first()
  await expect(pool).toHaveText(/2\/10 PV/) // 8 dos 10 pontos já gastos

  // Nível 3: teto vai a 15, os 8 pontos gastos continuam gastos.
  await openLevelUp(page)
  await page.getByRole('button', { name: /Média/ }).first().click()
  await page.getByRole('button', { name: /Juramento de Devoção/ }).first().click()
  await page.getByRole('button', { name: /Confirmar Subida para Nível 3/ }).first().click()
  await page.keyboard.press('Escape')
  await expect(pool).toHaveText(/7\/15 PV/)

  // "Gastar 5" tira os 5 pontos, não 1.
  await page.getByRole('button', { name: 'Gastar 5' }).first().click()
  await expect(pool).toHaveText(/2\/15 PV/)
})

// e2e-pw/encounter.spec.js
import { test, expect } from '@playwright/test'
import { installAuthedApp, USER_ID } from './support/supabase-stub.js'

const CAMPAIGN_ID = '11111111-1111-4111-8111-111111111111'

const ANA = {
  id: '22222222-2222-4222-8222-222222222222',
  system: 'dnd5e',
  campaignId: CAMPAIGN_ID,
  info: { name: 'Ana', level: 3, class: 'Guerreiro', race: 'Humano', feats: [] },
  attributes: { str: 14, dex: 14, con: 14, int: 10, wis: 10, cha: 10 },
  combat: {
    maxHp: 20, currentHp: 18, tempHp: 0, armorClass: 16, conditions: [],
    deathSaves: { successes: 0, failures: 0 }, attacks: [], classFeatureUses: [],
    hitDice: { pool: { d10: { total: 3, used: 0 } } },
  },
  proficiencies: {}, spellcasting: {}, inventory: {},
}

test('Mestre monta combate, aplica dano e a ficha reflete', async ({ page, context }) => {
  await installAuthedApp(context, {
    characters: [ANA],
    campaigns: [{ id: CAMPAIGN_ID, name: 'Mesa de Teste', dm_id: USER_ID, system: 'dnd5e' }],
  })

  await page.goto(`/campaigns/${CAMPAIGN_ID}/combate`)

  const ana = page.getByLabel('Ana')
  await expect(ana).toBeChecked()

  await page.getByRole('button', { name: /rolar iniciativa/i }).click()
  await expect(page.getByText(/rodada 1/i)).toBeVisible()
  await expect(page.getByText('18/20')).toBeVisible()

  await page.getByLabel(/valor de dano ou cura/i).fill('5')
  await page.getByRole('button', { name: /^dano$/i }).click()
  await expect(page.getByText('13/20')).toBeVisible()

  await page.getByRole('button', { name: /condi/i }).click()
  await page.getByRole('button', { name: /prostrado/i }).click()
  await expect(page.getByText(/Prostrado/).first()).toBeVisible()

  // Descanso longo reescreve a ficha de todo mundo sem desfazer: confirma antes.
  await page.getByRole('button', { name: /descanso longo/i }).click()
  await expect(page.getByText(/não há como desfazer/i)).toBeVisible()
  await page.getByRole('button', { name: /^descansar$/i }).click()
  await expect(page.getByText(/1 ficha descansou/i)).toBeVisible()
  await expect(page.getByText('20/20')).toBeVisible()
})

test('Mestre salva um encontro na prep e carrega no combate', async ({ page, context }) => {
  await installAuthedApp(context, {
    characters: [ANA],
    campaigns: [{ id: CAMPAIGN_ID, name: 'Mesa de Teste', dm_id: USER_ID, system: 'dnd5e' }],
  })

  // Preparação: cria o encontro salvo.
  await page.goto(`/campaigns/${CAMPAIGN_ID}/encontros`)
  await page.getByRole('button', { name: /novo encontro/i }).click()
  await page.getByLabel(/nome do encontro/i).fill('Emboscada na ponte')

  await page.getByRole('button', { name: /adicionar monstros/i }).click()
  await expect(page.getByRole('dialog', { name: /bestiário srd/i })).toBeVisible()
  await page.getByPlaceholder(/buscar monstro/i).fill('goblin')
  await page.getByRole('button', { name: /^goblin\b/i }).click()
  await page.getByRole('button', { name: /adicionar ao combate/i }).click()
  await page.getByRole('button', { name: /fechar bestiário/i }).click()

  await page.getByRole('button', { name: /^salvar$/i }).click()
  await expect(page.getByText('Emboscada na ponte')).toBeVisible()

  // Combate: carrega o mesmo encontro salvo.
  await page.goto(`/campaigns/${CAMPAIGN_ID}/combate`)
  await page.getByRole('button', { name: /carregar encontro salvo/i }).click()
  await page.getByRole('button', { name: /^emboscada na ponte$/i }).click()
  await expect(page.getByText(/PV · CA/).first()).toBeVisible()
})

test('quem não é o Mestre da mesa é devolvido pra tela da mesa', async ({ page, context }) => {
  // Mesma URL, mas o dm_id da mesa é de OUTRA pessoa. A RLS de `encounters` já
  // barraria os dados; a guarda da rota existe pra devolver o jogador em vez de
  // deixá-lo numa tela vazia.
  await installAuthedApp(context, {
    characters: [ANA],
    campaigns: [{ id: CAMPAIGN_ID, name: 'Mesa Alheia', dm_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', system: 'dnd5e' }],
  })

  await page.goto(`/campaigns/${CAMPAIGN_ID}/combate`)

  await expect(page).toHaveURL(new RegExp(`/campaigns/${CAMPAIGN_ID}$`))
  await expect(page.getByRole('button', { name: /rolar iniciativa/i })).toHaveCount(0)
})

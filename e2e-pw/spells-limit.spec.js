import { test, expect } from '@playwright/test'
import { installAuthedApp } from './support/supabase-stub'
import { makeCharacter } from './support/fixtures'

// Magia CONCEDIDA (talento/subclasse/raça) não pode ocupar vaga de magia
// conhecida: o cabeçalho já descontava ("5/6 +1 concedida") mas o catálogo
// contava a lista crua e travava em 6/6, deixando a vaga livre inalcançável.
// Bardo nv 3: 6 magias conhecidas.
const SHORT = 'BARDXXMTBC'

test('magia de talento não gasta vaga de conhecida no catálogo', async ({ context, page }) => {
  const id = '77777777-7777-4777-8777-777777777777'
  await installAuthedApp(context, {
    characters: [makeCharacter(id, 'Ozzy Osbard', {
      shortId: SHORT,
      info: { name: 'Ozzy Osbard', race: 'humano', class: 'bardo', level: 3, alignment: '', multiclasses: [], feats: [], chosenFeatures: {}, asiOrFeatByLevel: {}, background: 'artista' },
      attributes: { str: 8, dex: 14, con: 14, int: 10, wis: 12, cha: 17 },
      spellcasting: {
        ability: 'cha', usedSlots: {}, pactSlotsUsed: 0,
        spells: [
          { id: 'sp1', index: 'curar-ferimentos',  name: 'Curar Ferimentos',  level: 1, school: 'Evocação' },
          { id: 'sp2', index: 'enfeiticar-pessoa', name: 'Enfeitiçar Pessoa', level: 1, school: 'Encantamento' },
          { id: 'sp3', index: 'palavra-curativa',  name: 'Palavra Curativa',  level: 1, school: 'Evocação' },
          { id: 'sp4', index: 'sono',              name: 'Sono',              level: 1, school: 'Encantamento' },
          { id: 'sp5', index: 'invisibilidade',    name: 'Invisibilidade',    level: 2, school: 'Ilusão' },
          {
            id: 'sp6', index: 'heroismo', name: 'Heroísmo', level: 1, school: 'Encantamento',
            alwaysPrepared: true, prepared: true, source: 'feat', sourceLabel: 'Tocado pelas Fadas',
          },
        ],
      },
    })],
  })
  await page.goto(`/c/${SHORT}`)
  await expect(page.getByText('Ozzy Osbard').first()).toBeVisible()

  await page.getByRole('tab', { name: 'Magias' }).first().click()
  const contador = page.locator('span').filter({ hasText: /^Magias conhecidas:/ }).first()
  await expect(contador).toHaveText(/5\/6/)

  // Catálogo no Nv 1: a vaga que sobra tem que estar utilizável.
  await page.getByRole('button', { name: /Adicionar magia/ }).click()
  await page.getByRole('button', { name: 'Nv 1', exact: true }).click()
  await expect(page.getByText(/Limite atingido/)).toHaveCount(0)

  // Usa a vaga: a sexta conhecida entra e AÍ sim o catálogo trava.
  await page.getByRole('button', { name: '+', exact: true }).first().click()
  await expect(contador).toHaveText(/6\/6/)
  await expect(page.getByText(/Limite atingido/)).toBeVisible()

  // A concedida continua fora da conta, e o rótulo diz de onde ela veio.
  await expect(contador).toHaveText(/\+1 concedida/)
})

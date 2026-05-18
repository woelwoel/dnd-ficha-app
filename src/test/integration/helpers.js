/**
 * Helpers para testes E2E (RTL).
 *
 * Os testes E2E renderizam componentes reais com SrdProvider — que faz
 * fetch() dos JSONs em /srd-data/. Em jsdom não há fetch real, então
 * mockamos global.fetch para servir o conteúdo dos arquivos físicos em
 * `public/srd-data/` via fs do Node.
 *
 * Também fornecemos um helper `clearStorage()` que limpa localStorage
 * entre testes, e `getStoredCharacters()` para inspecionar o estado.
 */
import fs from 'node:fs'
import path from 'node:path'
import { vi } from 'vitest'

const PUBLIC_DATA = path.resolve(process.cwd(), 'public/srd-data')

function loadFixture(filename) {
  const fullPath = path.join(PUBLIC_DATA, filename)
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8'))
}

/**
 * Mocka global.fetch para servir os JSONs reais do app.
 * Chame em beforeEach.
 */
export function mockSrdFetch() {
  global.fetch = vi.fn((url) => {
    const file = String(url).split('/').pop()
    try {
      const data = loadFixture(file)
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(data),
      })
    } catch {
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve([]),
      })
    }
  })
}

/**
 * Limpa localStorage entre testes. Useful para isolar fichas.
 */
export function clearStorage() {
  if (typeof localStorage !== 'undefined') localStorage.clear()
}

/**
 * Inspeção: retorna o array de personagens do localStorage.
 */
export function getStoredCharacters() {
  try {
    const raw = localStorage.getItem('dnd-app-characters')
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

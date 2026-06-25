import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const data = JSON.parse(
  fs.readFileSync(path.resolve('public/srd-data/tasha-class-choices-pt.json'), 'utf-8'),
)

describe('tasha-class-choices — bárbaro', () => {
  it('tem a chave barbaro com o choice primal_path', () => {
    expect(data.barbaro).toBeTruthy()
    const primalPath = data.barbaro.choices.find(c => c.id === 'primal_path')
    expect(primalPath).toBeTruthy()
    expect(primalPath.options.map(o => o.value).sort()).toEqual(['besta', 'magia-selvagem'])
  })

  it('opções não carregam source no arquivo cru (carimbo é em runtime, igual ao artífice)', () => {
    for (const cls of Object.values(data)) {
      for (const choice of cls.choices ?? []) {
        for (const opt of choice.options ?? []) {
          expect(opt.source).toBeUndefined()
        }
      }
    }
  })

  it('a subescolha Forma da Besta requer primal_path = besta e tem 3 armas naturais', () => {
    const beast = data.barbaro.choices.find(c => c.id === 'barbaro_beast_form')
    expect(beast.requires).toEqual({ primal_path: 'besta' })
    expect(beast.options.map(o => o.value).sort()).toEqual(['cauda', 'garras', 'mordida'])
  })

  it('values únicos dentro de cada choice e desc não-vazio', () => {
    for (const cls of Object.values(data)) {
      for (const choice of cls.choices ?? []) {
        const vals = (choice.options ?? []).map(o => o.value)
        expect(new Set(vals).size).toBe(vals.length)
        for (const opt of choice.options ?? []) {
          expect((opt.desc ?? '').length).toBeGreaterThan(20)
        }
      }
    }
  })
})

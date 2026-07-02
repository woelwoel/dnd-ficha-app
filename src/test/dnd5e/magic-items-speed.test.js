import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Nenhum item de D&D concede mais que +12m de deslocamento. Valor acima
// disso quase certamente está em pés (era pré-metros). Guarda contra
// regressão de unidade ao adicionar itens novos — o app inteiro usa metros.
describe('efeitos speed de itens mágicos estão em metros', () => {
  for (const f of ['phb-magic-items-pt.json', 'tasha-magic-items-pt.json']) {
    it(f, () => {
      const raw = JSON.parse(readFileSync(`public/srd-data/${f}`, 'utf8'))
      const items = Array.isArray(raw) ? raw : Object.values(raw).flat()
      for (const item of items) {
        for (const ef of item.effects ?? []) {
          if (ef.type === 'speed') {
            expect(ef.value, `${item.name} (${ef.value})`).toBeLessThanOrEqual(12)
          }
        }
      }
    })
  }
})

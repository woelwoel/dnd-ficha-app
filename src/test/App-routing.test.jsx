import { describe, it, expect } from 'vitest'
import { listSystems } from '../systems'

// Com 1 sistema registrado, o seletor de sistema é pulado no /new (NewRoute
// resolve direto pro único sistema). Este teste fixa o invariante de produto:
// enquanto só houver dnd5e, criar ficha NÃO pede escolha de sistema. Quando o
// 2o sistema entrar, este teste vira o lembrete de revisar o fluxo do seletor.
describe('roteamento por sistema', () => {
  it('com 1 sistema, listSystems tem comprimento 1 (picker é pulado)', () => {
    expect(listSystems()).toHaveLength(1)
    expect(listSystems()[0].id).toBe('dnd5e')
  })
})

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ROLE_ORDER, ROLE_DEFINITIONS } from '../systems/dnd5e/components/CharacterWizardV2/blocks/class/class-roles'

function loadJson(rel) {
  const url = new URL(rel, import.meta.url)
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8'))
}

const EXPECTED = {
  barbaro: ['DANO CORPO A CORPO', 'TANQUE'],
  bardo: ['SUPORTE', 'CONTROLE', 'UTILIDADE'],
  clerigo: ['CURA', 'SUPORTE', 'DANO MÁGICO'],
  druida: ['CURA', 'CONTROLE', 'INVOCAÇÃO'],
  guerreiro: ['DANO CORPO A CORPO', 'DANO À DISTÂNCIA', 'TANQUE'],
  monge: ['DANO CORPO A CORPO', 'UTILIDADE'],
  paladino: ['DANO CORPO A CORPO', 'CURA', 'TANQUE'],
  patrulheiro: ['DANO À DISTÂNCIA', 'UTILIDADE'],
  ladino: ['FURTIVIDADE', 'DANO À DISTÂNCIA', 'UTILIDADE'],
  feiticeiro: ['DANO MÁGICO', 'CONTROLE'],
  bruxo: ['DANO MÁGICO', 'CONTROLE', 'UTILIDADE'],
  mago: ['DANO MÁGICO', 'CONTROLE', 'INVOCAÇÃO'],
}

describe('roles nos dados de classe', () => {
  const phb = loadJson('../../public/srd-data/phb-classes-pt.json')
  const tasha = loadJson('../../public/srd-data/tasha-classes-pt.json')

  it('cada classe PHB tem o array roles esperado', () => {
    for (const [index, roles] of Object.entries(EXPECTED)) {
      const cls = phb.find(c => c.index === index)
      expect(cls, `classe ${index} não encontrada`).toBeTruthy()
      expect(cls.roles).toEqual(roles)
    }
  })

  it('Artífice (Tasha) tem roles', () => {
    const art = tasha.find(c => c.index === 'artifice')
    expect(art.roles).toEqual(['SUPORTE', 'UTILIDADE', 'INVOCAÇÃO'])
  })

  // Guarda contra typo em conteúdo futuro: um papel escrito errado no JSON
  // (ex.: "DANO CORPO-A-CORPO") cairia no estilo/definição de fallback sem
  // erro. ROLE_ORDER é o vocabulário canônico — todo papel no JSON deve estar
  // nele e ter definição.
  it('todo papel usado no JSON existe no vocabulário canônico (sem typos)', () => {
    const allRoles = [...phb, ...tasha].flatMap(c => c.roles ?? [])
    expect(allRoles.length).toBeGreaterThan(0)
    for (const role of allRoles) {
      expect(ROLE_ORDER, `papel desconhecido no JSON: "${role}"`).toContain(role)
      expect(ROLE_DEFINITIONS[role], `sem definição para "${role}"`).toBeTruthy()
    }
  })
})

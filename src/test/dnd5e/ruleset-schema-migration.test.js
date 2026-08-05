import { describe, it, expect } from 'vitest'
import { SCHEMA_VERSION, migrateCharacter, safeParseCharacter } from '../../systems/dnd5e/domain/characterSchema'
import { rulesetOf, DEFAULT_RULESET } from '../../systems/dnd5e/domain/rulesets'

// Inclui todos os campos obrigatórios no nível raiz de `characterSchema`
// (id, combat, proficiencies, spellcasting, inventory) — sem eles,
// `safeParseCharacter` reprova por campo ausente, mascarando o que este
// teste realmente quer verificar: a validação do enum `ruleset`.
const fichaV4 = () => ({
  id: 'test-id',
  meta: { createdAt: 'x', updatedAt: 'x', schemaVersion: 4, settings: { sources: ['phb'] } },
  info: { name: 'Velha', class: 'mago', level: 1 },
  attributes: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  combat: {
    maxHp: 10, currentHp: 10, tempHp: 0, armorClass: 10, speed: 9,
    hitDice: { pool: { d6: { total: 1, used: 0 } } },
    deathSaves: { successes: 0, failures: 0 },
  },
  proficiencies: { savingThrows: [], skills: [], expertiseSkills: [], backgroundSkills: [], armor: [], weapons: [], tools: [], languages: [] },
  spellcasting: { ability: null, usedSlots: {}, spells: [] },
  inventory: { currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 }, items: [] },
})

describe('migração v4 → v5', () => {
  it('SCHEMA_VERSION é 5', () => {
    expect(SCHEMA_VERSION).toBe(5)
  })
  it('carimba ruleset 2014 na ficha legada', () => {
    const out = migrateCharacter(fichaV4())
    expect(out.meta.settings.ruleset).toBe('2014')
    expect(out.meta.schemaVersion).toBe(5)
  })
  it('é idempotente: rodar duas vezes não muda o resultado', () => {
    const uma = migrateCharacter(fichaV4())
    const duas = migrateCharacter(uma)
    expect(duas.meta.settings.ruleset).toBe('2014')
    expect(duas.meta.schemaVersion).toBe(5)
  })
  it('não sobrescreve ruleset já declarado', () => {
    const doc = fichaV4()
    doc.meta.schemaVersion = 4
    doc.meta.settings.ruleset = '2024'
    expect(migrateCharacter(doc).meta.settings.ruleset).toBe('2024')
  })
  it('ficha sem meta.settings ganha settings com ruleset', () => {
    const doc = fichaV4()
    delete doc.meta.settings
    expect(migrateCharacter(doc).meta.settings.ruleset).toBe('2014')
  })
})

describe('validação do ruleset', () => {
  it('aceita 2024', () => {
    const doc = fichaV4()
    doc.meta.schemaVersion = 5
    doc.meta.settings.ruleset = '2024'
    expect(safeParseCharacter(doc).success).toBe(true)
  })
  it('REPROVA valor desconhecido em vez de cair calado no 2014', () => {
    const doc = fichaV4()
    doc.meta.schemaVersion = 5
    doc.meta.settings.ruleset = 'xpto'
    expect(safeParseCharacter(doc).success).toBe(false)
  })
  it('rulesetOf continua devolvendo 2014 quando o campo está ausente', () => {
    expect(rulesetOf({ meta: { settings: {} } })).toBe(DEFAULT_RULESET)
  })
})

describe('settingsSchema preserva chaves desconhecidas (rollback-safety)', () => {
  // Cenário: rollback de deploy pra uma versão anterior a este commit (sem
  // `ruleset` no shape) carrega uma ficha já carimbada '2024'. Se o parse
  // daquele código antigo descartasse o campo desconhecido e o app
  // autosalvasse nessa janela, a perda seria permanente — e quando o código
  // novo voltasse, `rulesetOf` trataria a ausência como '2014' por
  // definição, fazendo uma ficha 2024 real renderizar com as regras erradas
  // em silêncio. `settingsSchema` precisa de `.passthrough()` pra não apagar
  // campos de settings que o código rodando não conhece ainda (o inverso
  // também vale: uma versão futura de settings sendo lida por este código).
  it('mantém uma chave desconhecida em meta.settings depois do parse', () => {
    const doc = fichaV4()
    doc.meta.schemaVersion = 5
    doc.meta.settings = { sources: ['phb'], chaveFutura: 'x' }
    const r = safeParseCharacter(doc)
    expect(r.success).toBe(true)
    expect(r.data.meta.settings.chaveFutura).toBe('x')
  })
})

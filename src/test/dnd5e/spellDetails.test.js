import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolveSpellDetail, resolveSpellDetails } from '../../systems/dnd5e/domain/spellDetails'
import { buildCharacterWithSubclassSpells } from '../../systems/dnd5e/components/CharacterWizardV2/blocks/build-character'
import { INITIAL_DRAFT_V2 } from '../../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'

// Catálogo mínimo no formato do phb-spells-pt.json.
const CATALOG = [
  {
    index: 'maos-magicas', name: 'Mãos Mágicas', level: 0, school: 'Conjuração',
    casting_time: '1 ação', range: '9 metros', duration: '1 minuto',
    components: ['V', 'G'], ritual: false, concentration: false,
    desc: 'Uma mão espectral flutuante aparece em um ponto à sua escolha dentro do alcance.',
  },
  {
    index: 'convocar-familiar', name: 'Convocar Familiar', level: 1, school: 'Conjuração',
    casting_time: '1 hora', range: '3 metros', duration: 'Instantânea',
    components: ['V', 'G', 'M'], material: 'carvão, incenso e ervas', ritual: true,
    desc: 'Você ganha o serviço de um familiar, um espírito que assume a forma animal que você escolher.',
  },
  {
    index: 'falar-com-animais', name: 'Falar com Animais', level: 1, school: 'Adivinhação',
    casting_time: '1 ação', range: 'Pessoal', duration: '10 minutos',
    ritual: true, desc: 'Você ganha a habilidade de compreender e se comunicar verbalmente com bestas.',
  },
]

describe('resolveSpellDetail', () => {
  it('hidrata o truque racial (index sintético, casa pelo NOME)', () => {
    const stored = {
      index: 'racial-cantrip-maos-magicas', name: 'Mãos Mágicas', level: 0, school: '',
      desc: 'Truque racial (Alto Elfo — Inteligência).',
    }
    const out = resolveSpellDetail(stored, CATALOG)
    expect(out.desc).toMatch(/mão espectral flutuante/)
    expect(out.castingTime).toBe('1 ação')
    expect(out.range).toBe('9 metros')
    expect(out.duration).toBe('1 minuto')
    expect(out.components).toBe('V, G')
    expect(out.school).toBe('Conjuração')
  })

  it('preserva a identidade da magia guardada (index/name/prepared)', () => {
    const stored = {
      index: 'racial-cantrip-maos-magicas', name: 'Mãos Mágicas', level: 0,
      desc: 'Truque racial (Alto Elfo — Inteligência).', prepared: true, id: 'abc',
    }
    const out = resolveSpellDetail(stored, CATALOG)
    expect(out.index).toBe('racial-cantrip-maos-magicas')
    expect(out.id).toBe('abc')
    expect(out.prepared).toBe(true)
  })

  it('hidrata o familiar do Pacto da Corrente (index legado find-familiar)', () => {
    const stored = {
      index: 'find-familiar', name: 'Achar Familiar', level: 1, school: 'Conjuração',
      ritual: true, desc: 'Você evoca um espírito familiar que assume a forma de um animal.',
    }
    const out = resolveSpellDetail(stored, CATALOG)
    expect(out.desc).toMatch(/serviço de um familiar/)
    expect(out.castingTime).toBe('1 hora')
    expect(out.material).toBe('carvão, incenso e ervas')
    expect(out.index).toBe('find-familiar') // identidade preservada: a ficha salva depende dela
  })

  it('hidrata magia concedida por feature quando o index bate (Consciência Primordial)', () => {
    const stored = {
      index: 'falar-com-animais', name: 'Falar com Animais', level: 1,
      desc: 'Você compreende e se comunica verbalmente com bestas pela duração.',
      alwaysPrepared: true, sourceLabel: 'Consciência Primordial',
    }
    const out = resolveSpellDetail(stored, CATALOG)
    expect(out.desc).toMatch(/habilidade de compreender/)
    expect(out.sourceLabel).toBe('Consciência Primordial')
    expect(out.alwaysPrepared).toBe(true)
  })

  it('devolve a magia intacta quando não há correspondência no catálogo', () => {
    const stored = { index: 'magia-caseira', name: 'Magia Caseira', level: 2, desc: 'Descrição do mestre.' }
    expect(resolveSpellDetail(stored, CATALOG)).toEqual(stored)
  })

  it('não perde a descrição guardada se o catálogo não tiver texto', () => {
    const stored = { index: 'maos-magicas', name: 'Mãos Mágicas', level: 0, desc: 'texto da ficha' }
    const out = resolveSpellDetail(stored, [{ index: 'maos-magicas', name: 'Mãos Mágicas', level: 0 }])
    expect(out.desc).toBe('texto da ficha')
  })

  it('tolera catálogo ausente/vazio e magia nula', () => {
    const stored = { index: 'maos-magicas', name: 'Mãos Mágicas', level: 0 }
    expect(resolveSpellDetail(stored, null)).toBe(stored)
    expect(resolveSpellDetail(stored, [])).toBe(stored)
    expect(resolveSpellDetail(null, CATALOG)).toBe(null)
  })

  it('resolveSpellDetails hidrata a lista inteira', () => {
    const spells = [
      { index: 'racial-cantrip-maos-magicas', name: 'Mãos Mágicas', level: 0, desc: 'Truque racial (Alto Elfo — Inteligência).' },
      { index: 'find-familiar', name: 'Achar Familiar', level: 1, desc: 'Você evoca um espírito familiar que assume a forma de um animal.' },
    ]
    const out = resolveSpellDetails(spells, CATALOG)
    expect(out[0].desc).toMatch(/mão espectral/)
    expect(out[1].desc).toMatch(/serviço de um familiar/)
  })
})

/* ── Fim a fim: o que o wizard GRAVA na ficha ─────────────────────────── */

const SRD_SPELLS = [
  ...JSON.parse(readFileSync('public/srd-data/phb-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/tasha-spells-pt.json', 'utf8')),
  ...JSON.parse(readFileSync('public/srd-data/xanathar-spells-pt.json', 'utf8')),
]

const mago = { index: 'mago', hit_die: 6, spellcasting_ability: 'Inteligência' }

describe('build do wizard grava a magia de feature COMPLETA', () => {
  const baseDraft = {
    ...INITIAL_DRAFT_V2,
    name: 'Elanil', class: 'mago', level: 1,
    baseAttributes: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
    savingThrows: ['int', 'wis'],
  }

  it('truque racial do Alto Elfo sai com o texto do livro, não com "Truque racial (...)"', () => {
    const draft = { ...baseDraft, race: 'elfo', subrace: 'alto-elfo', racialCantrip: 'Mãos Mágicas' }
    const c = buildCharacterWithSubclassSpells(draft, mago, {}, SRD_SPELLS)
    const cantrip = c.spellcasting.spells.find(s => s.name === 'Mãos Mágicas')
    expect(cantrip).toBeTruthy()
    expect(cantrip.desc).not.toMatch(/^Truque racial/)
    expect(cantrip.desc.length).toBeGreaterThan(80)
    expect(cantrip.castingTime).toBeTruthy()
    expect(cantrip.range).toBeTruthy()
    expect(cantrip.duration).toBeTruthy()
  })

  it('familiar do Pacto da Corrente sai com o texto do livro', () => {
    const draft = {
      ...baseDraft, class: 'bruxo', level: 3,
      chosenFeatures: { ...(baseDraft.chosenFeatures ?? {}), pact_boon: 'corrente' },
    }
    const c = buildCharacterWithSubclassSpells(draft, { index: 'bruxo', hit_die: 8 }, {}, SRD_SPELLS)
    const familiar = c.spellcasting.spells.find(s => s.index === 'find-familiar')
    expect(familiar).toBeTruthy()
    expect(familiar.desc.length).toBeGreaterThan(80)
    expect(familiar.castingTime).toBeTruthy()
  })
})

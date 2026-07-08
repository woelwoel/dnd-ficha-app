import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Spells } from '../../systems/dnd5e/components/CharacterSheet/Spells'
import { SrdProvider } from '../../systems/dnd5e/data/SrdProvider'
import { mockSrdFetch } from './helpers'

const { rollCalls, rollState } = vi.hoisted(() => ({ rollCalls: [], rollState: { d20: 10 } }))
vi.mock('../../hooks/useDiceRoller', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    useDiceRoller: () => ({
      roll: (notation, label, opts = {}) => {
        rollCalls.push({ notation, label, opts })
        const m = String(notation).match(/^1d20([+-]\d+)?$/)
        if (m) {
          const mod = m[1] ? parseInt(m[1], 10) : 0
          return { notation, sides: 20, rolls: [rollState.d20], modifier: mod, total: rollState.d20 + mod, count: 1, mode: opts.mode ?? 'normal' }
        }
        return { notation, sides: 8, rolls: [5], modifier: 0, total: 5, count: 1, mode: 'normal' }
      },
      dice3d: false, setDice3d: () => {}, setDiceAccent: () => {},
      openPanel: () => {}, history: [], open: false, mode: 'normal',
    }),
  }
})

const MAGO = { index: 'mago', name: 'Mago', hit_die: 6, spellcasting_ability: 'Inteligência' }
const CLERIGO = { index: 'clerigo', name: 'Clérigo', hit_die: 8, spellcasting_ability: 'Sabedoria' }
const BRUXO = { index: 'bruxo', name: 'Bruxo', hit_die: 8, spellcasting_ability: 'Carisma' }

function makeChar(classIndex, ability, spells, level = 5) {
  return {
    info: { name: 'Teste', class: classIndex, level, race: 'humano', multiclasses: [] },
    attributes: { str: 8, dex: 14, con: 12, int: 16, wis: 16, cha: 16 },
    combat: {
      maxHp: 28, currentHp: 20, tempHp: 0, armorClass: 12, speed: 9, attacks: [],
      deathSaves: { successes: 0, failures: 0 },
      concentrating: { spellIndex: null, spellName: null },
    },
    spellcasting: { ability, usedSlots: {}, pactSlotsUsed: 0, spells },
  }
}

function Harness({ initial, classData, onApplyHealing = () => {}, spies = {} }) {
  const [character, setCharacter] = useState(initial)
  return (
    <SrdProvider>
      <Spells
        character={character}
        attributes={character.attributes}
        level={character.info.level}
        profBonus={3}
        classData={classData}
        onUpdateSpellcasting={() => {}}
        onAddSpell={() => {}}
        onRemoveSpell={() => {}}
        onTogglePrepared={() => {}}
        onToggleSlot={(lvl, used) => {
          spies.onToggleSlot?.(lvl, used)
          setCharacter(c => ({ ...c, spellcasting: { ...c.spellcasting, usedSlots: { ...c.spellcasting.usedSlots, [lvl]: used } } }))
        }}
        onSpendPactSlot={(qty) => {
          spies.onSpendPactSlot?.(qty)
          setCharacter(c => ({ ...c, spellcasting: { ...c.spellcasting, pactSlotsUsed: Math.min(qty, (c.spellcasting.pactSlotsUsed ?? 0) + 1) } }))
        }}
        onRegainPactSlot={() => {}}
        onSetConcentration={spies.onSetConcentration ?? (() => {})}
        onApplyHealing={onApplyHealing}
        onAddActiveEffect={spies.onAddActiveEffect ?? (() => {})}
      />
    </SrdProvider>
  )
}

const BOLA = { id: 's1', index: 'bola-de-fogo', name: 'Bola de Fogo', level: 3, school: 'Evocação', prepared: true }
const RAIO_FOGO = { id: 's2', index: 'raio-de-fogo', name: 'Raio de Fogo', level: 0, school: 'Evocação' }
const CURAR = { id: 's3', index: 'curar-ferimentos', name: 'Curar Ferimentos', level: 1, school: 'Evocação', prepared: true }

beforeEach(() => {
  mockSrdFetch()
  rollCalls.length = 0
  rollState.d20 = 10
})
afterEach(() => vi.restoreAllMocks())

async function openCastPicker(user) {
  const cast = await screen.findByRole('button', { name: 'Conjurar' })
  await user.click(cast)
}

describe('conjurar rola tudo (Mago)', () => {
  it('salvaguarda: gasta o slot e rola o dano com CD no label', async () => {
    const user = userEvent.setup()
    const onToggleSlot = vi.fn()
    render(<Harness initial={makeChar('mago', 'int', [BOLA])} classData={MAGO} spies={{ onToggleSlot }} />)
    await openCastPicker(user)
    await user.click(await screen.findByRole('button', { name: /^Nv 3/ }))
    expect(onToggleSlot).toHaveBeenCalledWith(3, 1)
    await waitFor(() => expect(rollCalls).toHaveLength(1))
    expect(rollCalls[0]).toMatchObject({ notation: '8d6' })
    expect(rollCalls[0].label).toBe('Bola de Fogo · dano (Nv 3) · CD 14 · salvaguarda de DES · metade no sucesso')
  })

  it('upcast: conjurar no Nv 5 rola 10d6', async () => {
    const user = userEvent.setup()
    render(<Harness initial={makeChar('mago', 'int', [BOLA], 9)} classData={MAGO} />)
    await openCastPicker(user)
    await user.click(await screen.findByRole('button', { name: /^Nv 5/ }))
    await waitFor(() => expect(rollCalls).toHaveLength(1))
    expect(rollCalls[0].notation).toBe('10d6')
  })

  it('truque rola direto sem gastar slot (ataque + dano escalonado)', async () => {
    const user = userEvent.setup()
    const onToggleSlot = vi.fn()
    render(<Harness initial={makeChar('mago', 'int', [RAIO_FOGO])} classData={MAGO} spies={{ onToggleSlot }} />)
    await user.click(await screen.findByRole('button', { name: 'Rolar Raio de Fogo' }))
    await waitFor(() => expect(rollCalls).toHaveLength(2))
    expect(onToggleSlot).not.toHaveBeenCalled()
    expect(rollCalls[0]).toMatchObject({ notation: '1d20+6' })
    expect(rollCalls[1]).toMatchObject({ notation: '2d10' })
  })

  it('nat 20 no truque de ataque rola dano com crit', async () => {
    const user = userEvent.setup()
    rollState.d20 = 20
    render(<Harness initial={makeChar('mago', 'int', [RAIO_FOGO])} classData={MAGO} />)
    await user.click(await screen.findByRole('button', { name: 'Rolar Raio de Fogo' }))
    await waitFor(() => expect(rollCalls).toHaveLength(2))
    expect(rollCalls[1].opts).toEqual({ crit: true })
    expect(rollCalls[1].label).toContain('CRÍTICO')
  })

  it('nat 1 para no ataque (sem dano)', async () => {
    const user = userEvent.setup()
    rollState.d20 = 1
    render(<Harness initial={makeChar('mago', 'int', [RAIO_FOGO])} classData={MAGO} />)
    await user.click(await screen.findByRole('button', { name: 'Rolar Raio de Fogo' }))
    await waitFor(() => expect(rollCalls).toHaveLength(1))
  })

  it('magia sem mecanica: conjura gasta o slot e NAO rola nada', async () => {
    const user = userEvent.setup()
    const onToggleSlot = vi.fn()
    const SEM = { id: 's9', index: 'compreender-idiomas', name: 'Compreender Idiomas', level: 1, school: 'Adivinhação', prepared: true }
    render(<Harness initial={makeChar('mago', 'int', [SEM])} classData={MAGO} spies={{ onToggleSlot }} />)
    await openCastPicker(user)
    await user.click(await screen.findByRole('button', { name: /^Nv 1/ }))
    expect(onToggleSlot).toHaveBeenCalledWith(1, 1)
    expect(rollCalls).toHaveLength(0)
  })
})

describe('cura aplicavel (Clerigo)', () => {
  it('rola a cura com mod e o botao Aplicar chama onApplyHealing com o total', async () => {
    const user = userEvent.setup()
    const onApplyHealing = vi.fn()
    render(<Harness initial={makeChar('clerigo', 'wis', [CURAR])} classData={CLERIGO} onApplyHealing={onApplyHealing} />)
    await openCastPicker(user)
    await user.click(await screen.findByRole('button', { name: /^Nv 1/ }))
    await waitFor(() => expect(rollCalls).toHaveLength(1))
    expect(rollCalls[0].notation).toBe('1d8+3')
    const apply = await screen.findByRole('button', { name: /Aplicar 5 PV/ })
    await user.click(apply)
    expect(onApplyHealing).toHaveBeenCalledWith(5)
  })
})

describe('Pact Magic (Bruxo)', () => {
  it('chip Pacto aparece, gasta pact slot e rola no nivel do pacto', async () => {
    const user = userEvent.setup()
    const onSpendPactSlot = vi.fn()
    render(<Harness initial={makeChar('bruxo', 'cha', [BOLA])} classData={BRUXO} spies={{ onSpendPactSlot }} />)
    await openCastPicker(user)
    const pact = await screen.findByRole('button', { name: /^Pacto Nv 3/ })
    await user.click(pact)
    expect(onSpendPactSlot).toHaveBeenCalled()
    await waitFor(() => expect(rollCalls).toHaveLength(1))
    expect(rollCalls[0].notation).toBe('8d6')
    expect(rollCalls[0].label).toContain('(Nv 3)')
  })
})

describe('efeitos ativos no cast', () => {
  it('magia de buff com alcance nao-Pessoal mostra o botao Aplicar em voce', async () => {
    const user = userEvent.setup()
    const onAddActiveEffect = vi.fn()
    const onSetConcentration = vi.fn()
    const ESCUDO_SPELL = { id: 's5', index: 'escudo-da-fe', name: 'Escudo da Fé', level: 1, school: 'Abjuração', prepared: true, range: '18 metros' }
    render(<Harness initial={makeChar('clerigo', 'wis', [ESCUDO_SPELL])} classData={CLERIGO} spies={{ onAddActiveEffect, onSetConcentration }} />)
    await openCastPicker(user)
    await user.click(await screen.findByRole('button', { name: /^Nv 1/ }))
    expect(onAddActiveEffect).not.toHaveBeenCalled()
    await user.click(await screen.findByRole('button', { name: /Aplicar em você/ }))
    expect(onAddActiveEffect).toHaveBeenCalledWith(expect.objectContaining({ id: 'escudo-da-fe', source: 'cast' }))
    expect(onSetConcentration).toHaveBeenCalled()
  })

  it('alcance Pessoal aplica o efeito direto, sem prompt', async () => {
    const user = userEvent.setup()
    const onAddActiveEffect = vi.fn()
    const BUFF_SELF = { id: 's6', index: 'bencao', name: 'Bênção', level: 1, school: 'Encantamento', prepared: true, range: 'Pessoal' }
    render(<Harness initial={makeChar('clerigo', 'wis', [BUFF_SELF])} classData={CLERIGO} spies={{ onAddActiveEffect }} />)
    await openCastPicker(user)
    await user.click(await screen.findByRole('button', { name: /^Nv 1/ }))
    expect(onAddActiveEffect).toHaveBeenCalledWith(expect.objectContaining({ id: 'bencao', source: 'cast' }))
    expect(screen.queryByRole('button', { name: /Aplicar em você/ })).not.toBeInTheDocument()
  })
})

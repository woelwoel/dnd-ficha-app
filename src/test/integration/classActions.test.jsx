import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CombatClassActions } from '../../components/CharacterSheet/CombatClassActions'
import { DiceRollerProvider } from '../../context/DiceRollerContext'
import { defaultClassFeatureUses } from '../../domain/rules'

// Catálogo de bestas mockado pro WildShapePanel
const BEASTS_FIXTURE = {
  beasts: [
    {
      index: 'wolf', name: 'Lobo', nameEn: 'Wolf', cr: 0.25, crLabel: '1/4',
      size: 'Médio', ac: 13, hp: 11, hitDice: '2d8+2',
      speed: { walk: { ft: 40, m: 12, label: 'caminhar' } },
      str: 12, dex: 15, con: 12, int: 3, wis: 12, cha: 6,
      senses: { passive_perception: 13 },
      damageResistances: [], damageImmunities: [], conditionImmunities: [],
      attacks: [{ name: 'Mordida', attackBonus: 4, damageDice: '2d4+2', damageType: 'perfuração', desc: '' }],
      traits: [],
    },
    {
      index: 'brown-bear', name: 'Urso Pardo', nameEn: 'Brown Bear', cr: 1, crLabel: '1',
      size: 'Grande', ac: 11, hp: 34, hitDice: '4d10+12',
      speed: { walk: { ft: 40, m: 12, label: 'caminhar' }, climb: { ft: 30, m: 9, label: 'escalar' } },
      str: 19, dex: 10, con: 16, int: 2, wis: 13, cha: 7,
      senses: {}, damageResistances: [], damageImmunities: [], conditionImmunities: [],
      attacks: [{ name: 'Mordida', attackBonus: 5, damageDice: '1d8+4', damageType: 'perfuração', desc: '' }],
      traits: [],
    },
    {
      index: 'eagle', name: 'Águia', nameEn: 'Eagle', cr: 0, crLabel: '0',
      size: 'Pequeno', ac: 12, hp: 3, hitDice: '1d6',
      speed: { walk: { ft: 10, m: 3, label: 'caminhar' }, fly: { ft: 60, m: 18, label: 'voar' } },
      str: 6, dex: 15, con: 10, int: 2, wis: 14, cha: 7,
      senses: {}, damageResistances: [], damageImmunities: [], conditionImmunities: [],
      attacks: [{ name: 'Garras', attackBonus: 4, damageDice: '1d4+2', damageType: 'corte', desc: '' }],
      traits: [],
    },
  ],
}

/* ─────────────────────────────────────────────────────────────────────
   E2E — Recursos de Classe em Combate

   Cobre os painéis de classe específicos:
   - Ladino: Ataque Furtivo (dado por nível)
   - Bárbaro: Rage toggle
   - Paladino: Smite (consome slot)
   - Bardo: Bardic Inspiration
   - Monge: Ki spending
   - Feiticeiro: Sorcery Points
   - Druida: Wild Shape
   - Guerreiro: Second Wind / Action Surge
   ────────────────────────────────────────────────────────────────────*/

function baseCharacter(classIndex, level, multiclasses = []) {
  const c = {
    info: { name: `Test ${classIndex}`, class: classIndex, level, race: 'humano', multiclasses },
    attributes: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 14 },
    combat: {
      maxHp: 40, currentHp: 40, tempHp: 0, armorClass: 14, speed: 30,
      attacks: [], deathSaves: { successes: 0, failures: 0 },
      concentrating: { spellIndex: null, spellName: null },
      classFeatureUses: [],
    },
    spellcasting: { ability: null, usedSlots: {}, spells: [] },
  }
  c.combat.classFeatureUses = defaultClassFeatureUses(c)
  return c
}

function ControlledActions({ initial }) {
  const [character, setCharacter] = useState(initial)
  return (
    <DiceRollerProvider>
      <CombatClassActions
        character={character}
        onToggleRage={(active) => setCharacter(c => ({ ...c, combat: { ...c.combat, rageActive: active } }))}
        onSpendFeatureUse={(id) =>
          setCharacter(c => ({
            ...c,
            combat: {
              ...c.combat,
              classFeatureUses: c.combat.classFeatureUses.map(u =>
                u.id === id ? { ...u, used: Math.min(u.max, (u.used ?? 0) + 1) } : u
              ),
            },
          }))
        }
        onRegainFeatureUse={(id) =>
          setCharacter(c => ({
            ...c,
            combat: {
              ...c.combat,
              classFeatureUses: c.combat.classFeatureUses.map(u =>
                u.id === id ? { ...u, used: Math.max(0, (u.used ?? 0) - 1) } : u
              ),
            },
          }))
        }
        onToggleSlot={(lvl, used) =>
          setCharacter(c => ({ ...c, spellcasting: { ...c.spellcasting, usedSlots: { ...c.spellcasting.usedSlots, [lvl]: used } } }))
        }
        onSetWildShape={(ws) =>
          setCharacter(c => ({ ...c, combat: { ...c.combat, wildShape: ws ?? { active: false, beastName: '', currentHp: 0, maxHp: 0 } } }))
        }
      />
    </DiceRollerProvider>
  )
}

describe('CombatClassActions E2E', () => {
  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    // Mock fetch para o catálogo de bestas usado pelo WildShapePanel
    global.fetch = vi.fn(() => Promise.resolve({ json: () => Promise.resolve(BEASTS_FIXTURE) }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Ladino', () => {
    it('exibe Ataque Furtivo com dado calculado por nível', () => {
      render(<ControlledActions initial={baseCharacter('ladino', 5)} />)
      expect(screen.getByText(/Ataque Furtivo/i)).toBeInTheDocument()
      // Nv 5 → ⌈5/2⌉ = 3 → 3d6
      expect(screen.getByText('3d6')).toBeInTheDocument()
    })

    it('escala corretamente no nível 11 (6d6)', () => {
      render(<ControlledActions initial={baseCharacter('ladino', 11)} />)
      expect(screen.getByText('6d6')).toBeInTheDocument()
    })
  })

  describe('Bárbaro', () => {
    it('inicia sem fúria; ativar muda banner para EM FÚRIA', async () => {
      const user = userEvent.setup()
      render(<ControlledActions initial={baseCharacter('barbaro', 3)} />)
      expect(screen.getByText('Fúria')).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: /Entrar em Fúria/i }))
      await waitFor(() => expect(screen.getByText('EM FÚRIA')).toBeInTheDocument())
      // Botão muda para Encerrar
      expect(screen.getByRole('button', { name: /Encerrar/i })).toBeInTheDocument()
    })

    it('mostra +2 de bônus no Bárbaro Nv 3', () => {
      render(<ControlledActions initial={baseCharacter('barbaro', 3)} />)
      expect(screen.getByText(/\+2/)).toBeInTheDocument()
    })

    it('mostra +3 no Bárbaro Nv 9 e +4 no Nv 16', () => {
      const { unmount } = render(<ControlledActions initial={baseCharacter('barbaro', 9)} />)
      expect(screen.getByText(/\+3/)).toBeInTheDocument()
      unmount()
      render(<ControlledActions initial={baseCharacter('barbaro', 16)} />)
      expect(screen.getByText(/\+4/)).toBeInTheDocument()
    })
  })

  describe('Paladino', () => {
    it('Smite aparece a partir do Nv 2 e expõe botão por nível de espaço', async () => {
      const initial = baseCharacter('paladino', 5)
      // Paladino 5 (half-caster): slots 1°=4, 2°=2
      initial.spellcasting.usedSlots = {}
      render(<ControlledActions initial={initial} />)
      expect(screen.getByText('Golpe Divino')).toBeInTheDocument()
      // Botões inline por nível de espaço (sem mais click "Aplicar" pra expandir).
      // Cada botão mostra "Nv X" + "×N" disponíveis + "Yd8" do dano.
      const buttons = screen.getAllByRole('button')
      const smiteButtons = buttons.filter(b => /Nv\s*\d/i.test(b.textContent ?? ''))
      // Paladino 5: pelo menos 1 botão de Nv 1 e 1 de Nv 2
      expect(smiteButtons.length).toBeGreaterThanOrEqual(2)
      expect(smiteButtons.some(b => /Nv\s*1.*2d8/i.test(b.textContent ?? ''))).toBe(true)
      expect(smiteButtons.some(b => /Nv\s*2.*3d8/i.test(b.textContent ?? ''))).toBe(true)
    })

    it('Lay on Hands tem pool = 5 × nível', () => {
      render(<ControlledActions initial={baseCharacter('paladino', 5)} />)
      // 5 × 5 = 25 PV
      expect(screen.getByText('25/25 PV')).toBeInTheDocument()
    })

    it('Lay on Hands botão Gastar 5 consome do pool', async () => {
      const user = userEvent.setup()
      render(<ControlledActions initial={baseCharacter('paladino', 5)} />)
      await user.click(screen.getByRole('button', { name: /Gastar 5/i }))
      // Pool agora deve ser 20/25
      await waitFor(() => expect(screen.getByText('20/25 PV')).toBeInTheDocument())
    })
  })

  describe('Bardo', () => {
    it('Inspiração de Bardo aparece com dado por nível', () => {
      render(<ControlledActions initial={baseCharacter('bardo', 5)} />)
      // Nv 5 → d8
      expect(screen.getByText('(1d8)')).toBeInTheDocument()
    })

    it('botão Conceder gasta um uso', async () => {
      const user = userEvent.setup()
      render(<ControlledActions initial={baseCharacter('bardo', 5)} />)
      // CHA 14 → mod 2 → 2 usos. Restantes inicial = 2
      expect(screen.getByText(/Restantes:/)).toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Conceder' }))
      // Restantes deve cair para 1
      await waitFor(() => {
        const strong = screen.getByText('1')
        expect(strong).toBeInTheDocument()
      })
    })
  })

  describe('Monge', () => {
    it('Ki aparece a partir do Nv 2 com contador = nível', () => {
      render(<ControlledActions initial={baseCharacter('monge', 5)} />)
      expect(screen.getByText(/Ki ·/)).toBeInTheDocument()
      expect(screen.getByText('5/5')).toBeInTheDocument()
    })

    it('gastar 1 ki em "Rajada de Golpes" decrementa pool', async () => {
      const user = userEvent.setup()
      render(<ControlledActions initial={baseCharacter('monge', 5)} />)
      await user.click(screen.getByRole('button', { name: /Rajada de Golpes/i }))
      await waitFor(() => expect(screen.getByText('4/5')).toBeInTheDocument())
    })
  })

  describe('Feiticeiro', () => {
    it('Pontos de Feitiçaria aparecem com contador igual ao nível', () => {
      render(<ControlledActions initial={baseCharacter('feiticeiro', 5)} />)
      expect(screen.getByText(/Feitiçaria · Pontos:/)).toBeInTheDocument()
      expect(screen.getByText('5/5')).toBeInTheDocument()
    })

    it('Metamagia disponível apenas no nível 3+', () => {
      render(<ControlledActions initial={baseCharacter('feiticeiro', 5)} />)
      // Aba Metamagia deve estar ativa por padrão
      expect(screen.getByRole('button', { name: /Cuidadosa/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Acelerada/ })).toBeInTheDocument()
    })

    it('Conversão Flexível mostra tabela bidirecional', async () => {
      const user = userEvent.setup()
      render(<ControlledActions initial={baseCharacter('feiticeiro', 5)} />)
      await user.click(screen.getByRole('button', { name: /^Conversão Flexível$/i }))
      // 2pt → Nv 1 e Nv 1 → +1pt aparecem
      expect(await screen.findByRole('button', { name: /2pt → Nv 1/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Nv 1 → \+1pt/i })).toBeInTheDocument()
    })
  })

  describe('Druida', () => {
    it('Wild Shape aparece a partir do Nv 2 com CR ≤ 1/4', () => {
      render(<ControlledActions initial={baseCharacter('druida', 2)} />)
      expect(screen.getByText('Forma Selvagem')).toBeInTheDocument()
      expect(screen.getByText(/CR ≤ 1\/4/i)).toBeInTheDocument()
    })

    it('CR escala: Nv 4 → 1/2, Nv 8 → 1', () => {
      const { unmount } = render(<ControlledActions initial={baseCharacter('druida', 4)} />)
      expect(screen.getByText(/CR ≤ 1\/2/i)).toBeInTheDocument()
      unmount()
      render(<ControlledActions initial={baseCharacter('druida', 8)} />)
      expect(screen.getByText(/CR ≤ 1/i)).toBeInTheDocument()
    })

    it('transformação via picker de bestas cria estado wildShape ativo', async () => {
      const user = userEvent.setup()
      render(<ControlledActions initial={baseCharacter('druida', 4)} />)
      await user.click(screen.getByRole('button', { name: /^Transformar$/i }))
      // Picker aparece e carrega catálogo — Lobo está disponível (CR 1/4)
      const lobo = await screen.findByRole('button', { name: /Lobo/i })
      await user.click(lobo)
      // Banner verde aparece
      await waitFor(() => expect(screen.getByText(/EM FORMA SELVAGEM — Lobo/)).toBeInTheDocument())
      expect(screen.getByText('11/11')).toBeInTheDocument()
      // Stat block mostra AC e ataque
      expect(screen.getByText('Mordida')).toBeInTheDocument()
    })
  })

  describe('Guerreiro', () => {
    it('Retomar o Fôlego aparece com 1d10+nível', () => {
      render(<ControlledActions initial={baseCharacter('guerreiro', 5)} />)
      expect(screen.getByText('Retomar o Fôlego')).toBeInTheDocument()
      expect(screen.getByText(/1d10\+5/)).toBeInTheDocument()
    })

    it('Surto de Ação aparece no nível 2 com 1 uso', () => {
      render(<ControlledActions initial={baseCharacter('guerreiro', 5)} />)
      expect(screen.getByText('Surto de Ação')).toBeInTheDocument()
    })

    it('botão Usar consome 1 surto', async () => {
      const user = userEvent.setup()
      render(<ControlledActions initial={baseCharacter('guerreiro', 5)} />)
      // Pega botão Usar (Surto)
      const usarBtn = screen.getByRole('button', { name: /^Usar$/ })
      await user.click(usarBtn)
      await waitFor(() => expect(usarBtn).toBeDisabled())
    })
  })
})

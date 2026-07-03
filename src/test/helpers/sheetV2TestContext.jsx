// src/test/helpers/sheetV2TestContext.jsx
// Render helper pros componentes v2 (que consomem useCharacterContext).
import { render } from '@testing-library/react'
import { CharacterProvider } from '../../systems/dnd5e/components/CharacterSheet/CharacterContext'

export function makeCharacter(overrides = {}) {
  return {
    id: 'test-1',
    info: {
      name: 'THOR', race: 'human', subrace: '', class: 'fighter', level: 13,
      background: 'outlander', alignment: 'Neutro', playerName: 'Gabriel', xp: 0,
    },
    attributes: { str: 20, dex: 13, con: 18, int: 18, wis: 9, cha: 8 },
    proficiencies: {
      skills: ['athletics', 'acrobatics', 'arcana', 'investigation'],
      expertiseSkills: ['athletics'],
      languages: ['Comum', 'Anão'],
    },
    combat: {
      maxHp: 131, currentHp: 97, tempHp: 0, armorClass: 11, speed: 9,
      conditions: ['poisoned'], inspiration: true, exhaustion: 2,
      attacks: [], classFeatureUses: [],
    },
    spellcasting: { spells: [], slots: [], usedSlots: [] },
    inventory: { items: [], currency: {} },
    traits: {},
    meta: { settings: { sources: ['phb'] } },
    ...overrides,
  }
}

export function makeCalc(overrides = {}) {
  const mods = { str: 5, dex: 1, con: 4, int: 4, wis: -1, cha: -1 }
  return {
    profBonus: 5,
    mods,
    effectiveAttrs: { str: 20, dex: 13, con: 18, int: 18, wis: 9, cha: 8 },
    savingThrows: { str: 5, dex: 1, con: 9, int: 9, wis: -1, cha: -1 },
    passivePerception: 9,
    initiative: 1,
    hpPercent: 74,
    hpColor: 'green',
    suggestedAC: 11,
    suggestedMaxHp: 131,
    featSpeedBonus: 0,
    fmt: n => (n >= 0 ? `+${n}` : `${n}`),
    ...overrides,
  }
}

const noop = () => {}
const noopBag = new Proxy({}, { get: () => noop })

export function renderWithSheetContext(ui, { character, calc, ...rest } = {}) {
  const value = {
    character: character ?? makeCharacter(),
    setCharacter: noop,
    calc: calc ?? makeCalc(),
    classData: null,
    races: [], classes: [], backgrounds: [],
    updaters: noopBag,
    handlers: noopBag,
    fichaErrors: {},
    featureUses: [],
    readOnly: false,
    onNavigateToSpells: noop,
    focusSpellId: null,
    clearFocusSpell: noop,
    ...rest,
  }
  return render(<CharacterProvider value={value}>{ui}</CharacterProvider>)
}

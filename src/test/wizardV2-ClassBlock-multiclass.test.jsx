// src/test/wizardV2-ClassBlock-multiclass.test.jsx
//
// Garante que ao adicionar uma classe como MULTICLASSE no Wizard, todos os
// pickers de escolha (subclasse, estilo de combate, especialização etc.) da
// classe secundária aparecem — o que ANTES estava quebrado: o stripe da MC
// só mostrava "Nome · Nv X · 🗑", deixando o jogador sem como escolher
// Origem do Feiticeiro, Domínio do Clérigo, Patrono do Bruxo, etc.
//
// Cobre as 12 classes oficiais do PHB. Usa os dados reais de
// public/srd-data/ pra blindar contra regressão na shape dos JSONs.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClassBlock } from '../systems/dnd5e/components/CharacterWizardV2/blocks/ClassBlock'
import { INITIAL_DRAFT_V2 } from '../systems/dnd5e/components/CharacterWizardV2/hooks/useDraft'

function loadJson(rel) {
  return JSON.parse(readFileSync(resolve(process.cwd(), rel), 'utf8'))
}

const classChoicesData    = loadJson('public/srd-data/phb-class-choices-pt.json')
const classProgressionRaw = loadJson('public/srd-data/phb-class-progression-full-pt.json')
const multiclassData      = loadJson('public/srd-data/phb-multiclass-pt.json')

const ALL_CLASSES = [
  { index: 'barbaro',    name: 'Bárbaro',     hit_die: 12 },
  { index: 'bardo',      name: 'Bardo',       hit_die: 8,  spellcasting_ability: 'Carisma' },
  { index: 'clerigo',    name: 'Clérigo',     hit_die: 8,  spellcasting_ability: 'Sabedoria' },
  { index: 'druida',     name: 'Druida',      hit_die: 8,  spellcasting_ability: 'Sabedoria' },
  { index: 'feiticeiro', name: 'Feiticeiro',  hit_die: 6,  spellcasting_ability: 'Carisma' },
  { index: 'guerreiro',  name: 'Guerreiro',   hit_die: 10 },
  { index: 'ladino',     name: 'Ladino',      hit_die: 8 },
  { index: 'mago',       name: 'Mago',        hit_die: 6,  spellcasting_ability: 'Inteligência' },
  { index: 'monge',      name: 'Monge',       hit_die: 8 },
  { index: 'paladino',   name: 'Paladino',    hit_die: 10, spellcasting_ability: 'Carisma' },
  { index: 'patrulheiro',name: 'Patrulheiro', hit_die: 10, spellcasting_ability: 'Sabedoria' },
  { index: 'bruxo',      name: 'Bruxo',       hit_die: 8,  spellcasting_ability: 'Carisma' },
].map(c => ({ ...c, saving_throws: ['Constituição', 'Sabedoria'] })) // bobagem ok pro render

// Pega a maior level que tenha pelo menos uma choice — assim cobrimos a
// classe inteira. Se a classe não tem choice nenhuma, usamos 1.
function topChoiceLevel(clsIdx) {
  const choices = classChoicesData[clsIdx]?.choices ?? []
  if (!choices.length) return 1
  return Math.max(...choices.map(c => c.level))
}

// Choices "base" — as que não dependem de outra escolha pra aparecer.
// As condicionais (ex: maneuvers do Mestre de Combate) surgem só depois
// que o jogador escolhe o arquétipo correspondente, então não testamos.
function baseChoiceNames(clsIdx) {
  return (classChoicesData[clsIdx]?.choices ?? [])
    .filter(c => !c.requires)
    .map(c => c.featureName)
}

describe('ClassBlock — multiclasse renderiza pickers de TODAS as classes', () => {
  // Primary sempre Mago lvl 5 só pra render funcionar; o foco é a MC.
  // baseAttributes preenchidos pra liberar "Multiclasse" (attributesReady).
  const baseDraft = {
    ...INITIAL_DRAFT_V2,
    class: 'mago',
    level: 5,
    settings: { ...INITIAL_DRAFT_V2.settings, allowMulticlass: true },
    baseAttributes: { str: 13, dex: 13, con: 13, int: 13, wis: 13, cha: 13 },
  }

  for (const cls of ALL_CLASSES) {
    // Quando a classe sob teste É o primário (mago), trocamos o primário pra
    // outra qualquer (guerreiro) só pra liberar este caso de teste e cobrir
    // TODAS as 12 classes como multiclasse.
    const primaryClass = cls.index === 'mago' ? 'guerreiro' : 'mago'
    const mcLevel = topChoiceLevel(cls.index)
    const expectedNames = baseChoiceNames(cls.index)

    it(`MC ${cls.name} nv ${mcLevel} → mostra todos os pickers base (${expectedNames.length})`, () => {
      const draft = {
        ...baseDraft,
        class: primaryClass,
        multiclasses: [{
          class: cls.index,
          level: mcLevel,
          chosenFeatures: {},
          asiChoices: {},
          bonusSpells: [],
          hitDie: cls.hit_die,
        }],
      }

      const { container } = render(<ClassBlock
        draft={draft}
        updateDraft={() => {}}
        classes={ALL_CLASSES}
        classChoices={classChoicesData}
        classProgression={classProgressionRaw}
        feats={[]}
        multiclassData={multiclassData}
      />)
      const allText = container.textContent || ''

      // Cada featureName tem que aparecer em ALGUM lugar da árvore renderizada.
      // Usamos regex case-insensitive porque o LevelProgressionList renderiza
      // o nome com case original em vários tipos de elementos.
      // Texto completo do bloco renderizado, sem distinção de elemento.
      // Tolerante a quebras (HTML pode quebrar o texto em vários spans).
      for (const featureName of expectedNames) {
        expect(
          allText,
          `Esperava encontrar "${featureName}" no DOM ao adicionar ${cls.name} como MC nv ${mcLevel}`,
        ).toContain(featureName)
      }
    })
  }
})

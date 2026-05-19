// src/components/CharacterWizardV2/blocks/build-character.js
import { generateId } from '../../../hooks/useCharacter'
import { calculateMaxHp, getModifier } from '../../../utils/calculations'
import { injectSubclassSpellsAtBuild } from '../../../domain/subclassSpells'

export function resolveClassEquipmentItems(draft, classEquipment) {
  if (draft.classEquipmentChoice !== 'equipment') return []
  const classData = classEquipment?.[draft.class]
  if (!classData) return []
  const items = []

  for (const choice of classData.choices ?? []) {
    const selectedOption = draft.classEquipmentChoices?.[choice.id]
    if (!selectedOption) continue
    const opt = choice.options.find(o => o.value === selectedOption)
    if (!opt) continue
    ;(opt.items ?? []).forEach((item, itemIdx) => {
      if (item.pick) {
        const pickKey = `${choice.id}:${selectedOption}:${itemIdx}`
        const pickedName = draft.classEquipmentPicks?.[pickKey]
        if (pickedName) items.push({ name: pickedName, qty: 1, source: 'class' })
      } else {
        items.push({ name: item.name, qty: item.qty, source: 'class' })
      }
    })
  }

  for (const item of classData.fixed ?? []) {
    if (item.pick) {
      const pickKey = `fixed:${item.name}`
      const pickedName = draft.classEquipmentPicks?.[pickKey]
      if (pickedName) items.push({ name: pickedName, qty: 1, source: 'class' })
    } else {
      items.push({ name: item.name, qty: item.qty, source: 'class' })
    }
  }
  return items
}

export function buildCharacter(draft, classData, classEquipment, srdSpells = null) {
  const attrs = { ...draft.baseAttributes }
  for (const [k, v] of Object.entries(draft.racialBonuses ?? {})) {
    attrs[k] = Math.min(30, (attrs[k] ?? 10) + v)
  }
  const allAsiChoices = [
    ...Object.values(draft.asiChoices ?? {}),
    ...((draft.multiclasses ?? []).flatMap(mc => Object.values(mc.asiChoices ?? {}))),
  ]
  for (const choice of allAsiChoices) {
    if (choice?.type === 'asi') {
      for (const [attr, bonus] of Object.entries(choice.bonuses ?? {})) {
        attrs[attr] = Math.min(20, (attrs[attr] ?? 10) + bonus)
      }
    } else if (choice?.type === 'feat' && choice.featAttrBonus) {
      const targetAttr = choice.featChosenAttr ?? choice.featAttrBonus.choices?.[0]
      if (targetAttr) {
        attrs[targetAttr] = Math.min(20, (attrs[targetAttr] ?? 10) + (choice.featAttrBonus.amount ?? 1))
      }
    }
  }

  const dexMod = getModifier(attrs.dex ?? 10)
  const maxHp = calculateMaxHp(classData, draft.level, attrs.con ?? 10)
  const allClasses = new Set([
    draft.class,
    ...((draft.multiclasses ?? []).map(mc => mc.class).filter(Boolean)),
  ])
  let unarmoredAC = 10 + dexMod
  if (allClasses.has('barbaro')) unarmoredAC += getModifier(attrs.con ?? 10)
  else if (allClasses.has('monge')) unarmoredAC += getModifier(attrs.wis ?? 10)

  return {
    id: generateId(),
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: '1.0',
      schemaVersion: 2,
      creationMethod: 'wizard-v2',
      settings: draft.settings,
    },
    info: {
      name: draft.name, playerName: draft.playerName ?? '',
      race: draft.race, subrace: draft.subrace,
      class: draft.class, subclass: '', level: draft.level,
      multiclasses: (draft.multiclasses ?? []).map(mc => ({
        class: mc.class, level: mc.level,
        chosenFeatures: mc.chosenFeatures ?? {},
        asiChoices: mc.asiChoices ?? {},
      })),
      chosenFeatures: draft.chosenFeatures ?? {},
      feats: [
        ...Object.entries(draft.asiChoices ?? {})
          .filter(([, c]) => c?.type === 'feat' && c.featIndex)
          .map(([lvl, c]) => ({
            index: c.featIndex, name: c.featName, takenAtLevel: Number(lvl),
            ...(c.featAttrBonus ? { chosenAttr: c.featChosenAttr ?? c.featAttrBonus.choices?.[0] ?? null } : {}),
          })),
        ...((draft.multiclasses ?? []).flatMap(mc =>
          Object.entries(mc.asiChoices ?? {})
            .filter(([, c]) => c?.type === 'feat' && c.featIndex)
            .map(([lvl, c]) => ({
              index: c.featIndex, name: c.featName, takenAtLevel: Number(lvl), fromClass: mc.class,
              ...(c.featAttrBonus ? { chosenAttr: c.featChosenAttr ?? c.featAttrBonus.choices?.[0] ?? null } : {}),
            }))
        )),
      ],
      background: draft.background, alignment: draft.alignment,
      appearance: draft.appearance ?? '', xp: 0,
      scoreMethod: draft.settings.abilityScoreMethod,
      draconicAncestry: draft.draconicAncestry ?? '',
    },
    attributes: attrs,
    appliedRacialBonuses: draft.racialBonuses ?? {},
    combat: {
      maxHp, currentHp: maxHp, tempHp: 0,
      armorClass: unarmoredAC, speed: 30,
      hitDice: (() => {
        const pool = { [`d${classData?.hit_die ?? 8}`]: { total: draft.level, used: 0 } }
        for (const mc of draft.multiclasses ?? []) {
          const mcHitDie = mc.hitDie ?? 8
          const key = `d${mcHitDie}`
          pool[key] = { total: (pool[key]?.total ?? 0) + mc.level, used: pool[key]?.used ?? 0 }
        }
        return { pool }
      })(),
      attacks: [],
      concentrating: { spellIndex: null, spellName: null },
      deathSaves: { successes: 0, failures: 0 },
    },
    proficiencies: {
      savingThrows: draft.savingThrows ?? [],
      skills: [...(draft.chosenSkills ?? []), ...(draft.racialSkills ?? [])],
      expertiseSkills: Array.isArray(draft.chosenFeatures?.expertise_skills)
        ? draft.chosenFeatures.expertise_skills : [],
      backgroundSkills: draft.backgroundSkills ?? [],
      armor: [], weapons: [], tools: [], languages: [],
    },
    spellcasting: {
      ability: draft.spellcastingAbility, usedSlots: {},
      spells: (() => {
        const baseSpells = [...(draft.spells ?? []), ...(draft.bonusSpells ?? [])]
        if (draft.racialCantrip) {
          baseSpells.push({
            index: `racial-cantrip-${draft.racialCantrip.toLowerCase().replace(/\s/g, '-')}`,
            name: draft.racialCantrip, level: 0, school: '',
            ritual: false, concentration: false,
            desc: `Truque racial (${draft.subrace === 'alto-elfo' ? 'Alto Elfo — Inteligência' : 'Racial'}).`,
          })
        }
        if (draft.chosenFeatures?.pact_boon === 'corrente' && !baseSpells.find(s => s.index === 'find-familiar')) {
          baseSpells.push({
            index: 'find-familiar', name: 'Achar Familiar', level: 1,
            school: 'Conjuração', ritual: true, concentration: false,
            desc: 'Você evoca um espírito familiar.',
          })
        }
        const seen = new Set()
        return baseSpells.filter(s => !seen.has(s.index) && seen.add(s.index))
      })(),
    },
    inventory: {
      currency: {
        cp: 0, sp: 0, ep: 0,
        gp: (draft.backgroundGold ?? 0) + (draft.classEquipmentChoice === 'gold' ? (draft.classStartingGold ?? 0) : 0),
        pp: 0,
      },
      items: [
        ...(draft.backgroundItems ?? []).map(i => ({ ...i, id: generateId() })),
        ...resolveClassEquipmentItems(draft, classEquipment).map(i => ({ ...i, id: generateId() })),
      ],
    },
    traits: {
      personalityTraits: '', ideals: '', bonds: '', flaws: '',
      featuresAndTraits: '', notes: '',
    },
  }
}

/**
 * Wrapper de buildCharacter que pós-processa o personagem para injetar
 * magias concedidas por subclasse (Cleric domain, Paladin oath, Druid
 * Land circle, Warlock patron). Separado de buildCharacter pra manter o
 * core puro/testável sem dependência da lista SRD.
 */
export function buildCharacterWithSubclassSpells(draft, classData, classEquipment, srdSpells) {
  const base = buildCharacter(draft, classData, classEquipment)
  if (!srdSpells || srdSpells.length === 0) return base
  return injectSubclassSpellsAtBuild(base, srdSpells)
}

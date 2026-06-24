// src/components/CharacterWizardV2/blocks/build-character.js
import { generateId } from '../../../../../hooks/useCharacter'
import { calculateMaxHpFromHitDice, racialHpPerLevel, getModifier, RACE_LANGUAGES } from '../../../../../utils/calculations'
import { injectSubclassSpellsAtBuild } from '../../../domain/subclassSpells'
import { classSpeedBonusMeters } from '../../../domain/rules'

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

const FINAL_ATTR_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

/**
 * Atributos FINAIS do personagem: base + bônus racial (teto 30) + ASIs/talentos
 * de classe e multiclasse (teto 20). Fonte única de verdade — usada tanto no
 * buildCharacter quanto na Revisão, pra a prévia bater com o personagem real.
 */
export function computeFinalAttributes(draft) {
  const attrs = {}
  for (const k of FINAL_ATTR_KEYS) attrs[k] = draft?.baseAttributes?.[k] ?? 10
  for (const [k, v] of Object.entries(draft?.racialBonuses ?? {})) {
    attrs[k] = Math.min(30, (attrs[k] ?? 10) + v)
  }
  const allAsiChoices = [
    ...Object.values(draft?.asiChoices ?? {}),
    ...((draft?.multiclasses ?? []).flatMap(mc => Object.values(mc.asiChoices ?? {}))),
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
  // Talento racial do Humano Variante (nível 1) — pode conceder +1 a um atributo.
  const rf = draft?.racialFeat
  if (rf?.featAttrBonus) {
    const targetAttr = rf.featChosenAttr ?? rf.featAttrBonus.choices?.[0]
    if (targetAttr) {
      attrs[targetAttr] = Math.min(20, (attrs[targetAttr] ?? 10) + (rf.featAttrBonus.amount ?? 1))
    }
  }
  return attrs
}

/**
 * Nível total = classe primária + soma das multiclasses.
 */
export function totalCharacterLevel(draft) {
  return (draft?.level ?? 1)
    + (draft?.multiclasses ?? []).reduce((s, mc) => s + (mc.level ?? 0), 0)
}

/**
 * PV máximo do draft considerando multiclasse (PHB p.164) + talento Robusto.
 * Fonte única usada tanto no buildCharacter quanto na prévia da Revisão, pra
 * o número bater com o personagem real. Lê `mc.hitDie` (gravado ao adicionar
 * a classe no MulticlassModal); fallback d8 quando ausente.
 */
export function computeDraftMaxHp(draft, classData) {
  if (!classData) return 0
  const attrs = computeFinalAttributes(draft)
  const hasRobusto = [
    ...Object.values(draft?.asiChoices ?? {}),
    ...((draft?.multiclasses ?? []).flatMap(mc => Object.values(mc.asiChoices ?? {}))),
    ...(draft?.racialFeat ? [draft.racialFeat] : []),
  ].some(c => c?.featIndex === 'robusto')

  return calculateMaxHpFromHitDice({
    primaryDie: classData?.hit_die ?? 8,
    primaryLevel: draft?.level ?? 1,
    extras: (draft?.multiclasses ?? []).map(mc => ({ die: mc.hitDie ?? 8, level: mc.level ?? 0 })),
    conScore: attrs.con ?? 10,
    robustoLevels: hasRobusto ? totalCharacterLevel(draft) : 0,
    racialHpPerLevel: racialHpPerLevel(draft?.subrace),
  })
}

/**
 * Proficiências (armadura/arma/ferramenta) e perícias ganhas pelas
 * multiclasses. As proficiências são gravadas em `mc.proficiencies` ao
 * adicionar a classe; a perícia escolhida fica em `mc.chosenSkills`.
 */
function collectMulticlassProficiencies(draft) {
  const uniq = arr => [...new Set(arr.filter(Boolean))]
  const armor = [], weapons = [], tools = [], skills = []
  for (const mc of draft?.multiclasses ?? []) {
    const p = mc.proficiencies ?? {}
    armor.push(...(p.armor ?? []))
    weapons.push(...(p.weapons ?? []))
    tools.push(...(p.tools ?? []))
    skills.push(...(mc.chosenSkills ?? []))
  }
  return { armor: uniq(armor), weapons: uniq(weapons), tools: uniq(tools), skills: uniq(skills) }
}

export function buildCharacter(draft, classData, classEquipment, srdSpells = null) {
  const attrs = computeFinalAttributes(draft)

  const dexMod = getModifier(attrs.dex ?? 10)
  const maxHp = computeDraftMaxHp(draft, classData)
  const mcProfs = collectMulticlassProficiencies(draft)
  const allClasses = new Set([
    draft.class,
    ...((draft.multiclasses ?? []).map(mc => mc.class).filter(Boolean)),
  ])
  // Deslocamento (metros): base racial (draft.speed) + bônus de classe.
  const speedMeters = (draft.speed ?? 9) + classSpeedBonusMeters({
    info: { class: draft.class, level: draft.level, multiclasses: draft.multiclasses ?? [] },
  })
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
        // Talento racial do Humano Variante (sempre nível 1).
        ...(draft.racialFeat?.featIndex ? [{
          index: draft.racialFeat.featIndex,
          name: draft.racialFeat.featName,
          takenAtLevel: 1,
          source: 'race',
          ...(draft.racialFeat.featAttrBonus
            ? { chosenAttr: draft.racialFeat.featChosenAttr ?? draft.racialFeat.featAttrBonus.choices?.[0] ?? null }
            : {}),
        }] : []),
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
      // Tasha's "Customizando sua Origem": override flexível dos bônus de
      // atributo raciais, só persistido quando a fonte está habilitada e há
      // escolha completa (ver RaceBlock). Permite ao applyRacialChange da
      // ficha re-aplicar o override em vez dos bônus fixos da raça.
      ...(draft.settings?.flexibleRacialAsi && draft.racialAsiOverride && Object.keys(draft.racialAsiOverride).length
        ? { racialAsiOverride: draft.racialAsiOverride } : {}),
    },
    attributes: attrs,
    appliedRacialBonuses: draft.racialBonuses ?? {},
    combat: {
      maxHp, currentHp: maxHp, tempHp: 0,
      armorClass: unarmoredAC, speed: speedMeters,
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
      skills: [...new Set([
        ...(draft.chosenSkills ?? []),
        ...(draft.racialSkills ?? []),
        ...mcProfs.skills,
      ])],
      expertiseSkills: Array.isArray(draft.chosenFeatures?.expertise_skills)
        ? draft.chosenFeatures.expertise_skills : [],
      backgroundSkills: draft.backgroundSkills ?? [],
      armor: mcProfs.armor, weapons: mcProfs.weapons, tools: mcProfs.tools,
      languages: [...new Set([
        ...(RACE_LANGUAGES[draft.race] ?? []),
        ...(draft.racialLanguages ?? []),
      ])],
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

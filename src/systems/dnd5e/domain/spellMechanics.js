import { abbrOfKey } from './attributes'

/** Tipos de dano canônicos em PT (validação da camada de dados). */
export const DAMAGE_TYPES_PT = [
  'ácido', 'contundente', 'cortante', 'elétrico', 'fogo', 'força', 'frio',
  'necrótico', 'perfurante', 'psíquico', 'radiante', 'trovejante', 'veneno',
]

/** Tier de truque pelo nível TOTAL do personagem (PHB: 1/5/11/17). */
export function cantripTier(level) {
  return level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1
}

/** '3d4+3' → { count, sides, mod } ; null se não for notação de dados. */
export function parseDiceNotation(str) {
  const m = String(str).replace(/\s+/g, '').toLowerCase().match(/^(\d*)d(\d+)([+-]\d+)?$/)
  if (!m) return null
  return {
    count: Math.max(1, parseInt(m[1] || '1', 10)),
    sides: parseInt(m[2], 10),
    mod: m[3] ? parseInt(m[3], 10) : 0,
  }
}

function fmtDice({ count, sides, mod }) {
  return `${count}d${sides}${mod > 0 ? `+${mod}` : mod < 0 ? String(mod) : ''}`
}

const fmtMod = n => (n >= 0 ? `+${n}` : String(n))

/** Soma `per` (mesmos lados — garantido pela validação dos dados) n vezes. */
function addDice(base, per, n) {
  if (!per || n <= 0) return base
  const b = parseDiceNotation(base)
  const p = parseDiceNotation(per)
  return fmtDice({ count: b.count + p.count * n, sides: b.sides, mod: b.mod + p.mod * n })
}

/** Multiplica a QUANTIDADE de dados (escalonamento de truque). */
function scaleDice(base, tier) {
  const b = parseDiceNotation(base)
  return fmtDice({ count: b.count * tier, sides: b.sides, mod: b.mod })
}

/** Upcast por faixas: troca a notação pela maior faixa cujo nível ≤ castLevel. */
function tierDice(base, tiers, castLevel) {
  const lvl = Object.keys(tiers).map(Number).filter(l => l <= castLevel).sort((a, b) => b - a)[0]
  return lvl ? tiers[lvl] : base
}

/** Acrescenta modificador plano à notação ('1d8' + 3 → '1d8+3'). */
function withFlatMod(base, m) {
  if (!m) return base
  const b = parseDiceNotation(base)
  return fmtDice({ ...b, mod: b.mod + m })
}

/**
 * Monta o plano de rolagens de uma conjuração.
 *
 * @param spell  { name, level } — magia da ficha
 * @param mech   entrada do spell-mechanics-pt.json (ou null → retorna null)
 * @param ctx    { slotLevel, characterLevel, spellAttack, spellMod, spellDC }
 * @returns { steps, announce } | null
 *   steps: [{ kind: 'attack'|'damage'|'heal', notation, label, critLabel?, critable? }]
 *   O executor (castSpell.js) percorre em ordem: ataque nat 20 → todo dano
 *   critable do raio com crit; nat 1 → todo dano critable do raio pulado.
 *   critable = attack && (pkt.onHit ?? primeiro pacote); pacotes independentes
 *   do acerto (ex.: explosão da Faca de Gelo) rolam sempre.
 *   Upcast: `packet` escolhe o pacote alvo (default 0); `tiers` troca a
 *   notação pela faixa do slot (Lâmina Sombria), `perSlot`/`perLevels` somam.
 */
export function spellRollPlan(spell, mech, ctx) {
  if (!mech) return null
  const isCantrip = spell.level === 0
  const castLevel = isCantrip ? 0 : (ctx.slotLevel ?? spell.level)
  const perLevels = mech.upcast?.perLevels ?? 1
  const above = isCantrip ? 0 : Math.floor(Math.max(0, castLevel - spell.level) / perLevels)
  const tier = cantripTier(ctx.characterLevel ?? 1)
  const lvlSuffix = isCantrip ? '' : ` (Nv ${castLevel})`

  const announce = mech.save
    ? `CD ${ctx.spellDC} · salvaguarda de ${abbrOfKey(mech.save.ability)}` +
      (mech.save.halfOnSuccess ? ' · metade no sucesso' : '')
    : null

  const beamCount = mech.beams
    ? (mech.beams.base ?? 1)
      + (mech.beams.perSlot ?? 0) * above
      + (mech.beams.cantripScaling ? tier - 1 : 0)
    : 1

  const steps = []
  for (let b = 1; b <= beamCount; b++) {
    const beamSuffix = beamCount > 1 ? ` · raio ${b}/${beamCount}` : ''
    if (mech.attack) {
      steps.push({
        kind: 'attack',
        notation: `1d20${fmtMod(ctx.spellAttack ?? 0)}`,
        label: `${spell.name} · ataque${beamSuffix}`,
      })
    }
    ;(mech.damage ?? []).forEach((pkt, i) => {
      let dice = pkt.dice
      if (mech.cantripScaling) dice = scaleDice(dice, tier)
      if (i === (mech.upcast?.packet ?? 0)) {
        if (mech.upcast?.tiers) dice = tierDice(dice, mech.upcast.tiers, castLevel)
        else if (mech.upcast?.perSlot) dice = addDice(dice, mech.upcast.perSlot, above)
      }
      if (pkt.addMod) dice = withFlatMod(dice, ctx.spellMod ?? 0)
      const typePart = (mech.damage.length > 1) ? ` (${pkt.type})` : ''
      const cd = i === 0 && b === 1 && announce ? ` · ${announce}` : ''
      steps.push({
        kind: 'damage',
        notation: dice,
        label: `${spell.name} · dano${typePart}${lvlSuffix}${beamSuffix}${cd}`,
        critLabel: `${spell.name} · dano CRÍTICO${typePart}${lvlSuffix}${beamSuffix}${cd}`,
        critable: !!mech.attack && (pkt.onHit ?? i === 0),
      })
    })
  }

  if (mech.heal) {
    let dice = mech.heal.dice
    if (!mech.damage?.length && mech.upcast?.perSlot) dice = addDice(dice, mech.upcast.perSlot, above)
    if (mech.heal.addMod) dice = withFlatMod(dice, ctx.spellMod ?? 0)
    steps.push({ kind: 'heal', notation: dice, label: `${spell.name} · cura${lvlSuffix}` })
  }

  return { steps, announce }
}

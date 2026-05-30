import { formatCR } from '../../utils/monsters'
import {
  translateLabel,
  translateSpeedKey,
  translateSenseKey,
} from '../../utils/monsters-i18n'

const ABILITY_LABELS = [
  { key: 'strength',     label: 'FOR' },
  { key: 'dexterity',    label: 'DES' },
  { key: 'constitution', label: 'CON' },
  { key: 'intelligence', label: 'INT' },
  { key: 'wisdom',       label: 'SAB' },
  { key: 'charisma',     label: 'CAR' },
]

function modOf(score) {
  const m = Math.floor((score - 10) / 2)
  return m >= 0 ? `+${m}` : `${m}`
}

function joinACs(armor_class) {
  if (!Array.isArray(armor_class) || armor_class.length === 0) return '—'
  return armor_class.map(ac => {
    if (typeof ac === 'number') return String(ac)
    const desc = ac.type ? ` (${ac.type})` : ''
    return `${ac.value}${desc}`
  }).join(', ')
}

function joinSpeed(speed, lang) {
  if (!speed || typeof speed !== 'object') return '—'
  return Object.entries(speed)
    .map(([k, v]) => k === 'walk' ? v : `${translateSpeedKey(k, lang)} ${v}`)
    .join(', ')
}

function joinSenses(senses, lang) {
  if (!senses || typeof senses !== 'object') return '—'
  return Object.entries(senses)
    .map(([k, v]) => `${translateSenseKey(k, lang)} ${v}`)
    .join(', ')
}

function getProfs(monster, kind) {
  const list = monster.proficiencies ?? []
  return list
    .filter(p => p?.proficiency?.name?.startsWith(kind + ':'))
    .map(p => {
      const name = p.proficiency.name.replace(`${kind}: `, '')
      const sign = p.value >= 0 ? '+' : ''
      return `${name} ${sign}${p.value}`
    })
    .join(', ')
}

function joinList(arr) {
  if (!arr || arr.length === 0) return ''
  return arr.map(x => typeof x === 'string' ? x : x.name ?? '').filter(Boolean).join(', ')
}

function Section({ label, value }) {
  if (!value) return null
  return (
    <div className="text-sm">
      <span className="font-bold text-amber-300">{label}</span>{' '}
      <span className="text-gray-200">{value}</span>
    </div>
  )
}

function Block({ title, items }) {
  if (!items || items.length === 0) return null
  return (
    <div className="space-y-2">
      <h4 className="text-xs uppercase tracking-widest font-bold text-amber-400 border-b border-amber-700/40 pb-1">{title}</h4>
      {items.map((it, i) => (
        <div key={i} className="text-sm">
          <span className="font-bold italic text-gray-100">{it.name}.</span>{' '}
          <span className="text-gray-300">{it.desc}</span>
        </div>
      ))}
    </div>
  )
}

export function MonsterStatBlock({ monster, lang = 'en' }) {
  if (!monster) return null
  const cr = formatCR(monster.challenge_rating)
  const xp = monster.xp != null ? ` (${monster.xp.toLocaleString()} XP)` : ''
  const subtypeText = monster.subtype ? ` (${monster.subtype})` : ''
  const t = (label) => translateLabel(label, lang)

  const savingThrows = getProfs(monster, 'Saving Throw')
  const skills       = getProfs(monster, 'Skill')

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-amber-400">{monster.name}</h2>
        <p className="italic text-sm text-gray-400">
          {monster.size} {monster.type}{subtypeText}, {monster.alignment}
        </p>
      </div>

      <div className="space-y-1 border-y border-amber-700/40 py-3">
        <Section label={t('Armor Class')}  value={joinACs(monster.armor_class)} />
        <Section label={t('Hit Points')}   value={`${monster.hit_points}${monster.hit_dice ? ` (${monster.hit_dice})` : ''}`} />
        <Section label={t('Speed')}        value={joinSpeed(monster.speed, lang)} />
      </div>

      <div className="grid grid-cols-6 gap-2 text-center border-b border-amber-700/40 pb-3">
        {ABILITY_LABELS.map(({ key, label }) => (
          <div key={key} className="bg-gray-900/60 rounded px-1 py-1.5">
            <div className="text-xs uppercase tracking-wider text-amber-400">{label}</div>
            <div className="text-sm font-bold text-white">{monster[key]}</div>
            <div className="text-xs text-gray-400">{modOf(monster[key])}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <Section label={t('Saving Throws')}           value={savingThrows} />
        <Section label={t('Skills')}                  value={skills} />
        <Section label={t('Damage Vulnerabilities')}  value={joinList(monster.damage_vulnerabilities)} />
        <Section label={t('Damage Resistances')}      value={joinList(monster.damage_resistances)} />
        <Section label={t('Damage Immunities')}       value={joinList(monster.damage_immunities)} />
        <Section label={t('Condition Immunities')}    value={joinList(monster.condition_immunities)} />
        <Section label={t('Senses')}                  value={joinSenses(monster.senses, lang)} />
        <Section label={t('Languages')}               value={monster.languages || '—'} />
        <Section label={t('Challenge')}               value={`${cr}${xp}`} />
      </div>

      <Block title={t('Special Abilities')} items={monster.special_abilities} />
      <Block title={t('Actions')}           items={monster.actions} />
      <Block title={t('Reactions')}         items={monster.reactions} />
      <Block title={t('Legendary Actions')} items={monster.legendary_actions} />
    </div>
  )
}

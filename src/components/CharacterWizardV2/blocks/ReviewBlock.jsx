import {
  ABILITY_SCORES, SKILLS, getProficiencyBonus, getModifier, formatModifier,
  calculateMaxHp, SPELL_ABILITY_PT_TO_KEY,
  calculateSpellSaveDC, calculateSpellAttackBonus,
} from '../../../utils/calculations'
import { computeFinalAttributes } from './build-character'

const METHOD_LABEL = {
  'standard-array': 'Array Padrão [15,14,13,12,10,8]',
  'point-buy': 'Compra de Pontos (27pts)',
  'manual': 'Manual',
  'roll': 'Rolagem 4d6 Drop',
  '4d6drop': 'Rolagem 4d6 Drop',
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-display tracking-widest uppercase text-ink-500 mb-2">{title}</h3>
      <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3 flex flex-col gap-1.5">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-ink-300">{label}</span>
      <span className={highlight ? 'font-display text-ink-500' : 'text-ink-500'}>{value}</span>
    </div>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="border-2 border-parchment-600 bg-parchment-50 rounded-sm px-2 py-2 text-center">
      <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-0.5">{label}</p>
      <p className="text-base font-display text-ink-500">{value}</p>
    </div>
  )
}

export function ReviewBlock({ draft, races, backgrounds, classData }) {
  const selectedRace = races.find(r => r.index === draft.race)
  const selectedSubrace = selectedRace?.subraces?.find(sr => sr.index === draft.subrace)
  const selectedBg = backgrounds.find(b => b.index === draft.background)

  // Atributos finais = base + racial + ASIs/talentos (mesma fórmula do
  // buildCharacter), pra a Revisão bater com o personagem real.
  const finalAttrs = computeFinalAttributes(draft)

  const profBonus = getProficiencyBonus(draft.level ?? 1)
  const maxHp = calculateMaxHp(classData, draft.level ?? 1, finalAttrs.con ?? 10)
  const dexMod = getModifier(finalAttrs.dex ?? 10)
  const spellKey = draft.spellcastingAbility ?? SPELL_ABILITY_PT_TO_KEY[classData?.spellcasting_ability]
  const spellScore = finalAttrs[spellKey] ?? 10
  const spellSaveDC = spellKey ? calculateSpellSaveDC(spellScore, profBonus) : null
  const spellAtk = spellKey ? calculateSpellAttackBonus(spellScore, profBonus) : null

  const allSkills = [...new Set([...(draft.chosenSkills ?? []), ...(draft.backgroundSkills ?? [])])]
  const isComplete = draft.name?.trim() && draft.race && draft.class && draft.background

  return (
    <div className="flex flex-col gap-4">
      {!isComplete && (
        <div className="border-2 border-red-700 bg-red-50 rounded-sm px-4 py-3 text-sm text-red-700">
          Preencha os campos obrigatórios (Nome, Raça, Classe, Antecedente) antes de inscrever o herói.
        </div>
      )}

      <Section title="Identidade">
        <Row label="Nome" value={draft.name || '—'} highlight />
        <Row label="Raça" value={[selectedRace?.name, selectedSubrace?.name].filter(Boolean).join(' — ') || '—'} />
        <Row label="Classe" value={classData ? `${classData.name} Nível ${draft.level}` : '—'} />
        <Row label="Antecedente" value={selectedBg?.name || '—'} />
        <Row label="Alinhamento" value={draft.alignment || '—'} />
      </Section>

      <Section title="Atributos">
        <div className="grid grid-cols-3 gap-2">
          {ABILITY_SCORES.map(({ key, abbr }) => {
            const score = finalAttrs[key]
            const base = draft.baseAttributes?.[key]
            // Bônus total (racial + ASI/talento) = final − base.
            const totalBonus = base > 0 ? score - base : 0
            return (
              <div key={key} className="border-2 border-parchment-600 bg-parchment-50 rounded-sm px-2 py-2 text-center">
                <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-1">{abbr}</p>
                {totalBonus > 0 && <p className="text-xs italic text-ink-200">{base}+{totalBonus}</p>}
                <p className="text-lg font-display text-ink-500">{score}</p>
                <p className="text-xs text-ink-200">{formatModifier(getModifier(score))}</p>
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Combate">
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="PV Máx." value={maxHp || '—'} />
          <StatBox label="CA" value={10 + dexMod} />
          <StatBox label="Prof." value={formatModifier(profBonus)} />
          <StatBox label="Iniciativa" value={formatModifier(dexMod)} />
          <StatBox label="Dado de Vida" value={draft.hitDice} />
          {spellSaveDC && <StatBox label="CD Magia" value={spellSaveDC} />}
          {spellAtk !== null && <StatBox label="Atk Magia" value={formatModifier(spellAtk)} />}
        </div>
      </Section>

      {allSkills.length > 0 && (
        <Section title="Perícias Proficientes">
          <div className="flex flex-wrap gap-2">
            {allSkills.map(key => {
              const skill = SKILLS.find(s => s.key === key)
              const isBg = draft.backgroundSkills?.includes(key)
              return (
                <span key={key} className="flex items-center gap-1 text-xs font-display border-2 border-parchment-600 bg-parchment-50 px-2.5 py-1 rounded-sm text-ink-500">
                  {isBg && <span>🎒</span>}
                  {skill?.name ?? key}
                </span>
              )
            })}
          </div>
        </Section>
      )}

      <Section title="Configurações da Campanha">
        <Row label="Método de Atributos" value={METHOD_LABEL[draft.settings?.abilityScoreMethod] ?? draft.settings?.abilityScoreMethod} />
        <Row label="Feats" value={draft.settings?.allowFeats ? 'Permitido' : 'Não permitido'} />
        <Row label="Multiclasse" value={draft.settings?.allowMulticlass ? 'Permitido' : 'Não permitido'} />
        <Row label="Nível Inicial" value={draft.settings?.startLevel ?? 1} />
      </Section>
    </div>
  )
}

// Passo 8 — Revisão Final
import { ABILITY_SCORES, SKILLS, getProficiencyBonus, getModifier, formatModifier, calculateMaxHp, SPELL_ABILITY_PT_TO_KEY, calculateSpellSaveDC, calculateSpellAttackBonus } from '../../../utils/calculations'

export function Step8Review({ draft, races, backgrounds, classData }) {
  const selectedRace = races.find(r => r.index === draft.race)
  const selectedSubrace = selectedRace?.subraces?.find(sr => sr.index === draft.subrace)
  const selectedBg = backgrounds.find(b => b.index === draft.background)

  // Atributos finais (base + racial)
  const finalAttrs = {}
  for (const { key } of ABILITY_SCORES) {
    const base  = draft.baseAttributes[key] ?? 10
    const bonus = draft.racialBonuses?.[key] ?? 0
    finalAttrs[key] = base > 0 ? base + bonus : 10
  }

  const profBonus     = getProficiencyBonus(draft.level)
  const maxHp         = calculateMaxHp(classData, draft.level, finalAttrs.con ?? 10)
  const dexMod        = getModifier(finalAttrs.dex ?? 10)
  const spellKey      = draft.spellcastingAbility ?? SPELL_ABILITY_PT_TO_KEY[classData?.spellcasting_ability]
  const spellScore    = finalAttrs[spellKey] ?? 10
  const spellSaveDC   = spellKey ? calculateSpellSaveDC(spellScore, profBonus) : null
  const spellAtk      = spellKey ? calculateSpellAttackBonus(spellScore, profBonus) : null

  const allSkills = [...new Set([...(draft.chosenSkills ?? []), ...(draft.backgroundSkills ?? [])])]

  const isComplete = draft.name?.trim() && draft.race && draft.class && draft.background

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-amber-400 mb-1">Revisão</h2>
        <p className="text-sm text-gray-400">Confira tudo antes de criar o personagem.</p>
      </div>

      {/* Alerta se incompleto */}
      {!isComplete && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
          Volte e preencha os campos obrigatórios (Nome, Raça, Classe, Antecedente).
        </div>
      )}

      {/* Identidade */}
      <Section title="Identidade">
        <Row label="Nome"        value={draft.name || '—'} highlight />
        <Row label="Raça"        value={[selectedRace?.name, selectedSubrace?.name].filter(Boolean).join(' — ') || '—'} />
        <Row label="Classe"      value={classData ? `${classData.name} Nível ${draft.level}` : '—'} />
        <Row label="Antecedente" value={selectedBg?.name || '—'} />
        <Row label="Alinhamento" value={draft.alignment || '—'} />
      </Section>

      {/* Atributos */}
      <Section title="Atributos">
        <div className="grid grid-cols-3 gap-2">
          {ABILITY_SCORES.map(({ key, abbr }) => {
            const score = finalAttrs[key]
            const base  = draft.baseAttributes[key]
            const bonus = draft.racialBonuses?.[key] ?? 0
            return (
              <div key={key} className="bg-gray-800 rounded-lg px-2 py-2 text-center">
                <p className="text-[10px] text-gray-500 uppercase mb-1">{abbr}</p>
                {bonus > 0 && <p className="text-[10px] text-amber-600">{base}+{bonus}</p>}
                <p className="text-lg font-bold text-amber-300">{score}</p>
                <p className="text-xs text-gray-500">{formatModifier(getModifier(score))}</p>
              </div>
            )
          })}
        </div>
      </Section>

      {/* Combate */}
      <Section title="Combate">
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="PV Máx."     value={maxHp || '—'} />
          <StatBox label="CA"          value={10 + dexMod} />
          <StatBox label="Prof."       value={formatModifier(profBonus)} />
          <StatBox label="Iniciativa"  value={formatModifier(dexMod)} />
          <StatBox label="Dado de Vida" value={draft.hitDice} />
          {spellSaveDC   && <StatBox label="CD Magia"   value={spellSaveDC} />}
          {spellAtk !== null && <StatBox label="Atk. Magia"  value={formatModifier(spellAtk)} />}
        </div>
      </Section>

      {/* Perícias */}
      {allSkills.length > 0 && (
        <Section title="Perícias Proficientes">
          <div className="flex flex-wrap gap-2">
            {allSkills.map(key => {
              const skill  = SKILLS.find(s => s.key === key)
              const isBg   = draft.backgroundSkills?.includes(key)
              return (
                <span key={key} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border ${
                  isBg
                    ? 'border-amber-700/60 bg-amber-900/20 text-amber-400'
                    : 'border-gray-600 bg-gray-800 text-gray-300'
                }`}>
                  {isBg && <span>🎒</span>}
                  {skill?.name ?? key}
                </span>
              )
            })}
          </div>
        </Section>
      )}

      {/* Configurações */}
      <Section title="Configurações da Campanha">
        <Row label="Método de Atributos" value={{
          'standard-array': 'Array Padrão [15,14,13,12,10,8]',
          'point-buy':       'Compra de Pontos (27pts)',
          '4d6drop':         'Rolagem 4d6 Drop',
        }[draft.settings.abilityScoreMethod] ?? draft.settings.abilityScoreMethod} />
        <Row label="Feats"        value={draft.settings.allowFeats ? 'Permitido' : 'Não permitido'} />
        <Row label="Multiclasse"  value={draft.settings.allowMulticlass ? 'Permitido' : 'Não permitido'} />
      </Section>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">{title}</h3>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 space-y-1.5">
        {children}
      </div>
    </div>
  )
}

function Row({ label, value, highlight }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={highlight ? 'text-amber-300 font-semibold' : 'text-gray-200'}>{value}</span>
    </div>
  )
}

function StatBox({ label, value }) {
  return (
    <div className="bg-gray-750 rounded-lg px-2 py-2 text-center border border-gray-700">
      <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
      <p className="text-base font-bold text-amber-300">{value}</p>
    </div>
  )
}

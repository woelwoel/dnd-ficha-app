import { ABILITY_SCORES, getModifier, getProficiencyBonus } from '../../utils/calculations'
import { SKILLS } from '../../utils/calculations'

function Stat({ label, value, sub }) {
  return (
    <div className="text-center bg-gray-800 border border-gray-600 rounded-lg p-2">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-lg font-bold text-amber-400">{value}</div>
      {sub !== undefined && <div className="text-xs text-gray-500">{sub}</div>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 pb-1 border-b border-gray-700">
        {title}
      </h3>
      {children}
    </div>
  )
}

export function CharacterView({ character, races, classes, backgrounds }) {
  const { info, attributes, combat, proficiencies, spellcasting, inventory, traits } = character
  const prof = getProficiencyBonus(info.level)

  const selectedRace = races.find(r => r.index === info.race)
  const selectedClass = classes.find(c => c.index === info.class)
  const selectedBg = backgrounds.find(b => b.index === info.background)

  return (
    <div className="space-y-5 print:text-black print:bg-white">

      {/* ── Cabeçalho ── */}
      <div className="bg-gray-800 border border-amber-700 rounded-xl p-4">
        <div className="text-2xl font-bold text-amber-400 mb-1">
          {info.name || 'Personagem sem nome'}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-300">
          {selectedRace && <span>{selectedRace.name}</span>}
          {selectedClass && <span>{selectedClass.name}</span>}
          <span>Nível {info.level}</span>
          {selectedBg && <span>{selectedBg.name}</span>}
          {info.alignment && <span>{info.alignment}</span>}
          {info.xp > 0 && <span className="text-gray-400">{info.xp.toLocaleString()} XP</span>}
        </div>
      </div>

      {/* ── Atributos e Combate ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Atributos */}
        <Section title="Atributos">
          <div className="grid grid-cols-3 gap-2">
            {ABILITY_SCORES.map(({ key, abbr, name }) => {
              const val = attributes[key]
              const mod = getModifier(val)
              return (
                <div key={key} className="bg-gray-800 border border-gray-600 rounded-lg p-2 text-center">
                  <div className="text-xs text-gray-400">{abbr}</div>
                  <div className="text-xl font-bold text-white">{val}</div>
                  <div className="text-sm text-amber-400">{mod >= 0 ? '+' : ''}{mod}</div>
                </div>
              )
            })}
          </div>
        </Section>

        {/* Combate */}
        <Section title="Combate">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="PV Máx" value={combat.maxHp} />
            <Stat label="PV Atual" value={combat.currentHp} />
            <Stat label="CA" value={combat.armorClass} />
            <Stat label="Deslocamento" value={`${combat.speed}ft`} />
            <Stat label="Dado de Vida" value={combat.hitDice} />
            <Stat label="Bônus Prof." value={`+${prof}`} />
          </div>
          {combat.tempHp > 0 && (
            <div className="mt-2 text-sm text-gray-400">
              PV Temporários: <span className="text-blue-400">{combat.tempHp}</span>
            </div>
          )}
        </Section>
      </div>

      {/* ── Salvaguardas ── */}
      <Section title="Testes de Resistência">
        <div className="grid grid-cols-3 gap-1">
          {ABILITY_SCORES.map(({ key, abbr }) => {
            const isProficient = proficiencies.savingThrows?.includes(key)
            const mod = getModifier(attributes[key]) + (isProficient ? prof : 0)
            return (
              <div key={key} className="flex items-center gap-1 text-sm">
                <span className={`w-2 h-2 rounded-full ${isProficient ? 'bg-amber-400' : 'bg-gray-600'}`} />
                <span className="text-gray-400 w-8 shrink-0">{abbr}</span>
                <span className="text-white font-medium">{mod >= 0 ? '+' : ''}{mod}</span>
              </div>
            )
          })}
        </div>
      </Section>

      {/* ── Perícias ── */}
      <Section title="Perícias">
        <div className="grid grid-cols-2 gap-1">
          {SKILLS.map(skill => {
            const isProficient = proficiencies.skills?.includes(skill.key)
            const abilityMod = getModifier(attributes[skill.ability])
            const total = abilityMod + (isProficient ? prof : 0)
            return (
              <div key={skill.key} className="flex items-center gap-1 text-xs">
                <span className={`w-2 h-2 rounded-full shrink-0 ${isProficient ? 'bg-amber-400' : 'bg-gray-600'}`} />
                <span className={isProficient ? 'text-white' : 'text-gray-400'}>{skill.name}</span>
                <span className={`ml-auto font-medium ${isProficient ? 'text-amber-400' : 'text-gray-300'}`}>
                  {total >= 0 ? '+' : ''}{total}
                </span>
              </div>
            )
          })}
        </div>
      </Section>

      {/* ── Magias (se tiver) ── */}
      {spellcasting.spells?.length > 0 && (
        <Section title="Magias">
          {spellcasting.ability && (
            <p className="text-xs text-gray-400 mb-2">
              Habilidade: {spellcasting.ability}
            </p>
          )}
          <div className="space-y-1">
            {[0,1,2,3,4,5,6,7,8,9].map(lvl => {
              const spells = spellcasting.spells.filter(s => (s.level ?? 0) === lvl)
              if (!spells.length) return null
              return (
                <div key={lvl}>
                  <span className="text-xs text-amber-600 font-semibold">
                    {lvl === 0 ? 'Truques' : `Nível ${lvl}`}:
                  </span>
                  <span className="text-xs text-gray-300 ml-1">
                    {spells.map(s => s.name).join(', ')}
                  </span>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── Inventário ── */}
      {inventory.items?.length > 0 && (
        <Section title="Inventário">
          <div className="flex flex-wrap gap-2 text-xs text-gray-400 mb-2">
            {inventory.currency.pp > 0 && <span>{inventory.currency.pp} PP</span>}
            {inventory.currency.gp > 0 && <span>{inventory.currency.gp} PO</span>}
            {inventory.currency.ep > 0 && <span>{inventory.currency.ep} PE</span>}
            {inventory.currency.sp > 0 && <span>{inventory.currency.sp} PP</span>}
            {inventory.currency.cp > 0 && <span>{inventory.currency.cp} PC</span>}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {inventory.items.map(item => (
              <div key={item.id} className="text-xs text-gray-300 flex justify-between">
                <span>{item.name}</span>
                {item.quantity > 1 && <span className="text-gray-500">×{item.quantity}</span>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Personalidade & Traços ── */}
      {(traits.personalityTraits || traits.ideals || traits.bonds || traits.flaws) && (
        <Section title="Personalidade">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {traits.personalityTraits && (
              <div>
                <p className="text-xs text-amber-600 mb-0.5">Traços de Personalidade</p>
                <p className="text-gray-300">{traits.personalityTraits}</p>
              </div>
            )}
            {traits.ideals && (
              <div>
                <p className="text-xs text-amber-600 mb-0.5">Ideais</p>
                <p className="text-gray-300">{traits.ideals}</p>
              </div>
            )}
            {traits.bonds && (
              <div>
                <p className="text-xs text-amber-600 mb-0.5">Vínculos</p>
                <p className="text-gray-300">{traits.bonds}</p>
              </div>
            )}
            {traits.flaws && (
              <div>
                <p className="text-xs text-amber-600 mb-0.5">Defeitos</p>
                <p className="text-gray-300">{traits.flaws}</p>
              </div>
            )}
          </div>
        </Section>
      )}

      {/* ── Características & Notas ── */}
      {traits.featuresAndTraits && (
        <Section title="Características e Traços">
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{traits.featuresAndTraits}</p>
        </Section>
      )}

      {traits.notes && (
        <Section title="Notas de Campanha">
          <p className="text-sm text-gray-300 whitespace-pre-wrap">{traits.notes}</p>
        </Section>
      )}
    </div>
  )
}

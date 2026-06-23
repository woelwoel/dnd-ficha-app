import { calculateMaxHp } from '../../../../../../utils/calculations'

function StatCard({ label, value, sub }) {
  return (
    <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm px-3 py-2">
      <p className="text-xs font-display tracking-widest uppercase text-ink-300 mb-0.5">{label}</p>
      <p className="text-sm font-display text-ink-500">{value}</p>
      {sub && <p className="text-xs italic text-ink-200">{sub}</p>}
    </div>
  )
}

export function ClassStatsCards({ classData, level, conMod, savingThrows }) {
  if (!classData) return null
  const hpPreview = calculateMaxHp(classData, level, 10 + conMod)
  const profBonus = `+${Math.ceil(level / 4) + 1}`

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Dado de Vida" value={`d${classData.hit_die}`} />
        <StatCard label="Habilidade de Magia" value={classData.spellcasting_ability || '—'} />
        {hpPreview != null && (
          <StatCard label={`PV no Nível ${level}`} value={`${hpPreview} PV`} sub="base: atributo 10" />
        )}
        <StatCard label="Bônus de Proficiência" value={profBonus} />
      </div>

      {savingThrows?.length > 0 && (
        <div>
          <p className="text-xs font-display tracking-widest uppercase text-ink-500 mb-1">Salvaguardas:</p>
          <div className="flex flex-wrap gap-2">
            {savingThrows.map(k => (
              <span key={k} className="text-xs font-display bg-parchment-100 border-2 border-parchment-600 px-2.5 py-1 rounded-sm text-ink-500 uppercase">
                {k}
              </span>
            ))}
          </div>
        </div>
      )}

      {classData.skill_choices && (
        <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
          <p className="text-xs italic text-ink-300 mb-1">
            Você poderá escolher{' '}
            <span className="font-display text-ink-500">{classData.skill_choices.count} perícias</span> no passo de Perícias:
          </p>
          <div className="flex flex-wrap gap-1 mt-2">
            {classData.skill_choices.from?.map((s, i) => (
              <span key={i} className="text-xs bg-parchment-50 border-2 border-parchment-600 px-2 py-0.5 rounded-sm text-ink-300">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

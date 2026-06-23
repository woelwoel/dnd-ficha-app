export function RaceBonusPreview({ bonuses, hasFreeChoice }) {
  if (!bonuses?.length && !hasFreeChoice) return null
  return (
    <div className="border-2 border-parchment-600 bg-parchment-100 rounded-sm p-3">
      <p className="text-xs font-display tracking-widest uppercase text-ink-500 mb-2">
        Bônus de atributo (aplicados):
      </p>
      <div className="flex flex-wrap gap-2">
        {bonuses.map((b, i) => (
          <span key={i} className="text-xs font-display bg-parchment-200 border-2 border-parchment-600 px-2.5 py-1 rounded-sm text-ink-500">
            +{b.bonus} {b.ability}
          </span>
        ))}
        {hasFreeChoice && (
          <span className="text-xs italic bg-parchment-50 border-2 border-dashed border-ink-300 px-2.5 py-1 rounded-sm text-ink-300">
            +1 em 2 atributos à escolha
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * Barra de vida do combatente. Só apresentação: quem decide o que é `current`
 * (doc da ficha pro PJ, `state` do encontro pro monstro) é a linha.
 */
export function HpBar({ current, max, temp = 0, label }) {
  const total = Math.max(1, max || 0)
  const fracao = Math.max(0, Math.min(1, (current || 0) / total))
  const cor = fracao > 0.5 ? 'bg-green-700' : fracao > 0.25 ? 'bg-amber-600' : 'bg-red-700'

  return (
    <div className="flex items-center gap-2 min-w-[7.5rem]">
      <div
        role="img"
        aria-label={`${label}: ${current} de ${max} pontos de vida`}
        className="relative flex-1 h-2 rounded-sm border border-parchment-600 bg-parchment-200 overflow-hidden"
      >
        <div className={`h-full ${cor}`} style={{ width: `${fracao * 100}%` }} />
      </div>
      <span className="text-sm tabular-nums text-ink-500 whitespace-nowrap">
        {current === 0 ? (
          <span className="text-xs ink-italic text-red-700">caído</span>
        ) : (
          <>{current}/{max}</>
        )}
        {temp > 0 && <span className="text-xs ink-italic text-ink-300"> +{temp}</span>}
      </span>
    </div>
  )
}

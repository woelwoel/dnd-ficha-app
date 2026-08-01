/**
 * Registro curto do que aconteceu no combate.
 *
 * É LOCAL e não persistido, de propósito: mudança de monstro passa pelo
 * `update` do encontro, mas mudança de PJ vai pela RPC da ficha e não toca o
 * jsonb — persistir deixaria metade do log de fora ou pagaria uma segunda ida
 * à rede por golpe. Log pela metade é pior que log honestamente efêmero.
 */
export function CombatLog({ entries = [] }) {
  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-xs font-display tracking-widest uppercase text-ink-500">
        Registro <span className="normal-case tracking-normal ink-italic text-ink-300">· desta sessão</span>
      </h3>
      {entries.length === 0 ? (
        <p className="text-xs ink-italic text-ink-300">Nada aconteceu ainda.</p>
      ) : (
        <ul className="flex flex-col gap-0.5 max-h-48 overflow-y-auto pr-1">
          {entries.map(e => (
            <li key={e.seq} className="text-xs text-ink-500">
              <span className="ink-italic text-ink-300">R{e.round}</span> {e.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

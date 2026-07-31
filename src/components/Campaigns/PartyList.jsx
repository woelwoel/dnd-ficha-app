import { Button } from '../ui/Button'

function CharacterLine({ character, onOpen }) {
  const resumo = [character.race, character.className].filter(Boolean).join(' ')
  const conteudo = (
    <>
      <span className="text-sm text-ink-500 font-display tracking-wide">{character.name}</span>
      <span className="text-xs ink-italic text-ink-300">
        {resumo}{resumo && ' — '}Nv {character.level}
        {character.currentHp != null && character.maxHp != null && (
          <> · {character.currentHp}/{character.maxHp} PV</>
        )}
      </span>
    </>
  )

  if (!onOpen) {
    return <div className="flex flex-wrap items-baseline gap-x-2">{conteudo}</div>
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(character.openId)}
      className="flex flex-wrap items-baseline gap-x-2 text-left hover:underline decoration-parchment-600 underline-offset-4"
    >
      {conteudo}
    </button>
  )
}

/**
 * A companhia da mesa numa lista só: quem é membro e com qual personagem.
 *
 * Antes eram duas caixas separadas — uma de logins e outra de fichas — que
 * nunca diziam que "cristimansigor2" e "Sahir Al Madih" são a mesma pessoa.
 *
 * @param {Array} rows — saída de `mergeParty`
 * @param {Array} orphanCharacters — fichas cujo dono não é mais membro
 * @param {(openId:string)=>void} [onOpenCharacter] — ausente para o jogador,
 *   que enxerga o resumo mas não abre a ficha alheia
 */
export function PartyList({
  rows = [], orphanCharacters = [], onOpenCharacter, onRemoveMember, onLeave,
  busyMemberId = null, leaving = false, failure = null, onRetry,
}) {
  return (
    <section
      aria-label="Companhia"
      className="rounded-sm border-2 border-parchment-600 bg-parchment-50 shadow-parchment-sm overflow-hidden"
    >
      <h2 className="px-4 py-2 text-xs font-display uppercase tracking-widest text-ink-500 border-b border-parchment-600 bg-parchment-100">
        Companhia ({rows.length})
      </h2>

      {failure && (
        <div className="px-4 py-3 flex flex-col items-start gap-2 border-b border-parchment-600">
          <p role="alert" className="text-sm text-red-700">
            Não foi possível carregar as fichas desta mesa — os membros abaixo estão sem personagem por isso.
            {failure.message && (
              <span className="block mt-1 text-xs ink-italic text-ink-300">{failure.message}</span>
            )}
          </p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="text-xs font-display tracking-wide uppercase px-3 py-1 border-2 border-parchment-600 rounded-sm text-ink-500 hover:bg-parchment-200 transition"
            >
              Tentar de novo
            </button>
          )}
        </div>
      )}

      <ul className="divide-y divide-parchment-600">
        {rows.map(r => (
          <li key={r.userId} className="px-4 py-3 flex items-start gap-3">
            {r.avatarUrl
              ? <img src={r.avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              : <span aria-hidden className="w-8 h-8 rounded-full shrink-0 border-2 border-parchment-600 bg-parchment-200" />}

            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-ink-500 font-display tracking-wide truncate">
                  {r.isSelf ? 'Você' : r.displayName}
                </span>
                <span className={
                  'text-xs uppercase tracking-widest font-display px-1.5 py-0.5 rounded-sm shrink-0 ' +
                  (r.role === 'dm'
                    ? 'bg-amber-100 text-amber-800 border border-amber-600'
                    : 'text-ink-300')
                }>
                  {r.role === 'dm' ? 'Mestre' : 'Jogador'}
                </span>
              </div>

              {r.characters.length === 0 ? (
                <span className="text-xs ink-italic text-ink-300">
                  {r.role === 'dm' ? 'conduz a mesa' : 'ainda não criou ficha'}
                </span>
              ) : (
                r.characters.map(c => (
                  <CharacterLine key={c.id} character={c} onOpen={onOpenCharacter} />
                ))
              )}
            </div>

            {onRemoveMember && !r.isSelf && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busyMemberId === r.userId}
                onClick={() => onRemoveMember(r.userId)}
              >
                {busyMemberId === r.userId ? 'Removendo…' : 'Remover'}
              </Button>
            )}
            {onLeave && r.isSelf && r.role !== 'dm' && (
              <Button variant="ghost" size="sm" disabled={leaving} onClick={onLeave}>
                {leaving ? 'Saindo…' : 'Sair'}
              </Button>
            )}
          </li>
        ))}
      </ul>

      {orphanCharacters.length > 0 && (
        <div className="border-t-2 border-parchment-600">
          <h3 className="px-4 py-2 text-xs font-display uppercase tracking-widest text-ink-300 bg-parchment-100">
            Fichas sem dono na mesa ({orphanCharacters.length})
          </h3>
          <ul className="divide-y divide-parchment-600/50">
            {orphanCharacters.map(c => (
              <li key={c.id} className="px-4 py-2">
                <CharacterLine character={c} onOpen={onOpenCharacter} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

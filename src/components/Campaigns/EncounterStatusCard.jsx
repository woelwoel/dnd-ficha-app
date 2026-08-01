import { Button } from '../ui/Button'

/**
 * O bloco de ação da mesa: o que está rolando agora e o que dá pra fazer.
 *
 * Ele nasceu porque "Rodar combate" — a ação de toda semana — era um botão do
 * mesmo peso de "Encontros", espremido entre o código de convite e a lista de
 * fichas, enquanto "Apagar mesa" ganhava uma seção inteira com título.
 *
 * @param {object|null} encounter — linha de `getActiveEncounter`, ou null
 * @param {boolean} readFailed — a leitura não respondeu; NUNCA esconde o botão
 *   de rodar combate por causa disso
 */
export function EncounterStatusCard({ encounter, readFailed, onRun, onLibrary, onClose, closing }) {
  const state = encounter?.state
  const emAndamento = !!state?.started
  const montagem = !!encounter && !emAndamento
  const combatentes = state?.combatants?.length ?? 0

  return (
    <section className={`rounded-sm border-2 p-4 flex flex-wrap items-center gap-3 ${
      emAndamento ? 'border-amber-700 bg-amber-50' : 'border-parchment-600 bg-parchment-50'
    }`}>
      <div className="flex-1 min-w-[12rem]">
        <h2 className="text-sm font-display tracking-widest uppercase text-ink-500">
          {emAndamento ? 'Combate em andamento' : montagem ? 'Montagem começada' : 'Combate'}
        </h2>
        <p className="text-xs ink-italic text-ink-300">
          {emAndamento
            ? `Rodada ${state.round} · ${combatentes} na cena`
            : montagem
              ? 'Um encontro foi aberto mas a iniciativa ainda não foi rolada.'
              : 'Nenhum combate aberto nesta mesa.'}
        </p>
        {readFailed && (
          <p className="text-xs ink-italic text-amber-800">
            não deu pra confirmar se há combate aberto — o botão abaixo retoma o que existir
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onRun}>
          {emAndamento ? 'Retomar combate' : montagem ? 'Continuar montagem' : 'Rodar combate'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onLibrary}>Encontros</Button>
        {emAndamento && (
          <Button size="sm" variant="danger" disabled={closing} onClick={onClose}>
            {closing ? 'Encerrando…' : 'Encerrar'}
          </Button>
        )}
      </div>
    </section>
  )
}

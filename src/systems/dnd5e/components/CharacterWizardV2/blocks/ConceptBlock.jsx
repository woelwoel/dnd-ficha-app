import { ALIGNMENTS } from '../../../../../utils/calculations'

const fieldCls =
  'w-full px-3 py-2 rounded-sm border-2 border-parchment-600 bg-parchment-50 text-ink-500 ' +
  'focus:outline-none focus:border-ink-300 placeholder:text-ink-200 placeholder:italic'

/**
 * Nomes sugeridos por gênero/origem fantasy comum em D&D 5e. Os jogadores
 * costumavam digitar o nome da classe ("DRUIDA", "bruxo") como nome próprio
 * — listar exemplos curtos ensina o padrão sem ser intrusivo.
 */
const NAME_SUGGESTIONS = [
  'Aelar Folha-de-Outono',
  'Mira Voz-do-Trovão',
  'Thorin Forjarrocha',
  'Sahir al-Madi',
  'Rowan Trilha-de-Cinzas',
  'Lyanna Lâmina-Sussurrante',
]

export function ConceptBlock({ draft, updateDraft }) {
  const nameMissing = !draft.name?.trim()
  // Mantém um placeholder estável durante a vida do componente
  // (não muda a cada keystroke).
  const placeholder = NAME_SUGGESTIONS[Math.floor(Math.random() * NAME_SUGGESTIONS.length)]
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label
          htmlFor="concept-name"
          className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1"
        >
          Nome do Personagem <span className="text-red-700">*</span>
        </label>
        <input
          id="concept-name"
          type="text"
          value={draft.name ?? ''}
          onChange={e => updateDraft({ name: e.target.value })}
          placeholder={`ex: ${placeholder}`}
          className={`${fieldCls} text-base font-display`}
          autoFocus
        />
        <p className="text-xs ink-italic text-ink-300 mt-1">
          Nome próprio do herói (não digite o nome da classe).
        </p>
        {nameMissing && (
          <p className="text-xs text-red-700 mt-1 italic">O nome é obrigatório.</p>
        )}
      </div>

      <div>
        <label
          htmlFor="concept-player-name"
          className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1"
        >
          Nome do Jogador <span className="text-ink-200 normal-case lowercase">(opcional)</span>
        </label>
        <input
          id="concept-player-name"
          type="text"
          value={draft.playerName ?? ''}
          onChange={e => updateDraft({ playerName: e.target.value })}
          placeholder="Seu nome real"
          className={fieldCls}
        />
      </div>

      <div>
        <label
          htmlFor="concept-alignment"
          className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1"
        >
          Alinhamento
        </label>
        <select
          id="concept-alignment"
          value={draft.alignment ?? ''}
          onChange={e => updateDraft({ alignment: e.target.value })}
          className={fieldCls}
        >
          <option value="">Escolher...</option>
          {ALIGNMENTS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div>
        <label
          htmlFor="concept-appearance"
          className="block text-xs font-display tracking-widest uppercase text-ink-500 mb-1"
        >
          Aparência <span className="text-ink-200 normal-case lowercase">(opcional)</span>
        </label>
        <textarea
          id="concept-appearance"
          value={draft.appearance ?? ''}
          onChange={e => updateDraft({ appearance: e.target.value })}
          placeholder="Altura, olhos, marcas, estilo..."
          rows={3}
          className={`${fieldCls} resize-none`}
        />
      </div>
    </div>
  )
}

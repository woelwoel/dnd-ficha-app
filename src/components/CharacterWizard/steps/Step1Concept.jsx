// Passo 1 — Conceito do Personagem
import { ALIGNMENTS } from '../../../utils/calculations'

export function Step1Concept({ draft, updateDraft }) {
  const fieldCls = (hasErr) =>
    `w-full bg-gray-800 border rounded px-3 py-2 text-white focus:outline-none focus:ring-1 ${
      hasErr
        ? 'border-red-500 focus:border-red-400 focus:ring-red-400'
        : 'border-gray-600 focus:border-amber-400 focus:ring-amber-400'
    }`

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-amber-400 mb-1">Conceito</h2>
        <p className="text-sm text-gray-400">Quem é seu personagem?</p>
      </div>

      {/* Nome */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Nome do Personagem <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={draft.name}
          onChange={e => updateDraft({ name: e.target.value })}
          placeholder="Ex: Thorin Ironforge"
          className={`${fieldCls(!draft.name?.trim())} text-lg font-semibold`}
          autoFocus
        />
        {!draft.name?.trim() && (
          <p className="text-xs text-red-400 mt-1">O nome é obrigatório para avançar.</p>
        )}
      </div>

      {/* Nome do Jogador */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Nome do Jogador <span className="text-gray-600">(opcional)</span>
        </label>
        <input
          type="text"
          value={draft.playerName ?? ''}
          onChange={e => updateDraft({ playerName: e.target.value })}
          placeholder="Seu nome real"
          className={fieldCls(false)}
        />
      </div>

      {/* Alinhamento */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Alinhamento</label>
        <select
          value={draft.alignment}
          onChange={e => updateDraft({ alignment: e.target.value })}
          className={fieldCls(false)}
        >
          <option value="">Escolher...</option>
          {ALIGNMENTS.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Aparência */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Aparência <span className="text-gray-600">(opcional)</span>
        </label>
        <textarea
          value={draft.appearance ?? ''}
          onChange={e => updateDraft({ appearance: e.target.value })}
          placeholder="Descreva a aparência do seu personagem: altura, cor dos olhos, marcas, estilo..."
          rows={3}
          className={`${fieldCls(false)} resize-none`}
        />
      </div>
    </div>
  )
}

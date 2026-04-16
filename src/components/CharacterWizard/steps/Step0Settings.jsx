// Passo 0 — Configurações da Campanha
// Método de atributos, feats, multiclasse

const METHODS = [
  {
    id: 'standard-array',
    label: 'Array Padrão',
    desc: 'Distribua os valores [15, 14, 13, 12, 10, 8] entre seus atributos.',
    icon: '📋',
  },
  {
    id: 'point-buy',
    label: 'Compra de Pontos',
    desc: '27 pontos para distribuir. Cada atributo começa em 8 e pode chegar até 15.',
    icon: '🪙',
  },
  {
    id: '4d6drop',
    label: 'Rolagem (4d6)',
    desc: 'Role 4d6 e descarte o menor dado, 6 vezes. Distribua os resultados.',
    icon: '🎲',
  },
]

export function Step0Settings({ draft, updateDraft }) {
  function handleMethod(method) {
    const baseAttributes = method === 'point-buy'
      ? { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 }
      : { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 }
    updateDraft({
      settings: { ...draft.settings, abilityScoreMethod: method },
      baseAttributes,
      rolledScores: [],
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-amber-400 mb-1">Configurações da Campanha</h2>
        <p className="text-sm text-gray-400">
          Defina as regras da sua mesa. Você pode pular e usar os padrões.
        </p>
      </div>

      {/* Método de atributos */}
      <div>
        <label className="block text-xs font-bold text-amber-300 uppercase tracking-widest mb-3">
          Método de Geração de Atributos
        </label>
        <div className="space-y-2">
          {METHODS.map(m => (
            <button
              key={m.id}
              onClick={() => handleMethod(m.id)}
              className={`w-full flex items-start gap-3 text-left px-4 py-3 rounded-lg border transition-colors ${
                draft.settings.abilityScoreMethod === m.id
                  ? 'border-amber-500 bg-amber-900/20 text-white'
                  : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
              }`}
            >
              <span className="text-xl shrink-0 mt-0.5">{m.icon}</span>
              <div>
                <div className="font-semibold text-sm">{m.label}</div>
                <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">{m.desc}</div>
              </div>
              {draft.settings.abilityScoreMethod === m.id && (
                <span className="ml-auto text-amber-400 shrink-0">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Opções adicionais */}
      <div>
        <label className="block text-xs font-bold text-amber-300 uppercase tracking-widest mb-3">
          Opções Adicionais
        </label>
        <div className="space-y-2">
          <ToggleRow
            label="Permitir Feats"
            desc="Nos níveis de ASI (4, 8, 12, 16, 19), o jogador pode escolher um Feat ao invés de +2."
            checked={draft.settings.allowFeats}
            onChange={v => updateDraft({ settings: { ...draft.settings, allowFeats: v } })}
          />
          <ToggleRow
            label="Permitir Multiclasse"
            desc="O personagem pode ganhar níveis em mais de uma classe."
            checked={draft.settings.allowMulticlass}
            onChange={v => updateDraft({ settings: { ...draft.settings, allowMulticlass: v } })}
          />
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ label, desc, checked, onChange }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-colors ${
        checked ? 'border-amber-600 bg-amber-900/20' : 'border-gray-700 bg-gray-800'
      }`}
      onClick={() => onChange(!checked)}
    >
      <div className="flex-1">
        <div className="text-sm font-medium text-gray-200">{label}</div>
        <div className="text-xs text-gray-500 mt-0.5">{desc}</div>
      </div>
      <div className={`w-10 h-5 rounded-full border-2 transition-colors relative shrink-0 ${
        checked ? 'bg-amber-600 border-amber-500' : 'bg-gray-700 border-gray-600'
      }`}>
        <div className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white transition-all ${
          checked ? 'left-[18px]' : 'left-0.5'
        }`} />
      </div>
    </div>
  )
}

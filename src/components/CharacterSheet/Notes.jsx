import { useState } from 'react'

function TraitField({ field, label, value, onUpdate, suggestions }) {
  const [showSuggestions, setShowSuggestions] = useState(false)

  function applySuggestion(text) {
    onUpdate(field, text)
    setShowSuggestions(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs text-gray-400">{label}</label>
        {suggestions?.length > 0 && (
          <button
            onClick={() => setShowSuggestions(v => !v)}
            className="text-[10px] text-amber-500 hover:text-amber-300 transition-colors"
          >
            {showSuggestions ? 'Fechar' : 'Sugestões do antecedente'}
          </button>
        )}
      </div>

      {showSuggestions && suggestions?.length > 0 && (
        <div className="mb-2 space-y-1 max-h-40 overflow-y-auto pr-1">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => applySuggestion(s)}
              className="w-full text-left text-xs bg-gray-700 hover:bg-amber-900/40 border border-gray-600 hover:border-amber-600 rounded px-3 py-1.5 text-gray-300 hover:text-amber-200 transition-colors"
            >
              <span className="text-amber-700 font-bold mr-1">{i + 1}.</span>{s}
            </button>
          ))}
        </div>
      )}

      <textarea
        value={value || ''}
        onChange={e => onUpdate(field, e.target.value)}
        rows={3}
        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-amber-400"
      />
    </div>
  )
}

export function Notes({ traits, onUpdate, background }) {
  const traitFields = [
    { field: 'personalityTraits', label: 'Traços de Personalidade', suggestions: background?.personality_traits },
    { field: 'ideals',            label: 'Ideais',                  suggestions: background?.ideals },
    { field: 'bonds',             label: 'Vínculos',                suggestions: background?.bonds },
    { field: 'flaws',             label: 'Defeitos',                suggestions: background?.flaws },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">
          Traços &amp; Personalidade
          {background && (
            <span className="ml-2 text-xs font-normal text-gray-500 normal-case">
              — sugestões de {background.name}
            </span>
          )}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {traitFields.map(({ field, label, suggestions }) => (
            <TraitField
              key={field}
              field={field}
              label={label}
              value={traits[field]}
              onUpdate={onUpdate}
              suggestions={suggestions}
            />
          ))}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <label className="block text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">
          Características &amp; Habilidades de Classe/Raça
        </label>
        <textarea
          value={traits.featuresAndTraits || ''}
          onChange={e => onUpdate('featuresAndTraits', e.target.value)}
          rows={6}
          placeholder="Descreva as características de raça, classe, antecedente..."
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-amber-400"
        />
      </div>

      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <label className="block text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">
          Notas da Campanha
        </label>
        <textarea
          value={traits.notes || ''}
          onChange={e => onUpdate('notes', e.target.value)}
          rows={10}
          placeholder="NPCs conhecidos, locais, eventos, itens especiais, backstory..."
          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-amber-400"
        />
      </div>
    </div>
  )
}

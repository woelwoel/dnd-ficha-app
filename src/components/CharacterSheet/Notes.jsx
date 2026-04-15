export function Notes({ traits, onUpdate }) {
  return (
    <div className="space-y-4">
      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">Traços & Personalidade</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { field: 'personalityTraits', label: 'Traços de Personalidade' },
            { field: 'ideals',            label: 'Ideais'                  },
            { field: 'bonds',             label: 'Vínculos'                },
            { field: 'flaws',             label: 'Defeitos'                },
          ].map(({ field, label }) => (
            <div key={field}>
              <label className="block text-xs text-gray-400 mb-1">{label}</label>
              <textarea
                value={traits[field] || ''}
                onChange={e => onUpdate(field, e.target.value)}
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-amber-400"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
        <label className="block text-sm font-bold text-amber-400 uppercase tracking-widest mb-3">
          Características & Habilidades de Classe/Raça
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

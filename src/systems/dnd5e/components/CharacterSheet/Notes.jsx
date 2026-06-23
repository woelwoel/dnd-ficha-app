import { useState } from 'react'
import { Icon } from '../../../../components/ui/Icon'
import { ConfirmDialog } from '../../../../components/ui/ConfirmDialog'

function TraitField({ field, label, value, onUpdate, suggestions }) {
  const [showSuggestions, setShowSuggestions] = useState(false)

  function applySuggestion(text) {
    onUpdate(field, text)
    setShowSuggestions(false)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-display tracking-widest uppercase text-ink-300">{label}</label>
        {suggestions?.length > 0 && (
          <button
            onClick={() => setShowSuggestions(v => !v)}
            className="text-xs ink-italic text-ink-300 hover:text-ink-500 transition-colors underline"
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
              className="w-full text-left text-xs bg-parchment-100 hover:bg-amber-50 border border-parchment-600 hover:border-amber-600 rounded-sm px-3 py-1.5 text-ink-500 transition-colors"
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
        className="w-full bg-parchment-100 border-2 border-parchment-600 rounded-sm px-3 py-2 text-sm text-ink-500 resize-y focus:outline-none focus:border-ink-300"
      />
    </div>
  )
}

/* ── Diário de sessões ──────────────────────────────────────────
 * Lista de entradas datadas (uma por sessão de jogo, normalmente).
 * Cada uma com título opcional + corpo. Mais recentes no topo.
 */
function SessionLog({ entries, onChange }) {
  const [newOpen, setNewOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBody, setNewBody] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [editing, setEditing] = useState(null) // id da entrada em edição

  // Ordenado por createdAt desc (mais recente primeiro)
  const sorted = [...(entries ?? [])].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))

  function addEntry() {
    const body = newBody.trim()
    if (!body) return
    const now = Date.now()
    const entry = {
      id: `session-${now}`,
      createdAt: now,
      title: newTitle.trim(),
      body,
    }
    onChange([...(entries ?? []), entry])
    setNewTitle('')
    setNewBody('')
    setNewOpen(false)
  }

  function updateEntry(id, patch) {
    onChange((entries ?? []).map(e => e.id === id ? { ...e, ...patch } : e))
  }

  function deleteEntry(id) {
    onChange((entries ?? []).filter(e => e.id !== id))
    setConfirmDelete(null)
  }

  function formatDate(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
      + ' · '
      + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="bg-parchment-100 border-2 border-parchment-600 rounded-sm p-4 shadow-parchment-sm">
      <div className="flex items-center justify-between mb-3">
        <label className="block text-sm font-display tracking-widest uppercase text-ink-500 inline-flex items-center gap-2">
          <Icon name="scroll" size={16} strokeWidth={1.75} />
          Diário de Sessões
          <span className="text-xs ink-italic text-ink-300 normal-case tracking-normal">
            {(entries ?? []).length} {(entries ?? []).length === 1 ? 'entrada' : 'entradas'}
          </span>
        </label>
        <button
          type="button"
          onClick={() => setNewOpen(v => !v)}
          className="text-xs px-3 py-1 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 font-display tracking-wide"
        >
          {newOpen ? 'Cancelar' : '+ Nova entrada'}
        </button>
      </div>

      {newOpen && (
        <div className="mb-3 p-3 bg-parchment-50 border-2 border-parchment-600 rounded-sm space-y-2">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Título (opcional) — ex: 'Sessão 7 · Cripta dos Reis'"
            maxLength={120}
            className="w-full bg-parchment-100 border-2 border-parchment-600 rounded-sm px-3 py-1.5 text-sm text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
          />
          <textarea
            value={newBody}
            onChange={e => setNewBody(e.target.value)}
            rows={4}
            autoFocus
            placeholder="O que aconteceu? Decisões, NPCs, loot, próximos passos…"
            className="w-full bg-parchment-100 border-2 border-parchment-600 rounded-sm px-3 py-2 text-sm text-ink-500 placeholder:text-ink-200 resize-y focus:outline-none focus:border-ink-300"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setNewOpen(false); setNewTitle(''); setNewBody('') }}
              className="text-xs px-3 py-1 rounded-sm border-2 border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 font-display tracking-wide"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={addEntry}
              disabled={!newBody.trim()}
              className="text-xs px-3 py-1 rounded-sm bg-ink-500 hover:bg-ink-600 border-2 border-ink-600 text-parchment-50 font-display tracking-wide disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Salvar entrada
            </button>
          </div>
        </div>
      )}

      {sorted.length === 0 && !newOpen ? (
        <p className="text-xs ink-italic text-ink-300 text-center py-6">
          Nenhuma entrada ainda. Use o botão acima pra registrar o que aconteceu na última sessão.
        </p>
      ) : (
        <div className="space-y-2">
          {sorted.map(e => {
            const isEditing = editing === e.id
            return (
              <div
                key={e.id}
                className="border-2 border-parchment-600 bg-parchment-50 rounded-sm p-3"
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <input
                        type="text"
                        value={e.title || ''}
                        onChange={ev => updateEntry(e.id, { title: ev.target.value })}
                        placeholder="Título (opcional)"
                        maxLength={120}
                        className="w-full bg-parchment-100 border-2 border-parchment-600 rounded-sm px-2 py-1 text-sm font-display text-ink-500 placeholder:text-ink-200 focus:outline-none focus:border-ink-300"
                      />
                    ) : (
                      <h4 className="text-sm font-display text-ink-500 font-semibold tracking-wide">
                        {e.title || <span className="ink-italic font-normal text-ink-300">sem título</span>}
                      </h4>
                    )}
                    <p className="text-xs ink-italic text-ink-300 mt-0.5">{formatDate(e.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditing(isEditing ? null : e.id)}
                      title={isEditing ? 'Concluir edição' : 'Editar'}
                      className="text-xs px-2 py-0.5 rounded-sm border border-parchment-600 hover:border-ink-300 text-ink-300 hover:text-ink-500 font-display tracking-wide"
                    >
                      {isEditing ? 'Concluir' : 'Editar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(e.id)}
                      title="Apagar entrada"
                      aria-label={`Apagar entrada ${e.title || 'sem título'}`}
                      className="text-red-700 hover:text-red-900 text-base leading-none w-6 h-6 inline-flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                </div>
                {isEditing ? (
                  <textarea
                    value={e.body || ''}
                    onChange={ev => updateEntry(e.id, { body: ev.target.value })}
                    rows={4}
                    className="w-full mt-2 bg-parchment-100 border-2 border-parchment-600 rounded-sm px-2 py-1.5 text-sm text-ink-500 resize-y focus:outline-none focus:border-ink-300"
                  />
                ) : (
                  <p className="text-sm text-ink-500 whitespace-pre-wrap leading-relaxed">
                    {e.body}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Apagar entrada?"
        message="A entrada será removida do diário. Você pode escrever uma nova depois — mas o conteúdo desta vai embora."
        confirmLabel="Apagar"
        variant="danger"
        onConfirm={() => deleteEntry(confirmDelete)}
        onCancel={() => setConfirmDelete(null)}
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

  function setSessionEntries(next) {
    onUpdate('sessionEntries', typeof next === 'function' ? next(traits.sessionEntries ?? []) : next)
  }

  return (
    <div className="space-y-4">
      <div className="bg-parchment-100 border-2 border-parchment-600 rounded-sm p-4 shadow-parchment-sm">
        <h3 className="text-sm font-display tracking-widest uppercase text-ink-500 mb-3">
          Traços &amp; Personalidade
          {background && (
            <span className="ml-2 text-xs ink-italic font-normal text-ink-300 normal-case tracking-normal">
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

      <div className="bg-parchment-100 border-2 border-parchment-600 rounded-sm p-4 shadow-parchment-sm">
        <label className="block text-sm font-display tracking-widest uppercase text-ink-500 mb-3">
          Características &amp; Habilidades de Classe/Raça
        </label>
        <textarea
          value={traits.featuresAndTraits || ''}
          onChange={e => onUpdate('featuresAndTraits', e.target.value)}
          rows={6}
          placeholder="Descreva as características de raça, classe, antecedente..."
          className="w-full bg-parchment-50 border-2 border-parchment-600 rounded-sm px-3 py-2 text-sm text-ink-500 placeholder:text-ink-200 resize-y focus:outline-none focus:border-ink-300"
        />
      </div>

      {/* Diário de sessões — novo */}
      <SessionLog entries={traits.sessionEntries ?? []} onChange={setSessionEntries} />

      <div className="bg-parchment-100 border-2 border-parchment-600 rounded-sm p-4 shadow-parchment-sm">
        <label className="block text-sm font-display tracking-widest uppercase text-ink-500 mb-3">
          Notas da Campanha (persistentes)
        </label>
        <p className="text-xs ink-italic text-ink-300 mb-2">
          Pra info que vale ao longo de toda a campanha: NPCs recorrentes, locais, lore, contatos. Use o diário acima pra crônica por sessão.
        </p>
        <textarea
          value={traits.notes || ''}
          onChange={e => onUpdate('notes', e.target.value)}
          rows={8}
          placeholder="NPCs conhecidos, locais, eventos importantes, lore relevante…"
          className="w-full bg-parchment-50 border-2 border-parchment-600 rounded-sm px-3 py-2 text-sm text-ink-500 placeholder:text-ink-200 resize-y focus:outline-none focus:border-ink-300"
        />
      </div>
    </div>
  )
}

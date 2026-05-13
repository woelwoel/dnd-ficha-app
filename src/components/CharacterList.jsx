import { useState, useCallback } from 'react'
import { loadCharacters, deleteCharacter } from '../utils/storage'
import { Ornaments } from './ui'

const CLASS_ICONS = {
  guerreiro: '⚔', mago: '✦', clerigo: '☩', ladino: '⚜',
  barbaro: '⚒', bardo: '♪', druida: '❦', patrulheiro: '➳',
  paladino: '✠', feiticeiro: '✺', bruxo: '⊛', monge: '☯',
}

function classIcon(cls) {
  if (!cls) return '◆'
  const key = cls.toLowerCase()
  for (const [k, v] of Object.entries(CLASS_ICONS)) {
    if (key.includes(k)) return v
  }
  return '◆'
}

/* ── Estado vazio ──────────────────────────────────────────── */
function EmptyState() {
  return (
    <div className="text-center py-16">
      <p className="font-display text-2xl text-ink-500 mb-3 tracking-widest uppercase">
        Tomo Vazio
      </p>
      <p className="ink-italic text-sm leading-relaxed max-w-xs mx-auto">
        Nenhum herói foi inscrito ainda. Comece uma nova folha.
      </p>
    </div>
  )
}

/* ── Linha de personagem (entrada de índice) ───────────────── */
function CharacterEntry({ character: c, onSelect, confirmDelete, setConfirmDelete, onDelete }) {
  const icon = classIcon(c.info?.class)
  const subtitle = [
    c.info?.race,
    c.info?.class
      ? `${c.info.class} · Nível ${c.info.level ?? 1}`
      : null,
  ].filter(Boolean).join(' · ')

  return (
    <li className="group relative flex items-stretch gap-3 py-2 border-b border-dotted border-parchment-600/60 hover:bg-parchment-200/50 transition-colors">
      {/* Ícone da classe */}
      <span className="w-8 shrink-0 flex items-center justify-center text-xl text-ink-300 font-display">
        {icon}
      </span>

      {/* Entrada clicável */}
      <button
        onClick={() => onSelect(c.id)}
        className="flex-1 text-left min-w-0"
      >
        <div className="font-display text-base text-ink-500 truncate">
          {c.info?.name || (
            <span className="ink-italic font-body">— Sem nome —</span>
          )}
        </div>
        <div className="text-xs ink-italic mt-0.5 capitalize truncate">
          {subtitle || 'Personagem sem detalhes'}
        </div>
      </button>

      {/* Confirmar exclusão */}
      {confirmDelete === c.id ? (
        <div className="flex items-center gap-2 px-2 shrink-0">
          <span className="text-xs ink-italic font-display">Riscar?</span>
          <button
            onClick={() => onDelete(c.id)}
            className="text-xs px-2 py-1 bg-ink-500 hover:bg-ink-600 text-parchment-50 rounded font-display tracking-wide transition-colors"
          >
            Sim
          </button>
          <button
            onClick={() => setConfirmDelete(null)}
            className="text-xs px-2 py-1 bg-parchment-100 hover:bg-parchment-200 text-ink-300 border border-parchment-600 rounded font-display tracking-wide transition-colors"
          >
            Não
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(c.id)}
          className="opacity-0 group-hover:opacity-100 text-ink-200 hover:text-ink-500 transition-all px-3 text-xl leading-none shrink-0"
          title="Riscar do tomo"
        >
          ×
        </button>
      )}
    </li>
  )
}

/* ── Componente principal ──────────────────────────────────── */
export function CharacterList({ onSelect, onCreate }) {
  const [characters, setCharacters] = useState(loadCharacters)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const handleDelete = useCallback((id) => {
    deleteCharacter(id)
    setCharacters(loadCharacters())
    setConfirmDelete(null)
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-12">
      <div className="relative w-full max-w-2xl bg-parchment-50 border-2 border-parchment-600 rounded-sm px-8 sm:px-14 py-12"
        style={{ boxShadow: 'var(--shadow-parchment-lg)' }}>

        {/* Vinhetas de canto */}
        <Ornaments.CornerVignette className="absolute top-2 left-2 w-10 h-10 text-gilt-500" />
        <Ornaments.CornerVignette className="absolute top-2 right-2 w-10 h-10 text-gilt-500" rotate={90} />
        <Ornaments.CornerVignette className="absolute bottom-2 left-2 w-10 h-10 text-gilt-500" rotate={270} />
        <Ornaments.CornerVignette className="absolute bottom-2 right-2 w-10 h-10 text-gilt-500" rotate={180} />

        {/* ── Cabeçalho ────────────────────────────────────── */}
        <header className="text-center mb-8">
          <p className="text-xs ink-italic tracking-[0.4em] uppercase mb-3">
            D&D 5e · Sistema de Referência
          </p>

          <h1 className="text-5xl sm:text-6xl text-ink-500 font-display tracking-wider leading-none mb-2">
            Tomo dos Heróis
          </h1>

          <p className="ink-italic text-base mt-2">
            Folhas de personagem do reino
          </p>

          <div className="mt-6">
            <Ornaments.Flourish className="mx-auto w-48 h-6 text-gilt-500" />
          </div>
        </header>

        {/* ── Lista / estado vazio ──────────────────────────── */}
        {characters.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <h2 className="font-display text-xs tracking-[0.3em] uppercase text-ink-300 mb-2 border-b border-parchment-600 pb-1">
              Índice
            </h2>
            <ul className="space-y-0 mb-8">
              {characters.map(c => (
                <CharacterEntry
                  key={c.id}
                  character={c}
                  onSelect={onSelect}
                  confirmDelete={confirmDelete}
                  setConfirmDelete={setConfirmDelete}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </>
        )}

        {/* ── Botão criar ──────────────────────────────────── */}
        <div className="flex justify-center">
          <button
            onClick={onCreate}
            className="group inline-flex items-center gap-3 px-8 py-3
              bg-parchment-100 hover:bg-parchment-200
              border-2 border-ink-300 hover:border-ink-500
              text-ink-500
              font-display text-sm tracking-[0.2em] uppercase rounded-sm
              transition-colors"
          >
            <span className="text-gilt-500 text-base leading-none">✦</span>
            Inscrever Novo Herói
            <span className="text-gilt-500 text-base leading-none">✦</span>
          </button>
        </div>

        {/* ── Rodapé ornamental ────────────────────────────── */}
        <div className="mt-10">
          <Ornaments.Flourish className="mx-auto w-32 h-4 text-gilt-500 opacity-60" />
        </div>
      </div>
    </div>
  )
}

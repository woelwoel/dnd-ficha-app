import { useEffect, useState } from 'react'

const ALIGNMENTS = [
  'Leal e Bom', 'Neutro e Bom', 'Caótico e Bom',
  'Leal e Neutro', 'Neutro', 'Caótico e Neutro',
  'Leal e Mau', 'Neutro e Mau', 'Caótico e Mau',
]

export function CharacterInfo({ info, onUpdate, races, classes, backgrounds }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <div className="col-span-2 sm:col-span-3">
        <label className="block text-xs text-gray-400 mb-1">Nome do Personagem</label>
        <input
          type="text"
          value={info.name}
          onChange={e => onUpdate('name', e.target.value)}
          placeholder="Ex: Thorin Ironforge"
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white text-lg font-semibold focus:outline-none focus:border-amber-400"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Raça</label>
        <select
          value={info.race}
          onChange={e => onUpdate('race', e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
        >
          <option value="">Escolher...</option>
          {races.map(r => (
            <option key={r.index} value={r.index}>{r.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Classe</label>
        <select
          value={info.class}
          onChange={e => onUpdate('class', e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
        >
          <option value="">Escolher...</option>
          {classes.map(c => (
            <option key={c.index} value={c.index}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Nível</label>
        <input
          type="number"
          min={1}
          max={20}
          value={info.level}
          onChange={e => onUpdate('level', Math.min(20, Math.max(1, parseInt(e.target.value) || 1)))}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Antecedente</label>
        <select
          value={info.background}
          onChange={e => onUpdate('background', e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
        >
          <option value="">Escolher...</option>
          {backgrounds.map(b => (
            <option key={b.index} value={b.index}>{b.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Alinhamento</label>
        <select
          value={info.alignment}
          onChange={e => onUpdate('alignment', e.target.value)}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400"
        >
          <option value="">Escolher...</option>
          {ALIGNMENTS.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">Experiência (XP)</label>
        <input
          type="number"
          min={0}
          value={info.xp}
          onChange={e => onUpdate('xp', Math.max(0, parseInt(e.target.value) || 0))}
          className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      </div>
    </div>
  )
}

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SrdProvider, useSrd } from '../../systems/dnd5e/data/SrdProvider'

function Probe() {
  const { classes, classChoices } = useSrd()
  return (
    <div>
      <div data-testid="classes">{(classes ?? []).map(c => `${c.index}:${c.source}`).join(',')}</div>
      <div data-testid="choices">{Object.keys(classChoices ?? {}).sort().join(',')}</div>
      <div data-testid="druid-circle">
        {(classChoices?.druida?.choices?.[0]?.options ?? []).map(o => `${o.value}:${o.source ?? 'phb'}`).join(',')}
      </div>
    </div>
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url) => {
    const u = String(url)
    const body =
      u.includes('phb-classes')             ? [{ index: 'druida', name: 'Druida' }] :
      u.includes('tasha-classes')           ? [{ index: 'artifice', name: 'Artífice', source: 'tasha' }] :
      u.includes('phb-class-choices')       ? { druida: { choices: [{ level: 2, id: 'circle', options: [{ value: 'terra', name: 'Terra' }] }] } } :
      u.includes('tasha-class-choices')     ? { druida: { choices: [{ level: 2, id: 'circle', options: [{ value: 'estrelas', name: 'Estrelas' }] }] }, artifice: { choices: [] } } :
      u.includes('phb-class-progression')   ? { druida: { levels: [] } } :
      u.includes('tasha-class-progression') ? { artifice: { levels: [] } } :
      // demais datasets do boot retornam vazio compatível
      (u.includes('-choices') || u.includes('progression')) ? {} : []
    return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) })
  }))
})

describe('SrdProvider — datasets compostos no boot', () => {
  it('classes = array phb+tasha carimbado; classChoices = objeto mesclado', async () => {
    render(<SrdProvider><Probe /></SrdProvider>)
    await waitFor(() => {
      expect(screen.getByTestId('classes').textContent).toContain('druida:phb')
      expect(screen.getByTestId('classes').textContent).toContain('artifice:tasha')
      expect(screen.getByTestId('choices').textContent).toBe('artifice,druida')
      expect(screen.getByTestId('druid-circle').textContent).toBe('terra:phb,estrelas:tasha')
    })
  })
})

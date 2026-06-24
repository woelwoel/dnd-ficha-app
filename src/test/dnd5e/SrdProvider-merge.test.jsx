import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SrdProvider, useLazySrdDataset } from '../../systems/dnd5e/data/SrdProvider'

function Probe() {
  const feats = useLazySrdDataset('feats')
  return <div data-testid="feats">{(feats ?? []).map(f => `${f.index}:${f.source}`).join(',')}</div>
}

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url) => {
    const body =
      url.includes('phb-feats')   ? [{ index: 'adepto-elemental', name: 'AE' }] :
      url.includes('tasha-feats') ? [{ index: 'esmagador', name: 'Esm', source: 'tasha' }] :
      []
    return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) })
  }))
})

describe('SrdProvider — merge de feats', () => {
  it('une phb (carimbado phb) + tasha (carimbado tasha)', async () => {
    render(<SrdProvider><Probe /></SrdProvider>)
    await waitFor(() => {
      const txt = screen.getByTestId('feats').textContent
      expect(txt).toContain('adepto-elemental:phb')
      expect(txt).toContain('esmagador:tasha')
    })
  })
})

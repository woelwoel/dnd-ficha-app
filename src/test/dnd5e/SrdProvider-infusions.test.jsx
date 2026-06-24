import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SrdProvider, useLazySrdDataset } from '../../systems/dnd5e/data/SrdProvider'

function Probe() {
  const inf = useLazySrdDataset('infusions')
  return <div data-testid="inf">{(inf ?? []).map(i => `${i.index}:${i.source}`).join(',')}</div>
}
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url) => {
    const body = String(url).includes('tasha-infusions') ? [{ index: 'arma-aprimorada', name: 'Arma', source: 'tasha' }] : []
    return Promise.resolve({ ok: true, headers: { get: () => 'application/json' }, json: () => Promise.resolve(body) })
  }))
})
describe('SrdProvider — infusions', () => {
  it('carrega infusions carimbado tasha', async () => {
    render(<SrdProvider><Probe /></SrdProvider>)
    await waitFor(() => expect(screen.getByTestId('inf').textContent).toContain('arma-aprimorada:tasha'))
  })
})

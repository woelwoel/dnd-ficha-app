import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

/**
 * Wrapper de `render` que envolve a UI em MemoryRouter — necessário pra
 * componentes que usam useNavigate/useLocation/useParams (CharacterList,
 * CampaignsScreen, etc).
 *
 * Uso:
 *   import { renderWithRouter } from '../utils/renderWithRouter'
 *   renderWithRouter(<CharacterList onSelect={...} />)
 *
 * Aceita `initialEntries` opcional pra simular URL específica:
 *   renderWithRouter(<CharacterList />, { initialEntries: ['/c/abc123'] })
 */
export function renderWithRouter(ui, { initialEntries = ['/'], ...renderOptions } = {}) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>,
    renderOptions,
  )
}

import { useCallback, useState } from 'react'
import { CAMPAIGN_SCOPE_STORAGE_KEY } from '../utils/config'

/**
 * Persiste o "scope" ativo da listagem de fichas em localStorage.
 *
 * Valores possíveis:
 *   - 'personal'                       → só fichas pessoais (campaign_id IS NULL)
 *   - { campaignId: '<uuid>' }         → fichas dessa mesa
 *
 * Default é 'personal'. F5 mantém a escolha.
 */
function readScope() {
  try {
    const raw = localStorage.getItem(CAMPAIGN_SCOPE_STORAGE_KEY)
    if (!raw) return 'personal'
    if (raw === 'personal') return 'personal'
    const parsed = JSON.parse(raw)
    if (parsed?.campaignId && typeof parsed.campaignId === 'string') return parsed
    return 'personal'
  } catch { return 'personal' }
}

function writeScope(scope) {
  try {
    localStorage.setItem(
      CAMPAIGN_SCOPE_STORAGE_KEY,
      scope === 'personal' ? 'personal' : JSON.stringify(scope),
    )
  } catch { /* sem localStorage */ }
}

export function useCampaignContext() {
  const [scope, setScopeState] = useState(readScope)
  const setScope = useCallback((s) => {
    setScopeState(s)
    writeScope(s)
  }, [])
  return [scope, setScope]
}

/**
 * Se o scope persistido aponta pra uma mesa em que o user não é mais membro
 * (ou que foi deletada), reseta pra 'personal'. Caso contrário, devolve o
 * scope inalterado. Use depois de listMyCampaigns() pra evitar listas vazias
 * mudas (#10 super review).
 *
 * @param scope estado atual de useCampaignContext()
 * @param setScope setter de useCampaignContext()
 * @param myCampaigns array retornado por listMyCampaigns()
 * @returns boolean — true se resetou
 */
export function resetScopeIfMissing(scope, setScope, myCampaigns) {
  if (!scope || typeof scope !== 'object' || !scope.campaignId) return false
  const stillMember = (myCampaigns ?? []).some(c => c.id === scope.campaignId)
  if (stillMember) return false
  setScope('personal')
  return true
}

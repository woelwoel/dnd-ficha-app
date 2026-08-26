/**
 * Escape hatch do seletor de ruleset. Enquanto o conteúdo 2024 não existe
 * (Fases 2 a 5), só quem passa `?ruleset=2024` na URL vê a opção no setup —
 * mesmo padrão de `?theme=parchment` e `?adm=1`.
 *
 * Ao contrário do flag de tema, este NÃO persiste: é ferramenta de
 * desenvolvimento, não preferência de usuário. Quando o pacote 2024 estiver
 * pronto (Fase 2 ou 3), este arquivo morre e o seletor vira público.
 *
 * PEGADINHA: use `/new?ruleset=2024` — a URL da tela de CRIAÇÃO. Abrir
 * `/?ruleset=2024` na lista e clicar em "Recrutar Aventureiro" NÃO funciona:
 * `ListRoute.onCreate` em App.jsx navega pra '/new' fixo, sem repassar a
 * query, e o seletor lê `window.location.search` já em '/new'.
 */
export function isRulesetPickerEnabled(
  search = typeof window !== 'undefined' ? window.location.search : '',
) {
  return new URLSearchParams(search).get('ruleset') === '2024'
}

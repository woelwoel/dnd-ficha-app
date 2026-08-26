/**
 * Escape hatch do seletor de ruleset. Enquanto o conteúdo 2024 não existe
 * (Fases 2 a 5), só quem passa `?ruleset=2024` na URL vê a opção no setup —
 * mesmo padrão de `?theme=parchment` e `?adm=1`.
 *
 * Ao contrário do flag de tema, este NÃO persiste: é ferramenta de
 * desenvolvimento, não preferência de usuário. Quando o pacote 2024 estiver
 * pronto (Fase 2 ou 3), este arquivo morre e o seletor vira público.
 */
export function isRulesetPickerEnabled(
  search = typeof window !== 'undefined' ? window.location.search : '',
) {
  return new URLSearchParams(search).get('ruleset') === '2024'
}

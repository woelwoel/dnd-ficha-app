/**
 * Controle de acesso à ficha.
 *
 * Papéis e contexto:
 *   - dono            → edita a própria ficha.
 *   - DM da mesa      → abre a ficha do jogador em modo LEITURA.
 *   - admin global    → só tem poder DENTRO da tela Admin (`adminContext`).
 *                       No jogo normal o admin é tratado como jogador comum
 *                       (não basta ter is_admin; precisa ter aberto a ficha
 *                       a partir do Admin, que carrega com `?adm=1`).
 *
 * Por que `adminContext` em vez de `isAdmin`? A flag is_admin fica sempre
 * ligada no perfil e a RLS de admin devolve qualquer ficha. Se a edição
 * dependesse só dela, o admin editaria fichas alheias jogando como jogador
 * comum — exatamente o vazamento que queremos fechar.
 */

/**
 * Somente-leitura quando quem abre NÃO é o dono e não está em contexto admin.
 * (DM lendo ficha de jogador cai aqui → readOnly.)
 */
export function isSheetReadOnly({ ownerId, currentUserId, adminContext = false }) {
  if (adminContext) return false
  return !!(ownerId && currentUserId && ownerId !== currentUserId)
}

/**
 * Pode ABRIR a ficha? Dono sempre; DM da mesa da ficha; admin só em
 * contexto admin. Qualquer outro (inclusive admin jogando como jogador)
 * não abre ficha alheia.
 *
 * `ownerId == null` (ficha nova local, ainda sem dono) é tratado como
 * acessível pra não travar o fluxo de criação.
 */
export function canOpenSheet({ ownerId, currentUserId, isDmHere = false, adminContext = false }) {
  if (adminContext) return true
  if (!ownerId) return true
  if (currentUserId && ownerId === currentUserId) return true
  return !!isDmHere
}

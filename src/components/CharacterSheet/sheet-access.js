/**
 * Ficha é somente-leitura quando um usuário que NÃO é o dono a abre
 * (caso clássico: DM lendo ficha de jogador). Exceção: admin edita qualquer
 * ficha.
 */
export function isSheetReadOnly({ ownerId, currentUserId, isAdmin }) {
  if (isAdmin) return false
  return !!(ownerId && currentUserId && ownerId !== currentUserId)
}

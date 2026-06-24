/** Caps de infusões (conhecidas/ativas) por nível de Artífice — tabela O Artífice. */
export function getInfusionCaps(artificerLevel) {
  const L = Number(artificerLevel) || 0
  if (L < 2) return { known: 0, active: 0 }
  if (L < 6) return { known: 4, active: 2 }
  if (L < 10) return { known: 6, active: 3 }
  if (L < 14) return { known: 8, active: 4 }
  if (L < 18) return { known: 10, active: 5 }
  return { known: 12, active: 6 }
}

/** Nível NA classe Artífice (primária ou multiclasse); 0 se não for Artífice. */
export function artificerLevelOf(character) {
  const info = character?.info ?? {}
  if (info.class === 'artifice') return info.level ?? 0
  const mc = (info.multiclasses ?? []).find(m => m.class === 'artifice')
  return mc?.level ?? 0
}

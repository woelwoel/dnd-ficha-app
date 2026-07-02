export const DRACONIC_ANCESTORS = [
  { value: 'azul',     label: 'Azul',     damage: 'Elétrico', breath: 'Linha 1,5m×9m', save: 'Des' },
  { value: 'branco',   label: 'Branco',   damage: 'Frio',     breath: 'Cone de 4,5m',  save: 'Con' },
  { value: 'bronze',   label: 'Bronze',   damage: 'Elétrico', breath: 'Linha 1,5m×9m', save: 'Des' },
  { value: 'cobre',    label: 'Cobre',    damage: 'Ácido',    breath: 'Linha 1,5m×9m', save: 'Des' },
  { value: 'latao',    label: 'Latão',    damage: 'Fogo',     breath: 'Linha 1,5m×9m', save: 'Des' },
  { value: 'negro',    label: 'Negro',    damage: 'Ácido',    breath: 'Linha 1,5m×9m', save: 'Des' },
  { value: 'ouro',     label: 'Ouro',     damage: 'Fogo',     breath: 'Cone de 4,5m',  save: 'Des' },
  { value: 'prata',    label: 'Prata',    damage: 'Frio',     breath: 'Cone de 4,5m',  save: 'Con' },
  { value: 'verde',    label: 'Verde',    damage: 'Veneno',   breath: 'Cone de 4,5m',  save: 'Con' },
  { value: 'vermelho', label: 'Vermelho', damage: 'Fogo',     breath: 'Cone de 4,5m',  save: 'Des' },
]

export function enrichDraconicTopics(topics, ancestryValue) {
  if (!ancestryValue) return topics
  const anc = DRACONIC_ANCESTORS.find(a => a.value === ancestryValue)
  if (!anc) return topics

  return topics.map(t => {
    const title = (t.title ?? t.name ?? '').toLowerCase()
    if (title === 'ancestral dracônico') {
      return {
        ...t,
        desc: `${t.desc}\n\n▸ Seu ancestral: Dragão ${anc.label}\n▸ Tipo de dano: ${anc.damage}`,
      }
    }
    if (title === 'arma de sopro') {
      return {
        ...t,
        desc: `${t.desc}\n\n▸ Forma: ${anc.breath}\n▸ Dano: ${anc.damage}\n▸ Teste de resistência: ${anc.save}`,
      }
    }
    if (title === 'resistência a dano') {
      return {
        ...t,
        desc: `${t.desc}\n\n▸ Tipo: ${anc.damage} (Dragão ${anc.label})`,
      }
    }
    return t
  })
}

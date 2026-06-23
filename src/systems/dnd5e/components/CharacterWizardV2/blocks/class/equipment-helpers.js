export function rollGoldFormula(formula) {
  const m = (formula ?? '5d4 × 10').match(/(\d+)d(\d+)\s*[×x*]\s*(\d+)/i)
  const n = m ? Number(m[1]) : 5
  const sides = m ? Number(m[2]) : 4
  const mult = m ? Number(m[3]) : 10
  let total = 0
  for (let i = 0; i < n; i++) total += Math.ceil(Math.random() * sides)
  return total * mult
}

export function allPicksDone(classEquipmentData, choices, picks) {
  if (!classEquipmentData) return true
  for (const choice of classEquipmentData.choices ?? []) {
    const sel = choices?.[choice.id]
    if (!sel) return false
    const opt = choice.options.find(o => o.value === sel)
    if (!opt) continue
    for (let i = 0; i < (opt.items ?? []).length; i++) {
      if (opt.items[i].pick && !picks?.[`${choice.id}:${sel}:${i}`]) return false
    }
  }
  for (const item of classEquipmentData.fixed ?? []) {
    if (item.pick && !picks?.[`fixed:${item.name}`]) return false
  }
  return true
}

export function computePreviewItems(classEquipmentData, choices, picks) {
  if (!classEquipmentData) return []
  const items = []
  for (const choice of classEquipmentData.choices ?? []) {
    const sel = choices?.[choice.id]
    if (!sel) continue
    const opt = choice.options.find(o => o.value === sel)
    if (!opt) continue
    ;(opt.items ?? []).forEach((item, idx) => {
      if (item.pick) {
        const picked = picks?.[`${choice.id}:${sel}:${idx}`]
        if (picked) items.push({ name: picked, qty: 1 })
      } else {
        items.push(item)
      }
    })
  }
  for (const item of classEquipmentData.fixed ?? []) {
    if (item.pick) {
      const picked = picks?.[`fixed:${item.name}`]
      if (picked) items.push({ name: picked, qty: 1 })
    } else {
      items.push(item)
    }
  }
  return items
}

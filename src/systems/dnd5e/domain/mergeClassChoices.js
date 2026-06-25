import { tagSource } from './sources'

/**
 * Mescla catálogos de class-choices de múltiplas fontes num único objeto.
 *
 * - Classe presente só na fonte extra (ex.: `artifice`) → entra inteira, com
 *   `options` carimbadas com `code`.
 * - Classe em colisão (ex.: `barbaro`) → para cada `choice` da fonte extra:
 *   se já existe `choice` de mesmo `id`, concatena as `options` (carimbadas);
 *   senão, anexa o `choice` inteiro.
 * - PHB nunca é carimbado: ausência de `source` numa opção = phb (básico).
 *
 * Pura: não muta `phb` nem `extra`. `tagSource` preserva `source` já presente.
 */
export function mergeClassChoices(phb, extra, code = 'tasha') {
  const out = {}
  for (const [cls, data] of Object.entries(phb ?? {})) {
    out[cls] = {
      ...data,
      choices: (data.choices ?? []).map(ch => ({ ...ch, options: [...(ch.options ?? [])] })),
    }
  }
  for (const [cls, data] of Object.entries(extra ?? {})) {
    const extraChoices = (data.choices ?? []).map(ch => ({
      ...ch,
      options: tagSource(ch.options ?? [], code),
    }))
    if (!out[cls]) {
      out[cls] = { ...data, choices: extraChoices }
      continue
    }
    for (const ech of extraChoices) {
      const existing = out[cls].choices.find(c => c.id === ech.id)
      if (existing) existing.options = [...existing.options, ...ech.options]
      else out[cls].choices.push(ech)
    }
  }
  return out
}

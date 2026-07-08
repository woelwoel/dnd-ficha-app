# Xanathar Plano 2 — Hexblade (O Lâmina Maldita) + Guerreiro Maldito

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o patrono de Bruxo **O Lâmina Maldita** (Hexblade) do XGE — features por nível parseáveis (tracker automático na Maldição), lista expandida de magias, e o **Guerreiro Maldito** que resolve o [[xanathar-deferral]]: a arma de pacto passa a poder usar Carisma no ataque/dano.

**Architecture:** Dados no `xanathar-class-choices-pt.json` (option nova na choice `patron` existente — merge por id concatena). Magias concedidas na tabela `WARLOCK_PATRON_SPELLS` de `subclassSpells.js` (GRUPO B, mesma semântica dos outros patronos). Único código de comportamento: `WarlockPactPanel` passa a considerar CHA no `BladePactPanel` quando o patrono é `hexblade`.

**Tech Stack:** React, Vitest + @testing-library/react, JSON em `public/srd-data`.

**Spec:** `docs/superpowers/specs/2026-07-07-xanathar-design.md` · **Roadmap:** `docs/superpowers/plans/2026-07-07-xanathar-roadmap.md`

**Comando de teste:** `npx vitest run <arquivo>`.

## Nomes desta tradução (PDF, pág. pymupdf 16-17)

- Patrono: **O Lâmina Maldita** (value `hexblade`).
- Features: **Guerreiro Maldito** (nv1, = Hex Warrior/CHA), **Maldição da Lâmina Maldita** (nv1), **Lista de Magias Expandida** (nv1), **Espectro Amaldiçoado** (nv6), **Armadura de Maldições** (nv10), **Mestre das Maldições** (nv14).
- Lista expandida (todos os slugs CONFERIDOS no catálogo composto — sem omissões):
  - 1º `escudo-arcano` (Shield), `destruicao-colerica` (Wrathful Smite)
  - 2º `nublar` (Blur), `marca-da-punicao` (Branding Smite)
  - 3º `piscar` (Blink), `arma-elemental` (Elemental Weapon)
  - 4º `assassino-fantasmagorico` (Phantasmal Killer), `destruicao-estonteante` (Staggering Smite)
  - 5º `destruicao-banidora` (Banishing Smite), `cone-de-frio` (Cone of Cold)

## Mapa de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `public/srd-data/xanathar-class-choices-pt.json` | + `bruxo.patron.hexblade` (features parseáveis) | Modificar |
| `src/systems/dnd5e/domain/subclassSpells.js` | + `WARLOCK_PATRON_SPELLS.hexblade` | Modificar |
| `src/systems/dnd5e/components/CharacterSheet/WarlockPactPanel.jsx` | CHA no `BladePactPanel` + label/ícone do patrono | Modificar |
| `src/test/dnd5e/xanathar-subclasses-parse.test.js` | Parse das subclasses XGE (cresce nos planos 3-5) | **Criar** |
| `src/test/dnd5e/xanathar-subclass-spells.test.js` | Lista expandida + integridade de slugs | **Criar** |
| `src/test/WarlockPactPanel.test.jsx` | CHA do Guerreiro Maldito | Modificar |
| `vite.config.js` | Bump `srd-data-v24` → `v25` | Modificar |

---

## Task 1: Patrono Hexblade (dados parseáveis)

**Files:**
- Modify: `public/srd-data/xanathar-class-choices-pt.json`
- Test: `src/test/dnd5e/xanathar-subclasses-parse.test.js` (criar)

- [ ] **Step 1: Escrever o teste que falha** — `src/test/dnd5e/xanathar-subclasses-parse.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseSubclassFeatures, detectFeatureUses } from '../../systems/dnd5e/domain/subclassFeatures'

const choices = JSON.parse(readFileSync('public/srd-data/xanathar-class-choices-pt.json', 'utf8'))
// Opções de subclasse (exclui choices internas como invocações/disparos arcanos).
const NON_SUBCLASS = new Set(['eldritch_invocations', 'arcane_shots'])
const subclassOptions = Object.values(choices)
  .flatMap(c => c.choices ?? [])
  .filter(ch => !NON_SUBCLASS.has(ch.id))
  .flatMap(ch => ch.options ?? [])

describe('subclasses do xanathar-class-choices-pt.json', () => {
  it('toda subclasse parseia em features por nível', () => {
    expect(subclassOptions.length).toBeGreaterThan(0)
    for (const opt of subclassOptions) {
      const { summary, features } = parseSubclassFeatures(opt.desc)
      expect(summary.length, opt.value).toBeGreaterThan(20)
      expect(features.length, opt.value).toBeGreaterThanOrEqual(3)
      expect(features.every(f => f.level >= 1 && f.level <= 20), opt.value).toBe(true)
    }
  })
})

describe('hexblade (O Lâmina Maldita)', () => {
  const hexblade = choices.bruxo.choices.find(c => c.id === 'patron').options.find(o => o.value === 'hexblade')

  it('existe com id/level da choice patron do PHB', () => {
    const patron = choices.bruxo.choices.find(c => c.id === 'patron')
    expect(patron.level).toBe(1)
    expect(hexblade).toBeTruthy()
    expect(hexblade.source ?? 'phb').not.toBe('phb') // será carimbado 'xanathar' no merge
  })

  it('tem features nos níveis 1, 6, 10 e 14', () => {
    const levels = parseSubclassFeatures(hexblade.desc).features.map(f => f.level)
    for (const lvl of [1, 6, 10, 14]) expect(levels, `nível ${lvl}`).toContain(lvl)
  })

  it('Maldição ganha tracker 1x/descanso curto', () => {
    const curse = parseSubclassFeatures(hexblade.desc).features.find(f => /maldi/i.test(f.name ?? ''))
    expect(curse, 'feature Maldição').toBeTruthy()
    expect(detectFeatureUses(`${curse.name}: ${curse.desc}`)).toMatchObject({ max: 1, recharge: 'short' })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/test/dnd5e/xanathar-subclasses-parse.test.js` → FAIL (`choices.bruxo` undefined; arquivo é `{}`).

- [ ] **Step 3: Escrever a chave `bruxo` no `xanathar-class-choices-pt.json`** (id/level/featureName/prompt IDÊNTICOS à choice `patron` do PHB — `mergeClassChoices` casa por id e concatena `options`):

```json
{
  "bruxo": {
    "choices": [
      {
        "level": 1,
        "id": "patron",
        "featureName": "Patrono Sobrenatural",
        "prompt": "Escolha seu Patrono Sobrenatural",
        "options": [
          {
            "value": "hexblade",
            "name": "O Lâmina Maldita",
            "desc": "Você fez o seu pacto com uma entidade misteriosa do Pendor das Sombras — uma força que se manifesta em armas mágicas inteligentes esculpidas da matéria da sombra. A poderosa espada Lâmina Negra é a mais notável dessas armas, que se espalharam pelo multiverso ao longo dos tempos. A força sombria por trás dessas armas pode oferecer poder para guerreiros que formam pactos com ela.\n\nFeatures de Patrono por nível:\n• Nv 1 — Guerreiro Maldito: Você ganha proficiência em armaduras médias, escudos e armas marciais. Sempre que terminar um descanso longo, pode tocar uma arma com a qual seja proficiente e que não possua a propriedade duas mãos; ao atacar com ela, pode usar seu modificador de Carisma, em vez de Força ou Destreza, para os testes de ataque e dano. Se ganhar a característica Pacto da Lâmina, o benefício se estende a todas as armas de pacto que conjurar, independente do tipo.\n• Nv 1 — Lista de Magias Expandida: as magias da Lâmina Maldita (por nível de bruxo) são adicionadas à sua lista de magias de bruxo e contam como magias de bruxo para você.\n• Nv 1 — Maldição da Lâmina Maldita: como ação bônus, escolha uma criatura que possa ver a até 9 metros; ela é amaldiçoada por 1 minuto (termina antes se o alvo ou você morrer, ou você for incapacitado). Enquanto durar: você ganha bônus de dano contra o alvo igual ao seu bônus de proficiência; seus ataques contra ele são críticos em 19-20; e se o alvo morrer, você recupera PV iguais ao seu nível de bruxo + seu modificador de Carisma (mínimo 1). Uma vez usada, não pode usá-la novamente até terminar um descanso curto ou longo.\n• Nv 6 — Espectro Amaldiçoado: quando você mata um humanoide, pode erguer seu espírito como um espectro aliado (PV temporários iguais à metade do seu nível de bruxo; bônus de ataque igual ao seu modificador de Carisma), que age em sua própria iniciativa e obedece a seus comandos até o fim do seu próximo descanso longo. Uma vez usada, não pode usá-la novamente até terminar um descanso longo.\n• Nv 10 — Armadura de Maldições: se o alvo da sua Maldição o acerta com um ataque, pode usar sua reação para rolar 1d6; em 4 ou mais, o ataque falha, não importa o resultado.\n• Nv 14 — Mestre das Maldições: quando a criatura amaldiçoada pela sua Maldição morre, você pode aplicar a maldição a outra criatura que possa ver a até 9 metros (sem recuperar PV por esta aplicação), desde que não esteja incapacitado."
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/test/dnd5e/xanathar-subclasses-parse.test.js` → PASS. Validar JSON: `node -e "JSON.parse(require('fs').readFileSync('public/srd-data/xanathar-class-choices-pt.json','utf8')); console.log('JSON ok')"`.

- [ ] **Step 5: Regressão do merge** — `npx vitest run src/test/dnd5e/mergeClassChoices.test.js src/test/dnd5e/` → PASS.

- [ ] **Step 6: Revisão de fidelidade com o dono** (Hexblade é item de risco da spec).

- [ ] **Step 7: Commit**

```bash
git add public/srd-data/xanathar-class-choices-pt.json src/test/dnd5e/xanathar-subclasses-parse.test.js
git commit -m "feat(xanathar): patrono O Lamina Maldita (Hexblade) — dados parseaveis"
```

---

## Task 2: Lista expandida do Hexblade em `subclassSpells.js`

**Files:**
- Modify: `src/systems/dnd5e/domain/subclassSpells.js`
- Test: `src/test/dnd5e/xanathar-subclass-spells.test.js` (criar)

- [ ] **Step 1: Escrever o teste que falha** — `src/test/dnd5e/xanathar-subclass-spells.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { getSubclassSpellsForLevel } from '../../systems/dnd5e/domain/subclassSpells'

const catalog = new Set(
  ['phb', 'tasha', 'xanathar']
    .flatMap(s => JSON.parse(readFileSync(`public/srd-data/${s}-spells-pt.json`, 'utf8')))
    .map(sp => sp.index)
)

describe('lista expandida do Hexblade', () => {
  it('concede magias nos tiers de bruxo (nv 1/3/5/7/9)', () => {
    const r1 = getSubclassSpellsForLevel({ classIndex: 'bruxo', chosenFeatures: { patron: 'hexblade' }, classLevel: 1 })
    expect(r1.indices.length).toBeGreaterThanOrEqual(2)
    expect(r1.alwaysPrepared).toBe(true)
    expect(r1.source).toBe('patron')
  })

  it('todos os slugs referenciados existem no catálogo composto', () => {
    for (const lvl of [1, 3, 5, 7, 9]) {
      const r = getSubclassSpellsForLevel({ classIndex: 'bruxo', chosenFeatures: { patron: 'hexblade' }, classLevel: lvl })
      for (const idx of r.indices) expect(catalog.has(idx), idx).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/test/dnd5e/xanathar-subclass-spells.test.js` → FAIL (hexblade sem tabela → `indices` vazio).

- [ ] **Step 3: Implementar** — em `subclassSpells.js`, adicionar ao objeto `WARLOCK_PATRON_SPELLS` (após `grande_antigo`; os tiers seguem `WARLOCK_PATRON_LEVELS = [1,3,5,7,9]`):

```js
  // O Lâmina Maldita — Hexblade (Xanathar's p.55) — source: xanathar
  hexblade: [
    ['escudo-arcano',            'destruicao-colerica'],    // 1 (Shield, Wrathful Smite)
    ['nublar',                   'marca-da-punicao'],       // 3 (Blur, Branding Smite)
    ['piscar',                   'arma-elemental'],         // 5 (Blink, Elemental Weapon)
    ['assassino-fantasmagorico', 'destruicao-estonteante'], // 7 (Phantasmal Killer, Staggering Smite)
    ['destruicao-banidora',      'cone-de-frio'],           // 9 (Banishing Smite, Cone of Cold)
  ],
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/test/dnd5e/xanathar-subclass-spells.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/domain/subclassSpells.js src/test/dnd5e/xanathar-subclass-spells.test.js
git commit -m "feat(xanathar): lista expandida de magias do Hexblade"
```

---

## Task 3: Guerreiro Maldito — CHA na arma de pacto (`WarlockPactPanel`)

**Files:**
- Modify: `src/systems/dnd5e/components/CharacterSheet/WarlockPactPanel.jsx`
- Test: `src/test/WarlockPactPanel.test.jsx` (estender)

- [ ] **Step 1: Escrever os testes que falham** — em `WarlockPactPanel.test.jsx` (usa o helper `makeChar` do arquivo):

```js
  it('Hexblade: Pacto da Lâmina usa CHA quando é o melhor (Guerreiro Maldito)', () => {
    // nv 3, prof +2. CHA 18 (+4) > FOR/DES → 1d20+6. Nome do patrono aparece.
    const char = makeChar({ info: { level: 3, chosenFeatures: { patron: 'hexblade', pact_boon: 'lamina' } },
      attributes: { str: 10, dex: 12, cha: 18 } })
    render(<WarlockPactPanel bruxoLevel={3} character={char} />)
    expect(screen.getByText('O Lâmina Maldita')).toBeInTheDocument()
    expect(screen.getAllByText(/1d20\+6/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Carisma/).length).toBeGreaterThanOrEqual(1)
  })

  it('patrono não-Hexblade continua max(FOR, DES), sem CHA', () => {
    // infernal, CHA 18 ignorado; DES 12 (+1) → 1d20+3.
    const char = makeChar({ info: { level: 3, chosenFeatures: { patron: 'infernal', pact_boon: 'lamina' } },
      attributes: { str: 10, dex: 12, cha: 18 } })
    render(<WarlockPactPanel bruxoLevel={3} character={char} />)
    expect(screen.getAllByText(/1d20\+3/).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByText(/1d20\+6/)).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Rodar e ver falhar** — `npx vitest run src/test/WarlockPactPanel.test.jsx` → FAIL (usa só FOR/DES → 1d20+3; e label "O Lâmina Maldita" não existe).

- [ ] **Step 3: Implementar** — em `WarlockPactPanel.jsx`:

3a. `PATRON_LABEL` += `hexblade: 'O Lâmina Maldita',` e `PATRON_ICON` += `hexblade: '🗡',`.

3b. `BladePactPanel` recebe `patron` e considera CHA quando `hexblade`. Substituir a função:

```js
function BladePactPanel({ totalLevel, attributes, patron }) {
  // PHB/Tasha: a arma de pacto usa Força ou Destreza (a melhor). O Guerreiro
  // Maldito (Hexblade, Xanathar) permite usar Carisma na arma de pacto.
  const isHexblade = patron === 'hexblade'
  const mods = [getModifier(attributes?.str ?? 10), getModifier(attributes?.dex ?? 10)]
  if (isHexblade) mods.push(getModifier(attributes?.cha ?? 10))
  const best = Math.max(...mods)
  const profBonus = getProficiencyBonus(totalLevel)
  const atk = `1d20${formatModifier(profBonus + best)}`
  const abilityNote = isHexblade
    ? 'Força, Destreza ou Carisma (Guerreiro Maldito) — a melhor'
    : 'Força ou Destreza (a melhor)'

  return (
    <div className="flex items-center gap-2 bg-violet-100 rounded px-2 py-1.5 border border-violet-700/30">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-violet-900">🗡 Pacto da Lâmina</p>
        <p className="text-xs ink-italic">
          Arma de pacto usa {abilityNote} pra ataque/dano. Rolar ataque rápido: {atk}.
        </p>
      </div>
      <span className="text-base font-bold text-violet-900 font-mono">{atk}</span>
      <RollButton notation={atk} label="Pacto da Lâmina (ataque)" />
    </div>
  )
}
```

3c. No call site do `BladePactPanel` (dentro do componente principal), passar `patron`:

```jsx
          <BladePactPanel totalLevel={totalLevel} attributes={attributes} patron={patron} />
```

- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/test/WarlockPactPanel.test.jsx` → PASS (novos + antigos; o teste antigo "usa Força/Destreza, não CHA" continua verde porque não é Hexblade).

- [ ] **Step 5: Commit**

```bash
git add src/systems/dnd5e/components/CharacterSheet/WarlockPactPanel.jsx src/test/WarlockPactPanel.test.jsx
git commit -m "feat(xanathar): Guerreiro Maldito — CHA na arma de pacto do Hexblade (resolve deferral)"
```

---

## Task 4: Bump SW + verificação final + merge

**Files:**
- Modify: `vite.config.js`

- [ ] **Step 1: Bump do `cacheName`** — `srd-data-v24` → `srd-data-v25` (+ linha de comentário datada).
- [ ] **Step 2: Suíte completa** — `npx vitest run` → PASS (flakes conhecidos de timeout em `LoginScreen`/`ResetPasswordScreen`/`HeaderV2`; re-rodar isolados se aparecerem).
- [ ] **Step 3: Build sanity** — `npx vite build` → conclui sem erro.
- [ ] **Step 4: Commit** — `git commit -am "chore(xanathar): bump cache srd-data v24->v25 (Hexblade)"`.
- [ ] **Step 5: Merge + deploy** — mergear `xanathar` na `master` e `git push`.

---

## Verificação manual (preview) sugerida

1. Bruxo nv 3, Xanathar ligado → escolher patrono **O Lâmina Maldita**; features aparecem em cards por nível (1/6/10/14) e a Maldição tem tracker 1×/descanso curto.
2. Escolher Pacto da Lâmina + CHA 18 (> FOR/DES) → botão de ataque rápido usa CHA (Guerreiro Maldito).
3. Trocar pra patrono Infernal → ataque volta a FOR/DES (CHA ignorado).

## Self-review (cobertura da spec §"Peça: Hexblade + Guerreiro Hediondo")

- Patrono parseável + tracker da Maldição → Task 1.
- Lista expandida (GRUPO B) → Task 2.
- Guerreiro Maldito (CHA na arma de pacto) → Task 3. Resolve [[xanathar-deferral]].
- Bump SW → Task 4.

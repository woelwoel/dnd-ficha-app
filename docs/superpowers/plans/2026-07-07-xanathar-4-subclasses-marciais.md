# Xanathar Plano 4 — Subclasses marciais (Bárbaro, Guerreiro, Monge, Ladino)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) ou superpowers:executing-plans. Steps usam checkbox (`- [ ]`).

**Goal:** Entregar as 13 subclasses marciais do XGE, todas com features parseáveis (cards + trackers). Nenhuma concede magias. Única peça de infra: o Arqueiro Arcano ganha os **Disparos Arcanos** como choice interna `arcane_shots` gated ao arquétipo (padrão das Manobras do Mestre de Combate).

**Architecture:** Dados em `xanathar-class-choices-pt.json` (options novas nas choices `primal_path`/`martial_archetype`/`monastic_tradition`/`roguish_archetype`, merge por id). Disparos Arcanos = choice `arcane_shots` com `requires: { martial_archetype: 'arqueiro-arcano' }` + `multiSelectByLevel` (o app já suporta: ver `martial_archetype_maneuvers`). `arcane_shots` já está no `NON_SUBCLASS` do parse test.

**Tech Stack:** React, Vitest, JSON em `public/srd-data`.

**Spec:** `docs/superpowers/specs/2026-07-07-xanathar-design.md` · **Roadmap:** `.../2026-07-07-xanathar-roadmap.md`

## Choices-alvo (ids/levels do PHB — merge casa por id)

- Bárbaro `primal_path` (level 3) → `guardiao-ancestral`, `arauto-da-tempestade`, `fanatico`
- Guerreiro `martial_archetype` (level 3) → `arqueiro-arcano`, `cavaleiro`, `samurai` (+ choice `arcane_shots`)
- Monge `monastic_tradition` (level 3) → `mestre-bebado`, `kensei`, `alma-solar`
- Ladino `roguish_archetype` (level 3) → `inquiridor`, `mentor`, `batedor`, `espadachim`

Valores checados sem colisão com o PHB (guerreiro PHB usa `cavaleiro_batalla`/`mestre_combate`/`campeao` — `cavaleiro` é livre).

## Choice interna: Disparos Arcanos (Arqueiro Arcano)

```json
{
  "level": 3,
  "id": "arcane_shots",
  "featureName": "Disparos Arcanos (Arqueiro Arcano)",
  "requires": { "martial_archetype": "arqueiro-arcano" },
  "multiSelectByLevel": { "3": 2, "7": 3, "10": 4, "15": 5, "18": 6 },
  "prompt": "Escolha suas opções de Disparo Arcano. Ganha mais ao subir de nível (2→3→4→5→6).",
  "options": [ ... 8 flechas ... ]
}
```

8 opções (PDF p.35-37): Flecha da Explosão (`flecha-da-explosao`), da Sedução (`flecha-da-seducao`), do Agarrar (`flecha-do-agarrar`), do Banimento (`flecha-do-banimento`), do Enfraquecimento (`flecha-do-enfraquecimento`), Perfurante (`flecha-perfurante`), Perseguidora (`flecha-perseguidora`), Sombria (`flecha-sombria`). Cada uma carimbada `source: "xanathar"`.

## Mapa de arquivos

| Arquivo | Ação |
|---|---|
| `public/srd-data/xanathar-class-choices-pt.json` | + barbaro/guerreiro/monge/ladino (options com desc parseável) + choice `arcane_shots` |
| `src/test/dnd5e/xanathar-subclasses-parse.test.js` | cresce sozinho + bloco do gating de `arcane_shots` |
| `vite.config.js` | bump v26 → v27 |

Desc de cada subclasse: flavor do PDF + `\n\nFeatures de <X> por nível:\n• Nv N — Nome: desc` (transcrição). Idioma "Uma vez usada … descanso" onde a feature é 1×/descanso (tracker via `detectFeatureUses`).

Seções do PDF (pág. pymupdf): Bárbaro Guardião Ancestral/Arauto p.7-8, Fanático p.8; Guerreiro Arqueiro Arcano/Disparos/Cavaleiro/Samurai p.34-38; Ladino Inquiridor/Mentor/Batedor/Espadachim p.40-42; Monge Mestre Bêbado/Kensei/Alma Solar p.47-49.

---

## Task 1: Bárbaro — Guardião Ancestral, Arauto da Tempestade, Fanático

**Files:** `xanathar-class-choices-pt.json`, `xanathar-subclasses-parse.test.js`.

- [ ] **Step 1: Teste que falha** — no parse test, bloco:

```js
describe('caminhos XGE do bárbaro', () => {
  const barbaro = choices.barbaro?.choices.find(c => c.id === 'primal_path')
  it.each([['guardiao-ancestral'], ['arauto-da-tempestade'], ['fanatico']])(
    '%s parseia features em 3/6/10/14', (v) => {
    const opt = barbaro?.options.find(o => o.value === v)
    expect(opt, v).toBeTruthy()
    const levels = parseSubclassFeatures(opt.desc).features.map(f => f.level)
    for (const lvl of [3, 6, 10, 14]) expect(levels, `${v} nv${lvl}`).toContain(lvl)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** (`choices.barbaro` undefined).
- [ ] **Step 3: Implementar** — chave `barbaro`, choice `primal_path` (level 3), 3 options (desc do PDF).
- [ ] **Step 4: Rodar e ver passar** + validar JSON.
- [ ] **Step 5: Commit** — `feat(xanathar): caminhos do barbaro (Guardiao Ancestral/Arauto/Fanatico)`.

---

## Task 2: Guerreiro — Arqueiro Arcano (+ Disparos Arcanos), Cavaleiro, Samurai

**Files:** `xanathar-class-choices-pt.json`, `xanathar-subclasses-parse.test.js`.

- [ ] **Step 1: Teste que falha** — bloco de parse dos 3 arquétipos (níveis 3/7/10/15/18) + gating dos Disparos Arcanos:

```js
describe('arquétipos XGE do guerreiro', () => {
  const g = () => choices.guerreiro?.choices
  it.each([['arqueiro-arcano'], ['cavaleiro'], ['samurai']])('%s parseia features', (v) => {
    const opt = g().find(c => c.id === 'martial_archetype').options.find(o => o.value === v)
    expect(opt, v).toBeTruthy()
    expect(parseSubclassFeatures(opt.desc).features.length).toBeGreaterThanOrEqual(3)
  })
  it('Disparos Arcanos: choice gated ao Arqueiro Arcano, escala por nível', () => {
    const shots = g().find(c => c.id === 'arcane_shots')
    expect(shots.requires).toEqual({ martial_archetype: 'arqueiro-arcano' })
    expect(shots.multiSelectByLevel['3']).toBe(2)
    expect(shots.multiSelectByLevel['18']).toBe(6)
    expect(shots.options.length).toBe(8)
    expect(shots.options.every(o => o.source === 'xanathar')).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** — chave `guerreiro` com choice `martial_archetype` (3 options) + choice `arcane_shots` (8 flechas, gated). Nota: no parse test, `arcane_shots` já é excluído (NON_SUBCLASS).
- [ ] **Step 4: Rodar e ver passar** + validar JSON.
- [ ] **Step 5: Commit** — `feat(xanathar): arquetipos do guerreiro + Disparos Arcanos`.

---

## Task 3: Monge — Mestre Bêbado, Kensei, Alma Solar

**Files:** `xanathar-class-choices-pt.json`, `xanathar-subclasses-parse.test.js`.

- [ ] **Step 1: Teste que falha** — bloco de parse (níveis 3/6/11/17):

```js
describe('tradições XGE do monge', () => {
  const monge = choices.monge?.choices.find(c => c.id === 'monastic_tradition')
  it.each([['mestre-bebado'], ['kensei'], ['alma-solar']])('%s parseia features em 3/6/11/17', (v) => {
    const opt = monge?.options.find(o => o.value === v)
    expect(opt, v).toBeTruthy()
    const levels = parseSubclassFeatures(opt.desc).features.map(f => f.level)
    for (const lvl of [3, 6, 11, 17]) expect(levels, `${v} nv${lvl}`).toContain(lvl)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** — chave `monge`, choice `monastic_tradition` (level 3), 3 options.
- [ ] **Step 4: Rodar e ver passar** + validar JSON.
- [ ] **Step 5: Commit** — `feat(xanathar): tradicoes do monge (Mestre Bebado/Kensei/Alma Solar)`.

---

## Task 4: Ladino — Inquiridor, Mentor, Batedor, Espadachim

**Files:** `xanathar-class-choices-pt.json`, `xanathar-subclasses-parse.test.js`.

- [ ] **Step 1: Teste que falha** — bloco de parse (níveis 3/9/13/17):

```js
describe('arquétipos XGE do ladino', () => {
  const ladino = choices.ladino?.choices.find(c => c.id === 'roguish_archetype')
  it.each([['inquiridor'], ['mentor'], ['batedor'], ['espadachim']])('%s parseia features em 3/9/13/17', (v) => {
    const opt = ladino?.options.find(o => o.value === v)
    expect(opt, v).toBeTruthy()
    const levels = parseSubclassFeatures(opt.desc).features.map(f => f.level)
    for (const lvl of [3, 9, 13, 17]) expect(levels, `${v} nv${lvl}`).toContain(lvl)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** — chave `ladino`, choice `roguish_archetype` (level 3), 4 options.
- [ ] **Step 4: Rodar e ver passar** + validar JSON.
- [ ] **Step 5: Commit** — `feat(xanathar): arquetipos do ladino (Inquiridor/Mentor/Batedor/Espadachim)`.

---

## Task 5: Bump SW + verificação final + merge

- [ ] **Step 1: Bump** `srd-data-v26` → `v27`.
- [ ] **Step 2: Suíte completa** — `npx vitest run` → PASS.
- [ ] **Step 3: Build** — `npx vite build`.
- [ ] **Step 4: Commit** — `chore(xanathar): bump cache srd-data v26->v27 (subclasses marciais)`.
- [ ] **Step 5: Merge + deploy** — merge `xanathar` na `master` + push.

## Self-review (cobertura da spec §"Subclasses em volume", grupo marcial)

- 13 subclasses parseáveis → Tasks 1-4.
- Disparos Arcanos gated com escala por nível → Task 2.
- Sem magias concedidas (marciais) → respeitado (nada em subclassSpells/rules).
- Bump SW → Task 5.

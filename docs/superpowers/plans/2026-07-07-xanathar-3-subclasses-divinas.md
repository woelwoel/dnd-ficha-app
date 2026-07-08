# Xanathar Plano 3 — Subclasses divinas/naturais (Clérigo, Paladino, Patrulheiro, Druida)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar as 9 subclasses divinas/naturais do XGE, com features parseáveis (cards + trackers) e magias concedidas onde a subclasse concede: Clérigo (Domínio da Forja, Domínio da Sepultura), Paladino (Juramento da Conquista, Juramento da Redenção), Patrulheiro (Perseguidor Obscuro, Andarilho do Horizonte, Exterminador de Monstros), Druida (Círculo dos Sonhos, Círculo do Pastor — sem magias de círculo, como no XGE).

**Architecture:** Dados em `xanathar-class-choices-pt.json` (options novas nas choices existentes `divine_domain`/`sacred_oath`/`ranger_archetype`/`druid_circle`, merge por id). Magias concedidas nas tabelas já existentes: `CLERIC_DOMAIN_SPELLS` (rules.js, GRUPO A), `PALADIN_OATH_SPELLS` e `RANGER_ARCHETYPE_SPELLS` (subclassSpells.js). Druida XGE não concede magias de círculo → só features. Labels de painel em `ClericDomainPanel`.

**Tech Stack:** React, Vitest, JSON em `public/srd-data`.

**Spec:** `docs/superpowers/specs/2026-07-07-xanathar-design.md` · **Roadmap:** `docs/superpowers/plans/2026-07-07-xanathar-roadmap.md`

## Choices-alvo (ids/levels do PHB — merge casa por id)

- Clérigo `divine_domain` (level 1) → `forja`, `sepultura`
- Paladino `sacred_oath` (level 3) → `conquista`, `redencao`
- Patrulheiro `ranger_archetype` (level 3) → `perseguidor-obscuro`, `andarilho-do-horizonte`, `exterminador-de-monstros`
- Druida `druid_circle` (level 2) → `sonhos`, `pastor`

## Tabelas de magia (slugs CONFERIDOS no catálogo composto)

`CLERIC_DOMAIN_SPELLS` (rules.js) — tiers [1,3,5,7,9]:
```js
  forja: [
    ['identificar',   'destruicao-lancinante'],   // 1 (Identify, Searing Smite)
    ['esquentar-metal','arma-magica'],             // 3 (Heat Metal, Magic Weapon)
    ['arma-elemental','protecao-contra-energia'],  // 5
    ['fabricar',      'muralha-de-fogo'],          // 7 (Fabricate, Wall of Fire)
    ['animar-objetos','criacao'],                  // 9
  ],
  sepultura: [
    ['vitalidade-falsa',       'perdicao'],             // 1 (False Life, Bane)
    ['raio-do-enfraquecimento','repouso-tranquilo'],    // 3 (Ray of Enfeeblement, Gentle Repose)
    ['revivificar',            'toque-vampirico'],      // 5 (Revivify, Vampiric Touch)
    ['malogro',                'protecao-contra-a-morte'],// 7 (Blight, Death Ward)
    ['cupula-antivida',        'reviver-os-mortos'],    // 9 (Antilife Shell, Raise Dead)
  ],
```

`PALADIN_OATH_SPELLS` (subclassSpells.js) — tiers [3,5,9,13,17]:
```js
  conquista: [
    ['armadura-de-agathys','comando'],       // 3 (Armor of Agathys, Command)
    ['imobilizar-pessoa',  'arma-espiritual'],// 5 (Hold Person, Spiritual Weapon)
    ['rogar-maldicao',     'medo'],           // 9 (Bestow Curse, Fear)
    ['dominar-besta',      'pele-de-pedra'],  // 13 (Dominate Beast, Stoneskin)
    ['nevoa-mortal',       'dominar-pessoa'], // 17 (Cloudkill, Dominate Person)
  ],
  redencao: [
    ['santuario',                  'sono'],            // 3 (Sanctuary, Sleep)
    ['imobilizar-pessoa',          'acalmar-emocoes'], // 5 (Hold Person, Calm Emotions)
    ['contramagica',               'padrao-hipnotico'],// 9 (Counterspell, Hypnotic Pattern)
    ['esfera-resiliente-de-otiluke','pele-de-pedra'],  // 13 (Otiluke's Resilient Sphere, Stoneskin)
    ['imobilizar-monstro',         'muralha-de-energia'],// 17 (Hold Monster, Wall of Force)
  ],
```

`RANGER_ARCHETYPE_SPELLS` (subclassSpells.js) — tiers [3,5,9,13,17], 1 por tier:
```js
  'perseguidor-obscuro': [
    ['disfarcar-se'],        // 3 (Disguise Self)
    ['truque-de-corda'],     // 5 (Rope Trick)
    ['medo'],                // 9 (Fear)
    ['invisibilidade-maior'],// 13 (Greater Invisibility)
    ['similaridade'],        // 17 (Seeming)
  ],
  'andarilho-do-horizonte': [
    ['protecao-contra-o-bem-e-mal'],// 3 (Protection from Evil and Good)
    ['passo-nebuloso'],             // 5 (Misty Step)
    ['velocidade'],                 // 9 (Haste)
    ['banimento'],                  // 13 (Banishment)
    ['circulo-de-teletransporte'],  // 17 (Teleportation Circle)
  ],
  'exterminador-de-monstros': [
    ['protecao-contra-o-bem-e-mal'],// 3
    ['zona-da-verdade'],            // 5 (Zone of Truth)
    ['circulo-magico'],             // 9 (Magic Circle)
    ['banimento'],                  // 13
    ['imobilizar-monstro'],         // 17 (Hold Monster)
  ],
```

## Mapa de arquivos

| Arquivo | Ação |
|---|---|
| `public/srd-data/xanathar-class-choices-pt.json` | + clerigo/druida/paladino/patrulheiro (options com desc parseável) |
| `src/systems/dnd5e/domain/rules.js` | + `forja`/`sepultura` em `CLERIC_DOMAIN_SPELLS` |
| `src/systems/dnd5e/domain/subclassSpells.js` | + oaths e archetypes XGE |
| `src/systems/dnd5e/components/CharacterSheet/ClericDomainPanel.jsx` | + labels/ícones forja/sepultura |
| `src/test/dnd5e/xanathar-subclasses-parse.test.js` | cresce sozinho (arquivo do plano 2) |
| `src/test/dnd5e/xanathar-subclass-spells.test.js` | + casos por classe |
| `vite.config.js` | bump v25 → v26 |

Cada option de subclasse: `desc` = flavor do PDF + `\n\nFeatures de <X> por nível:\n• Nv N — Nome: desc` (transcrição fiel do PDF; a Maldição/idioma "uma vez … descanso" só onde a feature é 1×/descanso). Trackers saem do `detectFeatureUses`.

---

## Task 1: Clérigo — Domínio da Forja + da Sepultura

**Files:** `xanathar-class-choices-pt.json`, `rules.js`, `ClericDomainPanel.jsx`, tests.

- [ ] **Step 1: Teste que falha** — em `xanathar-subclass-spells.test.js`, adicionar bloco:

```js
import { getClericDomainSpellIndices } from '../../systems/dnd5e/domain/rules'
describe('domínios XGE do clérigo', () => {
  it.each([['forja'], ['sepultura']])('%s concede 2 magias/tier em 1/3/5/7/9', (domain) => {
    for (const lvl of [1, 3, 5, 7, 9]) {
      const idx = getClericDomainSpellIndices(domain, lvl)
      expect(idx.length, `${domain} nv${lvl}`).toBe(2)
      for (const s of idx) expect(catalog.has(s), s).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** — `rules.js` `CLERIC_DOMAIN_SPELLS` += forja/sepultura (tabela acima); `xanathar-class-choices-pt.json` += chave `clerigo` com choice `divine_domain` (level 1) e as 2 options (desc transcrita do PDF, seção Domínio da Forja/Sepultura); `ClericDomainPanel` `DOMAIN_LABEL` += `forja: 'Domínio da Forja', sepultura: 'Domínio da Sepultura'`, `DOMAIN_ICON` += `forja: '🔨', sepultura: '🪦'`.
- [ ] **Step 4: Rodar e ver passar** — `npx vitest run src/test/dnd5e/xanathar-subclass-spells.test.js src/test/dnd5e/xanathar-subclasses-parse.test.js`.
- [ ] **Step 5: Commit** — `feat(xanathar): dominios do clerigo — Forja e Sepultura`.

---

## Task 2: Paladino — Juramento da Conquista + da Redenção

**Files:** `xanathar-class-choices-pt.json`, `subclassSpells.js`, tests.

- [ ] **Step 1: Teste que falha** — em `xanathar-subclass-spells.test.js`:

```js
describe('juramentos XGE do paladino', () => {
  it.each([['conquista'], ['redencao']])('%s concede 2 magias/tier em 3/5/9/13/17', (oath) => {
    for (const lvl of [3, 5, 9, 13, 17]) {
      const r = getSubclassSpellsForLevel({ classIndex: 'paladino', chosenFeatures: { sacred_oath: oath }, classLevel: lvl })
      expect(r.indices.length, `${oath} nv${lvl}`).toBe(2)
      expect(r.alwaysPrepared).toBe(true)
      for (const s of r.indices) expect(catalog.has(s), s).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** — `subclassSpells.js` `PALADIN_OATH_SPELLS` += conquista/redencao; `xanathar-class-choices-pt.json` += `paladino` choice `sacred_oath` (level 3) com as 2 options (desc do PDF).
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `feat(xanathar): juramentos do paladino — Conquista e Redencao`.

---

## Task 3: Patrulheiro — Perseguidor Obscuro, Andarilho do Horizonte, Exterminador de Monstros

**Files:** `xanathar-class-choices-pt.json`, `subclassSpells.js`, tests.

- [ ] **Step 1: Teste que falha** — em `xanathar-subclass-spells.test.js`:

```js
describe('arquétipos XGE do patrulheiro', () => {
  it.each([['perseguidor-obscuro'], ['andarilho-do-horizonte'], ['exterminador-de-monstros']])(
    '%s concede 1 magia/tier em 3/5/9/13/17', (arch) => {
    for (const lvl of [3, 5, 9, 13, 17]) {
      const r = getSubclassSpellsForLevel({ classIndex: 'patrulheiro', chosenFeatures: { ranger_archetype: arch }, classLevel: lvl })
      expect(r.indices.length, `${arch} nv${lvl}`).toBe(1)
      expect(r.alwaysPrepared).toBe(true)
      for (const s of r.indices) expect(catalog.has(s), s).toBe(true)
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar** — `subclassSpells.js` `RANGER_ARCHETYPE_SPELLS` += os 3 arquétipos; `xanathar-class-choices-pt.json` += `patrulheiro` choice `ranger_archetype` (level 3) com as 3 options (desc do PDF). Sem sub-choices internas (os 3 são fixos por nível).
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `feat(xanathar): arquetipos do patrulheiro (Perseguidor/Andarilho/Exterminador)`.

---

## Task 4: Druida — Círculo dos Sonhos + do Pastor

**Files:** `xanathar-class-choices-pt.json`, tests.

> XGE não concede magias de círculo pra estes — só features parseáveis. Nada em subclassSpells.

- [ ] **Step 1: Teste que falha** — em `xanathar-subclasses-parse.test.js`, adicionar bloco:

```js
describe('círculos XGE do druida', () => {
  const druida = choices.druida.choices.find(c => c.id === 'druid_circle')
  it.each([['sonhos'], ['pastor']])('%s parseia features em 2/6/10/14', (circle) => {
    const opt = druida.options.find(o => o.value === circle)
    expect(opt, circle).toBeTruthy()
    const levels = parseSubclassFeatures(opt.desc).features.map(f => f.level)
    for (const lvl of [2, 6, 10, 14]) expect(levels, `${circle} nv${lvl}`).toContain(lvl)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar** (`choices.druida` undefined).
- [ ] **Step 3: Implementar** — `xanathar-class-choices-pt.json` += `druida` choice `druid_circle` (level 2) com options `sonhos`/`pastor` (desc do PDF, features nv 2/6/10/14). NÃO adicionar `druid_land_type` (círculos XGE não usam terreno).
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit** — `feat(xanathar): circulos do druida — Sonhos e Pastor`.

---

## Task 5: Bump SW + verificação final + merge

- [ ] **Step 1: Bump** `srd-data-v25` → `v26` (+ comentário datado).
- [ ] **Step 2: Suíte completa** — `npx vitest run` → PASS.
- [ ] **Step 3: Build** — `npx vite build`.
- [ ] **Step 4: Commit** — `chore(xanathar): bump cache srd-data v25->v26 (subclasses divinas)`.
- [ ] **Step 5: Merge + deploy** — merge `xanathar` na `master` + push.

## Verificação manual sugerida

1. Clérigo Forja nv 1 → magias de domínio (Identify, Searing Smite) sempre preparadas; features em cards.
2. Paladino Conquista nv 3 → oath spells; Patrulheiro Perseguidor Obscuro nv 3 → 1 magia/tier.
3. Druida Círculo dos Sonhos → features em cards, sem magias de círculo.

## Self-review (cobertura da spec §"Subclasses em volume", grupo divino/natural)

- 9 subclasses parseáveis → Tasks 1-4 (parse test cobre todas).
- Magias concedidas (domínio/juramento/arquétipo) com slugs conferidos → Tasks 1-3.
- Druida XGE sem magias de círculo → Task 4 (decisão explícita).
- Bump SW → Task 5.

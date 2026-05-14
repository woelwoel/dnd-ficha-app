# Itens Mágicos + Atunement — Design

**Data:** 2026-05-13
**Status:** Aprovado para implementação
**Escopo:** Sistema de itens mágicos com efeitos estruturais e atunement (PHB p.136 / DMG cap.7) integrado ao `dnd-ficha-app`.

---

## Objetivo

Adicionar à ficha um sistema de itens mágicos com:

- Catálogo curado de ~50 itens clássicos (PT-BR).
- Atunement com limite de 3 itens (já parcialmente implementado).
- Efeitos **estruturais** (modificadores numéricos: CA, ataque, dano, saves, atributos, resistências, vantagem, velocidade) aplicados automaticamente nos cálculos da ficha.
- UI integrada ao `Inventory.jsx` existente.

Fora do escopo: itens com cargas/uses ativáveis, magias embutidas em itens, poções/pergaminhos com efeito mecânico complexo (entram no catálogo apenas como texto).

---

## Arquitetura

**Três camadas:**

1. **Dados** — `public/srd-data/phb-magic-items-pt.json`. Lista de ~50 itens com `index`, `name`, `rarity`, `category`, `requiresAttunement`, `description`, `effects[]`.
2. **Engine** — `src/domain/magicItems.js`. Função pura `getActiveMagicEffects(items)` que filtra itens ativos e agrega efeitos em um objeto consultável.
3. **Integração** — Pontos cirúrgicos em `equipment.js`, `calculations.js` e no cálculo de ataques consomem o objeto agregado.

Sem novo estado persistido — efeitos são derivados de `inventory.items` (já tem `attuned` e `equipped`).

---

## Modelo de Efeitos

Cada item tem `effects: Effect[]`. Tipos suportados:

```json
{ "type": "ac",            "value": 1 }                  // Anel de Proteção
{ "type": "armorAc",       "value": 2 }                  // Armadura +2 (precisa equipar)
{ "type": "attack",        "value": 1 }                  // Arma +1 (precisa equipar)
{ "type": "damage",        "value": 1 }                  // Arma +1
{ "type": "saves",         "value": 1 }                  // Anel de Proteção (todos saves)
{ "type": "saveAbility",   "ability": "con", "value": 1 }// Manto de Resistência: só CON
{ "type": "attrSet",       "ability": "str", "value": 21}// Cinto de Força do Gigante
{ "type": "attrCap",       "ability": "cha", "value": 21}// Manto de Carismático
{ "type": "attrBonus",     "ability": "con", "value": 2, "max": 22 } // Amuleto da Saúde
{ "type": "resistance",    "damage": "fogo" }            // Anel de Resistência ao Fogo
{ "type": "advSaves" }                                   // Pedra da Boa Sorte (todos saves)
{ "type": "speed",         "value": 10 }                 // Botas Aladas (+10 ft)
{ "type": "darkvision",    "value": 60 }                 // Óculos da Visão Noturna
```

### Regras de combinação

- **Bônus numéricos somam:** dois `ac +1` → +2 total.
- **`attrSet` sobrescreve:** maior `value` ganha (não soma).
- **`attrCap`** aumenta o teto do atributo.
- **`attrBonus`** soma ao score atual, respeitando `max`.
- **`resistance` e `advSaves`** são sets (sem stack).

### Estado "ativo"

- Item com `requiresAttunement: true` → ativo se `attuned === true`.
- Item sem atunamento (armas/armaduras mágicas) → ativo se `equipped === true`.
- Itens nunca atunados/equipados não contribuem.

---

## Engine — `src/domain/magicItems.js`

API pública:

```js
export function getActiveMagicEffects(items) {
  // Filtra items ativos, agrega effects
  // Returns:
  // {
  //   ac: 0,                      // soma de effects.ac
  //   armorAc: 0,                 // soma de effects.armorAc (em armaduras equipadas)
  //   attack: 0,                  // soma de effects.attack (em armas equipadas)
  //   damage: 0,                  // soma de effects.damage
  //   saves: 0,                   // bônus geral em todos saves
  //   saveAbility: { str: 0, dex: 0, ... },  // bônus por atributo
  //   attrSet: { str: null, ... },           // override (maior ganha)
  //   attrCap: { str: 20, dex: 20, ... },    // teto efetivo
  //   attrBonus: { str: { value: 0, max: 20 }, ... },
  //   resistances: ['fogo', ...],
  //   advSaves: false,
  //   speed: 0,
  //   darkvision: 0,
  //   sources: { ac: [{ name, value }, ...], ... }  // p/ tooltips
  // }
}

export function isItemActive(item) {
  if (item.requiresAttunement) return item.attuned === true
  return item.equipped === true
}
```

Função pura, sem React. Recebe array, devolve objeto. Trivialmente testável.

---

## Pontos de Integração

### `src/domain/equipment.js` — `calculateArmorClass(...)`

- Soma `effects.ac` no resultado final.
- Para a armadura equipada ativa, soma `effects.armorAc` no `base`.

Assinatura recebe `magicEffects` opcional (default = objeto zerado).

### `src/utils/calculations.js`

- **`getAttributeScore(ability, character)`** (novo helper): pipeline
  `base → racial → ASI/feats → attrSet (sobrescreve) → attrBonus (respeita max) → attrCap (teto)`.
- Modificadores derivados (init, skills, saves) usam o score retornado.
- **`getSavingThrowBonus(ability)`**: soma `effects.saves + effects.saveAbility[ability]`.

### Ataques

Onde a lista de ataques é montada (componente atual em `Combat` ou similar):
- Se a arma equipada tem `effects.attack`, soma no bônus.
- Se tem `effects.damage`, soma no dano.

### Velocidade / Visão

- Componente que mostra `speed` soma `effects.speed`.
- Idem para `darkvision`.

### Resistências e Vantagens em Saves

Sem motor de combate automatizado para isso. Aparecem como **badges informativas** num painel "Efeitos Ativos" (ver UI). Sem efeito automático em rolagens — usuário aplica via Shift/Alt no dado.

---

## UI

### Botão "Buscar Mágico"

Adicionado em `Inventory.jsx` ao lado de "Buscar SRD" e "+ Manual". Abre `SrdSearchModal` apontando para `phb-magic-items-pt.json`.

**Categorias:** Anel, Varinha, Cajado, Armadura, Arma, Manto/Capa, Botas, Poção/Pergaminho, Outros.

**Raridade colorida** em cada linha:
- Comum → cinza
- Incomum → verde
- Raro → azul
- Muito Raro → roxo
- Lendário → laranja
- Artefato → vermelho

### Item adicionado

Ao selecionar do catálogo, item entra no inventário com:
- `effects` copiados do catálogo.
- `magicItemIndex` (referência ao item de origem).
- `requiresAttunement` do catálogo.
- `attuned: false` inicial.
- `rarity` preservada.

### Linha do item no inventário

- Borda colorida pela raridade quando atunado/equipado.
- Tooltip mostrando descrição + lista de efeitos formatada.

### Painel "Efeitos Ativos"

Novo bloco colapsável no topo da aba Inventário, mostrando agregação textual:

> "CA +1 · ATK +1 · DAN +1 · FOR 27 (Cinto) · CON 19 (Amuleto) · Velocidade +10 ft · Resistência: fogo · Vantagem em saves"

Cada efeito clicável mostra o item de origem (`sources`).

---

## Catálogo Curado (~50 itens)

Priorizados por uso típico em mesa:

**Anéis:** Proteção, Resistência (Fogo/Frio/Eletricidade/Ácido/Veneno), Mente Blindada.

**Mantos/Capas:** Carismático, Resistência, Élfica, Proteção, Capa de Exibição.

**Armas/Armaduras genéricas:** Arma +1/+2/+3, Armadura +1/+2/+3, Escudo +1/+2/+3.

**Cintos:** Cinto de Força do Gigante (Colina FOR 21, Pedra/Gelo FOR 23, Fogo FOR 25, Nuvem FOR 27, Tempestade FOR 29).

**Amuletos/Pingentes:** Amuleto da Saúde (CON 19), Pingente da Mente, Talismã da Sorte.

**Manual/Tomo:** Manual de Saúde Corporal (CON+2 até 22), Manual de Atletismo Ganho (FOR+2), Tomo de Compreensão (SAB+2), Tomo de Liderança e Influência (CAR+2).

**Botas:** Aladas, Velocidade, Élficas, Botas das Terras Invernais.

**Bugigangas:** Pedra da Boa Sorte, Bracelete de Defesa, Gema da Visão Noturna, Pedra de Boa Sorte.

**Itens descritivos (effects: []):** Varinha de Mageletes, Cajado da Cura, Bola de Cristal (entram no catálogo mas sem mecânica modelada — texto e descrição apenas).

A lista exata será fechada no plano de implementação.

---

## Testes

### Unit

- **`magicItems.test.js`**:
  - cada tipo de efeito isolado;
  - dois Anéis de Proteção somam `ac +2`;
  - dois Cintos: maior `attrSet` ganha;
  - filtro de ativos (atunado vs equipado vs nenhum);
  - `attrBonus` respeita `max`.
- **`equipment.test.js`**: `calculateArmorClass` com Anel de Proteção, Armadura +1, ambos.
- **`calculations.test.js`**: saves com Manto de Resistência (CON), score final com Cinto de Força, Manto de Carismático (cap 21), Amuleto da Saúde (+2 até 22).

### E2E (`src/test/e2e/magicItems.test.jsx`)

- Adicionar Anel de Proteção +1, atunar → CA sobe +1, contador 1/3.
- Atunar 3 itens → 4º item desabilita botão.
- Cinto de Força do Gigante (Lendário) atunado → FOR exibido como 27 + mod +8.
- Equipar Armadura +1 → CA inclui bônus.
- Desatunar → efeitos somem.

---

## Migração / Compatibilidade

- Itens existentes sem `effects` continuam funcionando como itens comuns (não contribuem em nada).
- Schema não muda — campos novos (`magicItemIndex`, `rarity`, `effects`) são opcionais.
- Sem migração necessária para fichas salvas.

---

## Decisões Adiadas

- **Itens com cargas/uses ativáveis** (Varinha de Mageletes, Cajado da Cura): no catálogo só como texto. Mecânica de uses fica para iteração futura — provavelmente reaproveitando `classFeatureUses`.
- **Resistências aplicadas em rolagens automaticamente:** sem motor de combate; usuário aplica via diceroller.
- **Itens customizados com effects builder:** para criar item mágico homebrew com efeitos, fica como melhoria futura. Por ora só catálogo + item manual sem effects.

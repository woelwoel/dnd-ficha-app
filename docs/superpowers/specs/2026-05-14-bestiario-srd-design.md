# Bestiário SRD — Design

**Data:** 2026-05-14
**Status:** Aprovado para implementação
**Escopo:** Modal flutuante global de consulta de monstros do SRD 5.1 (read-only) para uso em mesa.

---

## Objetivo

Adicionar um modal global de bestiário acessível de qualquer tela do app (lista, wizard, ficha). Permite buscar e filtrar os ~330 monstros do SRD 5.1 e visualizar o stat block completo de cada um — estilo PHB. Read-only; sem vínculo com a ficha do personagem.

**Fora de escopo:**
- Tradução PT-BR dos monstros.
- Favoritar/marcar.
- Listas de encontro / cálculo de dificuldade.
- Iniciativa, tracker de combate, vínculo com ficha.

---

## Arquitetura

**Três peças:**

1. **Dados:** `public/srd-data/5e-SRD-Monsters.json` (~330 monstros SRD 5.1, em inglês, mesmo formato dos outros SRDs já em uso).
2. **Engine pura:** `src/utils/monsters.js` — `matchesMonsterFilters`, `formatCR`, `EMPTY_MONSTER_FILTERS`, `countActiveMonsterFilters`, e constantes `MONSTER_TYPES`/`MONSTER_SIZES`/`ALIGNMENTS`.
3. **Componente global:** `src/components/Bestiary/BestiaryModal.jsx` + `src/components/Bestiary/MonsterStatBlock.jsx`. Trigger via ícone 🐉 num botão flutuante (próximo ao `DiceHistoryPanel`); modal montado em `App.jsx`.

Padrão segue o que já existe: `DiceHistoryPanel` é montado globalmente; `SrdSearchModal` para layouts de busca. Não há novo provider — o monstro selecionado é estado local do modal.

---

## Modelo de dados

Shape de um monstro do SRD (campos relevantes):

```js
{
  index: 'goblin', name: 'Goblin',
  size: 'Small', type: 'humanoid', subtype: 'goblinoid',
  alignment: 'neutral evil',
  armor_class: [{ value: 15, type: 'leather armor, shield' }],
  hit_points: 7, hit_dice: '2d6',
  speed: { walk: '30 ft.', fly: '60 ft.', swim: '...' },
  strength: 8, dexterity: 14, constitution: 10,
  intelligence: 10, wisdom: 8, charisma: 8,
  proficiencies: [{ value: 6, proficiency: { name: 'Skill: Stealth' } }],
  damage_resistances: [], damage_immunities: [], damage_vulnerabilities: [],
  condition_immunities: [],
  senses: { darkvision: '60 ft.', passive_perception: 9 },
  languages: 'Common, Goblin',
  challenge_rating: 0.25, xp: 50,
  actions: [{ name, desc, attack_bonus, damage: [...] }],
  special_abilities: [{ name, desc, usage }],
  legendary_actions: [...],
  reactions: [...],
}
```

Campos opcionais (nem todo monstro tem) são tratados defensivamente no stat block (renderiza seção só se existir).

---

## Filtros

```js
{
  cr: { min: 0, max: 30 },         // CR mínimo e máximo
  types: Set<string>,               // ex: 'humanoid', 'dragon'. Vazio = todos
  sizes: Set<string>,               // 'Tiny' ... 'Gargantuan'
  alignments: Set<string>,          // 'lawful good' ... 'unaligned'
}
```

### `matchesMonsterFilters(m, filters)`

AND entre dimensões, OR dentro de multiselect:
- **CR**: `m.challenge_rating >= filters.cr.min && <= filters.cr.max`. Suporta frações (0.125, 0.25, 0.5).
- **Tipo**: vazio → passa. Senão `filters.types.has(m.type)`.
- **Tamanho**: vazio → passa. Senão `filters.sizes.has(m.size)`.
- **Alinhamento**: vazio → passa. Senão `filters.alignments.has(m.alignment)`. (Casamento textual case-insensitive.)

### Busca textual

Filtra por `name.toLowerCase().includes(q)`. Aplicada após `matchesMonsterFilters`.

### `formatCR(cr)`

`0 → '0'`, `0.125 → '1/8'`, `0.25 → '1/4'`, `0.5 → '1/2'`, `N → 'N'` (string).

### `countActiveMonsterFilters(filters)`

Conta filtros não-default:
- `cr.min > 0` → +1
- `cr.max < 30` → +1
- `types.size`
- `sizes.size`
- `alignments.size`

---

## UI

### Trigger

Botão flutuante com ícone 🐉 ("Bestiário") no canto inferior direito da viewport, montado em `App.jsx` junto ao `DiceHistoryPanel`. Click abre o modal.

### Modal (tela cheia)

**Header**:
- Título "Bestiário SRD"
- Contagem: `23 de 334 monstros`
- Botão X (fechar)

**Linha de busca**:
- Input textual "Buscar monstro..."
- Botão "Filtros" com badge `Filtros · N` (mesmo padrão do filtro de magias)

**Painel de filtros (colapsável)**:
- **CR**: dois inputs `min` e `max` (números entre 0 e 30; aceita frações 0.125, 0.25, 0.5 normalizadas para 1/8, 1/4, 1/2 na exibição).
- **Tipos** (chips): aberration, beast, celestial, construct, dragon, elemental, fey, fiend, giant, humanoid, monstrosity, ooze, plant, undead. (Capitalização na UI: "Aberration", etc.)
- **Tamanho** (chips): Tiny, Small, Medium, Large, Huge, Gargantuan.
- **Alinhamento** (chips): Lawful Good, Neutral Good, Chaotic Good, Lawful Neutral, Neutral, Chaotic Neutral, Lawful Evil, Neutral Evil, Chaotic Evil, Unaligned.
- "Limpar filtros" no footer.

**Corpo (2 colunas):**
- **Esquerda (lista)** — overflow scroll, ~40% width. Cada item: nome + tipo (cinza) + badge CR colorido por faixa (CR 0-1 cinza, 2-4 verde, 5-10 azul, 11-16 amarelo, 17+ vermelho). Item ativo destacado.
- **Direita (stat block)** — overflow scroll, ~60% width. Componente `MonsterStatBlock` (estilo PHB):
  - Linha 1: nome (grande, amarelo)
  - Linha 2: "Size type (subtype), alignment" (itálico)
  - Linha 3: AC | HP | Speed (com todos os tipos: walk/fly/swim/burrow/climb)
  - Grid 6 colunas: STR, DEX, CON, INT, WIS, CHA (valor + modificador)
  - Saving Throws (se houver), Skills (se houver), Damage Vulnerabilities, Resistances, Immunities, Condition Immunities, Senses (com passive perception), Languages, Challenge (CR + XP)
  - Special Abilities (lista nome + desc)
  - Actions (lista nome + desc)
  - Reactions (se houver)
  - Legendary Actions (se houver)

### Mobile
- Coluna direita escondida; lista ocupa 100%. Click no monstro abre stat block em overlay (substitui a lista). Botão "Voltar à lista" no topo.

### Estado vazio
- Sem filtros casando: "Nenhum monstro encontrado."
- Sem monstro selecionado: "Selecione um monstro" na coluna direita.

### Fechamento
- ESC, click no overlay, botão X.

---

## Testes

### Unit (`src/test/monsters.test.js`)

- `matchesMonsterFilters` vazio passa qualquer monstro
- CR min/max isolados
- Tipo single + múltiplo
- Tamanho single + múltiplo
- Alinhamento (case-insensitive)
- Combinação AND
- `formatCR`: 0, 1/8, 1/4, 1/2, 1, 30
- `countActiveMonsterFilters` zero e combinado

### E2E (`src/test/e2e/bestiary.test.jsx`)

- Modal fecha com ESC
- Busca textual filtra lista
- Selecionar monstro renderiza stat block
- Filtro CR muda contagem
- "Limpar" reseta tudo

---

## Decisões adiadas

- **Tradução PT-BR**: não nessa iteração. Nomes/descrições ficam em inglês. Pode virar layer de tradução opcional depois.
- **Lista de encontros**: fora.
- **Favoritar**: fora.
- **Integração com a ficha (iniciar combate)**: fora.
- **Imagens dos monstros**: SRD não inclui. Fora.

# Filtros Avançados de Magia — Design

**Data:** 2026-05-14
**Status:** Aprovado para implementação
**Escopo:** Filtros estruturados na **lista de adição** (picker) de magias da aba Magias.

---

## Objetivo

Substituir/complementar a busca textual simples atual por um painel de filtros estruturados, permitindo peneirar as 100+ magias por nível disponíveis no picker usando atributos das magias (escola, ritual, concentração, componentes, tempo de conjuração).

Fora do escopo:
- Filtros na lista do personagem (já é pequena e navegada por nível/preparadas).
- Filtro por alcance (`range`) — dados muito irregulares pra valer parse.
- Persistência de filtros entre sessões.
- Bestiário, itens mágicos, outras abas.

---

## Arquitetura

Mudanças contidas em **`src/components/CharacterSheet/Spells.jsx`**:

1. **Função pura `matchesFilters(spell, filters)`** — exportada do próprio arquivo (ou movida pra `src/utils/spellFilters.js` se ficar feia inline). Decisão final na implementação.
2. **Estado `filters`** dentro do componente.
3. **`filteredPicker`** existente passa também por `matchesFilters`.
4. **Painel de filtros (UI)** — dropdown abaixo da busca, com chips e contadores.

Sem novo módulo de dados; sem novo schema. Os campos já vivem nas magias PT-BR (`school`, `ritual`, `concentration`, `components`, `casting_time`).

---

## Modelo

```js
filters = {
  schools: Set<string>,        // vazio = todas
  concentration: 'any'|'yes'|'no',
  ritual: 'any'|'yes',         // sem 'no' (ninguém filtra "não-rituais")
  components: {
    v: 'any'|'yes'|'no',
    s: 'any'|'yes'|'no',
    m: 'any'|'yes'|'no',
  },
  castingTimes: Set<string>,   // vazio = todos; chaves: 'action'|'bonus'|'reaction'|'minutes'|'hours'
}
```

### Lógica de `matchesFilters(spell, filters)`

Cada dimensão é AND. Dentro de multiselect (escolas, tempos) é OR.

- **Escola:** se `filters.schools` vazio → passa. Senão, `filters.schools.has(spell.school)`.
- **Concentração:** `any` passa; `yes` exige `spell.concentration === true`; `no` exige falso.
- **Ritual:** `any` passa; `yes` exige `spell.ritual === true`.
- **Componentes (V/S/M):** para cada componente, detectar presença em `spell.components` via regex (`/V/`, `/S/`, `/M/`):
  - `any` → passa.
  - `yes` → componente presente.
  - `no` → componente ausente.
- **Tempo de conjuração:** se `filters.castingTimes` vazio → passa. Senão, magia precisa casar pelo menos uma categoria selecionada. Categorias casam `spell.casting_time` (string PT-BR):
  - `action`  → `spell.casting_time === '1 ação'`
  - `bonus`   → `spell.casting_time === '1 ação bônus'`
  - `reaction`→ começa com `'1 reação'`
  - `minutes` → contém `'minuto'`
  - `hours`   → contém `'hora'`

### Estado "ativo" do painel

Contador de filtros ativos:
- +1 por escola selecionada → contagem agregada `schools.size`
- +1 se concentração ≠ `any`
- +1 se ritual ≠ `any`
- +1 por componente V/S/M ≠ `any`
- +1 por casting time selecionado → contagem agregada `castingTimes.size`

Total no badge: soma dos itens acima.

---

## UI

### Layout

Linha de cabeçalho do picker (já existe `search`):

```
[busca textual..........] [Filtros · 3]   23 magias
```

- `Filtros` é um botão. Badge à direita mostra a contagem total.
- "X magias" é a contagem do `filteredPicker` resultante.
- Quando contagem = 0, mensagem "Nenhuma magia casa os filtros." no lugar da lista.

### Painel (dropdown)

Abre/fecha com toggle. Posiciona-se abaixo da linha de busca.

```
┌─ Painel ──────────────────────────────────┐
│ Escolas:    [Abjuração] [Conjuração●]     │
│             [Adivinhação] [Encantamento]   │
│             [Evocação] [Ilusão●]           │
│             [Necromancia] [Transmutação]   │
│                                            │
│ Tempo:      [Ação] [Bônus●] [Reação]      │
│             [Minutos] [Hora+]              │
│                                            │
│ Componentes: V [qualquer▼]  S [com▼]      │
│              M [sem▼]                      │
│                                            │
│ Outros:     Concentração [não▼]           │
│             Ritual [só ritual▼]            │
│                                            │
│                              [Limpar]      │
└────────────────────────────────────────────┘
```

- Chips toggle (escolas, tempos) usam mesmo padrão visual já usado em outras tabs (`bg-amber-700` quando ativo).
- Tri-state V/S/M: pequeno select (`qualquer` / `com` / `sem`).
- Concentração: select `qualquer` / `sim` / `não`.
- Ritual: select `qualquer` / `só ritual`.
- Footer "Limpar" reseta tudo para o default.

### Reset

- Trocar de nível (tab) NÃO reseta (decisão de produto: facilita comparação cross-level).
- "Limpar filtros" reseta.
- Recarregar a página reseta.

---

## Testes

### Unit (`src/test/spells-filters.test.js`)

- filtro vazio passa qualquer magia
- escola single (1 escola)
- escolas múltiplas (OR dentro do set)
- concentração yes/no/any
- ritual yes/any
- componentes V sim, S não, M qualquer (tri-state combinado)
- casting time "Ação" não casa "1 ação bônus"
- casting time "Bônus" casa "1 ação bônus"
- casting time "Reação" casa "1 reação, que você toma..."
- AND entre dimensões: Evocação + concentração=não filtra corretamente
- combinação completa de 5 dimensões

### E2E (`src/test/e2e/spellsFilters.test.jsx`)

- Abrir painel → selecionar Evocação → lista encolhe; badge "Filtros · 1".
- Combinar Evocação + Concentração=não → mais reduzido.
- "Limpar" reseta tudo; badge some.
- "0 magias" mostra mensagem vazia.

---

## Decisões adiadas

- **Persistência entre sessões:** não persiste em localStorage. Reset ao recarregar.
- **Filtros na lista do personagem:** fora.
- **Filtro por classe (ver magias de outras classes no picker):** fora — o picker continua restrito às classes do personagem.
- **Filtro por nível alvo (1, 2, 3...)**: já existe via tabs.
- **Range:** dados muito irregulares.

# Privacidade na Visão de Mesa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Na visão de mesa (Companhia/mapa/lista), um jogador comum só vê o nome do jogador e o nome do personagem das fichas dos OUTROS — raça, classe, nível, HP e CA ficam ocultos. O DM e o próprio dono continuam vendo tudo.

**Architecture:** Redação no servidor. O RPC `campaign_roster` (security definer) passa a devolver `player_name` (join em `profiles`) e um booleano `revealed` por linha; campos sensíveis viram NULL quando `revealed=false` (linha não é do chamador nem o chamador é o DM). O cliente mapeia `playerName`/`revealed` (com `revealed ?? true` pra back-compat) e cada componente da visão de mesa renderiza a forma "redigida" quando `revealed === false`.

**Tech Stack:** Supabase Postgres (RPC SQL), React, Vitest + @testing-library/react.

**Rollout:** O deploy do cliente é seguro ANTES da migration (back-compat: `revealed ?? true` mantém o comportamento atual). A privacidade só "liga" quando o dono aplica a migration `0014` no SQL Editor do Supabase (migrations deste projeto são aplicadas manualmente, como diz o cabeçalho da 0011).

**Comando de teste:** `npx vitest run <arquivo>`.

---

## Contexto de código (já mapeado)

- **Fonte de dados:** `loadCampaignRoster` em [src/lib/campaigns.js](src/lib/campaigns.js) chama `supabase.rpc('campaign_roster', ...)` e molda cada linha em `{ id, ownerId, shortId, campaignId, isSummary, info:{name,class,race,level}, combat:{maxHp,currentHp,armorClass}, position, lastOpenedAt }`. O RPC vive em `supabase/migrations/0011_campaign_roster.sql`.
- **Consumidor:** `CharacterList.jsx` chama `loadCampaignRoster` no escopo de mesa. O DM vê o MESMO mapa (também via roster). Fora de mesa, o app usa `loadCharacters` (fichas próprias, não afetadas).
- **Render de raça/classe/nível/HP/CA:**
  - `CharacterToken.jsx` — `ClassIcon(info.class)` + badge de nível romano + label do nome + `MapTooltip` no hover.
  - `MapTooltip.jsx` — nome; depois `raça · classe · Nível N` (condicional); depois `HP a/b · CA c` (condicional). **Já some quando os campos são nulos.**
  - `CharacterSidebar.jsx` — fileira de filtros por classe (linhas 55–73); por ficha: `ClassIcon` + nome + subtítulo de classe (`{c.info?.class || '—'}`) + nível romano.
  - `CharacterListView.jsx` — cards via `summaryOf(c)` (system-agnostic). HP/CA só renderiza com `maxHp > 0`. Busca por raça/classe.
- **Fallback de ícone:** `ClassIcon` ([src/utils/class-icons.jsx](src/utils/class-icons.jsx)) já devolve uma **estrela** (`fallback`) para classe vazia/desconhecida — ou seja, linha redigida já mostra ícone genérico automaticamente.
- **summarize do dnd5e** ([src/systems/dnd5e/core.js:23](src/systems/dnd5e/core.js)): com `info` vazio → `{ title: nome, subtitle: '—', badges: [], icon: null }`. Degrada bem.
- **DM:** `campaigns.dm_id` (ver `campaigns.js`). **Profiles:** `profiles.display_name`, PK `profiles.id = user_id` (ver `listMembers`).

## Mapa de arquivos

| Arquivo | Responsabilidade | Ação |
|---|---|---|
| `supabase/migrations/0014_campaign_roster_privacy.sql` | Recria o RPC com `player_name` + `revealed` + redação | **Criar** |
| `src/lib/campaigns.js` | `loadCampaignRoster` mapeia `playerName` + `revealed` | Modificar |
| `src/components/CharacterList/MapTooltip.jsx` | Mostra nome do jogador; (raça/classe/HP já condicionais) | Modificar |
| `src/components/CharacterList/CharacterToken.jsx` | Esconde badge de nível quando `!revealed` | Modificar |
| `src/components/CharacterList/CharacterSidebar.jsx` | Esconde filtros de classe quando nem tudo revelado; subtítulo = nome do jogador; nível só se revelado | Modificar |
| `src/components/CharacterList/CharacterListView.jsx` | Mostra nome do jogador no card | Modificar |
| `src/test/campaign-roster.test.js` | Casos de `playerName`/`revealed` + back-compat | Modificar |
| `src/test/dnd5e/roster-privacy-ui.test.jsx` | Testes de componente (token/tooltip/sidebar redigidos) | **Criar** |

**Convenção de dados (usada em todas as tasks):** cada linha do roster ganha dois campos no nível raiz (irmãos de `info`): `playerName: string|null` e `revealed: boolean`. `revealed` default `true` quando ausente (RPC antigo). A "forma redigida" é `revealed === false`.

---

## Task 1: Migration do RPC com redação + nome do jogador

**Files:**
- Create: `supabase/migrations/0014_campaign_roster_privacy.sql`

> Sem teste automatizado (SQL aplicado manualmente no Supabase). A validação vem das tasks de cliente (back-compat) e da verificação manual no fim.

- [ ] **Step 1: Criar a migration**

Create `supabase/migrations/0014_campaign_roster_privacy.sql`:

```sql
-- Privacidade na visão de mesa: o campaign_roster passa a REDIGIR raça/classe/
-- nível/HP/CA das fichas que NÃO são do chamador (a menos que o chamador seja o
-- DM da mesa), e expõe o nome do jogador (profiles.display_name). Aplique no SQL
-- Editor do Supabase, NÃO via cliente.
--
-- revealed = true quando a linha é do próprio chamador OU o chamador é o DM.
-- Quando false, os campos sensíveis voltam NULL — o dado nem chega no navegador.
-- `name` (personagem), `player_name` e `position` são sempre devolvidos (a ficha
-- precisa aparecer no mapa). O `data` completo segue protegido pela RLS de
-- characters (só dono/DM abrem a ficha).

create or replace function public.campaign_roster(p_campaign_id uuid)
returns table (
  id             uuid,
  owner_id       uuid,
  short_id       text,
  campaign_id    uuid,
  name           text,
  player_name    text,
  revealed       boolean,
  class          text,
  race           text,
  level          int,
  max_hp         int,
  current_hp     int,
  armor_class    int,
  "position"     jsonb,
  last_opened_at timestamptz
)
language sql
security definer
stable
set search_path = public, pg_temp
as $$
  select
    c.id,
    c.owner_id,
    c.short_id,
    c.campaign_id,
    c.data->'info'->>'name'                          as name,
    pr.display_name                                  as player_name,
    rev.revealed                                     as revealed,
    case when rev.revealed then c.data->'info'->>'class' end as class,
    case when rev.revealed then c.data->'info'->>'race'  end as race,
    case when rev.revealed then nullif(c.data->'info'->>'level', '')::int end       as level,
    case when rev.revealed then nullif(c.data->'combat'->>'maxHp', '')::int end     as max_hp,
    case when rev.revealed then nullif(c.data->'combat'->>'currentHp', '')::int end as current_hp,
    case when rev.revealed then nullif(c.data->'combat'->>'armorClass', '')::int end as armor_class,
    c.data->'position'                               as "position",
    c.last_opened_at
  from public.characters c
  left join public.profiles pr on pr.id = c.owner_id
  cross join lateral (
    select (
      c.owner_id = auth.uid()
      or auth.uid() = (select cm.dm_id from public.campaigns cm where cm.id = p_campaign_id)
    ) as revealed
  ) rev
  where c.campaign_id = p_campaign_id
    and public.is_campaign_member(p_campaign_id);
$$;

grant execute on function public.campaign_roster(uuid) to authenticated;

NOTIFY pgrst, 'reload schema';
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/0014_campaign_roster_privacy.sql
git commit -m "feat(db): campaign_roster redige raça/classe/HP de outros + expõe nome do jogador"
```

---

## Task 2: `loadCampaignRoster` mapeia `playerName` + `revealed`

**Files:**
- Modify: `src/lib/campaigns.js` (função `loadCampaignRoster`)
- Test: `src/test/campaign-roster.test.js`

- [ ] **Step 1: Escrever os testes que falham**

Em `src/test/campaign-roster.test.js`, adicione dentro do `describe('loadCampaignRoster', ...)`:

```js
  it('mapeia playerName e revealed quando o RPC os devolve', async () => {
    state.rpcResult = {
      data: [{
        id: 'c2', owner_id: 'u1', short_id: null, campaign_id: 'camp1',
        name: 'Ozzy', player_name: 'Gabriel', revealed: false,
        class: null, race: null, level: null,
        max_hp: null, current_hp: null, armor_class: null,
        position: { x: 0.5, y: 0.5 }, last_opened_at: null,
      }],
      error: null,
    }
    const res = await loadCampaignRoster('camp1')
    const r = res.rows[0]
    expect(r.playerName).toBe('Gabriel')
    expect(r.revealed).toBe(false)
    expect(r.info).toEqual({ name: 'Ozzy', class: '', race: '', level: 1 })
  })

  it('back-compat: RPC antigo sem revealed → revealed=true (sem redação)', async () => {
    state.rpcResult = {
      data: [{ id: 'c3', owner_id: 'u1', campaign_id: 'camp1', name: 'X', class: 'mago', race: 'humano', level: 2 }],
      error: null,
    }
    const res = await loadCampaignRoster('camp1')
    const r = res.rows[0]
    expect(r.revealed).toBe(true)
    expect(r.playerName).toBeNull()
  })
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/campaign-roster.test.js`
Expected: FAIL — `r.playerName`/`r.revealed` são `undefined`.

- [ ] **Step 3: Implementar**

Em `src/lib/campaigns.js`, na função `loadCampaignRoster`, dentro do `.map(r => ({ ... }))`, adicione os dois campos no nível raiz do objeto (ex.: logo após `campaignId: r.campaign_id ?? null,`):

```js
    playerName: r.player_name ?? null,
    revealed: r.revealed ?? true,
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/campaign-roster.test.js`
Expected: PASS (todos, incluindo os 3 antigos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/campaigns.js src/test/campaign-roster.test.js
git commit -m "feat(roster): mapeia playerName e revealed (back-compat revealed ?? true)"
```

---

## Task 3: MapTooltip mostra o nome do jogador

**Files:**
- Modify: `src/components/CharacterList/MapTooltip.jsx`
- Test: `src/test/dnd5e/roster-privacy-ui.test.jsx`

> O MapTooltip já esconde raça/classe/nível/HP/CA quando os campos vêm nulos (condicionais existentes). Só falta exibir o nome do jogador.

- [ ] **Step 1: Escrever o teste que falha**

Create `src/test/dnd5e/roster-privacy-ui.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MapTooltip } from '../../components/CharacterList/MapTooltip'

describe('MapTooltip — privacidade', () => {
  it('linha redigida mostra nome do personagem e do jogador, sem raça/classe/HP', () => {
    render(<MapTooltip character={{
      info: { name: 'Ozzy', class: '', race: '', level: null },
      combat: {}, playerName: 'Gabriel', revealed: false,
    }} />)
    expect(screen.getByText('Ozzy')).toBeInTheDocument()
    expect(screen.getByText('Gabriel')).toBeInTheDocument()
    expect(screen.queryByText(/Nível/)).not.toBeInTheDocument()
    expect(screen.queryByText(/HP/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/roster-privacy-ui.test.jsx`
Expected: FAIL — "Gabriel" não está no documento.

- [ ] **Step 3: Implementar**

Em `MapTooltip.jsx`, dentro do `return`, logo APÓS o bloco do nome (o `<div>` que renderiza `{info.name || '—'}`, que fecha na linha ~39), insira:

```jsx
      {c.playerName && (
        <div className="text-[11px] mt-0.5 text-gold-500 font-body">
          👤 {c.playerName}
        </div>
      )}
```

(O objeto já está desestruturado como `const c = character || {}` no topo da função — use `c.playerName`.)

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/roster-privacy-ui.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterList/MapTooltip.jsx src/test/dnd5e/roster-privacy-ui.test.jsx
git commit -m "feat(mapa): tooltip mostra o nome do jogador"
```

---

## Task 4: CharacterToken esconde o nível quando redigido

**Files:**
- Modify: `src/components/CharacterList/CharacterToken.jsx`
- Test: `src/test/dnd5e/roster-privacy-ui.test.jsx` (estende)

> O ícone de classe já cai no fallback (estrela) com classe vazia. Falta esconder o badge de nível e tirar a classe/nível do aria-label quando `revealed === false`.

- [ ] **Step 1: Escrever o teste que falha**

Em `src/test/dnd5e/roster-privacy-ui.test.jsx`, adicione um novo `describe`:

```jsx
import { CharacterToken } from '../../components/CharacterList/CharacterToken'

describe('CharacterToken — privacidade', () => {
  it('linha redigida não mostra badge de nível e o aria-label não cita classe/nível', () => {
    render(<CharacterToken character={{
      id: 't1', info: { name: 'Ozzy', class: '', level: null },
      position: { x: 0.5, y: 0.5 }, playerName: 'Gabriel', revealed: false,
    }} />)
    expect(screen.getByText('Ozzy')).toBeInTheDocument()
    // sem badge romano de nível
    expect(screen.queryByText('I')).not.toBeInTheDocument()
    // aria-label = só o nome
    expect(screen.getByRole('button', { name: 'Ozzy' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/roster-privacy-ui.test.jsx`
Expected: FAIL — o badge `I` aparece (hoje `info.level ?? 1` → 1 → 'I') e o aria-label inclui `nível 1`.

- [ ] **Step 3: Implementar**

Em `CharacterToken.jsx`:

3a. Adicione `revealed` à desestruturação (linha ~32). Troque:

```js
  const { id, info = {}, position = { x: 0.5, y: 0.5 } } = character
```

por:

```js
  const { id, info = {}, position = { x: 0.5, y: 0.5 }, revealed = true } = character
```

3b. Troque o `ariaLabel` (linhas ~36-40) por uma versão que omite classe/nível quando redigido:

```js
  const ariaLabel = revealed
    ? [info.name || 'Personagem', info.class, `nível ${lv}`].filter(Boolean).join(', ')
    : (info.name || 'Personagem')
```

3c. Envolva o badge de nível (o `<span class="token-level ...">{romanLv}</span>`, linhas ~76-81) num condicional `revealed`:

```jsx
        {revealed && (
          <span
            aria-hidden="true"
            className="token-level absolute -bottom-1 -right-1 rounded-full grid place-items-center font-bold w-[22px] h-[22px] text-xs border-2 border-shell-800 text-ink-inverse font-display"
          >
            {romanLv}
          </span>
        )}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/roster-privacy-ui.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterList/CharacterToken.jsx src/test/dnd5e/roster-privacy-ui.test.jsx
git commit -m "feat(mapa): token esconde nível em ficha redigida"
```

---

## Task 5: CharacterSidebar — nome do jogador, filtros e nível condicionais

**Files:**
- Modify: `src/components/CharacterList/CharacterSidebar.jsx`
- Test: `src/test/dnd5e/roster-privacy-ui.test.jsx` (estende)

- [ ] **Step 1: Escrever o teste que falha**

Em `src/test/dnd5e/roster-privacy-ui.test.jsx`, adicione:

```jsx
import { CharacterSidebar } from '../../components/CharacterList/CharacterSidebar'

describe('CharacterSidebar — privacidade', () => {
  const redacted = { id: 's1', info: { name: 'Ozzy', class: '', race: '', level: null }, playerName: 'Gabriel', revealed: false }

  it('linha redigida mostra nome do jogador e não mostra classe nem nível', () => {
    render(<CharacterSidebar characters={[redacted]} />)
    expect(screen.getByText('Ozzy')).toBeInTheDocument()
    expect(screen.getByText('Gabriel')).toBeInTheDocument()
    expect(screen.queryByText('—')).not.toBeInTheDocument() // subtítulo não cai no placeholder de classe
  })

  it('esconde a fileira de filtros de classe quando há ficha redigida', () => {
    render(<CharacterSidebar characters={[redacted]} />)
    expect(screen.queryByRole('group', { name: 'Filtros de classe' })).not.toBeInTheDocument()
  })

  it('mostra os filtros quando tudo é revelado (visão do DM)', () => {
    render(<CharacterSidebar characters={[{ id: 's2', info: { name: 'A', class: 'mago', level: 3 }, playerName: 'Gm', revealed: true }]} />)
    expect(screen.getByRole('group', { name: 'Filtros de classe' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/roster-privacy-ui.test.jsx`
Expected: FAIL — hoje aparece o subtítulo `—`, os filtros sempre aparecem, e "Gabriel" não é renderizado.

- [ ] **Step 3: Implementar**

Em `CharacterSidebar.jsx`:

3a. Logo após a linha `const visible = filtered.slice(0, MAX_VISIBLE_TOKENS)` (linha ~41), calcule se tudo é revelado:

```js
  const allRevealed = characters.every(c => c.revealed !== false)
```

3b. Envolva a `<div>` de filtros (`role="group" aria-label="Filtros de classe"`, linhas ~55-73) em `allRevealed &&`:

```jsx
      {allRevealed && (
        <div className="flex flex-wrap gap-1 mb-2" role="group" aria-label="Filtros de classe">
          {/* ...conteúdo dos Chips inalterado... */}
        </div>
      )}
```

3c. Troque o `<span>` do subtítulo (linhas ~103-105, hoje `{c.info?.class || '—'}`) por: nome do jogador sempre, e classe só quando revelado.

```jsx
                  <span className="block text-xs italic mt-0.5 text-gold-500 truncate">
                    {c.playerName || (c.revealed !== false ? (c.info?.class || '—') : '—')}
                    {c.revealed !== false && c.info?.class && c.playerName ? ` · ${c.info.class}` : ''}
                  </span>
```

3d. Esconda o nível romano (o `<span ...>{toRoman(c.info?.level ?? 1)}</span>`, linhas ~107-109) quando redigido:

```jsx
                {c.revealed !== false && (
                  <span className="text-[13px] font-bold flex-shrink-0 mr-1 font-display text-gold-400">
                    {toRoman(c.info?.level ?? 1)}
                  </span>
                )}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/roster-privacy-ui.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterList/CharacterSidebar.jsx src/test/dnd5e/roster-privacy-ui.test.jsx
git commit -m "feat(companhia): sidebar mostra nome do jogador; oculta classe/nível/filtros em ficha redigida"
```

---

## Task 6: CharacterListView mostra o nome do jogador

**Files:**
- Modify: `src/components/CharacterList/CharacterListView.jsx`
- Test: `src/test/dnd5e/roster-privacy-ui.test.jsx` (estende)

> Para linha redigida, `summarize` já devolve `subtitle: '—'`, sem badges, ícone fallback, e o bloco HP/CA some (`maxHp > 0` falso). Falta só exibir o nome do jogador no card.

- [ ] **Step 1: Escrever o teste que falha**

Em `src/test/dnd5e/roster-privacy-ui.test.jsx`, adicione:

```jsx
import { CharacterListView } from '../../components/CharacterList/CharacterListView'

describe('CharacterListView — privacidade', () => {
  it('card mostra o nome do jogador', () => {
    render(<CharacterListView characters={[{
      id: 'l1', system: 'dnd5e', info: { name: 'Ozzy', class: '', race: '', level: null },
      combat: {}, playerName: 'Gabriel', revealed: false,
    }]} />)
    expect(screen.getByText('Ozzy')).toBeInTheDocument()
    expect(screen.getByText('Gabriel')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/test/dnd5e/roster-privacy-ui.test.jsx`
Expected: FAIL — "Gabriel" não aparece.

- [ ] **Step 3: Implementar**

Em `CharacterListView.jsx`, dentro do card, logo APÓS o `<span>` do subtítulo (`{summary.subtitle}`, linhas ~181-183), insira a linha do jogador:

```jsx
                    {c.playerName && (
                      <span className="block text-[11px] ink-italic text-ink-300 truncate">
                        👤 {c.playerName}
                      </span>
                    )}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/test/dnd5e/roster-privacy-ui.test.jsx`
Expected: PASS (todos os describes do arquivo).

- [ ] **Step 5: Commit**

```bash
git add src/components/CharacterList/CharacterListView.jsx src/test/dnd5e/roster-privacy-ui.test.jsx
git commit -m "feat(lista): card mostra o nome do jogador"
```

---

## Task 7: Verificação final

- [ ] **Step 1: Suíte completa**

Run: `npx vitest run`
Expected: PASS (baseline ~1320 + os novos; flakes conhecidos em LoginScreen/ResetPasswordScreen sob carga — re-rodar só esses se piscarem).

- [ ] **Step 2: Build**

Run: `npx vite build`
Expected: conclui sem erro.

- [ ] **Step 3: Commit (se houver algo pendente)** — caso contrário, pular.

---

## Aplicação da migration (manual, pelo dono — NÃO automatizar)

Depois do merge/deploy do cliente, o dono aplica a `0014` no **SQL Editor do Supabase** (cole o conteúdo de `supabase/migrations/0014_campaign_roster_privacy.sql` e rode). Antes disso, o app funciona igual a hoje (back-compat). Depois, a redação entra em vigor. Validar manualmente: entrar como jogador comum numa mesa com fichas de outros → ver só nome do jogador + nome do personagem; entrar como DM → ver tudo.

---

## Self-review (cobertura)

- Redação no servidor + `player_name` + `revealed` (design §1) → Task 1.
- Mapeamento cliente + back-compat (design §2) → Task 2.
- Token (ícone genérico automático + esconder nível) (design §3) → Task 4.
- Tooltip (nome do jogador; raça/classe/HP já condicionais) (design §3) → Task 3.
- Sidebar (nome do jogador, esconder classe/nível, esconder filtros) (design §3) → Task 5.
- Lista (nome do jogador; resto já degrada) (design §3) → Task 6.
- Nome do jogador exibido (design §4) → Tasks 3/5/6.
- Testes (design §5) → cada task tem TDD; roster + 4 componentes.
- Rollout seguro (back-compat) → Task 2 + nota de aplicação manual.

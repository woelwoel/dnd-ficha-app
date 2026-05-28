# Super Review — dnd-ficha-app (pós PR 4)

> Data: 2026-05-20. Estado do repo: master @ `8c72205` (CHANGELOG PR 4).
> Cobertura: tudo desde PR 1 (Auth) até PR 4 (UI de mesas) + base preexistente
> (wizard, ficha, regras D&D).

Achados organizados por severidade. Cada item tem **onde**, **consequência** e
**fix sugerido**. Itens marcados com 🎯 são os atacáveis primeiro (impacto alto,
esforço baixo).

---

## 🚨 Crítico

### 1. 🎯 `readOnly` está no contexto mas **não desabilita nenhum input**
**Onde:** `src/components/CharacterSheet/CharacterSheet.jsx:196` injeta `readOnly`
no `contextValue`, mas grep mostra que nenhum dos blocos (`Attacks.jsx`,
`CombatStats.jsx`, `Spells.jsx`, `CharacterInfo.jsx`, `Inventory.jsx`,
`HabilitiesTab.jsx`, etc.) consome.

**Consequência:** DM lendo ficha de jogador pode clicar `+HP`, editar notas,
marcar saves, mover slots… A UI responde, o React state muda, mas `useAutoSave`
é no-op silencioso. Quando recarrega, tudo some. Pior: DM acha que está editando
"pelo jogador" e fica confuso quando o player não vê. O selo "Modo leitura" no
header sozinho não basta — passa despercebido.

**Fix:**
- Consumir `readOnly` via `useCharacterContext()` nos blocos com inputs.
- Mínimo: bloquear `onClick` no handler raiz da ficha.
- Ideal: `disabled={readOnly}` em todo `<input>`/`<button>` + visual cinza
  (`opacity-60 cursor-not-allowed`).

---

### 2. 🎯 Wizard com draft em sessionStorage perde o destino da mesa
**Onde:** `src/components/CharacterWizardV2/CharacterWizardV2.jsx:284-286`

```js
const hasSavedDraft = !!sessionStorage.getItem(STORAGE_KEY)
const [campaignId, setCampaignId] = useState(
  initialCampaignId !== undefined ? initialCampaignId : undefined
)
const needsDestination = campaignId === undefined && !hasSavedDraft
```

Se usuário começou criando ficha pra Mesa X (`?campaignId=X`), salvou draft,
fechou, e voltou clicando "Recrutar" sem mesa selecionada, o resume **pula** o
`DestinationModal`. `campaignId` fica `undefined` → `handleFinalize` salva como
`null` (pessoal).

**Consequência:** ficha que devia ser da mesa silenciosamente vira pessoal.
Usuário só descobre depois que sumiu do filtro da mesa.

**Fix:** persistir `campaignId` junto do draft (mesmo `sessionStorage`/JSON) ou
perguntar de novo após resume. Sugestão: estender `useDraft` pra incluir
`campaignId` no payload salvo.

---

### 3. 🎯 `profiles_select_authenticated` expõe display_name + avatar_url de **todos** os usuários
**Onde:** `supabase/migrations/0001_profiles.sql:13-17`

```sql
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);  -- ← lê QUALQUER profile
```

Qualquer usuário logado pode fazer `select * from profiles` via anon key + REST
e enumerar email-derivado-display_name + uuid + avatar_url de **todo mundo** no
banco. O spec dizia "retorna apenas display_name" — a policy retorna a row
inteira.

**Consequência hoje:** baixa (UI não chama). **Consequência futura:** quando
adicionarmos display_name no MembersList (item #16), a policy continua aberta
demais. Scraping trivial.

**Fix opções:**
- Policy restrita: `using (id = auth.uid() OR id IN (select user_id from campaign_members where campaign_id IN (select campaign_id from campaign_members where user_id = auth.uid())))`
- Criar VIEW `public_profiles` (só `id`, `display_name`) com policy aberta;
  revogar SELECT direto na tabela.

---

## ⚠️ Segurança / privacidade

### 4. `join_attempts` cresce indefinidamente
**Onde:** `supabase/migrations/0004_campaigns.sql:34-40`

Toda tentativa de join (válida ou não) faz INSERT. Sem TTL, sem purge.
Cenário malicioso: 10 attempts/min × 60 × 24 × 365 ≈ 5M rows/ano por usuário
ativo. Tabela e índice incham.

**Fix:** habilitar `pg_cron` no Supabase e schedular `delete from
public.join_attempts where ts < now() - interval '1 day'` diariamente. Ou
incluir delete inline no `join_campaign` (limpar attempts > 1min do user antes
de inserir).

### 5. Sem rate limit em `create_campaign` / `signUp`
Um user pode criar 1000 mesas/min ou estourar criação de contas. Apenas
`join_campaign` tem rate limit (10/min). `create_campaign` permite spam
ilimitado de mesas; cada mesa gera invite_code e cresce `campaigns`.

**Fix:** trigger ou check `count(*) where dm_id = auth.uid()` >= N (ex: 20) no
início de `create_campaign`. signUp já tem rate limit nativo do Supabase, mas
confirme no painel.

### 6. CSP permite `style-src 'unsafe-inline'`
**Onde:** `vercel.json:8`

Necessário pelo `style={...}` inline do React em vários componentes. XSS via
style é difícil de explorar sem JS execution (que `script-src 'self'` bloqueia),
mas conformidade falha em scans.

**Fix:** migrar inline styles pra CSS classes / utility Tailwind. Refactor
grande, baixa prioridade.

### 7. `.claude/` e `.claire/` aparecem em `git status` mas não no `.gitignore`
Verificar se contêm credenciais antes de qualquer `git add .` em massa.
Provavelmente OK (cache de sessão), mas adicionar ao `.gitignore` evita
acidente futuro.

**Fix:**
```
.claude/
.claire/
```

### 8. Confirmar "Confirm email" obrigatório no Supabase
Se estiver off, qualquer um cria conta com email alheio. Verificar em
Authentication → Providers → Email → "Confirm email".

---

## 🐛 Bugs reais / edge cases

### 9. Stale `campaignId` no client após mesa ser deletada
A FK em `characters.campaign_id` é `on delete set null`. Quando DM apaga mesa,
DB nullifica a coluna. Mas o `character.campaignId` em memória do cliente
continua apontando pro UUID antigo. Próximo auto-save tenta `set campaign_id =
'<uuid-deletado>'` → **violação de FK** (23503), erro genérico "Sem salvar".
Usuário não entende.

**Fix:** ao receber erro 23503 no `upsertCharacter`, retry com
`campaignId: null` e logar warning. Ou validar `campaignId` contra
`listMyCampaigns()` antes de salvar.

### 10. 🎯 `useCampaignContext` aponta pra mesa onde user não é mais membro
**Onde:** `src/hooks/useCampaignContext.js`

Selector remembers `{campaignId: 'X'}`. Se user foi removido OU mesa foi
deletada, RLS retorna lista vazia. UX: "Mesa: X" no dropdown, lista zero
fichas, usuário acha que perdeu tudo.

**Fix:** após `listMyCampaigns()` no `CampaignSelector` ou `CharacterList`,
se `scope.campaignId` não está na lista retornada, resetar pra `'personal'`.
~5 linhas.

### 11. CharacterSheet refaz `supabase.auth.getUser()` toda vez que monta
**Onde:** `src/components/CharacterSheet/CharacterSheet.jsx:104-110`

```jsx
useEffect(() => {
  let alive = true
  import('../../lib/supabase').then(({ supabase }) =>
    supabase.auth.getUser().then(({ data }) => {
      if (alive) setCurrentUserId(data?.user?.id ?? null)
    }),
  )
  return () => { alive = false }
}, [])
```

Cada abertura de ficha = 1 round-trip ao Supabase auth, mesmo já tendo
`useAuth().user` no contexto. Duplicação desnecessária e bug-prone (pode
resolver depois do mount, causando flicker do `readOnly`).

**Fix:**
```jsx
const { user } = useAuth()
const readOnly = !!(character?.ownerId && user?.id && character.ownerId !== user.id)
```
Remove o useEffect inteiro.

### 12. `import` dinâmico desnecessário em hot path
**Onde:** `CharacterSheet.jsx:106` — `import('../../lib/supabase').then(...)`
dentro de `useEffect`.

`supabase` já é carregado pelo AuthProvider. Adiciona latência e complexidade
pra zero benefício. Eliminado se aplicar fix #11.

### 13. 🎯 `LoginScreen` inputs sem `autoComplete`
**Onde:** `src/auth/LoginScreen.jsx:114-130`

Sem `autoComplete="email"`, `"current-password"`, `"new-password"`,
gerenciadores de senha (1Password, Bitwarden, Chrome) não preenchem nem sugerem
senha forte na criação. Usabilidade ruim, especialmente mobile.

**Fix:**
```jsx
<input type="email" autoComplete="email" ... />
<input
  type="password"
  autoComplete={tab === TABS.SIGNIN ? 'current-password' : 'new-password'}
  ...
/>
```

### 14. 🎯 `MembersList` mostra UUID truncado em vez de display_name
**Onde:** `src/components/Campaigns/MembersList.jsx:54` —
`{m.user_id.slice(0, 8)}…`

DM olha lista e vê `4f3a8b21…` em vez de "joão" / email. Inútil.

**Fix:** estender `listMembers` em `src/lib/campaigns.js` com join via foreign
key relationship (sintaxe PostgREST):

```js
.from('campaign_members')
.select('user_id, role, created_at, profiles:user_id(display_name)')
```

E renderizar `m.profiles?.display_name ?? m.user_id.slice(0,8)`. Depende de
#3 estar mitigado (policy permite ler profiles).

### 15. `useDraft` no wizard usa `sessionStorage` (não `localStorage`)
Diferente do plano original (que mencionava localStorage). Inofensivo mas vale
confirmar intenção. sessionStorage = drafts somem ao fechar o browser; pode
frustar usuário que pausa a criação.

### 16. `AccountMenu` só existe no `CharacterList`
Dentro da ficha (`CharacterSheet`) ou dentro de `/campaigns` o usuário precisa
voltar à lista pra fazer logout/apagar conta. Inconsistente. Spec dizia
"AccountMenu no header" mas só foi parar em uma tela.

**Fix:** extrair um `AppHeader` compartilhado que tenha `AccountMenu`, e usar
nas 3 telas (CharacterList, CampaignsScreen, CampaignDetail). Ficha tem header
próprio (SheetHeader) — pode receber o AccountMenu lá também.

### 17. `safeParseCharacter` síncrono em `SheetHeader.handleFile`
**Onde:** `src/components/CharacterSheet/SheetHeader.jsx:38`

Cada import JSON faz parse Zod síncrono. Pra fichas grandes (200 KB próximo do
limite), trava UI 50–100ms. Aceitável hoje.

---

## 👤 UX

### 18. "Modo leitura" sem indicação visual além do selo no header
Inputs continuam parecendo editáveis. Sem cinza/opacity/cursor change. Reforça
o bug crítico #1.

### 19. Wizard tem até 3 modais em sequência
1. `ResumeDraftPrompt` (se draft)
2. `DestinationModal` (se sem campaignId)
3. `CampaignSetupModal` (sempre)

Fluxo recém-cadastrado vendo 2–3 modais consecutivos é confuso. Considerar
mesclar destination + setup em um único onboard.

### 20. Botão "↻ Rotacionar" sem feedback após sucesso
**Onde:** `src/components/Campaigns/InviteCodeBox.jsx:24`

Único feedback é o código re-renderizar. Adicionar toast tipo "✓ Código
atualizado" / "Copiado" igual ao copy. Microinteração.

### 21. "Mesas" e "Recrutar" no header têm ícone ⚔ idêntico
**Onde:** `src/components/CharacterList/CharacterList.jsx:135, 145`

Visualmente confunde. Mesa devia ser 🏰 / 📜 / ⚜ e criar personagem ⚔ / 🎲.

### 22. Apagar conta deixa órfão em `auth.users`
Documentado em CHANGELOG, mas o efeito prático é que o user "apaga conta",
recria com mesmo email, vê app vazio sem entender. Implementar Edge Function
no Vercel (ou Supabase) chamando admin API resolveria.

### 23. Sem página de privacidade / LGPD
Footer LGPD existe (email contato), mas LGPD (art. 9°) exige aviso explícito
sobre coleta. Considerar `/privacidade` com:
- Quais dados são coletados (email, fichas)
- Onde armazenados (Supabase — em qual região?)
- Como apagar (botão Apagar Conta)
- Contato do controlador

### 24. CampaignsScreen — sem busca/filtro
Com 20+ mesas vira parede de cards. Cosmético hoje. Adicionar quando passar
de ~10 mesas por user na média.

### 25. Selector de contexto é `<select>` puro
Estilizado básico. Em mesas com nomes longos, trunca. Considerar combobox
custom (headlessui ou similar) quando virar dor.

### 26. Sem feedback de loading em ações destrutivas
`removeMember`/`leaveCampaign`/`onRotate` mostram só `confirm()` nativo do
browser. Sem spinner durante a request. Aceitável (requests são rápidas).

---

## 🏗️ Arquitetura / código

### 27. Arquivos muito grandes
- `src/domain/rules.js` — 1053 linhas
- `src/components/CharacterSheet/CombatClassActions.jsx` — 930
- `src/components/CharacterSheet/Spells.jsx` — 858
- `src/components/CharacterSheet/CombatStats.jsx` — 789
- `src/hooks/useCharacter.js` — 664

Hard to navigate. Quando virar gargalo, dividir por sub-domínio (spellcasting,
combat, multiclass). Não urgente — apenas se for mexer.

### 28. `useAuth().user` vs `supabase.auth.getUser()` usados intercaladamente
Padrão inconsistente. Algumas partes pegam do hook, outras vão direto no
supabase.

**Regra:**
- **Dentro de componentes React:** sempre `useAuth()`.
- **Em modules fora de React** (`storage.js`, `campaigns.js`): `supabase.auth.getUser()`.

Documentar no `src/auth/README.md` ou similar.

### 29. Schema valida `ownerId/campaignId` mas espelha de duas fontes
**Em `rowToCharacter`** (`src/utils/storage.js:27`):

```js
ownerId: row.owner_id ?? row.data.ownerId ?? null,
campaignId: row.campaign_id ?? row.data.campaignId ?? null,
```

Se `data` (jsonb) e a coluna divergem (e divergem — porque ao salvar enviamos
`data: v.data` que inclui o `ownerId` validado), o cliente prefere a coluna,
mas o jsonb tem stale data. Não causa bug imediato mas é confuso e desperdiça
espaço.

**Fix:** strip `ownerId`/`campaignId` antes de `data: v.data` no upsert. São
colunas relacionais, não devem viver em `data`:

```js
const { ownerId, campaignId, ...dataToSave } = v.data
row.data = dataToSave
```

### 30. Sem tipos TypeScript
JS puro. Pra um app com Zod schema, useCharacter, rules engine… TS economizaria
horas. Não urgente.

### 31. Mistura de Tailwind utility + CSS vars + estilos inline
Ex: `style={{ borderColor: 'var(--color-shell-border)' }}` em muitos lugares.
Devia virar utility (`border-shell` no Tailwind theme via plugin/config).
Refactor cosmético.

### 32. Dois lugares pra mesma decisão "está autenticado"
- `AuthProvider` reage a `onAuthStateChange`
- Route components não checam — confiam no Gate

OK na prática mas vale documentar a invariante.

---

## 🧪 Testes

### 33. Cobertura desigual
**Bem testado:**
- `domain/rules.js` (várias suites)
- `storage.test.js` (caminhos felizes + scope)
- `campaigns.test.js` (7 testes)

**Gaps:**
- `useAutoSave` — sem teste (debounce + readOnly via `enabled`)
- `useCampaignContext` — sem teste (localStorage roundtrip)
- `CampaignsScreen` / `CampaignDetail` / `AccountMenu` — sem testes de componente
- `DeleteAccountModal` — sem teste (confirmação digitada)
- `loadCharacterByRouteParam` — sem teste do path UUID vs short_id
- E2E: Playwright existe mas nada usa

### 34. `test:rls` é teste real mas não roda em CI
Roda só local quando você lembra. Em CI: rodar contra projeto Supabase
dedicado de teste (free tier).

### 35. Sem CI rodando os testes
GitHub Actions trivial:
```yaml
- run: npm ci
- run: npm run test
- run: npm run build
```

Sem isso, quebra só aparece quando deploy crasha.

---

## 🔮 Futuros riscos / melhorias

### 36. PWA + auto-save async = race condition potencial
Se SW atualiza no meio de um save, fetch pode falhar com cache stale.
`clientsClaim` + `skipWaiting` mitiga mas vale monitorar.

### 37. Sem observabilidade
Erros do auto-save vão pro console e mostram "Sem salvar" mas você não sabe
onde sua app está falhando em prod. Opções:
- Sentry (free tier 5k events/mês)
- Vercel Speed Insights / Analytics
- POST simples pra `/api/log` capturando erros

### 38. Sem migração v3 → v4 do schema
Fichas criadas antes do PR4 não têm `campaignId` no `data` jsonb, mas têm
`campaign_id` na coluna (null). `migrateCharacter` continua na v3 — não
precisa migrar pra v4 porque o Zod aceita `optional`. Aceitável; revisitar
se trocarmos a invariante.

### 39. `Permissions-Policy` pode incluir `interest-cohort=()`
Pequeno detalhe pra opt-out do FLoC (que já morreu). Conformidade.

### 40. Sem health-check
`/api/health` ou similar pra monitorar disponibilidade. Como é SPA + Supabase,
o que checar é a chegada ao Supabase. Considerar quando tiver usuários reais.

### 41. Sem realtime no CampaignDetail
DM precisa F5 pra ver fichas atualizadas dos jogadores. Spec adia pra PR 5
opcional. Quando atacar, usar `supabase.channel().on('postgres_changes', ...)`.

### 42. Sem migrar `auth.users` órfão
Quando user "apaga conta" via #22 mas tenta logar de novo com mesmo email, o
profile não existe (cascade limpou) mas auth.users sim. App pode crashar ou
mostrar tela vazia. Investigar e ou:
- Recriar profile via trigger no signup (já existe? `handle_new_user` cria,
  mas só no INSERT em auth.users, não em login)
- Botão "Recriar profile" emergencial

---

## Plano de ataque sugerido

### Sprint 1: Fixes críticos (1-2 sessões)
PR consolidado fazendo:
1. **#1** — `readOnly` em inputs (maior dor, maior esforço)
2. **#2** — Wizard preserva `campaignId` no draft
3. **#3** — Tightening da policy de profiles
4. **#10** — Reset de scope inválido
5. **#11** — Usar `useAuth()` em vez de getUser() no CharacterSheet

### Sprint 2: Polimento UX (1 sessão)
6. **#13** — `autoComplete` nos inputs de login
7. **#14** — display_name no MembersList (depende de #3)
8. **#16** — AppHeader compartilhado com AccountMenu
9. **#20** — Toast/feedback no rotacionar código
10. **#21** — Ícones diferenciados (Mesas vs Recrutar)

### Sprint 3: Hardening (1 sessão)
11. **#4** — Purge de `join_attempts`
12. **#5** — Rate limit em `create_campaign`
13. **#7** — `.claude/`, `.claire/` no gitignore
14. **#8** — Verificar config Supabase confirm email
15. **#9** — Retry com `campaignId: null` em FK violation

### Sprint 4: Tests + CI
16. **#33** — Testes faltantes (useAutoSave, useCampaignContext, modals)
17. **#34** + **#35** — GitHub Actions rodando lint + test + build

### Backlog (quando der)
- #22 Apagar auth.users de verdade (Edge Function)
- #23 Página /privacidade
- #27 Split de rules.js / CombatClassActions.jsx
- #30 TypeScript migration
- #41 Realtime no CampaignDetail
- Observabilidade (#37)

---

## Apêndice: comandos úteis pra revisitar

```bash
# Auditar arquivos grandes
find src -type f \( -name "*.js" -o -name "*.jsx" \) -exec wc -l {} \; | sort -rn | head -20

# Achar usos de readOnly (após fix #1)
grep -rn "readOnly" src/components/CharacterSheet --include="*.jsx"

# Conferir RLS no Supabase
# (SQL Editor)
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

# Verificar TODOs deixados pra trás
grep -rn "TODO\|FIXME\|HACK" src --include="*.jsx" --include="*.js"
```

---

_Review gerado em sessão única após PR 4. Quando atacar os itens, criar um
plano novo em `docs/superpowers/plans/` referenciando os números deste doc._

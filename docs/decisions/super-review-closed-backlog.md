# Super Review 2026-05-20 — fechamento formal de itens deferidos

Decisões para os achados que ficaram fora dos sprints A–K mas precisam de
fechamento formal pra não voltarem no próximo review.

## #27 — Split de arquivos grandes
**Status:** deferido permanentemente como antecipação.
**Justificativa:** o reviewer já marcou como "não urgente — apenas se for
mexer". Cosmético, sem ganho de comportamento. Dividir ✕ arquivos grandes
agora introduz risco de regressão por mover helpers internos. A regra
agora é: ao tocar em arquivo > 700 linhas para feature nova ou fix,
quebrar oportunisticamente. Sem ação proativa.

## #30 — Migração TypeScript
**Status:** deferido como projeto separado.
**Justificativa:** migrar ~100 arquivos JS pra TS cold em sessão única
geraria tipos `any` por todo lado pra "fechar" — pior que ficar em JS.
Migração precisa ser deliberada, com tipos derivados dos schemas Zod
existentes (`type Character = z.infer<typeof CharacterSchema>`) e
revisão semântica de cada módulo. Quando a próxima dor real de tipo
aparecer (bug "esqueci um campo"), abrir issue dedicada com escopo
incremental: começar por `src/lib/` e `src/utils/` (sem JSX), depois
hooks, depois componentes.

## #32 — Padrão `useAuth` vs `supabase.auth.getUser`
**Status:** fechado.
**Resolução:** documentado em `src/auth/README.md` (commit do Batch B).
Resumo: componentes React usam `useAuth()`; módulos `.js` fora da árvore
usam `supabase.auth.getUser()`. Regra explicitada com exemplos.

## #38 — Migração schema v3 → v4
**Status:** fechado sem ação.
**Justificativa:** o reviewer perguntou se fichas pré-PR4 (sem
`campaignId` no JSONB) precisariam de migração. Resposta: não. O Zod
schema aceita `campaignId` como `optional`, e `rowToCharacter` em
`src/utils/storage.js` agora pega `campaign_id` direto da coluna
relacional. Fichas antigas continuam carregando sem warning. Se a
invariante mudar (ex: campaignId virar obrigatório), revisitar.

## #41 — Realtime no CampaignDetail
**Status:** fechado.
**Resolução:** implementado no backlog do super review (commit
`feat(realtime): ficha aberta atualiza ao vivo pro DM`). Cobertura:
- `CampaignCharactersList` recarrega quando qualquer ficha da mesa muda
- `CharacterSheet` em modo readOnly faz refetch ao receber UPDATE da
  própria linha (hook `useCharacterRealtime`)
- Pré-requisito documentado em `docs/ops/supabase-checklist.md`:
  adicionar `characters` à publicação `supabase_realtime`.

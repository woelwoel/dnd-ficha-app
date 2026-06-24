# Artífice — Fase B (Infusões / Infundir Item) Design

Data: 2026-06-24
Branch: `multi-sistema-fronteira`
Sistema: `dnd5e`. Pré-requisito: Artífice Fase A (classe jogável) já entregue.

## Objetivo

Implementar a mecânica-assinatura do Artífice — **Infundir Item** — como um
sistema de rastreamento na ficha: o jogador escolhe **infusões conhecidas** (até
um cap por nível) e marca quais estão **ativas** (infundidas), cada ativa ligada
a um item do inventário (até um cap por nível). Sem auto-aplicação de efeitos
mecânicos: o painel mostra a descrição e o jogador aplica manualmente, como o
app já faz com features e magias.

## Decisões (do brainstorming)

1. **Profundidade = rastrear + descrição.** NÃO auto-aplicar efeitos no motor
   (as infusões variam de +1 numérico a utilidades narrativas). Mostra texto.
2. **Infusão ativa referencia um item real do inventário** (dropdown), não
   texto livre. Acopla os dois sistemas; exige o item cadastrado.
3. **Gerenciamento só na Ficha** (não no Wizard). Infusões conhecidas trocam a
   cada nível e as ativas a cada descanso longo, então o lar natural é a ficha.

## Componentes

### 1. Catálogo — `public/srd-data/tasha-infusions-pt.json`

Extraído do PDF (p18+) por um script novo em `scripts/tasha/`. Cada infusão:

```
{
  "index": "arma-aprimorada",
  "name": "Arma Aprimorada",
  "prereq": 2,                 // nível mínimo de Artífice (alguns são 6/10/14)
  "itemType": "arma",          // tipo de alvo (texto curto, do "Item:" do livro)
  "requiresAttunement": false,
  "desc": "<texto fiel do PDF>",
  "source": "tasha"
}
```

Mesclado pelo `SrdProvider` como dataset composto (mesmo mecanismo `COMPOSED`
generalizado na Fase A; estratégia array). Gateado pela fonte no consumo (só
aparece com Tasha ativo).

### 2. Caps por nível — `domain` (ex.: `artificerInfusions.js`)

Função pura `getInfusionCaps(artificerLevel)` → `{ known, active }`, conforme a
tabela "O Artífice" (verificado na Fase A):

| Nível Artífice | Conhecidas | Itens infundidos (ativas) |
|---|---|---|
| 1 | 0 | 0 |
| 2–5 | 4 | 2 |
| 6–9 | 6 | 3 |
| 10–13 | 8 | 4 |
| 14–17 | 10 | 5 |
| 18–20 | 12 | 6 |

(Em multiclasse, usa o nível NA classe Artífice, não o total.)

### 3. Schema — corpo da ficha

`combat.artificerInfusions = { known: string[], active: [{ infusion, itemId }] }`.
- `known`: índices de infusões aprendidas.
- `active`: pares (infusão conhecida → id de item do inventário).
- Default vazio; ausência (ficha legada / não-Artífice) = `{ known: [], active: [] }`.
- Bump de `SCHEMA_VERSION` + migração que materializa o default. Persiste pelo
  codec existente.

### 4. UI — painel "Infusões" na Ficha

Renderiza só quando o personagem é Artífice de nível ≥ 2. Duas seções:

- **Conhecidas:** lista as conhecidas com descrição + selo TCE. Botão "adicionar"
  abre o catálogo filtrado por (a) pré-requisito de nível ≤ nível de Artífice e
  (b) fonte ativa; adiciona até `caps.known`. Permite remover/trocar.
- **Ativas (Itens Infundidos):** para cada infusão conhecida, um controle pra
  atribuí-la a um item do inventário (dropdown dos `inventory.items`), até
  `caps.active`. Botão "limpar todas" (descanso longo re-atribui).

Respeita `readOnly` (ficha compartilhada). Persiste via o fluxo de update da
ficha (mesmo padrão dos outros updaters do `useCharacterContext`).

### 5. Bordas e integração

- Caps reagem ao nível; a UI **bloqueia exceder** (botão desabilitado no cap).
- **Sem auto-aplicação** de efeitos (decisão 1).
- **Referência órfã:** se um item referenciado por uma infusão ativa for
  removido do inventário, a referência é limpa automaticamente (a ativa volta a
  "não atribuída"). Tratado na leitura/normalização do painel.
- Pré-requisito de nível por infusão é respeitado tanto pra conhecer quanto pra
  ativar.

## Testes

- `getInfusionCaps` por faixa de nível (1/2/6/10/14/18) + multiclasse usa nível
  da classe Artífice.
- Schema do `tasha-infusions-pt.json` (campos, source=tasha, prereq numérico).
- Default `{ known: [], active: [] }` em ficha legada / não-Artífice.
- Painel: adicionar respeita cap e pré-requisito; atribuir ativa respeita cap;
  remover item do inventário limpa a referência órfã; readOnly não edita.
- Merge/gating: infusões só aparecem com a fonte Tasha ativa.

## Service worker

Bump `cacheName srd-data-vN` (novo `tasha-infusions-pt.json`).

## Fora de escopo (YAGNI / fases futuras)

- Auto-aplicar efeitos mecânicos das infusões (numéricos ou não).
- Gerenciar infusões no Wizard (criação) — só na Ficha.
- "Replicar Item Mágico" como mecânica especial (replica itens do DMG) — tratada
  como infusão descritiva comum por ora.
- Fase C do Artífice (teto de sintonia, Lampejo de Genialidade como recurso,
  Item de Armazenar Magia).

## Relacionado

- [[tasha-fontes]] — sub-projeto guarda-chuva.
- Spike: `docs/superpowers/notes/2026-06-23-artifice-spike.md` (infusões = net-new).
- Fase A: `docs/superpowers/plans/2026-06-24-artifice-fase-a.md`.

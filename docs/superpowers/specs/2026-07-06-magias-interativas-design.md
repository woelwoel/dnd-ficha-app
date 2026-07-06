# Magias Interativas — Sub-projeto A: Rolagem de Magias (Design)

**Data:** 2026-07-06
**Status:** Aprovado pelo dono (decisões via brainstorming nesta sessão)

## Objetivo

Tornar as magias da ficha roláveis com um clique, no estilo D&D Beyond: dano,
cura, ataque de magia e anúncio de CD, integrados ao pipeline de rolagem
existente (`roll()` → histórico + dados 3D), com escalonamento automático por
nível de slot (upcast) e por nível de personagem (truques).

## Decisões do dono

1. **Fatiamento:** dois sub-projetos. **A (este spec): rolagem de magias.**
   B (futuro, spec próprio): efeitos ativos na ficha (buffs tipo Bênção/
   Velocidade alterando CA/deslocamento/rolagens, com chips e expiração por
   concentração).
2. **Fluxo:** conjurar = gasta slot **e** rola tudo num clique só. Sem botão
   de re-rolagem avulsa (YAGNI; o painel de dados manual continua existindo).
3. **Extras incluídos no A:** cura aplicável aos PV + salvaguarda de
   concentração oferecida ao sofrer dano.
4. **Camada de dados:** gerador one-shot de rascunho + curadoria manual
   commitada. O JSON curado é a fonte da verdade.

## Contexto (estado atual)

- `Spells.jsx` (compartilhado v1/v2 via `MainBox` aba "Magias"): stats de
  conjuração (CD/ataque/atributo), trackers de slots regulares e Pact Magic,
  `SpellRow` com preparar/despreparar, concentração, detalhe e botão
  "Conjurar" que **só gasta o slot** (seletor "Conjurar em Nv X").
- **Lacuna existente:** o seletor de conjuração só oferece slots regulares —
  Bruxo puro não consegue usar o botão "Conjurar".
- Os JSONs de magia (`phb-spells-pt.json` 390 magias, `tasha-spells-pt.json`
  21) **não têm mecânica estruturada** — dano/salvaguarda/escalonamento estão
  na prosa em PT.
- Pipeline de rolagem pronto: `roll(notation, label, {mode, crit})` centraliza
  histórico + dados 3D; `AttackRollButton` já faz ataque→dano com crítico
  (nat 20 dobra dados, nat 1 para) e Shift/Alt = vantagem/desvantagem.
- PV: `rules.applyDamage(character, amount, opts)` e `applyHealing` são puros
  e retornam `{ character, sideEffects }`; expostos por `useCharacter`.
- Concentração: `character.combat.concentrating = { spellIndex, spellName }`.

## Arquitetura

### 1. Camada de dados — `public/srd-data/spell-mechanics-pt.json`

Mapa `index da magia → mecânica`. Schema:

```jsonc
{
  "_ignore": ["aumentar-reduzir"],        // magias com dado na prosa que
                                          // conscientemente NÃO rolam nada do
                                          // conjurador (ex.: +1d4 na arma do
                                          // ALVO é buff — sub-projeto B)
  "bola-de-fogo": {
    "save": { "ability": "des", "halfOnSuccess": true },
    "damage": [{ "dice": "8d6", "type": "fogo" }],
    "upcast": { "perSlot": "1d6" }
  },
  "raio-de-fogo": {
    "attack": true,
    "damage": [{ "dice": "1d10", "type": "fogo" }],
    "cantripScaling": true
  },
  "curar-ferimentos": {
    "heal": { "dice": "1d8", "addMod": true },
    "upcast": { "perSlot": "1d8" }
  },
  "misseis-magicos": {
    "damage": [{ "dice": "3d4+3", "type": "força" }],
    "upcast": { "perSlot": "1d4+1" }
  }
}
```

Semântica dos campos:

- `attack: true` — a conjuração começa com 1d20 + bônus de ataque mágico.
  Natural 20 → dano crítico (dados dobrados); natural 1 → para sem dano.
- `save: { ability, halfOnSuccess }` — sem rolagem de d20 do conjurador; o
  resultado anuncia "CD N · salvaguarda de XXX · metade no sucesso" (quando
  `halfOnSuccess`). `ability` usa as abreviações canônicas de
  `src/systems/dnd5e/domain/attributes.js`.
- `damage: [{ dice, type }]` — array para múltiplos pacotes (ex.: Golpe
  Flamejante: cortante + fogo). `type` validado contra a lista canônica de
  tipos de dano em PT.
- `heal: { dice, addMod }` — cura; `addMod` soma o mod de conjuração.
- `upcast: { perSlot }` — notação somada por nível de slot acima do nível da
  magia. Aplica ao **primeiro pacote** de `damage`, ou ao `heal` em magias de
  cura. (Nenhuma magia PHB/Tasha rolável precisa de upcast em pacote
  secundário; se surgir, estende-se o schema.)
- `cantripScaling: true` — quantidade de dados multiplica por 2/3/4 nos
  níveis de personagem 5/11/17 (regra padrão de truques).
- `beams: { base, perSlot?, cantripScaling? }` — magias de múltiplos
  projéteis com ataque INDIVIDUAL por raio (um d20 por raio; um raio pode
  critar e outro errar). Ex.: Raio Ardente `{ base: 3, perSlot: 1 }`;
  Rajada Mística `{ base: 1, cantripScaling: true }` (nº de raios segue o
  tier do truque). Exclusividade: `beams.cantripScaling` escala o Nº DE
  RAIOS (dados fixos por raio); o `cantripScaling` raiz escala os DADOS —
  uma magia usa um ou outro. Idem `beams.perSlot` vs `upcast.perSlot`.
- `attack`, `save`, `heal` e `damage` combinam livremente; magia pode ter só
  `damage` (Mísseis Mágicos), `attack`+`damage`, `save`+`damage`,
  `heal` puro etc.

**Cobertura:** só magias com dano ou cura direta do conjurador (~150–180 das
411). Magia sem entrada = comportamento atual (conjurar só gasta slot). Nunca
mostra dado errado — degrada com segurança.

### 2. Gerador + guard-rail — `scripts/gen-spell-mechanics.mjs`

- **Modo rascunho (one-shot):** parseia a prosa de todas as fontes de magia
  ("XdY de dano de Z", "teste de resistência de W", "metade desse dano",
  `higher_level` "aumenta em XdY", "recupera pontos de vida") e emite o
  rascunho do JSON com marcações de baixa confiança para auditoria. Roda uma
  vez; depois da curadoria manual o JSON é editado à mão (o script NÃO re-roda
  por cima — diferente do `gen-bridge.mjs`).
- **Modo `--check` (permanente):** varre todas as fontes de magia presentes em
  `public/srd-data/` e lista magias cuja prosa sugere dano/cura mas que não
  têm entrada no mechanics **nem** estão em `_ignore`. Um teste unitário roda
  esse check na suíte: fonte nova (ex.: Xanathar futuro) → teste falha
  listando as descobertas → curadoria em lote no mesmo PR.
- **Curadoria:** auditoria manual em lotes (por nível/escola) contra o PHB
  antes do merge. Erro de regra é inaceitável — valor central do projeto.

### 3. Domínio — `src/systems/dnd5e/domain/spellMechanics.js`

Função pura central:

```
spellRollPlan(spell, mechanics, {
  slotLevel,        // nível do slot escolhido (null para truque)
  characterLevel,   // nível TOTAL (multiclasse) para escalonar truque
  spellAttack,      // bônus de ataque mágico
  spellMod,         // mod de conjuração (para heal addMod)
  spellDC,          // CD de magia
}) → {
  steps: [          // executados em ordem pela UI via roll()
    { kind: 'attack',  notation: '1d20+7', label: 'Raio de Fogo · ataque' },
    { kind: 'damage',  notation: '2d10',   label: 'Raio de Fogo · dano',
      critable: true },
    { kind: 'heal',    notation: '1d8+3',  label: 'Curar Ferimentos · cura (Nv 1)' },
  ],
  announce: 'CD 15 · salvaguarda de DES · metade no sucesso' | null,
}
```

- Calcula upcast (base + perSlot × níveis acima) e escalonamento de truque.
- `critable` marca o passo de dano que dobra dados quando o ataque crita.
- Labels padronizados: `"<Nome> · dano (Nv N)"`, `"<Nome> · ataque"`,
  `"<Nome> · cura (Nv N)"`, `"<Nome> · dano CRÍTICO"`. Truque não exibe
  "(Nv N)".
- Carregamento do mechanics segue o padrão dos demais JSONs de
  `public/srd-data` (fetch cacheado pelo SrdProvider/fetch existente).

### 4. UI — fluxo de conjuração no `SpellRow`

- O seletor "Conjurar em: Nv X" continua; escolher o nível agora **gasta o
  slot e executa o plano** de `spellRollPlan`:
  - ataque → d20 primeiro (Shift/Alt no clique = vantagem/desvantagem, igual
    ao `AttackRollButton`); nat 1 para; nat 20 → passo de dano com
    `crit: true`;
  - salvaguarda → dano direto + anúncio da CD junto ao resultado (toast 3D e
    entrada do histórico);
  - cura → rola e mostra botão transiente **"✚ Aplicar N PV"** na linha da
    magia (~10s ou até clicar) → `applyHealing(N)`;
  - dano puro → rola direto.
- **Truques** ganham botão de rolar direto (sem slot), escalonado por
  `characterLevel`.
- **Pact Magic:** o seletor ganha o chip **"Pacto Nv X (n)"** quando houver
  pact slot disponível e o nível do pacto comportar a magia — gasta pact slot
  (`onSpendPactSlot`) e rola escalonado pro nível do pacto. Corrige a lacuna
  do Bruxo.
- Magia preparada sem mechanics: seletor atual sem rolagem (nada muda).
- O anúncio de CD aparece: no toast dos dados 3D (linha secundária) e na
  entrada do histórico do painel.

### 5. Salvaguarda de concentração ao sofrer dano

- `rules.applyDamage` passa a emitir sideEffect
  `{ type: 'concentrationCheck', dc }` quando `amount > 0` e
  `combat.concentrating` ativo. CD = `max(10, floor(dano/2))` (PHB p.203).
  Zero UI no domínio — regra pura, testável.
- **Shell v2 apenas** (v1 está a caminho da remoção): componente
  `ConcentrationCheckPrompt` renderizado onde os sideEffects de dano já são
  tratados (HeaderV2/SheetV2). Mostra "Teste de Concentração — CD N ·
  <magia>", botão rola `1d20 + salvaguarda de CON` (Shift = vantagem, caso
  War Caster), exibe sucesso/falha contra a CD e, na falha, destaca o botão
  "Romper concentração". **Não rompe sozinho** — a decisão é do jogador.
- Cobre os dois caminhos de dano do v2 (modal de dano e controles rápidos),
  porque o gancho é o sideEffect do `applyDamage`, não a UI de origem.

## Fora de escopo (explícito)

- **Sub-projeto B:** efeitos ativos na ficha (buffs alterando CA/deslocamento/
  rolagens, chips de efeito, expiração por concentração). O mechanics JSON é
  onde os dados de efeito serão plugados depois.
- Rolagem/conjuração na `PreparedSpellsList` (aba Combate) — continua
  navegando pra aba Magias via `focusSpellId`.
- Re-rolagem avulsa sem gastar slot (dano recorrente de concentração usa o
  painel de dados manual).
- Prompt de concentração no shell v1.
- Consumo de componentes materiais, custo de material, ritual casting.

## Testes

- **Validação do mechanics (unit):** varre o JSON inteiro — toda notação
  parseia no `parseAndRoll`, `ability` válido, `type` na lista canônica,
  entradas de `_ignore` existem nas fontes.
- **Guard-rail (unit):** roda o `--check` do gerador — magia rolável sem
  entrada e fora de `_ignore` = falha listando os índices.
- **`spellRollPlan` (unit):** upcast (Bola de Fogo Nv 5 → 10d6; Curar
  Ferimentos Nv 3 → 3d8+mod), truque nos níveis 1/5/11/17, crítico dobra só
  os dados, multi-pacote, labels.
- **SpellRow (component):** conjurar gasta o slot certo e chama `roll()` com
  as notações do plano (mock do roller); pact chip aparece/gasta pact slot;
  botão "Aplicar N PV" chama `applyHealing`; magia sem mechanics não rola.
- **Concentração (unit + component):** DC 10 vs metade (13 de dano → CD 10;
  22 → CD 11); sideEffect só quando concentrando; prompt rola CON e destaca
  Romper na falha.
- **E2E (1 caso determinístico):** conjurar Bola de Fogo no Nv 3 via stub →
  slot gasto + anúncio "CD ... DES" visível.
- **Gates:** suíte unit completa, e2e, build verdes.

## Operacional

- O mechanics vive em `public/srd-data/` → **bumpar `srd-data-vN`** no
  `vite.config.js` ao mudar (gotcha conhecido do service worker).
- Componentes novos usam classes `.v2-*`/vars `--v2-*` (nunca utilitários de
  cor Tailwind novos sem regenerar a ponte — `node scripts/gen-bridge.mjs`).

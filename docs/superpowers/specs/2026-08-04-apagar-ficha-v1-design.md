# Apagar a ficha v1 (FASE 5, etapa B)

**Data:** 2026-08-04
**Status:** aprovado, aguardando plano de implementação

## Problema

O redesign da ficha entregou a FASE 5 etapa A — o "soft cut", que fez do v2 o
layout padrão em produção com `?sheetV2=0` como escape hatch. A etapa B, apagar
o v1, ficou represada pelo período de observação: o dono jogando sessões reais
no v2 antes de queimar a ponte.

Esse período aconteceu. O v2 é o único layout que qualquer usuário vê por
padrão há semanas, atravessou os painéis de Runas, Manobras de Tasha, efeitos
ativos e as correções de lista de magia. Manter o v1 agora custa: dois caminhos
de render pra testar, um e2e escrito de propósito contra o layout legado, e um
flag persistente em `localStorage` que pode prender um usuário num layout que
ninguém mais mantém.

O gatilho é o D&D 2024. O projeto vai ganhar um eixo novo de variação
(`ruleset`), e cada eixo multiplica a matriz de teste. Entrar no 2024 com dois
layouts vivos significa quatro combinações; entrar com um significa duas.

## O que o levantamento mostrou

O v1 é menor do que aparenta. Do grafo de imports a partir de `SheetHeader`,
`SheetTabs` e `SheetContent`, só **10 arquivos** são alcançados exclusivamente
por ele. Os outros **99** — `Attacks`, `Spells`, `FeaturesTab`,
`LevelProgression`, todos os painéis de classe, o domínio inteiro — são
compartilhados com o v2 e não se movem.

Mas o corte não é limpo. Três acoplamentos reais:

1. **`ImportErrorBanner` mora dentro do `SheetTabs.jsx` e o v2 consome**
   (`CharacterSheet.jsx:303` e `:305`, no ramo do v2). Apagar `SheetTabs.jsx`
   inteiro quebra o v2.

2. **A navegação para magias no v2 funciona por acidente.** O handler em
   `CharacterSheet.jsx:269` tem dois canais: `setFocusSpellId(spellId)` quando
   recebe argumento, e `setActiveTab('magias')` sempre. O v2 só lê o primeiro
   (`MainBox.jsx:62`) — nenhum componente dele lê `activeTab`.

   `FusedSpellSlots.jsx:10` usa `onClick={onNavigateToSpells}` sem arrow
   function, então o React passa o **SyntheticEvent** como `spellId`. Como o
   evento é truthy, `setFocusSpellId(event)` roda e o efeito do `MainBox` salta
   pra aba Magias. Depois `Spells.jsx:147` procura uma magia com `id === event`,
   não acha nenhuma, e limpa o sinal. O botão funciona — mas só porque um objeto
   de evento está sendo guardado num estado chamado `focusSpellId` e comparado
   contra ids de magia.

   O único chamador que dependia mesmo do `setActiveTab` é
   `PreparedSpellsList.jsx:77` (`onNavigateToSpells()` sem argumento), e esse
   arquivo é exclusivo do v1. Ao remover o `setActiveTab`, o acidente vira o
   único mecanismo de navegação — daí ele precisa ser substituído por um sinal
   explícito nesta mesma mudança.

3. **`portrait.spec.js:21` roda contra o v1 de propósito**, com `?sheetV2=0` e um
   comentário dizendo "reescrito p/ v2 na etapa B". E `a11y.spec.js:63` roda a
   ficha nos dois layouts em loop.

Além disso: `AttributeBox.test.jsx` cobre o teto de atributo 1–30 e morre junto
com o componente. O v2 tem o mesmo clamp em `AbilityStrip.jsx:136`, **sem
teste**.

E existem 4 worktrees em `.claude/worktrees/`, um deles segurando
`claude/relaxed-haibt-0621e7` — o git recusa apagar uma branch com worktree
ativo.

## Solução

Corte cirúrgico num PR só, em commits separados por natureza: primeiro os
preparos que o v2 precisa, depois a remoção, depois a limpeza de repo.

### Decisão de abordagem

Descartadas duas alternativas:

- **Duas etapas com observação** (remover o flag, deployar, esperar, depois
  apagar os arquivos): o período de observação que isso compraria já foi pago
  pela etapa A. Seria observar de novo o que já foi observado.
- **Corte + dissolver o wrapper `CharacterSheet.jsx`**: o wrapper não existe só
  pra bifurcar. Ele faz carregamento assíncrono, gate de acesso
  dono/DM/admin (`sheet-access.js`), autosave, realtime e monta o
  `CharacterProvider`. Dissolver isso é outra refatoração, e misturá-la com uma
  remoção esconderia uma regressão de permissão no meio do diff.

### Preparos (antes de apagar nada)

**Extrair o `ImportErrorBanner`.** Sai de `SheetTabs.jsx` para
`CharacterSheet/ImportErrorBanner.jsx`. `NavBlockedBanner` e `TABS` ficam onde
estão — morrem com o arquivo.

**Portar a asserção do teto 1–30** para `sheetV2-AbilityStrip-edit.test.jsx`,
enquanto o `AttributeBox.test.jsx` ainda existe para comparar.

**Reescrever os dois e2e acoplados ao flag** (detalhe na seção Testes). Como o
v2 já é o padrão, os dois passam a valer antes mesmo de o v1 sumir.

### Remoção

Apagar:

```
src/systems/dnd5e/components/CharacterSheet/SheetHeader.jsx
src/systems/dnd5e/components/CharacterSheet/SheetTabs.jsx
src/systems/dnd5e/components/CharacterSheet/SheetContent.jsx
src/systems/dnd5e/components/CharacterSheet/SheetCombatBar.jsx
src/systems/dnd5e/components/CharacterSheet/AttributesSection.jsx
src/systems/dnd5e/components/CharacterSheet/AttributeBox.jsx
src/systems/dnd5e/components/CharacterSheet/CombatStats.jsx
src/systems/dnd5e/components/CharacterSheet/SkillsList.jsx
src/systems/dnd5e/components/CharacterSheet/PreparedSpellsList.jsx
src/systems/dnd5e/components/CharacterSheet/v2/flag.js
src/components/Tooltip.jsx
src/test/AttributeBox.test.jsx
src/test/CombatStats-damage.test.jsx
src/test/sheetV2-flag.test.js
```

`Tooltip.jsx` só era importado por `AttributeBox` e `SkillsList`.

**`CharacterSheet.jsx` encolhe.** Some o ternário `sheetV2 ? … : …` e o ramo
inteiro do v1 (~90 linhas de JSX): o `SheetV2` passa a ser renderizado direto
dentro do `CharacterProvider`. Somem também:

- o `useState` do `sheetV2` e o import de `isSheetV2Enabled`
- `activeTab` / `setActiveTab` — o v2 tem estado de aba próprio no `MainBox`
- `navBlocked` / `setNavBlocked` e a função `handleTabChange`
- o objeto `quickStats`, que existia só para o modo legado do `SheetHeader`

`useTabValidation` **fica**, porque o `HeaderV2` lê `fichaErrors`. Mas encolhe
para só `getTabErrors` — `markTouched`, `hasErrors` e `focusFirstError` só
serviam ao gate de troca de aba do v1. Se depois disso o hook ficar com código
inalcançável, ele também é podado.

**O escape hatch some por completo.** Vão embora o `flag.js` e todo o código que
lê o parâmetro `?sheetV2=` ou a chave `sheetV2Off`. A chave em si continua no
`localStorage` de quem já a gravou — vira lixo inerte que ninguém mais lê, e não
vale código de limpeza. Não há aviso nem migração: quem estiver com o opt-out
ligado abre no v2 na próxima carga. Decisão consciente do dono — ninguém
conhecido usa o opt-out, e um banner de aviso seria código morto novo para
substituir código morto velho.

**Não se toca em:** `CharacterView.jsx`, `PrintView`, `PrintPreviewModal`,
`sheet-access.js`, `useSheetHandlers.js`, `CharacterContext.jsx` e os 99
arquivos compartilhados.

### Depois da remoção

**Tornar explícito o sinal de navegação para magias.** Vem depois e não antes de
propósito: enquanto o v1 existe, `SheetContent` e `PreparedSpellsList` também
consomem o `focusSpellId`, e mudar o contrato do contexto obrigaria a tocar em
dois arquivos que estão prestes a ser apagados. Com o v1 fora, o `MainBox` é o
único leitor.

O `focusSpellId` vira `spellNav = { nonce, spellId }`:

- `CharacterSheet.jsx` — `onNavigateToSpells(spellId)` incrementa sempre o
  `nonce` e grava o `spellId`, **normalizando** o argumento: se não for string
  nem número, vira `null`. É isso que impede um `SyntheticEvent` de entrar no
  lugar de um id.
- `MainBox.jsx:62` — o efeito passa a reagir à mudança de `nonce` em vez de
  `focusSpellId`, e salta para a aba Magias sempre que ele muda.
- `Spells.jsx:146` — continua focando a magia só quando `spellId` não é nulo.
  Nenhuma mudança de comportamento aqui.
- `FusedSpellSlots.jsx:10` — `onClick={onNavigateToSpells}` vira
  `onClick={() => onNavigateToSpells()}`, para parar de mandar o evento.

Com isso a troca de aba deixa de depender de um objeto de evento ser truthy, e
os dois caminhos (com e sem magia específica) passam a funcionar por desenho.

### Testes

Reescritos:

- **`portrait.spec.js`** — sai o `?sheetV2=0` e o "expandir a seção Identidade";
  entra o clique no botão "Editar retrato" do `HeaderV2`
  (`HeaderV2.jsx:314`). O `input[type=file][accept="image/*"]` e o
  `img[alt="Retrato"]` continuam existindo no v2, então as asserções de
  compressão (`data:image/(webp|jpeg)`, `< 60_000`) não mudam.
- **`a11y.spec.js`** — o loop de dois layouts colapsa numa passada só.

Testes novos, cobrindo o `spellNav` no `MainBox`:

- Um `nonce` novo **sem** `spellId` troca a aba para Magias. É o caminho que
  hoje só funciona porque um evento é truthy.
- Um `nonce` novo **com** `spellId` troca a aba e repassa o id adiante.

Sem esses dois, a normalização do argumento pode ser desfeita sem nada ficar
vermelho.

### Limpeza de repo

Commit separado, sem tocar em código de aplicação.

- Remover os 4 worktrees de `.claude/worktrees/` (`eager-poincare-6d137e`,
  `naughty-kalam-b9eac8`, `optimistic-hoover-cc4864`, `relaxed-haibt-0621e7`).
  Três estão em HEAD destacado; o quarto precisa sair antes da branch dele poder
  ser apagada.
- Apagar as **28 branches mergeadas na master**, local e remoto.
- Levantar a tabela das **15 não mergeadas** — commits à frente da master, o que
  fazem, se ainda aplicam — e apresentar ao dono para decisão caso a caso.
  Nenhuma delas é apagada sem aprovação explícita. `feat/magias-talento-p2`
  (plano 2 das magias de talento) é sabidamente trabalho real que nunca
  aterrissou.

## Verificação

- Suíte de testes em fatias com `--maxWorkers=2`. A suíte cheia sem flags
  estoura a memória da máquina e produz falhas aleatórias em arquivos sem
  relação.
- `npm run build` — pega import órfão que o teste não pega.
- Os e2e de ficha: `portrait`, `a11y`, `smoke`, `persistence`, `spell-cast`,
  `level-up`.
- Passada visual no v2 pelo Browser pane com a sessão falsa (sem login):
  header, retrato, painel de progressão, o botão dos espaços fundidos e a
  navegação de abas no desktop e no mobile.
- Grep final por `sheetV2`, `SheetTabs`, `SheetContent`, `sheetV2Off` no
  `src/` e no `e2e-pw/` — o resultado esperado é vazio fora dos nomes de teste
  do próprio v2.

## Fora de escopo

- Dissolver o wrapper `CharacterSheet.jsx`.
- Matar a ponte CSS gerada (`gen-bridge.mjs`) e o tema `?theme=parchment`. É o
  sub-projeto 3 do visual v2 e não depende disto.
- Podar o débito de lint (~611 erros pré-existentes, não gateados).
- Qualquer trabalho de D&D 2024.

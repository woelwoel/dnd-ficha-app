# Redesign do CharacterWizard — Design Doc

**Data:** 2026-05-15
**Branch:** `claude/naughty-kalam-b9eac8`
**Base:** worktree alinhada com `claude/brave-mendeleev-23aca1` (redesign da CharacterList já em `master`)

## Contexto

O `CharacterWizard` atual é um fluxo linear de 9 passos com um shell de sidebar + card central no estilo pergaminho. Funciona, mas acumulou problemas:

- **`Step3Class.jsx` tem 1217 linhas** — empilha escolha de classe, subclasse, equipamento, ASI/feats num único arquivo gigantesco.
- **Ordem dos passos é incoerente** com a dependência real entre eles (ex: equipamento dentro de Classe é calculado sem saber o Antecedente que vem depois).
- **Multiclasse não tem UI** — a flag `allowMulticlass` existe em settings, mas o usuário não consegue de fato montar uma multiclasse.
- **Estética desatualizada** vs o redesign recente da CharacterList (que foi quebrada em 7 arquivos pequenos com mapa interativo).
- **Fluxo linear engessado** — não há como pular pra um bloco específico ou ver o estado geral da ficha em construção.

Este redesign é abrangente: identidade visual + arquitetura de código + estrutura de UX + funcionalidades novas (multiclasse, feats, nível inicial >1, validação cruzada).

## Princípios de design

1. **Híbrido por padrão** — funciona pro novato (ordem visual sugerida, descrições inline) e pro experiente (livre pra pular pra qualquer bloco).
2. **Não-linear** — ficha em construção sempre visível como grid; usuário escolhe a ordem.
3. **Arquivos pequenos** — cada arquivo do V2 fica abaixo de 200 linhas; o monstro do `Step3Class` é dissecado em 5 arquivos focados.
4. **Compatibilidade de saída** — o personagem persistido pelo V2 tem **exatamente o mesmo shape** do produzido pelo wizard antigo. Snapshot test garante paridade.
5. **Storage abstraído** — nenhum componente do wizard fala com `localStorage`/API direto; tudo via `utils/storage.js` (preparado pra login futuro sem alterações no wizard).
6. **Convivência por feature flag** — V2 é construído em paralelo ao wizard antigo, sem risco pro app durante o desenvolvimento.

## Decisões tomadas no brainstorm

| Tópico | Decisão |
|---|---|
| Público-alvo | Híbrido (novato + experiente) |
| Estrutura de fluxo | Checklist não-linear (grid de cards) |
| Layout do shell | Grid de cards de pergaminho, todos visíveis simultaneamente |
| Configuração da Campanha | Modal upfront, antes do wizard |
| Multiclasse | Modal dedicado, acessado a partir do bloco Classe |
| Equipamento | Mantido junto com Classe (não vira bloco separado) |
| Ordem visual recomendada | Raça → Classe → Antecedente → Atributos → Perícias → (Magias) → Conceito → Revisão |
| Shape do personagem | Preservado (`class`/`level`/`chosenFeatures` no raiz + `multiclasses[]`) |
| Estratégia de execução | Build paralelo com feature flag (`?v2=1` ou `localStorage.wizardV2`) |
| Mobile | Sem foco no momento; layout colapsa em 1 coluna |

## Arquitetura

### Estrutura de arquivos

```
src/components/CharacterWizardV2/
├── CharacterWizardV2.jsx          // shell: grid + estado do draft (~150 linhas)
├── CampaignSetupModal.jsx          // modal upfront (settings) (~100 linhas)
├── MulticlassModal.jsx             // modal de multiclasse (~180 linhas)
├── BlockCard.jsx                   // card único do grid (status + resumo) (~80 linhas)
├── BlockEditorModal.jsx            // modal genérico que envolve o editor de um bloco (~80 linhas)
├── blocks/
│   ├── RaceBlock.jsx               // (~180 linhas)
│   ├── ClassBlock/
│   │   ├── ClassBlock.jsx           // composição (~80 linhas)
│   │   ├── ClassPicker.jsx          // escolher classe + nível (~120 linhas)
│   │   ├── SubclassChoice.jsx       // subclasse + chosenFeatures (~150 linhas)
│   │   ├── ClassEquipment.jsx       // equipamento, considerando antecedente (~150 linhas)
│   │   └── ClassASI.jsx             // ASI/feats por nível (~150 linhas)
│   ├── BackgroundBlock.jsx         // (~120 linhas)
│   ├── AttributesBlock.jsx         // (~180 linhas)
│   ├── SkillsBlock.jsx             // (~100 linhas)
│   ├── SpellsBlock.jsx             // (~180 linhas)
│   ├── ConceptBlock.jsx            // (~80 linhas)
│   └── ReviewBlock.jsx             // (~120 linhas)
├── hooks/
│   ├── useDraft.js                 // estado central + autosave em sessionStorage
│   └── useBlockStatus.js           // computa vazio/parcial/completo/bloqueado por bloco
└── index.js
```

### Feature flag

- Em `App.jsx` (ou onde `CharacterWizard` é renderizado), checar:
  ```js
  const useV2 = new URLSearchParams(location.search).get('v2') === '1'
              || localStorage.getItem('wizardV2') === 'true'
  ```
- Se `useV2`, renderiza `CharacterWizardV2`; caso contrário, `CharacterWizard` antigo.
- Toggle manual via `?v2=1` na URL (sem UI dedicada — é só pra desenvolvimento).

## Estado e fluxo de dados

### Shape do draft

O draft mantém o **mesmo formato** do `INITIAL_DRAFT` atual (CharacterWizard.jsx linhas 17-37). Sem mudanças de schema — o redesign é puramente UX/arquitetural.

```js
{
  settings: { abilityScoreMethod, allowFeats, allowMulticlass, startLevel },
  name, playerName, alignment, appearance,
  race, subrace, racialBonuses, racialAbilityChoices,
  racialSkills, draconicAncestry, racialCantrip,
  class: '', level: 1, chosenFeatures: {}, savingThrows: [],
  asiChoices: {},
  multiclasses: [],   // {index, level, subclass, chosenFeatures, asiChoices, ...}
  spellcastingAbility: null, hitDice: '1d8',
  background: '', backgroundSkills: [], backgroundItems: [], backgroundGold: 0,
  classEquipmentChoice, classEquipmentChoices, classEquipmentPicks, classStartingGold,
  baseAttributes: { str, dex, con, int, wis, cha },
  rolledScores: [],
  chosenSkills: [],
  spells: [], bonusSpells: [],
}
```

**Único campo novo:** `settings.startLevel` (inteiro, default 1) para suportar criação direta em nível >1.

### Status computado por bloco (`useBlockStatus.js`)

Função pura `getBlockStatus(blockId, draft, srdData)` retorna:

```js
{
  status: 'vazio' | 'parcial' | 'completo' | 'bloqueado',
  missing: string[],              // lista do que falta (vazio se completo)
  blockedBy: string[],            // ids dos blocos bloqueadores (vazio se não bloqueado)
}
```

Regras por bloco:
- **race**: completo se `draft.race` preenchido + escolhas raciais resolvidas (cantrip, ancestralidade dracônica etc. quando aplicável).
- **class**: completo se `draft.class` + subclasse (no nível certo) + `chosenFeatures` resolvidas + ASI/feats até o nível atual + equipamento escolhido.
- **background**: completo se `draft.background` preenchido + perícias do antecedente confirmadas.
- **attributes**: completo se 6 atributos atribuídos pelo método selecionado em settings; **bloqueado** se `race` vazio (não dá pra mostrar bônus raciais).
- **skills**: completo se total de perícias = (classe + escolhas extras) sem duplicatas com antecedente; **bloqueado** se `class` ou `background` vazios.
- **spells**: oculto/auto-completo se classe não-conjuradora; senão completo se truques + magias preparadas atendem o nível.
- **concept**: completo se `name` preenchido (resto é opcional).
- **review**: completo se todos os outros estão completos.

### Autosave

- `useDraft` salva o draft em `sessionStorage` (chave `wizard-v2-draft`) a cada mudança, com debounce de 500ms.
- Ao montar `CharacterWizardV2`: se há draft salvo, modal pequeno pergunta "Continuar personagem em construção?" / "Começar novo".
- Ao finalizar (`buildCharacter` + `upsertCharacter`): `sessionStorage` é limpo.
- Ao cancelar com mudanças: modal "Descartar progresso?" / "Salvar e sair" (último mantém em sessionStorage).

### Validação cruzada

- **Multiclasse:** `MulticlassModal` lê `draft.baseAttributes` e checa pré-requisitos via `phb-multiclass-pt.json` antes de adicionar; se atributos não atendem, botão "Adicionar" desabilitado com mensagem.
- **Atributos:** se já existe multiclasse configurada e `baseAttributes` não atende mais, badge de aviso no card (status fica `parcial`).
- **Equipamento:** `ClassEquipment` lê `draft.background` pra somar `backgroundGold` ao gold inicial e listar `backgroundItems` na lista de itens.

## Fluxo do usuário

### Entrada

1. Usuário clica "Criar Personagem" na CharacterList.
2. Abre `CampaignSetupModal` com 4 perguntas (método de atributos, feats sim/não, multiclasse sim/não, nível inicial).
3. Botão "Começar" fecha o modal e abre `CharacterWizardV2`.
4. **Re-editar settings:** botão discreto "⚙ campanha" no header do wizard reabre o `CampaignSetupModal`. Mudar o método de atributos depois de já ter atribuído valores zera `baseAttributes` e `rolledScores` (modal avisa antes); demais flags podem mudar livremente.

### Tela principal (grid)

- **Header:** botão "← Personagens" | título "Forjar Herói" | botão "✦ Inscrever Herói ✦" (só destrava quando `review` está completo).
- **Grid** de 7 ou 8 cards (Magias só aparece pra classe conjuradora). Layout: `repeat(auto-fit, minmax(180px, 1fr))`. Em desktop fica 4×2 (sem Magias) ou 4×2 + 1 órfão na 3ª linha (com Magias); em tablet 2 colunas; em mobile 1 coluna.
- Ordem visual = ordem recomendada (Raça primeiro, Revisão último).

### `BlockCard`

Cada card mostra:
- **Label** do bloco (RAÇA, CLASSE, …) em uppercase pergaminho.
- **Status badge:** ✓ verde (completo) / ● amarelo (parcial) / ○ cinza (vazio) / 🔒 com tooltip (bloqueado).
- **Resumo:** texto curto do que está preenchido (ex: "Meio-elfo", "Guerreiro 3 (Campeão)", "8 perícias") ou "preencher..." em itálico se vazio.
- **Hover:** elevação leve + cursor pointer.
- **Bloqueado:** opacidade reduzida + tooltip "Preencha [X] primeiro" + clique não abre modal.

### `BlockEditorModal`

- Overlay full-screen em mobile, modal centralizado em desktop.
- Conteúdo = o componente `<RaceBlock />`, `<ClassBlock />`, etc. correspondente.
- Mudanças aplicadas no draft em tempo real (não há "confirmar" — fechar = salvar).
- Botões no rodapé: "Limpar" (volta o bloco pro estado vazio) e "Fechar".
- Fecha com Esc, clique fora, ou botão "Fechar".

### `MulticlassModal`

- Acessado a partir do botão "+ Adicionar classe" dentro do `ClassBlock` (só visível se `settings.allowMulticlass`).
- Conteúdo:
  - Select de classe (exclui as já presentes em `class`/`multiclasses[]`).
  - Input de nível (1 por padrão).
  - Lista de pré-requisitos da classe escolhida vs `baseAttributes` (✓/✗).
  - Lista de proficiências que serão ganhas (informativo).
  - Botão "Adicionar" (desabilitado se pré-requisitos não atendidos) e "Cancelar".
- Confirmar adiciona em `draft.multiclasses[]`. Ícone 🗑 em cada classe extra dentro do `ClassBlock` pra remover.

### Finalizar

- Botão "✦ Inscrever Herói ✦" no header só clicável se `review` está completo.
- Clica → `buildCharacter(draft)` → `upsertCharacter(character)` → fecha wizard → volta pra CharacterList já com o novo herói.

### Cancelar

- Botão "← Personagens" no header. Se draft tem mudanças, modal "Descartar progresso?" / "Salvar e sair".

## Estética

Reusa a identidade visual da CharacterList redesenhada:
- Paleta `parchment-*` / `ink-*` (Tailwind tokens já definidos em `App.css`).
- Tipografia: `font-display` em títulos/labels uppercase com `tracking-widest`, fonte serif default no corpo, `ink-italic` em hints.
- Bordas `border-2 border-parchment-600` com `box-shadow: var(--shadow-parchment)`.
- Cantos `rounded-sm` (não totalmente quadrados, levemente arredondados).
- Animações sutis (`transition-colors duration-150`).

## Testes e validação

### Unit tests

- **`useBlockStatus.js`:** pra cada bloco, casos vazio/parcial/completo/bloqueado. Inclui combinações cruzadas (Magias com classe não-conjuradora, Atributos sem Raça etc.).
- **Pré-requisitos de multiclasse:** função pura testada com várias combos atributo×classe usando dados de `phb-multiclass-pt.json`.
- **`buildCharacter`:** snapshot test garante paridade — mesmo input passado pelo V2 produz o **exato** mesmo personagem que o wizard antigo produziria.

### E2E (Playwright)

Seguindo o padrão dos testes do redesign da CharacterList:
- **Fluxo feliz single-class:** abrir modal de campanha → entrar no grid → preencher cada bloco em ordem → finalizar → ver novo personagem na CharacterList.
- **Fluxo multiclasse:** criar Guerreiro 3 → adicionar Mago 2 via modal → confirmar proficiências e nível total na revisão.
- **Autosave:** começar preenchimento → fechar wizard sem finalizar → reabrir → modal "Continuar?" → estado restaurado.
- **Bloqueios:** tentar abrir Atributos sem Raça → tooltip + clique não abre modal.
- **Feature flag:** `?v2=1` mostra V2; sem flag mostra wizard antigo (zero regressão no fluxo antigo).

### Critérios para flipar o flag (V2 vira default)

1. Todos os blocos (7-8 dependendo de conjuração) implementados e cobertos por unit + E2E.
2. Snapshot test garante paridade de output com wizard antigo.
3. Multiclasse, feats e `startLevel > 1` funcionando E2E.
4. Você usa manualmente por uma sessão de criação completa sem topar com bug.

### Pós-flip

- Remover wizard antigo: `CharacterWizard.jsx` + `steps/Step0…Step8.jsx`.
- Remover feature flag.
- (Há memória registrada pra esse cleanup: `project_wizard_v2_cleanup.md`.)

## Entregáveis incrementais (PRs sugeridos)

1. Shell + grid + `CampaignSetupModal` + feature flag (blocos como placeholders sem funcionalidade).
2. `RaceBlock` + `ConceptBlock` (mais simples, valida o padrão de bloco).
3. `ClassBlock` (refatoração do `Step3Class` quebrada em 5 sub-arquivos), single-class apenas, com equipamento integrado.
4. `BackgroundBlock` + `AttributesBlock` + `SkillsBlock`.
5. `SpellsBlock` + `ReviewBlock` + finalize (`buildCharacter` + `upsertCharacter`).
6. `MulticlassModal` + suporte a `multiclasses[]` no `ClassBlock`.
7. Feats no ASI + suporte a `startLevel > 1` + validação cruzada (badges de aviso).

Cada PR é um incremento navegável e revisável; o app não quebra em momento algum.

## Não-objetivos (fora de escopo)

- **Refactor da `CharacterSheet` ou `LevelProgression.jsx`** — ficam intocados. O monstro de 1262 linhas do LevelProgression merece seu próprio brainstorm/redesign separado.
- **Refactor do shape persistido** (mover `class`/`level` pra dentro de `classes[]`) — over-engineering pra este escopo; deixar pra um trabalho futuro que mexa wizard + ficha juntos.
- **UI específica de mobile** — layout suporta colapso pra 1 coluna, mas otimizações dedicadas ficam pra depois.
- **Login de usuário e sincronização multi-device** — projeto futuro; este redesign mantém storage abstraído pra não bloquear.
- **Conteúdo novo** (mais classes/raças/feats além do PHB já cadastrado) — fora do redesign.

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Snapshot test falhar (V2 produz personagem ligeiramente diferente do antigo) | `buildCharacter` deve ser função compartilhada; V2 só monta o draft, conversão é a mesma |
| Esquecer de remover wizard antigo após flip | Memória `project_wizard_v2_cleanup.md` registrada |
| `Step3Class` ter lógica acoplada que escapa na refatoração | Quebrar em sub-arquivos um a um, com unit test pra cada peça |
| Modal de multiclasse não cobrir todos os casos do PHB | Usar `phb-multiclass-pt.json` como fonte única; testes cobrem combos extremos (paladino exige FOR e CAR ≥13 etc.) |

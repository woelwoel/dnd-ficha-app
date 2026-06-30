# Features de subclasse por nível + rastreadores automáticos

**Data:** 2026-06-30
**Branch:** multi-sistema-fronteira
**Status:** aprovado (aguardando revisão do spec)

## Problema

As features de subclasse (PHB e Tasha) vivem como um **blob de texto** na `desc` da
opção de subclasse escolhida, com a estrutura `• Nv N — Nome: descrição`. Hoje a
ficha ([FeaturesTab.jsx](../../../src/systems/dnd5e/components/CharacterSheet/FeaturesTab.jsx))
mostra esse blob como **um único card** no nível de seleção (via `resolveChosenFeature`),
e esconde os placeholders genéricos de nível alto ("Característica da Tradição Arcana"
nos nv 6/10/14). Disso vêm três lacunas:

1. **Rastreadores ausentes.** `defaultClassFeatureUses` ([rules.js:781](../../../src/systems/dnd5e/domain/rules.js))
   é hardcoded e cobre só ~7 features de subclasse. Praticamente todas as ~25 subclasses
   de Tasha e vários domínios/patronos do PHB com usos limitados ficam **sem contador**.
2. **Descoberta por nível fraca.** Tudo cai num card só no nível de seleção; ao subir
   pro nv 6/10/14 nada "novo" surge — a feature recém-desbloqueada está enterrada.
3. **Ações de subclasse não vão pra aba Combate.** O card-blob herda a tag do "escolher
   subclasse" (não-combate), então ações/reações de subclasse não aparecem como ações
   próprias na aba Combate.

**Fato habilitador:** o formato `• Nv N —` é **100% consistente** nas 70 opções de
subclasse (40 PHB + 30 Tasha). Um parser é confiável e dispensa migração de dados.

## Decisões tomadas (brainstorming)

- **Exibição:** cards individuais por nível (some o card-blob).
- **Rastreadores:** auto-detecção só de padrões de **alta confiança**; o resto fica só-texto.
- **Lógica no domínio** (não na UI), pra trackers entrarem no sistema de persistência/recarga existente.
- **Escopo:** todas as ~70 subclasses (PHB + Tasha) — formato idêntico, problema idêntico.

## Arquitetura

### Novo módulo `domain/subclassFeatures.js` (puro, testado)

```
parseSubclassFeatures(optionDesc) → { summary, features }
```
- Divide a `desc` nos bullets `• Nv N — …`. Cada bullet vira `{ level, name, desc }`.
- **Regra de nível:** captura o inteiro após `Nv`/`Nível` antes do travessão (`—`/`-`/`–`).
- **Regra de nome:** se o texto após o travessão tiver um `Nome: resto` com `Nome` curto
  (≤ ~40 chars, sem ponto final no meio → formato PHB limpo, ex. "Evocador Atento"),
  `name = Nome` e `desc = resto`. Caso contrário (bullets densos de Tasha que juntam
  várias habilidades), `name = "<rótulo da subclasse> (Nv N)"` e `desc =` bullet inteiro.
- **`summary`:** o texto antes de `Features por nível:` (flavor da subclasse). Pode ser
  exibido como card-resumo no nível de seleção ou omitido (ver Integração).
- Múltiplos bullets no mesmo nível → múltiplos cards naquele nível (ex.: Evocação tem 2 no nv 2).

```
detectFeatureUses(text, { attributes, profBonus }) → { max, recharge } | null
```
Só padrões de **alta confiança** (sem parse de número solto, pra não inventar máximo errado):
- `Usos = bônus de proficiência` / `igual ao(à) (seu )?bônus de proficiência` → `max = profBonus`, `recharge = 'long'` (default; ver abaixo).
- `1×/desc(anso)? curto` ou `descanso curto ou longo` → `max = 1`, `recharge = 'short'`.
- `1×/desc(anso)? longo` / `uma vez … descanso longo` → `max = 1`, `recharge = 'long'`.
- `(igual ao )?mod(ificador)? de (Carisma|Sabedoria|…)` / `<ATR> mod` → `max = max(1, modDoAtributo)`, `recharge = 'long'` (default).
- **Recharge quando o texto traz "bônus de proficiência" + "descanso curto/longo":** usar o descanso citado; senão `'long'`.
- Sem match → `null` (feature só-texto, sem tracker).

```
getSubclassFeatureCards(classIndex, chosenFeatures, classChoices, level) → [card]
```
- Acha a(s) escolha(s) de subclasse da classe e a opção escolhida; parseia; filtra
  `feature.level ≤ level`; devolve cards `{ id, name, desc, level, source }`.
- `id` estável e único: `"<classIndex>-sub-<subclassValue>-<level>-<slug(name)>"`.
- `source` = `"<Nome da classe> · <rótulo da subclasse>"` (ex.: "Mago · Evocação").

### Integração (3 pontos)

**1. FeaturesTab** — substitui o card-blob de subclasse:
- Onde hoje `resolveChosenFeature` devolve o blob da subclasse, passa a chamar
  `getSubclassFeatureCards` e emitir **um card por feature/nível**.
- Cada card roda pela heurística de combate existente (`detectActionType`/`combatTier`/
  `actionTypeOf`), igual aos traços raciais → **ações de subclasse vão pra aba Combate**
  (resolve Gap 3 sem trabalho extra).
- `resolveChosenFeature` continua existindo para choices NÃO-subclasse com `featureName`
  (se houver). A detecção "é subclasse?" = o choice cujo `id` está no conjunto de ids de
  subclasse (primal_path, arcane_tradition, patron, artificer_specialization, etc.).
- **Anti-duplo-render:** a feature da progressão que representa a *seleção* da subclasse
  (cujo `name` == `featureName` de um choice de subclasse, ex.: "Tradição Arcana") **não**
  é emitida como card próprio pelo caminho antigo — seu conteúdo é 100% substituído pelos
  cards parseados. Na prática: ao montar `classFeatures`, pular a feature cujo nome casa um
  choice de subclasse, e injetar os cards de `getSubclassFeatureCards` no lugar.
- Multiclasse: mesmo tratamento por `mc.class`/`mc.level`.

**2. `defaultClassFeatureUses`** (rules.js) — passa a também emitir trackers das features
de subclasse parseadas:
- Para cada classe (primária + multiclasses, que já são iteradas), pega os cards de
  subclasse via o módulo novo, roda `detectFeatureUses` em cada, e empurra um tracker
  `{ id, name, max, used:0, recharge, source }` para os que retornarem não-`null`.
- `id` do tracker = **mesmo id do card** (pra `FeaturesTab` casar `featureUses.find(u => u.id === f.id)`).
- Entra no `mergeFeatureUses`/`syncClassFeatureUses` existente → persiste `used` e recarrega no rest.

**3. Placeholders genéricos** de nível alto continuam escondidos (o conteúdo real agora
vem dos cards parseados; nada muda nessa parte).

## Fluxo de dados

```
option.desc (blob "• Nv N —")
   └─ parseSubclassFeatures → [{level,name,desc}]
        ├─ FeaturesTab: getSubclassFeatureCards → cards por nível
        │     └─ heurística combate → aba Combate | Habilidades
        └─ defaultClassFeatureUses: detectFeatureUses → tracker (mesmo id do card)
              └─ syncClassFeatureUses → combat.featureUses (persiste/recarrega)
```

## Testes

- **parseSubclassFeatures:** roda contra as **70 opções reais** (PHB + Tasha) — toda
  opção produz ≥1 card; nenhum card com `name` ou `desc` vazio; níveis plausíveis (1–20).
- **detectFeatureUses:** casos PT reais — "Usos = bônus de proficiência" → prof/long;
  "1×/descanso curto" → 1/short; "igual ao seu modificador de Carisma" → cha-mod/long;
  texto sem uso → null. Inclui um caso que NÃO deve disparar (número solto tipo "3 metros").
- **getSubclassFeatureCards:** filtra por nível (nv 5 não mostra feature de nv 6);
  ids únicos e estáveis; multiclasse usa o nível da classe certa.
- **Integração (defaultClassFeatureUses):** um Bruxo Insondável nv6 ganha tracker do
  Tentáculo das Profundezas (prof usos); um Mago Evocador não ganha tracker fantasma.
- Suíte existente de FeaturesTab/rules continua verde (sem regressão de contagem).

## Riscos / limitações aceitas

- Bullets densos de Tasha juntam várias habilidades num nível → **1 card por nível**
  (não por habilidade), e o tracker pega só o **padrão dominante** daquele nível.
- Naming Tasha cai no fallback `"<Subclasse> (Nv N)"` — menos bonito que o nome real,
  mas honesto e sem inventar.
- `detectFeatureUses` é conservador de propósito: features de uso limitado que não batem
  os padrões seguros ficam **só-texto** (sem tracker). Aceitável — melhor faltar tracker
  que mostrar máximo errado.
- Recarga default `'long'` quando ambíguo pode estar errada em casos raros; o texto do
  card sempre mostra a regra real, então é só o auto-tracker que pode divergir.

## Fora de escopo

- Reescrever as descs pra formato estruturado (migração de dados) — o parser cobre.
- Tracker por habilidade dentro de um bullet denso de Tasha.
- Enforcement de regras (ex.: gastar o uso ao rolar) — segue manual, como hoje.
- Cache SW: nenhuma mudança em `public/srd-data` (só código) → **sem bump**.

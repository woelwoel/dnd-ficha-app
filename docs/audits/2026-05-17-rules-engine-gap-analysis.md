# Gap Analysis — Rules Engine D&D 5e (2026-05-17)

## Resumo executivo
A engine cobre bem progressão, multiclasse, slots, descansos, CA, ataques com Fighting Styles, itens mágicos e filtros de magia. Encontrei **3 bugs concretos** (1 crítico em equipment, 1 médio em magicItems, 1 médio em rules), **gaps importantes** em testes de morte (não há automação de queda/auto-fail), e **mecânicas de combate ausentes** (concentração na hora do dano, crítico, sneak attack, exaustão aplicada, ataques de oportunidade). Cobertura de testes razoável, mas `rules.js`, `hitDice.js` e `useCharacterCalculations.js` não têm teste direto.

## 🔴 Críticos

- **[Bug] `equipment.js:69-72`** — `findArmorByName` faz `norm.includes(alias)` depois do exato/prefix; isto faz "armadura de placas" casar com o alias `'acolchoada'`? Não — mas casa "manto acolchoado" como `padded`, e qualquer item contendo `'cota'` (curingas) vira `chain-mail`. Como `'cota'` é alias para `chain-mail` antes de `'cota de escamas'` ser testado em ordem de `Object.entries`, há sensibilidade à ordem de iteração: "cota de escamas" pode ser detectado como `chain-mail` porque `'cota'` aparece antes na lista quando há substring match. Sugestão: remover o `includes` (manter só exato e startsWith) ou ordenar aliases por comprimento decrescente.

- **[Bug] `rules.js:102-113` `evaluateMulticlassPrerequisites`** — PHB p.163: Guerreiro requer **STR 13 OU DEX 13**; Monge requer **DES 13 E SAB 13**; Bárbaro requer **FOR 13**. O parsing assume que `{ str:13, or:'dex' }` significa "13 em qualquer um dos dois". Bug: o código pega `Object.keys(reqs).find(k => k !== 'or')` — se o JSON tem `{ str:13, dex:13, or:true }` ou se houver mais chaves, só usa a primeira. Mais sério: o minimo do `orKey` é assumido igual ao do `mainKey` (`reqs[mainKey]`). Se um dia o JSON disser `{ str:13, cha:13 }` (e/and), também trata só a primeira. Cobertura insuficiente — recomendado normalizar o JSON ou suportar `{ any:[{str:13},{dex:13}] }` / `{ all:[...] }`.

- **[Bug] `rules.js:494-497` `applyLevelUp`** — cálculo de `totalLevelAfter` está errado em multiclasse. Quando `multiclassIndex != null`, soma `character.info.level` (primária) + soma dos níveis MC com substituição da MC alvo por `newLevel`. Tudo bem. Mas quando `multiclassIndex == null` (sobe primária), soma `newLevel` + soma TODAS as MC. Funciona. Porém o cálculo replica o bug se houver chamadas com `newLevel` representando o nível recém-atingido daquela MC, e a chave `asiOrFeatByLevel[String(totalLevelAfter)]` usa o **nível total combinado**, não o nível da classe que ganhou o ASI. Em multiclasse com dois ASI no mesmo nível total (improvável mas possível em races com bônus), há colisão de chave. PHB p.165 fala em ASI por nível de classe — recomendo chavear por `classIndex + classLevel`.

## 🟡 Médios

- **[Bug] `magicItems.js:170-186` `getEffectiveAttributes`** — a linha `score = Math.max(score, capped)` faz com que se `score=15` e `bonus.value=4, max=20`, vira `min(19,20)=19`. OK. Mas se `score=18` e `bonus={value:2,max:20}`, vira `min(20,20)=20` (correto). Porém quando `score > bonus.max` (ex. score=21 por attrSet de Cinto, bonus.value=2, max=20), `capped = min(23,20)=20`, e `Math.max(21,20)=21` — preserva o score. Bom. **Mas**: a ordem `attrSet → attrBonus` ignora `attrCap` na aplicação automática. O comentário diz "attrCap não eleva automaticamente"; ok, mas então `attrBonus.max` deveria respeitar `attrCap[k]` quando ambos existem (Manto de Carismático elevaria o teto para 21, deixando Amuleto somar até 21 em vez de 20). Hoje os dois não interagem.

- **[Bug] `rules.js:632-638` Action Surge** — `level >= 17 ? 2 : level >= 2 ? 1 : 0`. PHB p.72: 1 uso no nível 2, **2 usos no nível 17**. OK. Mas Action Surge recarrega em **descanso curto OU longo** (não só curto). Marcação `recharge: 'short'` é semanticamente "curto e longo" no projeto (rest.js linha 47-48 inclui 'short' em longo). OK.

- **[Gap] `rules.js:651-660` Bardic Inspiration** — usos = `max(1, CHA mod)`. PHB p.53 diz `CHA mod` (mínimo 1) ✅. Mas: o **dado** escala (d6, d8, d10, d12) — não está exposto em nenhum lugar do schema/UI.

- **[Gap] `attacks.js:147-166` `calculateWeaponDamage`** — sem suporte a **crítico** (dobra dados, não modificadores — PHB p.196), **sneak attack** (Ladino — PHB p.96 adiciona dN d6 por nível em condições), **smite divino** (Paladino), **hex/hunter's mark** (dano extra por hit), **resistências/vulnerabilidades** do alvo. O modelo de ataque é puramente "rolagem por hit".

- **[Gap] `attacks.js`** — sem **multiataque** (Fighter Extra Attack, Monge Flurry of Blows, Ranger Extra Attack). Não há campo `attacksPerAction` no schema nem cálculo derivado.

- **[Gap] Concentração** — `applyConcentrationCheck` existe em `rules.js:722`, mas **não há gatilho** quando dano é aplicado. Como `updateCombat('currentHp', val)` é genérico, ao receber dano o sistema não pede save CON nem oferece UI. PHB p.203: DC = max(10, ⌊dano/2⌋).

- **[Gap] `useCharacter.js`** — não existe `applyDamage(amount)` / `heal(amount)`. Toda alteração de HP é manual via `updateCombat`, sem:
  - Drenar tempHp primeiro (PHB p.198)
  - Disparar concentration check
  - Detectar "dropped to 0" → marcar inconsciente, iniciar death saves
  - Massive damage instakill (PHB p.197)
  - Aplicar 2 falhas em crítico recebido a 0 HP (PHB p.197)

- **[Gap] `rest.js`** — não restaura **exhaustion -1** em descanso longo (PHB p.291). Também não checa requisito de **1 PV mínimo** para descanso longo (RAW: personagem com 0 HP não recebe benefícios).

- **[Gap] `rest.js performShortRest`** — não recarrega slots de Pact em multiclasse Bruxo+Bardo (etc.) — gap conhecido da auditoria anterior; ainda presente.

- **[Bug] `spellFilters.js:43-48`** — `castingTimeBucket` falha em variações com sufixo: `'1 ação (ritual)'` cairia em `null`. Recomendar `startsWith` em vez de `===`.

- **[Bug] `spellFilters.js:85`** — filtro `ritual === 'yes'` checa só `=== true`; algumas magias usam `'sim'`/`'yes'` no JSON traduzido.

## 🟢 Baixos

- `rules.js:79` — `find-familiar` hardcoded; deveria vir do JSON de pact boons.
- `rules.js:377-427` — `CLERIC_DOMAIN_SPELLS` totalmente hardcoded com 7 domínios. Faltam os 7 domínios SCAG/Tasha (Forja, Ordem, etc.).
- `rules.js:442-446` `FEAT_ARMOR_PROFICIENCIES` — só 3 feats; falta Magic Initiate, Ritual Caster, Skilled etc.
- `characterSchema.js:307` aceita `deathSaves > 0` mesmo com HP `> 0`. Considerar `superRefine`.
- `characterSchema.js:174` `attacks[].damageType: z.string().default('')` — permite vazio; PHB exige tipo.
- `characterSchema.js` — `combat.exhaustion`, `inspiration`, `conditions`, `rageActive`, `wildShape` são SETADOS em `useCharacter` mas **não declarados no Zod**. Vivem por `passthrough()`. Permite valores inválidos (exhaustion=99).
- `calculations.js:188-204` — `RACE_LANGUAGES`, `DND_LANGUAGES` deveriam vir de JSON.
- `equipment.js:188-191` — escudo sem proficiência só gera warning; PHB p.144 também impede conjuração.

## 📋 Mecânicas D&D 5e ausentes

- **Crítico (PHB p.196)** — dobrar dados de dano.
- **Sneak Attack (PHB p.96)** — Ladino: nd6 condicional.
- **Smite Divino (PHB p.84)** — Paladino consome slot.
- **Hunter's Mark / Hex** — dano extra rastreado.
- **Concentration check on damage** — gatilho ausente (DC=max(10, ⌊dmg/2⌋)).
- **Reação / Ataque de oportunidade** — sem rastreamento.
- **Multiataque / Extra Attack** — sem indicador no schema.
- **Two-Weapon Fighting** — bonus action attack não modelado.
- **Grappling/Shoving** — sem ação dedicada.
- **Surprise/Hidden** — sem flag.
- **Death from massive damage** — dano ≥ maxHp em um golpe = morte instantânea.
- **Drop to 0 → unconscious + death saves** — automação ausente.
- **Crit causa 2 falhas em death save** — ausente.
- **Cura de 1+ HP zera death saves** — ausente.
- **Stabilization (DC 10 Medicina)** — ausente.
- **Exhaustion penalties (PHB p.291)** — `setExhaustion` salva nível, mas penalidades não são aplicadas em nenhum cálculo.
- **Inspiração** — `setInspiration` salva flag mas nenhum cálculo a usa.
- **Cobertura (cover) +2/+5 CA** — ausente.
- **Bardic Inspiration die size** — escala (d6→d12) ausente.
- **Saves de raça** — Anão (vantagem vs veneno), Gnomo (vantagem vs magia INT/WIS/CHA) não aplicados.
- **Armadura sem proficiência não bloqueia conjuração** — apenas warning.

## ✅ Mecânicas validadas

- Modificador de atributo, bônus de proficiência por nível.
- HP máximo single-class e multiclasse (incluindo Robusto +2/nível).
- Slots unificados full+half (multiclasse) com exceção correta para half-caster solo.
- Slots de Pact Magic + recarga em short rest.
- ASI mutuamente exclusivo com Feat (PHB p.165).
- Clamp +20 na criação, hard max 30 em imports.
- Pré-requisitos de multiclasse (formato or limitado).
- Cleric Domain spells (1/3/5/7/9).
- CA: leve/média/pesada com cap DEX correto; Unarmored Defense (Bárbaro mantém com escudo, Monge perde com escudo).
- Magias preparadas vs conhecidas, ability por classe em multiclasse híbrida.
- Spell Save DC e ataque mágico.
- Itens mágicos: agregação aditiva, attrSet (maior ganha), attrBonus respeitando max.
- Fighting Styles: Archery, Dueling, Great Weapon (rr 1-2), Two-Weapon.
- Resolve ability de ataque com finesse/ranged/thrown.
- Talento Alerta (+5), Observador (+5 PP), Mobilidade (+10ft), Robusto (+2 PV/nível).
- Long rest restaura HP/slots/pactSlots/featureUses + zera death saves.
- Short rest gasta HD (mínimo 1 cura) + recarrega Pact Magic.
- Migrações de schema v1→v2→v3.
- Filtros de magia (escolas, concentração, ritual, V/S/M, casting time).

## 🧪 Gaps de cobertura de testes

- `src/domain/rules.js` — sem teste unitário direto.
- `src/utils/hitDice.js` — sem teste direto.
- `src/hooks/useCharacterCalculations.js` — sem teste direto.
- `src/hooks/useCharacter.js` — sem teste direto.
- `src/domain/attributes.js` — sem teste direto.

Já cobertos: attacks, calculations, characterSchema, equipment, magicItems, rest, spellcasting, spellFilters.

## 💀 Status do fluxo de testes de morte

**Existente:**
- Schema (`characterSchema.js:159-162`) — `deathSaves: { successes 0-3, failures 0-3 }`.
- Hook (`useCharacter.js:431-442`) — `updateDeathSaves(type, value)` com clamp.
- UI: `CombatStats.jsx:37 DeathSavesTracker` renderiza tracker; `CharacterView.jsx:418-424` mostra dots; `SheetContent.jsx:174` cabeada.
- Reset automático em descanso longo (`rest.js:156`).
- Display "downed" baseado em HP ≤ 0 (`CombatStats.jsx:170 isDowned`).

**Ausente (críticos do RAW PHB p.197):**
1. Auto-marca inconsciente / inicia testes ao chegar a 0 HP.
2. Cura de 1+ HP zera death saves.
3. 3 sucessos → estabilizado (transição automática).
4. 3 falhas → morte (sem flag `isDead`).
5. Crítico recebido a 0 HP = 2 falhas.
6. Nat 1 em death save = 2 falhas, Nat 20 = recupera com 1 HP.
7. Massive damage instakill.
8. Drena tempHp antes do HP.
9. Inconsciência bloqueando ações.

**Recomendação:** introduzir `applyDamage(amount, {critical, type})` e `applyHealing(amount)` em `useCharacter.js` (delegando para funções puras em `rules.js`). Esse helper centraliza: tempHp drain → currentHp clamp → death-save side-effects → concentration trigger → instakill detection → cura zera death saves. Sem isso, a "ficha de morte" é puramente cosmética.

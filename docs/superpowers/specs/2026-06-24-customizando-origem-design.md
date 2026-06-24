# Customizando sua Origem (Tasha) + Fundação de Idiomas

Data: 2026-06-24
Branch: `multi-sistema-fronteira`
Sistema: `dnd5e`.

## Princípio guia

O livro do Tasha é **complemento, não substituição**. Tudo que é Tasha entra
**opt-in** (desligado por padrão, gateado pela fonte); com a regra OFF, a criação
se comporta exatamente como hoje. Nada de Tasha pode quebrar o fluxo existente.

## Decomposição

O trabalho tem duas partes — a primeira é base PHB que faltava (pré-requisito da
segunda):

- **Parte A — Fundação de idiomas (base PHB, NÃO-Tasha).** O app hoje não rastreia
  idiomas de raça (`proficiencies.languages` fica vazio; raças não têm dados de
  idioma). É conteúdo base faltando. Afeta todas as fichas (aditivo).
- **Parte B — Customizando sua Origem (Tasha, opt-in).** Realocar aumentos de
  atributo e trocar idioma concedido pela raça. Depende da Parte A.

---

## Parte A — Fundação de idiomas

### A.1 Dados — idiomas por raça (JÁ EXISTEM no código)

DESCOBERTA: `src/utils/calculations.js` já tem `RACE_LANGUAGES` (mapa
raça→idiomas fixos, 9 raças) e `DND_LANGUAGES` (lista padrão, 16 idiomas). Os
dados estão prontos — só não são usados. **Não criar arquivo novo nem mexer em
`public/srd-data`.** Reusar essas constantes.

Falta apenas a contagem de idioma EXTRA por raça (Humano/Meio-Elfo ganham +1).
Adicionar um mapa pequeno `RACE_EXTRA_LANGUAGES` (ex.: `{ humano: 1, 'meio-elfo': 1 }`,
default 0) ao lado dos existentes.

### A.2 Lista padrão de idiomas (JÁ EXISTE)

`DND_LANGUAGES` em `calculations.js` é a lista padrão reutilizável. Usar ela.

### A.3 Build + UI

- `build-character.js`: popular `proficiencies.languages` a partir dos `fixed`
  da raça + as escolhas extras do draft (hoje grava `[]`).
- Passo de Raça do Wizard (`RaceBlock`): exibir os idiomas concedidos (read-only)
  e, quando `choices > 0`, oferecer seleção de idiomas extras da
  `STANDARD_LANGUAGES` (excluindo os já fixos). Gravar no draft.
- Ficha: a aba já tem `toggleLanguage`; garantir que os idiomas de raça apareçam.

### A.4 Schema

`proficiencies.languages` já existe (array). Sem mudança de schema; só passa a ser
populado. Ficha legada (languages vazio) continua válida.

---

## Parte B — Customizando sua Origem (Tasha, opt-in)

### B.1 Toggle gateado pela fonte

`meta.settings.flexibleRacialAsi` (boolean, JÁ existe no schema, default false).
Surge na config do Wizard (`CampaignSetupModal`, junto de allowFeats/Fontes),
visível **só quando a fonte Tasha está ativa**. OFF por padrão.

### B.2 Realocação de atributos

Backend já pronto: `applyRacialChange` chama
`computeRacialBonuses(..., { flexibleAsi, override })`; com `flexibleAsi` true e
`info.racialAsiOverride` presente, aplica o override no lugar dos bônus fixos.
Validação de schema já exige soma ≤ +3.

- UI no `RaceBlock` (só quando o toggle ON): escolher a distribuição —
  **+2/+1** (dois atributos distintos) ou **+1/+1/+1** (três distintos) — gravando
  `info.racialAsiOverride` (ex.: `{ str: 2, con: 1 }` ou `{ str: 1, dex: 1, con: 1 }`).
- Validação na UI: exatamente +2/+1 OU +1/+1/+1; atributos distintos.

### B.3 Troca de idioma

Quando o toggle ON: no `RaceBlock`, permitir **substituir** um idioma `fixed` da
raça por outro da `STANDARD_LANGUAGES`. Guardar como override
(`info.racialLanguageOverride: { [idiomaOriginal]: idiomaNovo }` ou uma lista
substituída) e o build aplica. OFF = idiomas `fixed` da raça (Parte A) sem troca.

### B.4 Comportamento OFF (invariante)

Com o toggle OFF (ou fonte Tasha desligada): bônus de atributo fixos da raça +
idiomas `fixed` da raça (Parte A), **idênticos** ao que a Parte A entrega sem
nenhuma escolha extra de Tasha. Nenhuma regra do Tasha aplicada.

---

## Testes

- A: `languages` presente nas raças; `STANDARD_LANGUAGES` completa; build popula
  `proficiencies.languages` dos `fixed` + escolhas; RaceBlock oferece escolha
  extra só quando `choices > 0`.
- B: toggle só aparece com fonte Tasha; override de atributo aplica no lugar dos
  fixos (e OFF mantém os fixos); validação +2/+1 ou +1/+1/+1; troca de idioma
  substitui o `fixed` e respeita a lista; OFF não troca nada.
- Invariante: ficha criada com Tasha OFF tem os mesmos atributos/idiomas que teria
  só com a Parte A.

## Service worker

**Sem bump.** Os dados de idioma já estão em `calculations.js` (código), não em
`public/srd-data` — nada de srd-data muda, então o cache do SW não precisa subir.

## Fora de escopo (YAGNI)

- Realocar perícia/ferramenta concedida pela raça (poucas raças têm no app).
- Trocar tipo de criatura / substituir traços raciais (Tasha).
- Idiomas exóticos com restrição de DM.

## Relacionado

- [[tasha-fontes]]; [[variant-human-feat]] (mesmo terreno do RaceBlock/bônus racial).
- Scaffolding existente: `settings.flexibleRacialAsi`, `info.racialAsiOverride`,
  `applyRacialChange`/`computeRacialBonuses` em `domain/rules.js`,
  `domain/racialBonuses.js`.

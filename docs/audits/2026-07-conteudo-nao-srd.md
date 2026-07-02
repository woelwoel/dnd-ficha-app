# Auditoria de conteúdo: SRD 5.1 vs IP fechado (WotC)

Gerado por `scripts/audit-srd-content.mjs` em 2026-07-02.
Contexto: Task 2.1 do plano `docs/superpowers/plans/2026-07-02-resolucao-analise-critica.md`.

## O problema em uma frase

O SRD 5.1 é CC-BY-4.0 (uso livre com atribuição); todo o resto de PHB e Tasha é
IP fechado da Wizards of the Coast, e `public/srd-data/` serve esses arquivos
publicamente sem autenticação.

## Inventário por arquivo

| Arquivo | KB | Classificação | Observação |
|---|---|---|---|
| 5e-SRD-Backgrounds.json | 11 | 🟢 SRD 5.1 | Base SRD (CC-BY-4.0). Exige atribuição CC-BY visível no app. |
| 5e-SRD-Classes.json | 147 | 🟢 SRD 5.1 | Base SRD (CC-BY-4.0). Exige atribuição CC-BY visível no app. |
| 5e-SRD-Equipment.json | 173 | 🟢 SRD 5.1 | Base SRD (CC-BY-4.0). Exige atribuição CC-BY visível no app. |
| 5e-SRD-Levels.json | 220 | 🟢 SRD 5.1 | Base SRD (CC-BY-4.0). Exige atribuição CC-BY visível no app. |
| 5e-SRD-Monsters-pt.json | 23 | 🟢 SRD 5.1 | Base SRD (CC-BY-4.0). Exige atribuição CC-BY visível no app. |
| 5e-SRD-Monsters.json | 1354 | 🟢 SRD 5.1 | Base SRD (CC-BY-4.0). Exige atribuição CC-BY visível no app. |
| 5e-SRD-Races.json | 26 | 🟢 SRD 5.1 | Base SRD (CC-BY-4.0). Exige atribuição CC-BY visível no app. |
| 5e-SRD-Spells.json | 594 | 🟢 SRD 5.1 | Base SRD (CC-BY-4.0). Exige atribuição CC-BY visível no app. |
| phb-backgrounds-pt.json | 51 | 🔴 Quase todo fechado | 12/13 antecedentes fora do SRD (SRD só tem: acolito). |
| phb-class-choices-pt.json | 110 | 🔴 Maioria fechada | 28/40 subclasses fora do SRD (detalhe abaixo). Options não-subclasse (totens, manobras do Mestre de Combate, estilos extras) também são majoritariamente fechadas. |
| phb-class-equipment-pt.json | 20 | 🟡 Mecânica SRD, texto a conferir | Estruturas/tabelas de classe e multiclasse estão no SRD; o risco está em DESCRIÇÕES verbatim do PHB (lore, fullDescription, features não-SRD) e na origem da tradução. |
| phb-class-progression-full-pt.json | 134 | 🟡 Mecânica SRD, texto a conferir | Estruturas/tabelas de classe e multiclasse estão no SRD; o risco está em DESCRIÇÕES verbatim do PHB (lore, fullDescription, features não-SRD) e na origem da tradução. |
| phb-class-progression-pt.json | 155 | 🟡 Mecânica SRD, texto a conferir | Estruturas/tabelas de classe e multiclasse estão no SRD; o risco está em DESCRIÇÕES verbatim do PHB (lore, fullDescription, features não-SRD) e na origem da tradução. |
| phb-classes-pt.json | 493 | 🟡 Mecânica SRD, texto a conferir | Estruturas/tabelas de classe e multiclasse estão no SRD; o risco está em DESCRIÇÕES verbatim do PHB (lore, fullDescription, features não-SRD) e na origem da tradução. |
| phb-feats-pt.json | 14 | 🔴 Fechado | 42/42 talentos fora do SRD (SRD só tem: agarrador). O único talento do SRD (Grappler) nem está no app — 100% do arquivo é fechado. |
| phb-magic-items-pt.json | 17 | 🟡 Misto | 50 itens; a maioria dos itens básicos do DMG está no SRD, mas conferir item a item (e vale a mesma ressalva de origem da tradução). |
| phb-maneuvers-pt.json | 5 | 🔴 Fechado | Manobras são do Mestre de Combate (subclasse não-SRD; a subclasse SRD do Guerreiro é o Campeão). |
| phb-multiclass-pt.json | 2 | 🟡 Mecânica SRD, texto a conferir | Estruturas/tabelas de classe e multiclasse estão no SRD; o risco está em DESCRIÇÕES verbatim do PHB (lore, fullDescription, features não-SRD) e na origem da tradução. |
| phb-races-pt.json | 137 | 🟡 Misto | As 9 raças básicas estão no SRD (1 sub-raça cada: Hill Dwarf, High Elf, Lightfoot Halfling, Rock Gnome). Sub-raças extras do PHB (ex.: anão da montanha, elfo da floresta, gnomo da floresta, draconato por ancestral) são fechadas. Conferir texto de lore. |
| phb-spells-pt.json | 586 | 🟡 Misto | 390 magias; o SRD tem 319 (ver 5e-SRD-Spells.json) — ~71+ fora do SRD. ATENÇÃO: mesmo as 319 SRD só são seguras se a TRADUÇÃO for derivada do SRD em inglês (tradução própria = obra derivada permitida pela CC-BY); tradução de terceiros do livro oficial NÃO é coberta. |
| phb-weapons-pt.json | 6 | 🟢 SRD (tabelas) | Tabelas de armas/equipamento estão no SRD. |
| tasha-class-choices-pt.json | 92 | 🔴 Fechado | Tasha NÃO tem versão SRD — 100% IP fechado (13 entradas). |
| tasha-class-progression-pt.json | 19 | 🔴 Fechado | Tasha NÃO tem versão SRD — 100% IP fechado (1 entradas). |
| tasha-classes-pt.json | 16 | 🔴 Fechado | Tasha NÃO tem versão SRD — 100% IP fechado (1 entradas). |
| tasha-feats-pt.json | 13 | 🔴 Fechado | Tasha NÃO tem versão SRD — 100% IP fechado (15 entradas). |
| tasha-infusions-pt.json | 13 | 🔴 Fechado | Tasha NÃO tem versão SRD — 100% IP fechado (16 entradas). |
| tasha-magic-items-pt.json | 25 | 🔴 Fechado | Tasha NÃO tem versão SRD — 100% IP fechado (40 entradas). |
| tasha-spells-pt.json | 24 | 🔴 Fechado | Tasha NÃO tem versão SRD — 100% IP fechado (21 entradas). |
| wild-shape-beasts-pt.json | 94 | 🟢 SRD (stat blocks) | Stat blocks de bestas estão no SRD (Monsters). |

### Subclasses fora do SRD em phb-class-choices-pt.json
  - barbaro/primal_path: 1/2 fora do SRD (totem)
  - bardo/bard_college: 1/2 fora do SRD (valor)
  - clerigo/divine_domain: 6/7 fora do SRD (conhecimento, luz, natureza, tempestade, enganacao, guerra)
  - druida/druid_circle: 1/2 fora do SRD (lua)
  - feiticeiro/sorcerous_origin: 1/2 fora do SRD (magia_selvagem)
  - guerreiro/martial_archetype: 2/3 fora do SRD (cavaleiro_batalla, mestre_combate)
  - ladino/roguish_archetype: 2/3 fora do SRD (assassino, arcano)
  - mago/arcane_tradition: 7/8 fora do SRD (abjuracao, conjuracao, adivinhacao, encantamento, ilusao, necromancia, transmutacao)
  - monge/monastic_tradition: 2/3 fora do SRD (quatro_elementos, sombra)
  - paladino/sacred_oath: 2/3 fora do SRD (os_antigos, vinganca)
  - patrulheiro/ranger_archetype: 1/2 fora do SRD (mestre_das_bestas)
  - bruxo/patron: 2/3 fora do SRD (feerico, grande_antigo)

## Amostragem manual de texto (2026-07-02)

Amostras inspecionadas para julgar "texto integral do livro" vs "resumo próprio"
(isto muda o tamanho do risco — mecânica de jogo não é protegível por copyright;
a EXPRESSÃO do texto é):

| Amostra | Veredito | Risco |
|---|---|---|
| Subclasse fechada (Domínio da Guerra, `phb-class-choices`) | **Resumo mecânico próprio** — formato "• Nv N — efeito condensado", intro de 1 frase | Baixo (zona defensável) |
| Talento fechado (Alerta, `phb-feats`) | **Resumo mecânico condensado**, não verbatim | Baixo |
| `fullDescription` de classe (Bárbaro, `phb-classes`) | **TRADUÇÃO VERBATIM do lore de abertura do PHB** ("Um humano alto membro de alguma tribo caminha em meio a uma nevasca…"). O SRD NÃO inclui esses textos de abertura | **ALTO — pior achado** |
| Magia SRD (Bola de Fogo, `phb-spells`) | Texto completo traduzido, fiel ao original | Médio (depende da origem da tradução; as ~71 magias não-SRD são as expostas) |
| Itens/subclasses de Tasha | Já auditados como "resumos fiéis, não verbatim" (D2, 2026-06-27) | Baixo-médio |

**Concentração do risco real:** (1) `fullDescription`/lore verbatim em
`phb-classes-pt.json` — substituir por lore próprio curto é a correção mais
urgente e barata; (2) texto integral das ~71 magias não-SRD; (3) nomes/estrutura
de conteúdo Tasha (mesmo resumido, é conteúdo exclusivo do livro).

## Ressalva transversal: origem da tradução

A CC-BY-4.0 permite obra derivada (tradução PRÓPRIA do SRD em inglês, com
atribuição). Ela NÃO cobre tradução extraída de terceiros — nem da edição
oficial brasileira, nem de fan-translations do livro completo (a esteira do
Tasha usou PDFs de fan-translation; se o conteúdo PHB veio da mesma origem,
até os itens "SRD" desta tabela carregam texto de origem não-limpa).

## Referência SRD 5.1 usada

- Subclasses (1/classe): Berserker, Lore, Life, Land, Champion, Open Hand,
  Devotion, Hunter, Thief, Draconic, Fiend, Evocation.
- Talentos: só Grappler. Antecedentes: só Acolyte.
- Raças: as 9 básicas com 1 sub-raça cada.

## Próximo passo

Decisão do dono (Task 2.2 do plano): resumir com texto próprio / mover pra
trás de auth / aceitar o risco documentado — ver opções no plano.

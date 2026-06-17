# Revisão — cinzentos de subclasse (combate)

Decisões que merecem conferência do dono do projeto.
Formato: classe / escolha / opção — marcação aplicada — porquê.

## Seletores de subclasse (escolha do arquétipo inteiro)

Os seletores agregam a subclasse inteira (várias features de níveis diferentes).
Marquei pelo uso dominante. São cinzentos porque um bundle nunca é "só" combate.

- barbaro / primal_path / berserker — combat essencial — frenesi dá ataque bônus recorrente
- barbaro / primal_path / totem — combat essencial — passivas de fúria usadas toda luta (poderia ser misto)
- bardo / bard_college / conhecimento — combat essencial — na dúvida marquei combate, mas é fortemente utilitário/social (Palavras Cortantes é reativo, Segredos Mágicos é versátil); defensável como `social`
- bardo / bard_college / valor — combat essencial — bardo-guerreiro, Ataque Extra
- clerigo / divine_domain / conhecimento — category social — domínio focado em perícias/idiomas/saber; mas ainda concede Canalizar Divindade ofensivo, defensável como combate
- clerigo / divine_domain / enganacao — combat situacional — Canalizar de furtividade/ilusão é mais utilitário; defensável como `social`
- clerigo / divine_domain / natureza — combat essencial — misto (encantar feras + dano), marcado combate
- druida / druid_circle / terra — category magia — Círculo da Terra é essencialmente magias adicionais por bioma; mas tem combate via conjuração
- druida / druid_circle / lua — combat essencial — druida-guerreiro de Forma Selvagem
- feiticeiro / sorcerous_origin / linhagem_draconico — combat essencial — bônus de dano/CA, defensável como `defesa` pela CA passiva
- feiticeiro / sorcerous_origin / magia_selvagem — combat essencial — efeitos caóticos em combate, mas imprevisível
- mago / arcane_tradition / adivinhacao — combat situacional — Portento (re-rolar) é situacional/utilitário; defensável como sem marcação
- mago / arcane_tradition / ilusao — combat situacional — disfarce/engano é majoritariamente utilitário; defensável como `social`
- mago / arcane_tradition / abjuracao — combat essencial — escudo arcano/proteção; defensável como `defesa`
- ladino / roguish_archetype / gatuno — combat essencial — Gatuno é o mais furtivo/utilitário dos três; defensável como `exploracao`/`social`

## Metamagia (feiticeiro)

- feiticeiro / metamagic / cuidadosa — combat situacional — protege aliados de TR, usada só quando há fogo amigo
- feiticeiro / metamagic / distante — combat situacional — dobra alcance, situacional
- feiticeiro / metamagic / estendida — combat situacional — dobra duração, mais buff/utilitário
- feiticeiro / metamagic / sutil — combat situacional — conjurar sem componentes; é majoritariamente social/anti-prisão, defensável como `social`
- feiticeiro / metamagic / rapida — combat essencial — conjurar como ação bônus, mas só "essencial" se você abusa dela
- feiticeiro / metamagic / expandida — combat essencial — dobra AoE; depende de ter magias de área

## Estilos de combate / manobras

- guerreiro / fighting_style / protecao — combat situacional — usa reação, depende de aliado adjacente
- paladino / fighting_style_paladin / protecao — combat situacional — idem (reação + aliado adjacente)
- guerreiro / martial_archetype_maneuvers / precisao — combat essencial — soma à jogada de ataque; usada toda luta, mas alguns veriam como situacional (só quando dúvida de acerto)
- guerreiro / martial_archetype_maneuvers / desarmar — combat situacional — controle, depende do alvo segurar item
- guerreiro / martial_archetype_maneuvers / empurrar — combat situacional — controle de posição
- guerreiro / martial_archetype_maneuvers / provocante — combat situacional — impõe desvantagem, controle
- guerreiro / martial_archetype_maneuvers / sopro — combat situacional — nega reações, niche
- guerreiro / martial_archetype_maneuvers / manobra-derrubar — combat situacional — derrubar (controle)
- guerreiro / martial_archetype_maneuvers / estocada — combat situacional — só estende alcance
- guerreiro / martial_archetype_maneuvers / joga-sopro (Finta) — combat situacional — ação bônus pra vantagem; defensável como essencial (vantagem é forte)
- guerreiro / martial_archetype_maneuvers / distracao — combat situacional — ação bônus, buffa aliado
- guerreiro / martial_archetype_maneuvers / rally — combat situacional — PV temporários a aliado (suporte)
- guerreiro / martial_archetype_maneuvers / defesa-agil, manobra-defensiva, resposta — combat situacional — todas reações

## Barbaro — totens

- barbaro / barbaro_totem_spirit / aguia — combat situacional — desengajar/desvantagem em AoO é mais mobilidade defensiva; defensável como `exploracao`
- barbaro / barbaro_totem_spirit / urso — combat essencial — resistência a quase tudo em fúria; defensável como `defesa`
- barbaro / barbaro_totem_spirit / lobo — combat essencial — aura ofensiva de grupo
- barbaro / barbaro_totem_supreme / aguia_14 — category exploracao — velocidade de voo; é em fúria (combate) mas o efeito é puro deslocamento

## Patrulheiro

- patrulheiro / favored_enemy / * — category social — vantagem em rastrear + idioma; não dá benefício de combate no PHB 5e (é conhecimento/idioma)
- patrulheiro / patrulheiro_hunters_prey / assassino_gigante — combat situacional — só vantagem contra Grandes+; nicho
- patrulheiro / patrulheiro_defensive_tactics / * — combat situacional — todas defensivas/reativas
- patrulheiro / patrulheiro_superior_hunter / * — combat situacional — todas reações
- patrulheiro / patrulheiro_companion / falcao — combat situacional — CR 0, baixo PV, mais reconhecimento que dano; defensável como `exploracao`
- patrulheiro / patrulheiro_companion / aguia — combat situacional — CR 0, voo/reconhecimento; defensável como `exploracao`
- patrulheiro / patrulheiro_companion / lobo, pantera, javali, gato_montes, urso_pequeno — combat essencial — feras que lutam junto (dano recorrente)

## Bruxo

- bruxo / patron / feerico — combat essencial — bundle de subclasse, mas Feérico é mais controle/encanto; defensável como `social`
- bruxo / eldritch_invocations / blast_repelente — combat situacional — empurra ao acertar; controle leve
- bruxo / eldritch_invocations / vigor_infernal — category defesa — Falsa Vida à vontade dá PV temporários; defensável como combate (prep defensiva ativa)
- bruxo / eldritch_invocations / visoes_nebulosas — combat situacional — Imagem Silenciosa à vontade; majoritariamente utilitário, defensável como sem marcação/`exploracao`
- bruxo / eldritch_invocations / sinal_mau_agouro — combat situacional — Enfeitiçar Pessoa 1x/descanso; nicho, social fora de combate
- bruxo / eldritch_invocations / ladrao_destinos — combat situacional — Enfeitiçar Monstro 1x/descanso; nicho
- bruxo / eldritch_invocations / um_com_sombras — category exploracao — invisibilidade em penumbra (furtividade); defensável como combate
- bruxo / pact_boon / corrente — combat situacional — familiar é mais reconhecimento/utilitário; defensável como `exploracao`
- bruxo / pact_boon / tomo — category magia — truques adicionais; defensável como combate se os truques forem ofensivos

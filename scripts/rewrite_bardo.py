import json

with open('public/srd-data/phb-class-progression-pt.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

bardo_levels = [
  {
    "level": 1, "prof": 2,
    "features": [
      {"name": "Conjuração de Bardo", "desc": "Você desata a magia por meio da palavra cantada, da música e da oratória. Carisma é sua habilidade de magia. CD de magia = 8 + bônus de proficiência + modificador de Carisma. Bônus de ataque mágico = bônus de proficiência + modificador de Carisma. Você aprende magias conhecendo-as de cor — não precisa preparar magias diariamente."},
      {"name": "Inspiração Bárdica (d6)", "desc": "Como ação bônus, escolha uma criatura (não você) a até 18 metros que possa ouvi-lo. Ela recebe um dado de Inspiração Bárdica (d6). Em até 10 minutos, ela pode rolar esse dado e somar ao resultado de um teste de habilidade, jogada de ataque ou TR — depois de ver o d20, mas antes de o Mestre anunciar o desfecho. Um dado por vez por criatura. Você tem usos iguais ao seu modificador de Carisma (mínimo 1). Recupera com descanso longo."}
    ]
  },
  {
    "level": 2, "prof": 2,
    "features": [
      {"name": "Faz de Tudo", "desc": "Você pode adicionar metade do seu bônus de proficiência (arredondado para baixo) a qualquer teste de habilidade que não inclua já o bônus de proficiência. Isso representa sua aptidão versátil em qualquer campo de conhecimento."},
      {"name": "Canção de Descanso (d6)", "desc": "Você pode usar música ou oratória durante um descanso curto para reconfortar aliados feridos. Ao fim do descanso curto, cada criatura amigável que o ouviu e gastou Dados de Vida recupera 1d6 pontos de vida adicionais. Esse dado melhora em níveis mais altos."}
    ]
  },
  {
    "level": 3, "prof": 2,
    "features": [
      {"name": "Especialização", "desc": "Escolha duas perícias nas quais você tenha proficiência (ou uma perícia e ferramentas de ladrão). Seu bônus de proficiência é dobrado para qualquer teste feito com essas escolhas."},
      {"name": "Colégio de Bardos", "desc": "Você se dedica às técnicas avançadas de um colégio de bardos. Escolha entre o Colégio do Conhecimento e o Colégio do Valor. Seu colégio concede características nos níveis 3, 6 e 14.", "choice_id": "bard_college", "subclass": True}
    ]
  },
  {
    "level": 4, "prof": 2,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {
    "level": 5, "prof": 3,
    "features": [
      {"name": "Inspiração Bárdica (d8)", "desc": "Seu dado de Inspiração Bárdica aumenta de d6 para d8."},
      {"name": "Fonte de Inspiração", "desc": "Você recupera todos os usos gastos de Inspiração Bárdica ao terminar um descanso curto ou longo — não apenas no descanso longo como antes."}
    ]
  },
  {
    "level": 6, "prof": 3,
    "features": [
      {"name": "Contrafeitiço", "desc": "Como ação, você inicia uma performance musical ou verbal que dura até o fim do seu próximo turno. Durante esse tempo, você e criaturas amigáveis a até 9 metros que possam ouvi-lo têm vantagem em Testes de Resistência contra ser encantadas ou amedrontadas. Você não pode lançar magias enquanto mantém a performance."},
      {"name": "Característica do Colégio de Bardos", "desc": "Você recebe a característica de nível 6 do seu Colégio (Conhecimento: Segredos Mágicos Adicionais — aprenda 2 magias de qualquer lista; Valor: Ataque Extra — 2 ataques por ação).", "subclass": True}
    ]
  },
  {"level": 7, "prof": 3, "features": []},
  {
    "level": 8, "prof": 3,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {
    "level": 9, "prof": 4,
    "features": [
      {"name": "Canção de Descanso (d8)", "desc": "O dado de cura bônus da Canção de Descanso aumenta de d6 para d8."}
    ]
  },
  {
    "level": 10, "prof": 4,
    "features": [
      {"name": "Inspiração Bárdica (d10)", "desc": "Seu dado de Inspiração Bárdica aumenta de d8 para d10."},
      {"name": "Especialização (mais 2 perícias)", "desc": "Escolha mais duas perícias nas quais você tenha proficiência. Seu bônus de proficiência passa a ser dobrado para essas perícias também (total: até 4 perícias com bônus dobrado)."},
      {"name": "Segredos Mágicos", "desc": "Você aprende 2 magias de qualquer lista de classe (não apenas a do Bardo). As magias escolhidas contam como magias de bardo e são incluídas no total de magias conhecidas. Você obtém novas magias por este recurso também nos níveis 14 e 18."}
    ]
  },
  {"level": 11, "prof": 4, "features": []},
  {
    "level": 12, "prof": 4,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {
    "level": 13, "prof": 5,
    "features": [
      {"name": "Canção de Descanso (d10)", "desc": "O dado de cura bônus da Canção de Descanso aumenta de d8 para d10."}
    ]
  },
  {
    "level": 14, "prof": 5,
    "features": [
      {"name": "Segredos Mágicos", "desc": "Você aprende mais 2 magias de qualquer lista de classe. Essas magias contam como magias de bardo e entram no total de magias conhecidas."},
      {"name": "Característica do Colégio de Bardos", "desc": "Você recebe a característica de nível 14 do seu Colégio (Conhecimento: Sabedoria Incomparável — use um dado de Inspiração nos seus próprios testes de habilidade; Valor: Magia de Batalha — ao lançar magia, faça um ataque de arma como ação bônus).", "subclass": True}
    ]
  },
  {
    "level": 15, "prof": 5,
    "features": [
      {"name": "Inspiração Bárdica (d12)", "desc": "Seu dado de Inspiração Bárdica aumenta de d10 para d12, o máximo possível."}
    ]
  },
  {
    "level": 16, "prof": 5,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {
    "level": 17, "prof": 6,
    "features": [
      {"name": "Canção de Descanso (d12)", "desc": "O dado de cura bônus da Canção de Descanso aumenta de d10 para d12."}
    ]
  },
  {
    "level": 18, "prof": 6,
    "features": [
      {"name": "Segredos Mágicos", "desc": "Você aprende mais 2 magias de qualquer lista de classe. Essas magias contam como magias de bardo e entram no total de magias conhecidas."}
    ]
  },
  {
    "level": 19, "prof": 6,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {
    "level": 20, "prof": 6,
    "features": [
      {"name": "Inspiração Superior", "desc": "Quando você rola para iniciativa e não tem nenhum uso de Inspiração Bárdica restante, você recupera imediatamente 1 uso. Isso garante que você sempre entre no combate com ao menos uma inspiração para distribuir."}
    ]
  }
]

data['bardo']['levels'] = bardo_levels

with open('public/srd-data/phb-class-progression-pt.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Bardo reescrito com sucesso')

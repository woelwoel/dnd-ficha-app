import json

with open('public/srd-data/phb-class-progression-pt.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

mago_levels = [
  {
    "level": 1, "prof": 2,
    "features": [
      {"name": "Conjuração de Mago", "desc": "Você estudou os princípios da magia arcana e registrou seu conhecimento em um grimório. Inteligência é sua habilidade de magia. CD de magia = 8 + bônus de proficiência + modificador de Inteligência. Você prepara magias do seu grimório após descanso longo: escolha magias em número igual ao modificador de Inteligência + nível de Mago (mínimo 1). Você começa com 6 magias de 1° nível no grimório e ganha 2 magias por nível. Pode lançar qualquer magia ritual do grimório sem gastar slot (+10 minutos de tempo de conjuração)."},
      {"name": "Recuperação Arcana", "desc": "Uma vez por dia, quando terminar um descanso curto, você pode recuperar espaços de magia gastos. Os espaços recuperados têm nível total combinado igual ou menor à metade do seu nível de Mago (arredondado para cima, mínimo 1). Não pode recuperar espaços acima do 5° nível desta forma."}
    ]
  },
  {
    "level": 2, "prof": 2,
    "features": [
      {"name": "Tradição Arcana", "desc": "Você se especializa em uma das oito escolas de magia arcana: Abjuração (proteção e anulação), Conjuração (teleporte e invocação), Adivinhação (conhecimento e presságios), Encantamento (controle mental), Evocação (dano elemental), Ilusão (enganação), Necromancia (mortos-vivos e energia vital) ou Transmutação (transformação). Sua escola concede características nos níveis 2, 6, 10 e 14.", "choice_id": "arcane_tradition", "subclass": True}
    ]
  },
  {"level": 3, "prof": 2, "features": []},
  {
    "level": 4, "prof": 2,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {"level": 5, "prof": 3, "features": []},
  {
    "level": 6, "prof": 3,
    "features": [
      {"name": "Característica da Tradição Arcana", "desc": "Você recebe a característica de nível 6 da sua escola de magia (ex: Abjuração — Proteção Projetada; Evocação — Cantrig Potente; Adivinhação — Especialista em Adivinhação; Transmutação — Pedra do Transmutador). Consulte sua tradição para detalhes.", "subclass": True}
    ]
  },
  {"level": 7, "prof": 3, "features": []},
  {
    "level": 8, "prof": 3,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {"level": 9, "prof": 4, "features": []},
  {
    "level": 10, "prof": 4,
    "features": [
      {"name": "Característica da Tradição Arcana", "desc": "Você recebe a característica de nível 10 da sua escola de magia (ex: Abjuração — Contra-magia Aprimorada; Evocação — Evocação Empoderada; Adivinhação — A Terceira Vista; Ilusão — Eu Ilusório). Consulte sua tradição para detalhes.", "subclass": True}
    ]
  },
  {"level": 11, "prof": 4, "features": []},
  {
    "level": 12, "prof": 4,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {"level": 13, "prof": 5, "features": []},
  {
    "level": 14, "prof": 5,
    "features": [
      {"name": "Característica da Tradição Arcana", "desc": "Você recebe a característica de nível 14 da sua escola de magia (ex: Abjuração — Resistência Mágica; Evocação — Sobrecarregar; Necromancia — Comandar Mortos-Vivos; Ilusão — Realidade Ilusória). Consulte sua tradição para detalhes.", "subclass": True}
    ]
  },
  {"level": 15, "prof": 5, "features": []},
  {
    "level": 16, "prof": 5,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {"level": 17, "prof": 6, "features": []},
  {
    "level": 18, "prof": 6,
    "features": [
      {"name": "Maestria de Magia", "desc": "Você domina certas magias a ponto de poder lançá-las sem esforço. Escolha uma magia de 1° nível e uma de 2° nível do seu grimório. Você pode lançar cada uma sem gastar espaço de magia. Após usá-las desta forma, deve terminar um descanso curto ou longo antes de repeti-las gratuitamente. Se desejar lançá-las em nível mais alto, gaste um espaço normalmente."}
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
      {"name": "Magia Marcante", "desc": "Você domina duas magias e pode lançá-las com facilidade excepcional. Escolha duas magias de 3° nível do seu grimório como suas magias marcantes. Você pode lançar cada uma sem gastar espaço de magia. Após usá-las desta forma, deve terminar um descanso curto ou longo antes de repeti-las gratuitamente."}
    ]
  }
]

data['mago']['levels'] = mago_levels

with open('public/srd-data/phb-class-progression-pt.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Mago reescrito com sucesso')

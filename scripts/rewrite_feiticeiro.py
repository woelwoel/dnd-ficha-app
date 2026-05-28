import json

with open('public/srd-data/phb-class-progression-pt.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

feiticeiro_levels = [
  {
    "level": 1, "prof": 2,
    "features": [
      {"name": "Conjuração de Feiticeiro", "desc": "Sua magia flui de dentro de você, não de livros ou divindades. Carisma é sua habilidade de magia. CD de magia = 8 + bônus de proficiência + modificador de Carisma. Você conhece magias de cor — não precisa preparar lista diária. Você começa conhecendo 4 cantrips e 2 magias de 1° nível."},
      {"name": "Origem Feiticeira", "desc": "Escolha a fonte do seu poder mágico inato: Linhagem Dracônica (sangue de dragão flui em você, concedendo resistência e poder elemental) ou Magia Selvagem (uma fonte imprevisível e caótica pulsa em seu interior). Sua origem concede características nos níveis 1, 6, 14 e 18.", "choice_id": "sorcerous_origin", "subclass": True}
    ],
    "class_specific": {"sorcery_points": 0}
  },
  {
    "level": 2, "prof": 2,
    "features": [
      {"name": "Fonte de Magia", "desc": "Você descobre o poço de poder arcano que existe dentro de si. Você tem Pontos de Magia iguais ao seu nível de Feiticeiro. Você pode converter espaços de magia em pontos (1 pt por nível do espaço) ou pontos em espaços de magia (1°=2pt, 2°=3pt, 3°=5pt, 4°=6pt, 5°=7pt — máximo 5°). A conversão é uma ação bônus. Todos os pontos se recuperam com descanso longo."}
    ],
    "class_specific": {"sorcery_points": 2}
  },
  {
    "level": 3, "prof": 2,
    "features": [
      {"name": "Metamagia", "desc": "Você aprende a torcer suas magias de formas sutis. Escolha 2 opções de Metamagia: Magia Cuidadosa (1pt — aliados na área passam automaticamente no TR), Magia Distante (1pt — dobrar o alcance ou 9m se toque), Magia Empoderada (1pt — rerolar até mod CAR dados de dano), Magia Estendida (1pt — dobrar duração, máx 24h), Magia Elevada (3pts — forçar rerolagem do TR usando o pior resultado), Magia Sutil (1pt — sem V e S), Magia Gêmea (1pt/nível — magia de 1 alvo atinge 2), Magia Acelerada (2pts — lançar magia de ação como ação bônus). Ganha mais opções nos níveis 10 e 17.", "choice_id": "metamagic"}
    ],
    "class_specific": {"sorcery_points": 3}
  },
  {
    "level": 4, "prof": 2,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ],
    "class_specific": {"sorcery_points": 4}
  },
  {
    "level": 5, "prof": 3,
    "features": [],
    "class_specific": {"sorcery_points": 5}
  },
  {
    "level": 6, "prof": 3,
    "features": [
      {"name": "Característica da Origem Feiticeira", "desc": "Você recebe a característica de nível 6 da sua Origem (Linhagem Dracônica: Afinidade Elemental — adicione modificador de Carisma ao dano do tipo do seu ancestral, gaste 1pt para resistência por 1h; Magia Selvagem: Dobra do Destino — gaste 2pts para adicionar ou subtrair 1d4 de qualquer rolagem de uma criatura visível).", "subclass": True}
    ],
    "class_specific": {"sorcery_points": 6}
  },
  {
    "level": 7, "prof": 3,
    "features": [],
    "class_specific": {"sorcery_points": 7}
  },
  {
    "level": 8, "prof": 3,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ],
    "class_specific": {"sorcery_points": 8}
  },
  {
    "level": 9, "prof": 4,
    "features": [],
    "class_specific": {"sorcery_points": 9}
  },
  {
    "level": 10, "prof": 4,
    "features": [
      {"name": "Metamagia (3 opções)", "desc": "Você aprende mais uma opção de Metamagia, totalizando 3 opções disponíveis.", "choice_id": "metamagic"}
    ],
    "class_specific": {"sorcery_points": 10}
  },
  {
    "level": 11, "prof": 4,
    "features": [],
    "class_specific": {"sorcery_points": 11}
  },
  {
    "level": 12, "prof": 4,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ],
    "class_specific": {"sorcery_points": 12}
  },
  {
    "level": 13, "prof": 5,
    "features": [],
    "class_specific": {"sorcery_points": 13}
  },
  {
    "level": 14, "prof": 5,
    "features": [
      {"name": "Característica da Origem Feiticeira", "desc": "Você recebe a característica de nível 14 da sua Origem (Linhagem Dracônica: Asas Dracônicas — como ação bônus, brote asas de dragão que concedem velocidade de voo igual ao deslocamento; Magia Selvagem: Caos Controlado — ao ativar uma magia selvagem, role a tabela 2 vezes e escolha o efeito).", "subclass": True}
    ],
    "class_specific": {"sorcery_points": 14}
  },
  {
    "level": 15, "prof": 5,
    "features": [],
    "class_specific": {"sorcery_points": 15}
  },
  {
    "level": 16, "prof": 5,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ],
    "class_specific": {"sorcery_points": 16}
  },
  {
    "level": 17, "prof": 6,
    "features": [
      {"name": "Metamagia (4 opções)", "desc": "Você aprende mais uma opção de Metamagia, totalizando 4 opções disponíveis.", "choice_id": "metamagic"}
    ],
    "class_specific": {"sorcery_points": 17}
  },
  {
    "level": 18, "prof": 6,
    "features": [
      {"name": "Característica da Origem Feiticeira", "desc": "Você recebe a característica de nível 18 da sua Origem (Linhagem Dracônica: Presença Dracônica — gaste 5pts: aura de 18m, criaturas que falharem no TR de Sabedoria ficam encantadas ou amedrontadas por 1 min, Concentração; Magia Selvagem: Bombardeio de Magias — quando um dado de dano mostrar seu valor máximo, role um dado extra e adicione ao dano).", "subclass": True}
    ],
    "class_specific": {"sorcery_points": 18}
  },
  {
    "level": 19, "prof": 6,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ],
    "class_specific": {"sorcery_points": 19}
  },
  {
    "level": 20, "prof": 6,
    "features": [
      {"name": "Restauração Feiticeira", "desc": "Você pode recuperar parte de sua energia mágica durante uma pausa breve. Ao terminar um descanso curto, você recupera 4 pontos de magia gastos."}
    ],
    "class_specific": {"sorcery_points": 20}
  }
]

data['feiticeiro']['levels'] = feiticeiro_levels

with open('public/srd-data/phb-class-progression-pt.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Feiticeiro reescrito com sucesso')

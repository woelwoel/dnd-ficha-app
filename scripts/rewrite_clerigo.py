import json

with open('public/srd-data/phb-class-progression-pt.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

clerigo_levels = [
  {
    "level": 1, "prof": 2,
    "features": [
      {"name": "Conjuração de Clérigo", "desc": "Você canaliza poder divino para lançar magias. Sabedoria é sua habilidade de magia. CD de magia = 8 + bônus de proficiência + modificador de Sabedoria. Você prepara magias após cada descanso longo: escolha magias da lista do Clérigo em número igual ao seu modificador de Sabedoria + nível de Clérigo (mínimo 1). Você pode mudar sua lista de magias preparadas a cada descanso longo."},
      {"name": "Domínio Divino", "desc": "Escolha um Domínio Divino relacionado à sua divindade: Vida, Luz, Tempestade, Natureza, Trickery, Guerra, entre outros. Seu Domínio concede magias sempre preparadas (que não contam para o limite) e características especiais nos níveis 1, 2, 6, 8 e 17.", "choice_id": "divine_domain", "subclass": True},
      {"name": "Magias de Domínio", "desc": "Seu Domínio Divino concede um par de magias bônus (sempre preparadas, não contam para o limite) em cada um dos seguintes níveis de personagem: 1, 3, 5, 7 e 9. As magias específicas dependem do Domínio escolhido.", "subclass": True}
    ]
  },
  {
    "level": 2, "prof": 2,
    "features": [
      {"name": "Canalizar Divindade (1/descanso)", "desc": "Você pode canalizar energia divina diretamente da sua divindade para alimentar efeitos mágicos. Você começa com dois efeitos: Virar Mortos-Vivos e um efeito do Domínio. Você tem 1 uso que se recupera ao terminar um descanso curto ou longo. O número de usos aumenta para 2 no nível 6 e 3 no nível 18."},
      {"name": "Canalizar Divindade: Virar Mortos-Vivos", "desc": "Como ação, apresente seu símbolo sagrado e profira uma prece censurando os mortos-vivos. Cada morto-vivo que puder vê-lo ou ouvi-lo a até 9 metros deve fazer um TR de Sabedoria (CD = 8 + prof + mod SAB). Com falha, a criatura é virada por 1 minuto ou até sofrer dano: ela deve gastar seus turnos tentando fugir de você e não pode se aproximar voluntariamente."},
      {"name": "Característica do Domínio", "desc": "Você recebe o efeito de Canalizar Divindade do seu Domínio (Vida: Preservar a Vida — curar até 5×nível de PV entre criaturas a 9m; Luz: Luz Radiante — dano radiante em área; Tempestade: Rajada Destrutiva — dano máximo com raio/trovão; outros domínios têm seus próprios efeitos).", "subclass": True}
    ]
  },
  {
    "level": 3, "prof": 2,
    "features": [
      {"name": "Magias de Domínio (nível de personagem 3)", "desc": "Você passa a ter acesso ao segundo par de magias do seu Domínio (magias de 2° nível). Sempre preparadas e não contam para o limite.", "subclass": True}
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
      {"name": "Destruir Mortos-Vivos (VD ≤ 1/2)", "desc": "Quando um morto-vivo falha no TR contra Virar Mortos-Vivos e seu Valor de Desafio for 1/2 ou menor, ele é destruído instantaneamente em vez de apenas ser virado. Esse limiar cresce com seus níveis de Clérigo."},
      {"name": "Magias de Domínio (nível de personagem 5)", "desc": "Você passa a ter acesso ao terceiro par de magias do seu Domínio (magias de 3° nível). Sempre preparadas e não contam para o limite.", "subclass": True}
    ]
  },
  {
    "level": 6, "prof": 3,
    "features": [
      {"name": "Canalizar Divindade (2/descanso)", "desc": "Você agora pode usar Canalizar Divindade duas vezes entre descansos curtos ou longos."},
      {"name": "Característica do Domínio", "desc": "Você recebe a característica de nível 6 do seu Domínio (Vida: Cura Abençoada — ao curar outro, recupere PV = 2 + nível da magia; Luz: Veste de Luz Aprimorada — proteger aliados também; Tempestade: Golpe Trovejante — empurrar criaturas grandes; outros domínios têm recursos equivalentes).", "subclass": True}
    ]
  },
  {
    "level": 7, "prof": 3,
    "features": [
      {"name": "Magias de Domínio (nível de personagem 7)", "desc": "Você passa a ter acesso ao quarto par de magias do seu Domínio (magias de 4° nível). Sempre preparadas e não contam para o limite.", "subclass": True}
    ]
  },
  {
    "level": 8, "prof": 3,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."},
      {"name": "Destruir Mortos-Vivos (VD ≤ 1)", "desc": "Mortos-vivos com VD 1 ou menor são destruídos quando falham no TR de Virar Mortos-Vivos."},
      {"name": "Característica do Domínio", "desc": "Você recebe a característica de nível 8 do seu Domínio: a maioria dos domínios concede Golpe Divino — ao acertar com arma, adicione 1d8 de dano do tipo do domínio (2d8 no nível 14); o Domínio da Luz concede Magia Potente — adicione seu modificador de Sabedoria ao dano de cantrips de Clérigo.", "subclass": True}
    ]
  },
  {
    "level": 9, "prof": 4,
    "features": [
      {"name": "Magias de Domínio (nível de personagem 9)", "desc": "Você passa a ter acesso ao quinto e último par de magias do seu Domínio (magias de 5° nível). Sempre preparadas e não contam para o limite.", "subclass": True}
    ]
  },
  {
    "level": 10, "prof": 4,
    "features": [
      {"name": "Intervenção Divina", "desc": "Você pode implorar à sua divindade para intervir em seu favor quando mais precisar. Como ação, descreva a assistência que busca e role d100. Se o resultado for igual ou menor ao seu nível de Clérigo, sua divindade intervém: o Mestre escolhe a natureza da ajuda. Se funcionar, você não pode usá-la de novo por 7 dias. Se não funcionar, pode tentar de novo após descanso longo. No nível 20, funciona automaticamente."}
    ]
  },
  {
    "level": 11, "prof": 4,
    "features": [
      {"name": "Destruir Mortos-Vivos (VD ≤ 2)", "desc": "Mortos-vivos com VD 2 ou menor são destruídos quando falham no TR de Virar Mortos-Vivos."}
    ]
  },
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
      {"name": "Destruir Mortos-Vivos (VD ≤ 3)", "desc": "Mortos-vivos com VD 3 ou menor são destruídos quando falham no TR de Virar Mortos-Vivos."}
    ]
  },
  {"level": 15, "prof": 5, "features": []},
  {
    "level": 16, "prof": 5,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {
    "level": 17, "prof": 6,
    "features": [
      {"name": "Destruir Mortos-Vivos (VD ≤ 4)", "desc": "Mortos-vivos com VD 4 ou menor são destruídos quando falham no TR de Virar Mortos-Vivos."},
      {"name": "Característica do Domínio", "desc": "Você recebe a característica de nível 17 do seu Domínio (Vida: Cura Suprema — usar valor máximo nos dados de cura; Luz: Coroa de Luz — aura de 18m de luz solar por 1 min; Tempestade: Olho da Tempestade — ao ar livre, ganhe velocidade de voo igual ao deslocamento; outros domínios têm poderes finais equivalentes).", "subclass": True}
    ]
  },
  {
    "level": 18, "prof": 6,
    "features": [
      {"name": "Canalizar Divindade (3/descanso)", "desc": "Você agora pode usar Canalizar Divindade três vezes entre descansos curtos ou longos."}
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
      {"name": "Melhoria da Intervenção Divina", "desc": "Sua chamada pela intervenção da sua divindade funciona automaticamente — não há mais necessidade de rolar d100. A divindade sempre responde ao seu pedido. Após usar, aguarde 7 dias para usar novamente."}
    ]
  }
]

data['clerigo']['levels'] = clerigo_levels

with open('public/srd-data/phb-class-progression-pt.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Clerigo reescrito com sucesso')

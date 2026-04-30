import json

with open('public/srd-data/phb-class-progression-pt.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# PHB correto:
# nv3: Juramento Sagrado (subclasse) — features em 3, 7, 15, 20
# nv7: Aura de Coragem (BASE CLASS — imunidade a medo para você e aliados)
# nv10: Característica do Juramento Sagrado (subclasse)
# nv20: Característica do Juramento Sagrado (subclasse)

paladino_levels = [
  {
    "level": 1, "prof": 2,
    "features": [
      {"name": "Sentido Divino", "desc": "Como ação, você percebe a presença de qualquer celéstio, demônio ou morto-vivo a até 18 metros de você que não esteja atrás de cobertura total. Você sabe o tipo de ser (celéstio, demônio ou morto-vivo) mas não a identidade específica. Dentro de uma magia Consagrar Terra, você sente qualquer lugar profanado ou consagrado. Você pode usar esse sentido um número de vezes igual a 1 + seu modificador de Carisma. Todos os usos são recuperados após um descanso longo."},
      {"name": "Cura pelas Mãos", "desc": "Você tem um reservatório de poder de cura que se reabastece a cada descanso longo. Com esse reservatório, pode restaurar pontos de vida totais iguais a 5 × seu nível de Paladino por dia. Como ação, você pode tocar uma criatura e curar uma quantidade de PV à sua escolha, desde que não exceda o máximo restante do reservatório. Alternativamente, pode gastar 5 PV do reservatório para curar uma doença ou neutralizar um veneno que afeta o alvo — múltiplas doenças/venenos custam 5 PV cada."}
    ]
  },
  {
    "level": 2, "prof": 2,
    "features": [
      {"name": "Estilo de Combate", "desc": "Adote um dos seguintes estilos como especialidade permanente: Defesa (+1 CA usando armadura), Duelo (+2 dano com arma de uma mão sem outra arma na segunda mão), Grande Arma (rerolar 1 e 2 nos dados de dano de armas de 2 mãos) ou Proteção (reação: impor desvantagem em ataque vs aliado adjacente, requer escudo).", "choice_id": "fighting_style"},
      {"name": "Conjuração de Paladino", "desc": "Você ganhou a habilidade de lançar magias de Paladino. Carisma é sua habilidade de conjuração. CD de magia = 8 + bônus de proficiência + modificador de Carisma. Você prepara magias após cada descanso longo, escolhendo da lista de Paladino uma quantidade igual ao seu modificador de Carisma + metade do nível de Paladino (arredondado para baixo). Você também pode usar uma magia preparada como rituais se ela tiver a propriedade ritual."},
      {"name": "Golpe Divino", "desc": "Quando você usa a ação Atacar em seu turno, antes de rolar um ataque pode declarar um Golpe Divino. Ao acertar, gaste um espaço de magia para causar +2d8 de dano radiante por nível do espaço (máximo 5d8 de bônus), além do dano normal da arma. Contra mortos-vivos e demônios, cause +1d8 radiante adicional, independente do nível do espaço."}
    ]
  },
  {
    "level": 3, "prof": 2,
    "features": [
      {"name": "Saúde Divina", "desc": "A magia divina que flui por você torna você imune a doenças. Sua ligação com uma divindade purifica seu corpo de qualquer enfermidade."},
      {"name": "Juramento Sagrado", "desc": "Você faz seu juramento sagrado, comprometendo-se com um conjunto de valores e ideais: Juramento de Devoção (paladino clássico — luz, honra, virtude; Canalizar Divindade: Arma Sagrada e Virar os Ímpios), Juramento dos Anciões (proteção da natureza e vida; Canalizar Divindade: Fúria da Natureza e Virar a Impiedade) ou Juramento de Vingança (caçar o mal com determinação implacável; Canalizar Divindade: Abjurar Inimigo e Voto de Inimizade). Cada juramento concede magias de juramento sempre preparadas e Canalizar Divindade (1 uso/descanso curto ou longo). Características de subclasse em 3, 7, 15 e 20.", "choice_id": "sacred_oath", "subclass": True}
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
      {"name": "Ataque Extra", "desc": "Quando você usa a ação Atacar no seu turno, você pode atacar duas vezes em vez de uma. Combine com Golpe Divino para maximizar seu dano em um dos ataques."}
    ]
  },
  {
    "level": 6, "prof": 3,
    "features": [
      {"name": "Aura de Proteção", "desc": "Você emana uma aura protetora que fortalece os TRs de seus aliados. Você e criaturas amigáveis a até 1,5 metros de você adicionam seu modificador de Carisma (mínimo +1) em todos os Testes de Resistência enquanto você estiver consciente. Quando você cair inconsciente, a aura cessa. No nível 18, o raio da aura aumenta para 9 metros."}
    ]
  },
  {
    "level": 7, "prof": 3,
    "features": [
      {"name": "Aura de Coragem", "desc": "Você emana uma aura de coragem que protege seus companheiros do medo. Você e criaturas amigáveis a até 1,5 metros de você não podem ser amedrontados enquanto você estiver consciente. Heróis ao seu redor encontram fortaleza em sua presença. No nível 18, o raio da aura aumenta para 9 metros."}
    ]
  },
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
      {"name": "Característica do Juramento Sagrado", "desc": "Você recebe a característica de nível 7 do seu Juramento (Devoção: Aura de Devoção — você e aliados a 1,5m imunes a ser encantados; Anciões: Aura Eterna — você e aliados a 1,5m têm resistência a dano de magias; Vingança: Vingador Implacável — ao acertar um Ataque de Oportunidade, pode mover metade do deslocamento em direção ao alvo como parte da reação).", "subclass": True}
    ]
  },
  {
    "level": 11, "prof": 4,
    "features": [
      {"name": "Golpe Divino Aprimorado", "desc": "Você é tão imbuído de energia justa que todos os seus golpes carregam poder divino. Você causa +1d8 de dano radiante adicional sempre que acertar uma criatura com um ataque de arma corpo a corpo. Esse dano é automático — não requer gastar espaços de magia."}
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
      {"name": "Toque Purificador", "desc": "Como ação, você pode usar o poder divino para encerrar uma magia que esteja afetando você ou um aliado que você toque. Para cada magia em efeito sobre o alvo, pode usar um de seus usos para encerrá-la. Você tem um número de usos iguais ao seu modificador de Carisma (mínimo 1). Todos os usos são recuperados após um descanso longo."}
    ]
  },
  {
    "level": 15, "prof": 5,
    "features": [
      {"name": "Característica do Juramento Sagrado", "desc": "Você recebe a característica de nível 15 do seu Juramento (Devoção: Pureza de Espírito — você está permanentemente sob o efeito de Proteção do Bem e do Mal; Anciões: Sentinela Imortal — ao cair a 0 PV, fique com 1 PV em vez disso, 1×/descanso longo, não funciona contra mortos-vivos/demônios; Vingança: Alma de Vingança — ao usar Voto de Inimizade e o alvo atacar outro: reação para atacar o alvo corp-a-corp).", "subclass": True}
    ]
  },
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
      {"name": "Melhoria das Auras", "desc": "O raio das suas auras de Paladino (Aura de Proteção e Aura de Coragem, além de auras concedidas por seu juramento) aumenta de 1,5 metros para 9 metros. Agora você protege um campo de batalha inteiro com sua presença divina."}
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
      {"name": "Característica do Juramento Sagrado", "desc": "Você recebe a poderosa característica épica de nível 20 do seu Juramento (Devoção: Nimbo Sagrado — 1 min: aura 9m, demônios/mortos-vivos sofrem 10 radiante/turno e você tem vantagem em TRs vs suas magias, 1×/descanso longo; Anciões: Campeão Ancião — 1 min: plantas crescem, cura 10 PV/turno, magias do juramento como ação bônus 1×/turno, 1×/descanso longo; Vingança: Avatar de Punição — 1 min: voo 18m, aura 9m, inimigos TR SAB ou amedrontados, 1×/descanso longo).", "subclass": True}
    ]
  }
]

data['paladino']['levels'] = paladino_levels

with open('public/srd-data/phb-class-progression-pt.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Paladino reescrito com sucesso')

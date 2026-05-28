import json

with open('public/srd-data/phb-class-progression-pt.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# sneak_attack_dice array is correct — increases only at odd levels
# [1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10]

ladino_levels = [
  {
    "level": 1, "prof": 2,
    "features": [
      {"name": "Especialização", "desc": "Escolha duas perícias nas quais você tenha proficiência (ou uma perícia e ferramentas de ladrão). Seu bônus de proficiência é dobrado para testes feitos com essas escolhas."},
      {"name": "Ataque Furtivo (1d6)", "desc": "Uma vez por turno, você pode causar 1d6 de dano extra se tiver vantagem na jogada de ataque — ou se um aliado capaz de agir estiver a 1,5m do alvo e você não tiver desvantagem. O ataque deve usar uma arma com propriedade Acuidade ou uma arma de Alcance. O dado aumenta a cada nível ímpar (ver tabela)."},
      {"name": "Gíria dos Ladrões", "desc": "Você aprendeu a gíria dos ladrões: uma mistura de dialeto, jargão e código que permite ocultar mensagens em conversas normais. Qualquer um que conheça a gíria entende a mensagem; outros precisam de um TR de Percepção (Sabedoria) CD 15 para notar que há uma mensagem escondida."}
    ]
  },
  {
    "level": 2, "prof": 2,
    "features": [
      {"name": "Ação Ardilosa", "desc": "Sua agilidade e astúcia permitem que você se mova e aja rapidamente. Você pode tomar uma ação bônus no seu turno para realizar uma das seguintes: Corrida, Desengajar ou Esconder."}
    ]
  },
  {
    "level": 3, "prof": 2,
    "features": [
      {"name": "Arquétipo de Gatuno", "desc": "Escolha o arquétipo que define sua especialidade: Ladrão (agilidade urbana e dispositivos mágicos), Assassino (disfarces, venenos e eliminar alvos sem alerta) ou Trapaceiro Arcano (combinação de magia de ilusão/encantamento com habilidades de gatuno). Seu arquétipo concede características nos níveis 3, 9, 13 e 17.", "choice_id": "roguish_archetype", "subclass": True},
      {"name": "Ataque Furtivo (2d6)", "desc": "Seu dado de Ataque Furtivo aumenta para 2d6."}
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
      {"name": "Esquiva Instintiva", "desc": "Quando um atacante que você possa ver o acertar com um ataque, você pode usar sua reação para reduzir o dano pela metade. Funciona mesmo contra ataques com vantagem."},
      {"name": "Ataque Furtivo (3d6)", "desc": "Seu dado de Ataque Furtivo aumenta para 3d6."}
    ]
  },
  {
    "level": 6, "prof": 3,
    "features": [
      {"name": "Especialização (mais 2 perícias)", "desc": "Escolha mais duas perícias nas quais você tenha proficiência. Seu bônus de proficiência passa a ser dobrado para essas perícias também (total: até 4 perícias com bônus dobrado)."},
      {"name": "Ataque Furtivo (3d6)", "desc": "Mantém 3d6. O dado do Ataque Furtivo só aumenta em níveis ímpares."}
    ]
  },
  {
    "level": 7, "prof": 3,
    "features": [
      {"name": "Evasão", "desc": "Você pode desviar de forma sobrenatural de explosões de efeito em área. Quando um efeito exige um TR de Destreza para sofrer apenas metade do dano, você não sofre nenhum dano com sucesso, e apenas metade com falha. Só funciona se você não estiver incapacitado."},
      {"name": "Ataque Furtivo (4d6)", "desc": "Seu dado de Ataque Furtivo aumenta para 4d6."}
    ]
  },
  {
    "level": 8, "prof": 3,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {
    "level": 9, "prof": 4,
    "features": [
      {"name": "Característica do Arquétipo de Gatuno", "desc": "Você recebe a característica de nível 9 do seu Arquétipo (Ladrão: Furtividade Suprema — vantagem em Furtividade ao mover metade do deslocamento ou menos; Assassino: Especialista em Infiltração — criar identidade falsa completa em 7 dias e 25po; Trapaceiro Arcano: Emboscada Mágica — estando oculto, o alvo tem desvantagem no TR contra suas magias).", "subclass": True},
      {"name": "Ataque Furtivo (5d6)", "desc": "Seu dado de Ataque Furtivo aumenta para 5d6."}
    ]
  },
  {
    "level": 10, "prof": 4,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."},
      {"name": "Ataque Furtivo (5d6)", "desc": "Mantém 5d6. O dado do Ataque Furtivo só aumenta em níveis ímpares."}
    ]
  },
  {
    "level": 11, "prof": 4,
    "features": [
      {"name": "Talento Confiável", "desc": "Você aperfeiçoou suas habilidades escolhidas ao ponto da excelência. Sempre que fizer um teste de habilidade que inclua seu bônus de proficiência, trate qualquer resultado de 9 ou menos no d20 como um 10. Combinado com Especialização, você raramente falha nas suas áreas de destaque."},
      {"name": "Ataque Furtivo (6d6)", "desc": "Seu dado de Ataque Furtivo aumenta para 6d6."}
    ]
  },
  {
    "level": 12, "prof": 4,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {
    "level": 13, "prof": 5,
    "features": [
      {"name": "Característica do Arquétipo de Gatuno", "desc": "Você recebe a característica de nível 13 do seu Arquétipo (Ladrão: Usar Dispositivos Mágicos — ignore requisitos de classe, raça e nível para usar itens mágicos; Assassino: Impostor — após 3h estudando alguém, imitar voz, escrita e comportamento perfeitamente; Trapaceiro Arcano: Ladrão Versátil — como ação bônus, Mão Arcana distrai criatura para você ter vantagem em ataques contra ela).", "subclass": True},
      {"name": "Ataque Furtivo (7d6)", "desc": "Seu dado de Ataque Furtivo aumenta para 7d6."}
    ]
  },
  {
    "level": 14, "prof": 5,
    "features": [
      {"name": "Sentido Cego", "desc": "Se você consegue ouvir, você está ciente da localização de qualquer criatura invisível ou oculta a até 3 metros de você, mesmo que não possa vê-la."},
      {"name": "Ataque Furtivo (7d6)", "desc": "Mantém 7d6. O dado do Ataque Furtivo só aumenta em níveis ímpares."}
    ]
  },
  {
    "level": 15, "prof": 5,
    "features": [
      {"name": "Mente Escorregadia", "desc": "Você ganhou maior resistência mental. Você agora tem proficiência em Testes de Resistência de Sabedoria — tornando muito mais difícil para inimigos encantarem ou amedrontarem você."},
      {"name": "Ataque Furtivo (8d6)", "desc": "Seu dado de Ataque Furtivo aumenta para 8d6."}
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
      {"name": "Característica do Arquétipo de Gatuno", "desc": "Você recebe a característica de nível 17 do seu Arquétipo (Ladrão: Reflexos de Ladrão — no 1° round de combate, age duas vezes: turno normal + ação extra no início com iniciativa -10; Assassino: Golpe Mortal — ao acertar criatura surpresa, TR CON (CD = 8+prof+mod DES) ou sofrer dano duplo; Trapaceiro Arcano: Ladrão de Magias — reação ao ser alvo de magia, fazer TR de Inteligência contra a CD do conjurador para roubar a magia).", "subclass": True},
      {"name": "Ataque Furtivo (9d6)", "desc": "Seu dado de Ataque Furtivo aumenta para 9d6."}
    ]
  },
  {
    "level": 18, "prof": 6,
    "features": [
      {"name": "Ilusório", "desc": "Você é tão evasivo que inimigos raramente conseguem ganhar vantagem sobre você. Nenhum ataque pode ter vantagem contra você enquanto você não estiver incapacitado."},
      {"name": "Ataque Furtivo (9d6)", "desc": "Mantém 9d6. O dado do Ataque Furtivo só aumenta em níveis ímpares."}
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
      {"name": "Golpe de Sorte", "desc": "Você tem um dom inexplicável para ter sucesso quando mais precisa. Se um ataque seu errar um alvo que você possa alcançar, você pode transformar o erro em acerto. Alternativamente, se você falhar em um teste de habilidade, pode tratar o d20 como se mostrasse 20. Uma vez usado, você não pode usá-lo novamente até terminar um descanso curto ou longo."},
      {"name": "Ataque Furtivo (10d6)", "desc": "Seu dado de Ataque Furtivo atinge o máximo: 10d6."}
    ]
  }
]

data['ladino']['levels'] = ladino_levels

with open('public/srd-data/phb-class-progression-pt.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Ladino reescrito com sucesso')

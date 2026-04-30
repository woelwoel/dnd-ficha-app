import json

with open('public/srd-data/phb-class-progression-pt.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Patrulheiro: meio-conjurador (Sabedoria), magias CONHECIDAS (não preparadas)
# Subclasses: features em 3, 7, 11, 15
# Magias conhecidas: 2·3·3·4·4·5·5·6·6·7·7·8·8·9·9·10·10·11·11·11

patrulheiro_levels = [
  {
    "level": 1, "prof": 2,
    "features": [
      {"name": "Inimigo Favorito", "desc": "Escolha um tipo de inimigo favorito: aberrações, bestas, celestiais, construtos, dragões, elementais, fadas, demônios, gigantes, humanoides (especifique 2 raças), mortos-vivos, limo ou plantas. Você tem vantagem em testes de Sobrevivência para rastrear esses inimigos e em testes de Intuição para lembrá-los. Também aprende 1 idioma associado ao seu inimigo favorito (se aplicável). Você ganha mais tipos de inimigos favoritos nos níveis 6 e 14.", "choice_id": "favored_enemy"},
      {"name": "Explorador Natural", "desc": "Escolha um tipo de terreno favorito: Ártico, Costa, Deserto, Floresta, Pântano, Planície, Montanha ou Subterrâneo. Ao viajar por pelo menos 1 hora nesse terreno: não se perde por meios não mágicos; dobra o bônus de proficiência em Inteligência e Sabedoria para interagir com o terreno; permanece alerta mesmo rastreando ou navegando; pode se mover furtivamente em ritmo normal em grupo; encontra comida/água dupla. Você ganha mais terrenos favoritos nos níveis 6 e 10.", "choice_id": "natural_explorer"}
    ]
  },
  {
    "level": 2, "prof": 2,
    "features": [
      {"name": "Estilo de Combate", "desc": "Adote um dos seguintes estilos como especialidade permanente: Arquearia (+2 em jogadas de ataque com armas de alcance), Defesa (+1 CA usando armadura), Duelo (+2 dano com arma de uma mão sem outra arma na segunda mão) ou Combate com Duas Armas (adicionar modificador de atributo ao dano da arma da segunda mão).", "choice_id": "fighting_style"},
      {"name": "Conjuração de Patrulheiro", "desc": "Você ganhou a habilidade de lançar magias. Sabedoria é sua habilidade de conjuração. CD de magia = 8 + bônus de proficiência + modificador de Sabedoria. Diferente de algumas classes, você conhece magias de cor (não precisa preparar lista diária). Você começa conhecendo 2 magias e aprende mais conforme sobe de nível (máximo 11 magias conhecidas). Espaços de magia seguem a mesma tabela de progressão que o Paladino (meio-conjurador)."}
    ]
  },
  {
    "level": 3, "prof": 2,
    "features": [
      {"name": "Arquétipo do Patrulheiro", "desc": "Escolha o arquétipo que define sua especialidade como patrulheiro: Caçador (habilidades de combate adaptáveis para caçar qualquer tipo de presa — escolha entre Abater Colossos, Matador de Gigantes ou Quebrar a Horda) ou Mestre das Bestas (laço sobrenatural com uma besta companheira que luta ao seu lado). Seu arquétipo concede características nos níveis 3, 7, 11 e 15.", "choice_id": "ranger_archetype", "subclass": True},
      {"name": "Consciência Primeva", "desc": "Você pode gastar 1 espaço de magia para concentrar-se por até 1 minuto. Durante esse tempo, você detecta a presença (mas não a localização exata) de qualquer criatura dos seguintes tipos dentro de 1,6 km (6,4 km em seu terreno favorito): aberrações, celéstios, dragões, elementais, fadas, demônios e mortos-vivos. Isso não lhe diz quantas são ou o que são exatamente — apenas que existem."}
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
      {"name": "Ataque Extra", "desc": "Quando você usa a ação Atacar no seu turno, você pode atacar duas vezes em vez de uma. Fundamental para Patrulheiros que usam combate com duas armas ou arquearia."}
    ]
  },
  {
    "level": 6, "prof": 3,
    "features": [
      {"name": "Inimigo Favorito (2° tipo)", "desc": "Você ganha um segundo tipo de inimigo favorito. Além disso, o dano que você causa contra seus inimigos favoritos aumenta em +4."},
      {"name": "Explorador Natural (2° terreno)", "desc": "Você ganha um segundo tipo de terreno favorito e passa a aplicar todos os benefícios de Explorador Natural nesse terreno também."}
    ]
  },
  {
    "level": 7, "prof": 3,
    "features": [
      {"name": "Característica do Arquétipo do Patrulheiro", "desc": "Você recebe a característica de nível 7 do seu Arquétipo (Caçador: Táticas Defensivas — escolha 1: Escapar da Horda (sem Ataques de Oportunidade ao sair de alcance), Defesa Múltipla (+4 CA contra o primeiro ataque após receber ataque), ou Vontade de Aço (vantagem em TRs contra medo); Mestre das Bestas: Treinamento Excepcional — ação bônus para ordenar Corrida/Desengajar/Esquivar/Ajudar à besta, e seus ataques passam a ser mágicos).", "subclass": True}
    ]
  },
  {
    "level": 8, "prof": 3,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."},
      {"name": "Passo da Terra", "desc": "Atravessar terreno difícil não mágico não custa movimento extra. Além disso, plantas não mágicas não podem imobilizá-lo — você atravessa trepadeiras, galhos e raízes sem ser preso ou retardado."}
    ]
  },
  {"level": 9, "prof": 4, "features": []},
  {
    "level": 10, "prof": 4,
    "features": [
      {"name": "Explorador Natural (3° terreno)", "desc": "Você ganha um terceiro tipo de terreno favorito."},
      {"name": "Ocultar-se às Claras", "desc": "Você pode passar 1 minuto se camuflando em seu ambiente natural. Após isso, enquanto permanecer estacionário, você adiciona +10 ao seu total de testes de Furtividade. Moveu-se? Precisa se camuflar de novo."}
    ]
  },
  {
    "level": 11, "prof": 4,
    "features": [
      {"name": "Característica do Arquétipo do Patrulheiro", "desc": "Você recebe a característica de nível 11 do seu Arquétipo (Caçador: Múltiplos Ataques — escolha 1: Volei (usando ação Atacar, faça um ataque de arco contra cada criatura em raio de 3m de um ponto dentro do alcance, usando um projétil por alvo) ou Redemoinho (usando ação Atacar, faça um ataque corp-a-corp contra cada criatura ao seu alcance); Mestre das Bestas: Fúria da Besta — ao ordenar à besta que ataque, ela ataca duas vezes).", "subclass": True}
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
      {"name": "Desaparecer", "desc": "Você pode usar Esconder como ação bônus no seu turno. Além disso, você não pode ser rastreado por meios não mágicos, a menos que decida deixar rastros."},
      {"name": "Inimigo Favorito (3° tipo)", "desc": "Você ganha um terceiro tipo de inimigo favorito."}
    ]
  },
  {
    "level": 15, "prof": 5,
    "features": [
      {"name": "Característica do Arquétipo do Patrulheiro", "desc": "Você recebe a característica de nível 15 do seu Arquétipo (Caçador: Defesa Superior — escolha 1: Evasão (TRs DES: sucesso = 0 dano, falha = metade), Resistência de Batalha (quando um ataque te erra, pode usar reação para forçar o atacante a rerolar com desvantagem), ou Esquiva Instintiva (ao ser acertado, reação para reduzir o dano pela metade)); Mestre das Bestas: Compartilhar Magias — ao lançar uma magia em si mesmo, pode afetá-la também à besta a até 9m).", "subclass": True}
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
      {"name": "Sentidos Ferais", "desc": "Você ganha sentidos sobre-humanos que detectam inimigos ocultos. Você está ciente da localização de qualquer criatura invisível a até 9 metros de você, mesmo que não possa vê-la. Além disso, você não tem desvantagem em ataques contra criaturas invisíveis nesse raio."}
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
      {"name": "Matador de Inimigos", "desc": "Você tornou-se um caçador incomparável de seus inimigos. Uma vez em cada um de seus turnos, quando você fizer uma jogada de ataque ou dano contra um de seus inimigos favoritos, pode adicionar seu modificador de Sabedoria à jogada. O bônus se aplica separadamente ao ataque ou ao dano, à sua escolha — não a ambos na mesma rolagem."}
    ]
  }
]

data['patrulheiro']['levels'] = patrulheiro_levels

with open('public/srd-data/phb-class-progression-pt.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Patrulheiro reescrito com sucesso')

import json

with open('public/srd-data/phb-class-progression-pt.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

monge_levels = [
  {
    "level": 1, "prof": 2,
    "features": [
      {"name": "Defesa Desarmada", "desc": "Enquanto não estiver usando armadura nem empunhando um escudo, sua CA é igual a 10 + modificador de Destreza + modificador de Sabedoria. Isso torna a Sabedoria diretamente relevante para sua sobrevivência em combate."},
      {"name": "Artes Marciais (d4)", "desc": "Você domina estilos de combate que usam ataques desarmados e armas de monge (espadas curtas e armas simples sem propriedade Pesada ou Alcance). Ao usar essas armas ou atacar desarmado: use Destreza em vez de Força para ataque e dano; use o dado de Artes Marciais (d4) se for maior que o dado normal da arma; faça 1 ataque desarmado como ação bônus após usar a ação Atacar. O dado aumenta conforme o nível (d6 no 5°, d8 no 11°, d10 no 17°)."}
    ],
    "class_specific": {"ki_points": 0, "martial_arts_die": "d4", "unarmored_movement_bonus": 0}
  },
  {
    "level": 2, "prof": 2,
    "features": [
      {"name": "Ki", "desc": "Você canaliza a energia mística chamada ki que flui em seu interior. Você tem um número de pontos de Ki igual ao seu nível de Monge (2 pontos agora). Esses pontos se recuperam após um descanso curto ou longo. Você pode gastar Ki para ativar as seguintes habilidades:\n• Rajada de Golpes (1 Ki): ao usar a ação Atacar, realize mais 2 ataques desarmados como ação bônus.\n• Defesa Paciente (1 Ki): use Esquivar como ação bônus.\n• Vento na Corrida (1 Ki): use Desengajar e Corrida como ação bônus."},
      {"name": "Movimento Desarmado (+3m)", "desc": "Sua velocidade aumenta em 3 metros enquanto não estiver usando armadura nem empunhando escudo. Esse bônus aumenta conforme você sobe de nível: +4,5m no 5°, +6m no 11°, +7,5m no 16°."}
    ],
    "class_specific": {"ki_points": 2, "martial_arts_die": "d4", "unarmored_movement_bonus": 3}
  },
  {
    "level": 3, "prof": 2,
    "features": [
      {"name": "Tradição Monástica", "desc": "Você se compromete com uma tradição monástica: Caminho da Mão Aberta (técnicas avançadas de combate desarmado — derrubar, empurrar, negar reações), Caminho das Sombras (magia sombria e furtividade, movendo-se entre as sombras) ou Caminho dos Quatro Elementos (canalizar elementos através do ki para criar efeitos poderosos). Sua tradição concede características nos níveis 3, 6, 11 e 17.", "choice_id": "monastic_tradition", "subclass": True},
      {"name": "Defletir Projéteis", "desc": "Como reação ao ser acertado por um ataque com arma de projétil, você pode reduzir o dano em 1d10 + modificador de Destreza + nível de Monge. Se reduzir o dano a 0, pode pegar o projétil. Se tiver mãos livres, pode lançá-lo gastando 1 ponto de Ki como parte da mesma reação: faça um ataque à distância (alcance 9m/18m, dano 1d6 + modificador de Destreza)."}
    ],
    "class_specific": {"ki_points": 3, "martial_arts_die": "d4", "unarmored_movement_bonus": 3}
  },
  {
    "level": 4, "prof": 2,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."},
      {"name": "Queda Lenta", "desc": "Como reação ao cair, você pode reduzir o dano de queda em 5 × seu nível de Monge. No nível 4, isso significa até 20 pontos de dano reduzido. Você simplesmente pousa com graça excepcional, absorvendo o impacto com seu treinamento."}
    ],
    "class_specific": {"ki_points": 4, "martial_arts_die": "d4", "unarmored_movement_bonus": 3}
  },
  {
    "level": 5, "prof": 3,
    "features": [
      {"name": "Ataque Extra", "desc": "Quando você usa a ação Atacar no seu turno, você pode atacar duas vezes em vez de uma. Combinado com a ação bônus de Artes Marciais e Rajada de Golpes, você pode desferir múltiplos golpes por turno."},
      {"name": "Golpe Atordoante", "desc": "Quando você acertar uma criatura com um ataque de arma, pode gastar 1 ponto de Ki para tentar atordoá-la. O alvo deve ser bem-sucedido em um TR de Constituição (CD = 8 + bônus de proficiência + modificador de Sabedoria) ou ficará atordoado até o início do seu próximo turno. Criaturas atordoadas perdem reações, não podem se mover nem agir, e ataques contra elas têm vantagem — o que também ativa Ataque Furtivo."},
      {"name": "Artes Marciais (d6)", "desc": "Seu dado de Artes Marciais aumenta para d6."}
    ],
    "class_specific": {"ki_points": 5, "martial_arts_die": "d6", "unarmored_movement_bonus": 4.5}
  },
  {
    "level": 6, "prof": 3,
    "features": [
      {"name": "Golpes Imbuídos de Ki", "desc": "Seus ataques desarmados contam como mágicos para fins de superar resistências e imunidades a dano não mágico. Muitos demônios, mortos-vivos e outras criaturas poderosas possuem resistência ou imunidade a dano mundano — seus punhos agora penetram essas defesas."},
      {"name": "Característica da Tradição Monástica", "desc": "Você recebe a característica de nível 6 da sua Tradição (Mão Aberta: Completude do Ser — ação para curar 3 × nível Monge PV, 1×/descanso longo; Sombras: Passo das Sombras — ação bônus para teleportar até 18m entre sombras com vantagem no próximo ataque; Quatro Elementos: +1 disciplina elemental, totalizando 3).", "subclass": True},
      {"name": "Movimento Desarmado (+4,5m)", "desc": "Seu bônus de deslocamento aumenta para +4,5 metros sem armadura."}
    ],
    "class_specific": {"ki_points": 6, "martial_arts_die": "d6", "unarmored_movement_bonus": 4.5}
  },
  {
    "level": 7, "prof": 3,
    "features": [
      {"name": "Evasão", "desc": "Seu instinto aguçado permite desviar de explosões com agilidade sobrenatural. Quando um efeito exige um TR de Destreza para sofrer apenas metade do dano, você não sofre nenhum dano com um sucesso, e apenas metade com uma falha. Só funciona se você não estiver incapacitado."},
      {"name": "Tranquilidade Mental", "desc": "Como ação, você pode usar seu treinamento em meditação para encerrar um efeito de encantamento ou medo que esteja afetando você. Sua disciplina mental lhe permite recuperar o controle mesmo sob magia hostil."}
    ],
    "class_specific": {"ki_points": 7, "martial_arts_die": "d6", "unarmored_movement_bonus": 4.5}
  },
  {
    "level": 8, "prof": 3,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ],
    "class_specific": {"ki_points": 8, "martial_arts_die": "d6", "unarmored_movement_bonus": 4.5}
  },
  {
    "level": 9, "prof": 4,
    "features": [
      {"name": "Movimento Desarmado Aprimorado", "desc": "Seu Movimento Desarmado agora lhe permite escalar superfícies verticais e tetos sem precisar usar as mãos, e correr sobre líquidos (água, lama, gelo) sem afundar, desde que comece e termine o movimento em superfície sólida."}
    ],
    "class_specific": {"ki_points": 9, "martial_arts_die": "d6", "unarmored_movement_bonus": 4.5}
  },
  {
    "level": 10, "prof": 4,
    "features": [
      {"name": "Pureza de Corpo", "desc": "Seu ki expulsou as impurezas de seu corpo. Você se torna imune a doenças e ao estado envenenado, e ao dano de veneno. Décadas de treinamento e meditação purificaram seu sistema a um nível sobre-humano."}
    ],
    "class_specific": {"ki_points": 10, "martial_arts_die": "d6", "unarmored_movement_bonus": 4.5}
  },
  {
    "level": 11, "prof": 4,
    "features": [
      {"name": "Característica da Tradição Monástica", "desc": "Você recebe a característica de nível 11 da sua Tradição (Mão Aberta: Serenidade — você tem Santuário permanente com CD baseada em Sabedoria, renovado em cada descanso longo; Sombras: Manto das Sombras — ação para se tornar invisível até atacar, lançar magia ou entrar em luz brilhante; Quatro Elementos: +1 disciplina elemental, totalizando 4).", "subclass": True},
      {"name": "Artes Marciais (d8)", "desc": "Seu dado de Artes Marciais aumenta para d8."},
      {"name": "Movimento Desarmado (+6m)", "desc": "Seu bônus de deslocamento aumenta para +6 metros sem armadura."}
    ],
    "class_specific": {"ki_points": 11, "martial_arts_die": "d8", "unarmored_movement_bonus": 6}
  },
  {
    "level": 12, "prof": 4,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ],
    "class_specific": {"ki_points": 12, "martial_arts_die": "d8", "unarmored_movement_bonus": 6}
  },
  {
    "level": 13, "prof": 5,
    "features": [
      {"name": "Língua do Sol e da Lua", "desc": "Você aprende a tocar o ki de outras mentes, estabelecendo compreensão mútua. Você pode se comunicar com qualquer criatura que seja capaz de entender pelo menos um idioma — ela ouvirá sua intenção e você a dela, independentemente de qual idioma cada um fale. Não funciona com criaturas sem capacidade de linguagem."}
    ],
    "class_specific": {"ki_points": 13, "martial_arts_die": "d8", "unarmored_movement_bonus": 6}
  },
  {
    "level": 14, "prof": 5,
    "features": [
      {"name": "Alma de Diamante", "desc": "Seu domínio do ki concede proficiência em todos os Testes de Resistência. Além disso, sempre que falhar em um TR, você pode gastar 1 ponto de Ki para rerollar o dado e usar o novo resultado. A disciplina de uma vida inteira torna você quase imparável."}
    ],
    "class_specific": {"ki_points": 14, "martial_arts_die": "d8", "unarmored_movement_bonus": 6}
  },
  {
    "level": 15, "prof": 5,
    "features": [
      {"name": "Corpo Eterno", "desc": "Seu ki preserva seu corpo além dos limites naturais. Você envelhece 10 vezes mais devagar que o normal, e não pode ser envelhecido magicamente. Sua aparência e vitalidade permanecem jovens por séculos."}
    ],
    "class_specific": {"ki_points": 15, "martial_arts_die": "d8", "unarmored_movement_bonus": 6}
  },
  {
    "level": 16, "prof": 5,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."},
      {"name": "Movimento Desarmado (+7,5m)", "desc": "Seu bônus de deslocamento aumenta para +7,5 metros sem armadura."}
    ],
    "class_specific": {"ki_points": 16, "martial_arts_die": "d8", "unarmored_movement_bonus": 7.5}
  },
  {
    "level": 17, "prof": 6,
    "features": [
      {"name": "Característica da Tradição Monástica", "desc": "Você recebe a característica de nível 17 da sua Tradição (Mão Aberta: Golpe Trêmulo — gaste 3 Ki ao acertar para iniciar vibração interna; como ação posterior, se o alvo tiver menos de 100 PV reduza a 0, se tiver 100 ou mais PV cause 10d10 de dano psíquico com TR CON para metade; Sombras: Oportunismo — reação para atacar corp-a-corp quando um aliado acertar uma criatura a 1,5m de você; Quatro Elementos: +1 disciplina elemental, totalizando 5).", "subclass": True},
      {"name": "Artes Marciais (d10)", "desc": "Seu dado de Artes Marciais aumenta para d10."}
    ],
    "class_specific": {"ki_points": 17, "martial_arts_die": "d10", "unarmored_movement_bonus": 7.5}
  },
  {
    "level": 18, "prof": 6,
    "features": [
      {"name": "Corpo Vazio", "desc": "Você pode usar sua ação e gastar 4 pontos de Ki para se tornar invisível por 1 minuto. Durante esse tempo, você também tem resistência a todo dano não mágico. Alternativamente, você pode gastar 8 pontos de Ki para lançar o feitiço Viajar pelo Éter, sem precisar de componentes, durando 1 minuto."}
    ],
    "class_specific": {"ki_points": 18, "martial_arts_die": "d10", "unarmored_movement_bonus": 7.5}
  },
  {
    "level": 19, "prof": 6,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ],
    "class_specific": {"ki_points": 19, "martial_arts_die": "d10", "unarmored_movement_bonus": 7.5}
  },
  {
    "level": 20, "prof": 6,
    "features": [
      {"name": "Eu Perfeito", "desc": "Quando rolar a iniciativa e não tiver pontos de Ki, você recupera automaticamente 4 pontos de Ki. O ápice do treinamento monástico garante que você nunca entre em combate completamente sem recursos — mesmo após longas batalhas."}
    ],
    "class_specific": {"ki_points": 20, "martial_arts_die": "d10", "unarmored_movement_bonus": 7.5}
  }
]

data['monge']['levels'] = monge_levels

with open('public/srd-data/phb-class-progression-pt.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Monge reescrito com sucesso')

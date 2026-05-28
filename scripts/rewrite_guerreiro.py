import json

with open('public/srd-data/phb-class-progression-pt.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

guerreiro_levels = [
  {
    "level": 1, "prof": 2,
    "features": [
      {"name": "Estilo de Combate", "desc": "Adote um dos seguintes estilos como especialidade permanente: Arquearia (+2 em ataques com armas de alcance), Defesa (+1 CA usando armadura), Duelo (+2 dano com arma de uma mão sem outra arma na segunda mão), Grande Arma (rerolar 1 e 2 nos dados de dano de armas de 2 mãos), Proteção (reação: impor desvantagem em ataque vs aliado adjacente, requer escudo), Duas Armas (adicionar modificador de atributo ao dano da segunda arma).", "choice_id": "fighting_style"},
      {"name": "Segunda Rajada", "desc": "Como ação bônus no seu turno, você pode recuperar PV iguais a 1d10 + seu nível de Guerreiro. Recupera o uso ao terminar um descanso curto ou longo. Disponível mesmo em armadura pesada e durante combate."}
    ]
  },
  {
    "level": 2, "prof": 2,
    "features": [
      {"name": "Surto de Ação (1 uso)", "desc": "Uma vez por descanso curto ou longo, você pode realizar uma ação adicional no seu turno além da sua ação normal e possível ação bônus. Surtos de Ação adicionais ao nível 17 permitem até 2 usos por descanso, mas apenas 1 por turno."}
    ]
  },
  {
    "level": 3, "prof": 2,
    "features": [
      {"name": "Arquétipo Marcial", "desc": "Escolha o arquétipo que melhor reflete seu estilo e técnicas de combate: Campeão (foco em acertos críticos e atletismo extremo), Mestre de Batalha (manobras táticas com Dados de Superioridade) ou Cavaleiro Eldritch (combinação de magia e espada). Seu arquétipo concede características nos níveis 3, 7, 10, 15 e 18.", "choice_id": "martial_archetype", "subclass": True}
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
      {"name": "Ataque Extra", "desc": "Quando você usa a ação Atacar no seu turno, você pode atacar duas vezes em vez de uma. Este total sobe para 3 ataques no nível 11 e 4 ataques no nível 20."}
    ]
  },
  {
    "level": 6, "prof": 3,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {
    "level": 7, "prof": 3,
    "features": [
      {"name": "Característica do Arquétipo Marcial", "desc": "Você recebe a característica de nível 7 do seu Arquétipo (Campeão: Atleta Notável — dobrar prof em Atletismo ou Acrobacia, levantar gasta apenas 1,5m; Mestre de Batalha: Conheça seu Inimigo — 1 min observando: compare FOR, DES, CON, CA, PV e nível; Cavaleiro Eldritch: Guerra da Mente — ao lançar cantrig, atacar com arma como ação bônus).", "subclass": True}
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
      {"name": "Indomável (1 uso)", "desc": "Você pode rerolar um TR que falhou, devendo usar o novo resultado. Você não pode usar esta característica novamente até terminar um descanso longo. O número de usos aumenta: 2 usos no nível 13 e 3 usos no nível 17."}
    ]
  },
  {
    "level": 10, "prof": 4,
    "features": [
      {"name": "Característica do Arquétipo Marcial", "desc": "Você recebe a característica de nível 10 do seu Arquétipo (Campeão: Estilo de Combate Adicional — escolha um segundo estilo permanente; Mestre de Batalha: Superioridade Aprimorada — dados sobem para d10, 6 manobras; Cavaleiro Eldritch: Golpe Eldritch — ao acertar com arma, alvo tem desvantagem no próximo TR vs magia até o próximo turno).", "subclass": True}
    ]
  },
  {
    "level": 11, "prof": 4,
    "features": [
      {"name": "Ataque Extra (3 ataques)", "desc": "Quando você usa a ação Atacar no seu turno, você pode atacar três vezes em vez de duas."}
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
      {"name": "Indomável (2 usos)", "desc": "Você pode usar Indomável duas vezes entre descansos longos."}
    ]
  },
  {
    "level": 14, "prof": 5,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {
    "level": 15, "prof": 5,
    "features": [
      {"name": "Característica do Arquétipo Marcial", "desc": "Você recebe a característica de nível 15 do seu Arquétipo (Campeão: Crítico Superior — crítico com 18–20; Mestre de Batalha: Implacável — ao rolar iniciativa sem Dados de Superioridade, recuperar 1; Cavaleiro Eldritch: Carga Arcana — ao usar Surto de Ação, teleportar até 9m antes ou depois dos ataques).", "subclass": True}
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
      {"name": "Surto de Ação (2 usos)", "desc": "Você pode usar Surto de Ação duas vezes antes de precisar de um descanso curto ou longo, mas apenas uma vez por turno."},
      {"name": "Indomável (3 usos)", "desc": "Você pode usar Indomável três vezes entre descansos longos."}
    ]
  },
  {
    "level": 18, "prof": 6,
    "features": [
      {"name": "Característica do Arquétipo Marcial", "desc": "Você recebe a característica de nível 18 do seu Arquétipo (Campeão: Sobrevivente — ao início do seu turno com PV abaixo da metade, recupere 5 + mod CON PV; Mestre de Batalha: Superioridade Aprimorada II — 6 dados d12, 6 manobras; Cavaleiro Eldritch: Magia de Guerra Aprimorada — ao lançar magia de 1° ou 2° nível, atacar com arma como ação bônus).", "subclass": True}
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
      {"name": "Ataque Extra (4 ataques)", "desc": "Quando você usa a ação Atacar no seu turno, você pode atacar quatro vezes em vez de três. Este é o pico do poder marcial — nenhum guerreiro faz mais ataques do que você."}
    ]
  }
]

data['guerreiro']['levels'] = guerreiro_levels

with open('public/srd-data/phb-class-progression-pt.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Guerreiro reescrito com sucesso')

import json

with open('public/srd-data/phb-class-progression-pt.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Fix invocations_known top-level array
# Correct: nv1=0, nv2-4=2, nv5-6=3, nv7-8=4, nv9-11=5, nv12-14=6, nv15-17=7, nv18-20=8
data['bruxo']['invocations_known'] = [0,2,2,2,3,3,4,4,5,5,5,6,6,6,7,7,7,8,8,8]

bruxo_levels = [
  {
    "level": 1, "prof": 2,
    "features": [
      {"name": "Patrono Sobrenatural", "desc": "Você fechou um pacto com um ser sobrenatural de poder imenso. Escolha seu patrono: A Arquifada (ser feérico de enorme beleza e poder), O Demônio (entidade infernal do plano do Averno) ou O Grande Antigo (ser além da compreensão mortal). Cada patrono concede magias bônus e características nos níveis 1, 6, 10 e 14.", "choice_id": "patron", "subclass": True},
      {"name": "Magia de Pacto", "desc": "Você canaliza poder mágico diretamente do seu pacto sobrenatural. Carisma é sua habilidade de magia. CD de magia = 8 + bônus de proficiência + modificador de Carisma. Seus espaços de magia de Pacto se recuperam ao final de um descanso curto ou longo — e todos têm o mesmo nível, que cresce com seus níveis de Bruxo. No nível 1: 1 espaço de 1° nível."}
    ],
    "class_specific": {"pact_slots": 1, "pact_slot_level": 1, "invocations": 0}
  },
  {
    "level": 2, "prof": 2,
    "features": [
      {"name": "Invocações Eldritch", "desc": "Você desvenda fragmentos de conhecimento proibido que conferem habilidades arcanas permanentes. Você aprende 2 Invocações Eldritch da lista do Bruxo. Ao subir de nível como Bruxo, você pode substituir uma invocação que conhece por outra para a qual se qualifique. O total de invocações que você conhece cresce conforme a tabela da classe."}
    ],
    "class_specific": {"pact_slots": 2, "pact_slot_level": 1, "invocations": 2}
  },
  {
    "level": 3, "prof": 2,
    "features": [
      {"name": "Dádiva de Pacto", "desc": "Seu patrono sobrenatural lhe concede um dom especial como recompensa pelos seus serviços. Escolha uma das três opções: Pacto da Corrente — obtenha um familiar poderoso (pode ser imp, quasit, sprite ou pseudodragão); Pacto da Lâmina — como ação bônus, invoque uma arma mágica que conta como mágica e pode mudar de forma; Pacto do Tomo — receba o Livro das Sombras com 3 cantrips extras de qualquer lista de classe.", "choice_id": "pact_boon"}
    ],
    "class_specific": {"pact_slots": 2, "pact_slot_level": 2, "invocations": 2}
  },
  {
    "level": 4, "prof": 2,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ],
    "class_specific": {"pact_slots": 2, "pact_slot_level": 2, "invocations": 2}
  },
  {
    "level": 5, "prof": 3,
    "features": [],
    "class_specific": {"pact_slots": 2, "pact_slot_level": 3, "invocations": 3}
  },
  {
    "level": 6, "prof": 3,
    "features": [
      {"name": "Característica do Patrono Sobrenatural", "desc": "Você recebe a característica de nível 6 do seu Patrono (Arquifada: Fuga Mística — reação ao sofrer dano, torne-se invisível e teletransporte 18m; O Demônio: Sorte do Sombrio — adicione d10 a qualquer teste ou TR uma vez entre descansos; O Grande Antigo: Proteção Entrópica — reação para impor desvantagem em ataque contra você).", "subclass": True}
    ],
    "class_specific": {"pact_slots": 2, "pact_slot_level": 3, "invocations": 3}
  },
  {
    "level": 7, "prof": 3,
    "features": [],
    "class_specific": {"pact_slots": 2, "pact_slot_level": 4, "invocations": 4}
  },
  {
    "level": 8, "prof": 3,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ],
    "class_specific": {"pact_slots": 2, "pact_slot_level": 4, "invocations": 4}
  },
  {
    "level": 9, "prof": 4,
    "features": [],
    "class_specific": {"pact_slots": 2, "pact_slot_level": 5, "invocations": 5}
  },
  {
    "level": 10, "prof": 4,
    "features": [
      {"name": "Característica do Patrono Sobrenatural", "desc": "Você recebe a característica de nível 10 do seu Patrono (Arquifada: Defesas Sedutoras — imunidade a encantamento e pode refletir o efeito de volta ao atacante; O Demônio: Resiliência Demoníaca — após descanso, escolha 1 tipo de dano para ter resistência até o próximo descanso; O Grande Antigo: Pensamentos Blindados — resistência a dano psíquico e mente ilegível magicamente).", "subclass": True}
    ],
    "class_specific": {"pact_slots": 2, "pact_slot_level": 5, "invocations": 5}
  },
  {
    "level": 11, "prof": 4,
    "features": [
      {"name": "Misticismo Arcano (6° nível)", "desc": "Você aprende um segredo de magia de poder além dos seus espaços de Pacto. Escolha uma magia de 6° nível da lista do Bruxo. Você pode lançá-la uma vez sem gastar um espaço de magia. Deve terminar um descanso longo antes de usá-la desta forma novamente. Ao nível 13, 15 e 17 você aprende magias adicionais de 7°, 8° e 9° nível pelo mesmo método."}
    ],
    "class_specific": {"pact_slots": 3, "pact_slot_level": 5, "invocations": 5}
  },
  {
    "level": 12, "prof": 4,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ],
    "class_specific": {"pact_slots": 3, "pact_slot_level": 5, "invocations": 6}
  },
  {
    "level": 13, "prof": 5,
    "features": [
      {"name": "Misticismo Arcano (7° nível)", "desc": "Você aprende uma magia de 7° nível da lista do Bruxo e pode lançá-la uma vez por descanso longo sem gastar espaço de magia."}
    ],
    "class_specific": {"pact_slots": 3, "pact_slot_level": 5, "invocations": 6}
  },
  {
    "level": 14, "prof": 5,
    "features": [
      {"name": "Característica do Patrono Sobrenatural", "desc": "Você recebe a característica de nível 14 do seu Patrono (Arquifada: Escuridão Dançante — encantar ou amedrontar criatura a 18m por 1 min, Concentração, 1×/descanso longo; O Demônio: Percussão pelo Inferno — ao acertar ataque, envie o alvo para o inferno brevemente: ele sofre 10d10 de dano psíquico ao retornar, 1×/descanso longo; O Grande Antigo: Criar Servo Mental — encantar permanentemente um humanoide incapacitado pelo seu toque).", "subclass": True}
    ],
    "class_specific": {"pact_slots": 3, "pact_slot_level": 5, "invocations": 6}
  },
  {
    "level": 15, "prof": 5,
    "features": [
      {"name": "Misticismo Arcano (8° nível)", "desc": "Você aprende uma magia de 8° nível da lista do Bruxo e pode lançá-la uma vez por descanso longo sem gastar espaço de magia."}
    ],
    "class_specific": {"pact_slots": 3, "pact_slot_level": 5, "invocations": 7}
  },
  {
    "level": 16, "prof": 5,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ],
    "class_specific": {"pact_slots": 3, "pact_slot_level": 5, "invocations": 7}
  },
  {
    "level": 17, "prof": 6,
    "features": [
      {"name": "Misticismo Arcano (9° nível)", "desc": "Você aprende uma magia de 9° nível da lista do Bruxo e pode lançá-la uma vez por descanso longo sem gastar espaço de magia. Este é o ápice do poder eldritch ao seu alcance."}
    ],
    "class_specific": {"pact_slots": 4, "pact_slot_level": 5, "invocations": 7}
  },
  {
    "level": 18, "prof": 6,
    "features": [],
    "class_specific": {"pact_slots": 4, "pact_slot_level": 5, "invocations": 8}
  },
  {
    "level": 19, "prof": 6,
    "features": [
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ],
    "class_specific": {"pact_slots": 4, "pact_slot_level": 5, "invocations": 8}
  },
  {
    "level": 20, "prof": 6,
    "features": [
      {"name": "Mestre Eldritch", "desc": "Você pode clamar a seu patrono para recuperar seu poder gasto. Como ação, passe 1 minuto em comunicação com seu patrono pedindo para restaurar todos os seus espaços de Magia de Pacto. Uma vez usado, você não pode usar esta característica novamente até terminar um descanso longo."}
    ],
    "class_specific": {"pact_slots": 4, "pact_slot_level": 5, "invocations": 8}
  }
]

data['bruxo']['levels'] = bruxo_levels

with open('public/srd-data/phb-class-progression-pt.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Bruxo reescrito com sucesso')

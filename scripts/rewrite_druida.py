import json

with open('public/srd-data/phb-class-progression-pt.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Fix wild_shape_cr — was off by one index
# PHB: nv1=none, nv2=CR1/4(no fly/swim), nv4=CR1/2(no fly), nv8=CR1(sem restricao)
data['druida']['wild_shape_cr'] = [
  None, "1/4", "1/4", "1/2", "1/2", "1/2", "1/2", "1",
  "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1", "1"
]

druida_levels = [
  {
    "level": 1, "prof": 2,
    "features": [
      {"name": "Conjuração de Druida", "desc": "Sua magia emana da natureza e do mundo selvagem. Sabedoria é sua habilidade de magia. CD de magia = 8 + bônus de proficiência + modificador de Sabedoria. Você prepara magias após cada descanso longo, escolhendo da lista de Druida em número igual ao modificador de Sabedoria + nível de Druida (mínimo 1). Pode usar um foco drúidico (galho, totem, cajado sagrado) no lugar de componentes materiais."},
      {"name": "Drúidico", "desc": "Você conhece o Drúidico, o idioma secreto dos druidas. Pode usá-lo para deixar mensagens ocultas em qualquer lugar. Você e outros druidas identificam automaticamente essas mensagens. Qualquer outro personagem precisa de um TR de Percepção (Sabedoria) CD 15 para notar que há uma mensagem, mas não consegue decifrá-la sem magia."}
    ]
  },
  {
    "level": 2, "prof": 2,
    "features": [
      {"name": "Forma Selvagem", "desc": "Como ação, você assume magicamente a forma de uma besta que já viu. Recupera 2 usos com descanso curto ou longo. Você mantém seus TRs mentais, alinhamento e personalidade — e pode concentrar magias. Seus PV ficam substituídos pelos da besta; ao cair a 0 PV na forma, o dano excedente se aplica na forma humana. Nível 2: VD máximo 1/4 (sem voo e sem nado); nível 4: VD 1/2 (sem voo); nível 8: VD 1 (sem restrições)."},
      {"name": "Círculo Druídico", "desc": "Você se alinha a um Círculo de druidas que compartilha sua visão de mundo: Círculo da Terra (magia e recuperação natural) ou Círculo da Lua (maestria na Forma Selvagem). Seu Círculo concede características nos níveis 2, 6, 10 e 14.", "choice_id": "druid_circle", "subclass": True}
    ]
  },
  {"level": 3, "prof": 2, "features": []},
  {
    "level": 4, "prof": 2,
    "features": [
      {"name": "Forma Selvagem (VD ≤ 1/2)", "desc": "Sua Forma Selvagem agora permite bestas com Valor de Desafio 1/2 ou menor. Voo ainda não é permitido."},
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {"level": 5, "prof": 3, "features": []},
  {
    "level": 6, "prof": 3,
    "features": [
      {"name": "Característica do Círculo Druídico", "desc": "Você recebe a característica de nível 6 do seu Círculo (Terra: Passo da Terra — terreno difícil não mágico sem custo extra de movimento, não pode ser paralisado por plantas; Lua: Formas Elementais — gastar 2 usos de Forma Selvagem para assumir a forma de um Elemental de Ar, Terra, Fogo ou Água).", "subclass": True}
    ]
  },
  {"level": 7, "prof": 3, "features": []},
  {
    "level": 8, "prof": 3,
    "features": [
      {"name": "Forma Selvagem (VD ≤ 1)", "desc": "Sua Forma Selvagem agora permite bestas com Valor de Desafio 1 ou menor. Voo e natação agora estão permitidos — você pode assumir qualquer besta que já tenha visto nesse VD."},
      {"name": "Aumento de Atributo", "desc": "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."}
    ]
  },
  {"level": 9, "prof": 4, "features": []},
  {
    "level": 10, "prof": 4,
    "features": [
      {"name": "Característica do Círculo Druídico", "desc": "Você recebe a característica de nível 10 do seu Círculo (Terra: Afinidade com a Natureza — imunidade a veneno e doenças, imune a ser encantado/amedrontado por Fadas ou Elementais; Lua: Golpes Elementares — seus ataques na Forma Selvagem contam como mágicos para fins de superar resistências).", "subclass": True}
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
      {"name": "Característica do Círculo Druídico", "desc": "Você recebe a característica de nível 14 do seu Círculo (Terra: Santuário da Natureza — bestas e plantas devem fazer TR de Sabedoria para atacar você; Lua: Mil Formas — lançar Alterar a Si Mesmo à vontade sem gastar espaço de magia).", "subclass": True}
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
      {"name": "Corpo Eterno", "desc": "A magia drúidica que você canaliza retarda o envelhecimento do seu corpo. Para cada 10 anos que passam, seu corpo envelhece apenas 1 ano. Você também é imune a envelhecimento mágico causado por magias ou efeitos."},
      {"name": "Magias de Besta", "desc": "Você pode lançar suas magias de Druida mesmo enquanto estiver na Forma Selvagem, desde que a magia tenha apenas componentes verbais e somáticos. Você não pode fornecer componentes materiais enquanto em forma de besta."}
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
      {"name": "Arquidruida", "desc": "Você pode usar sua Forma Selvagem um número ilimitado de vezes. Além disso, você pode ignorar os componentes verbais e somáticos das suas magias de Druida, bem como quaisquer componentes materiais que não tenham custo e não sejam consumidos pela magia — tanto na forma humana quanto na Forma Selvagem."}
    ]
  }
]

data['druida']['levels'] = druida_levels

with open('public/srd-data/phb-class-progression-pt.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print('Druida reescrito com sucesso')

/**
 * Enriquece descrições de subclasse em phb-class-choices-pt.json com features
 * por nível, magias preparadas e mecânicas específicas (mesmo padrão dos
 * commits anteriores pra Paladino/Clérigo/Bruxo).
 *
 * Idempotente: detecta marcadores e só atualiza desc se ainda for "flavor
 * curto" (< 500 chars). Itens já enriquecidos ficam intactos.
 *
 * Rodar: node scripts/enrich-subclass-descriptions.cjs
 */
const fs = require('fs')
const path = require('path')

const FILE = path.join(__dirname, '..', 'public', 'srd-data', 'phb-class-choices-pt.json')

const ENRICHMENTS = {
  /* ── BÁRBARO ─────────────────────────────────────────────── */
  barbaro: {
    primal_path: {
      berserker: "Caminho do Berserker é a senda da raiva pura — fúria desenfreada, dor ignorada, ofensa máxima.\n\nFeatures por nível:\n• Nv 3 — Frenesi: ao entrar em Fúria, pode escolher entrar em frenesi. Ganha 1 ataque corpo a corpo bônus a cada turno enquanto durar a Fúria. Quando ela acaba, sofre 1 nível de exaustão.\n• Nv 6 — Fúria Implacável: ao falhar em TR contra ser enfeitiçado ou amedrontado enquanto em Fúria, pode repetir o TR no início do próximo turno.\n• Nv 10 — Presença Intimidante: como ação, escolhe criatura a 9m; TR de Sabedoria; falha = amedrontada até fim do próximo turno seu (concentração). Pode estender no próximo turno como ação.\n• Nv 14 — Retaliação: como reação, quando sofrer dano de criatura a 1,5m, pode fazer um ataque corpo a corpo contra ela.",
      totem: "Caminho do Guerreiro Totêmico é a conexão com espíritos animais ancestrais que conferem força mística.\n\nFeatures por nível:\n• Nv 3 — Buscador de Espíritos: ritualisticamente aprende as magias Falar com Animais e Sentido de Caçador (rituais 1×/dia).\n• Nv 3 — Espírito Totem: escolhe um animal-totem que define passivas durante Fúria (escolha aqui é manual no campo Notas até o picker interativo): URSO (resistência a todo dano exceto psíquico) / LOBO (aliados a 1,5m com vantagem contra inimigos que você possa ver) / ÁGUIA (desengajar/atacar+correr como ação bônus) / ALCE (velocidade +4,5m) / TIGRE (salto de 3m).\n• Nv 6 — Aspecto da Besta: ganha característica permanente do mesmo animal escolhido (urso = capacidade de carga dobrada; lobo = rastrear melhor; etc.).\n• Nv 10 — Caminhante Espiritual: pode lançar Comungar com a Natureza como ritual.\n• Nv 14 — Totem Definitivo: passiva poderosa do animal (urso = ataques contra você têm desvantagem se atacarem aliado a 1,5m; lobo = derrubar inimigo a 1,5m ao acertar com arma corpo a corpo; etc.).",
    },
  },

  /* ── BARDO ─────────────────────────────────────────────── */
  bardo: {
    bard_college: {
      conhecimento: "O Colégio do Conhecimento valoriza a aprendizagem e a sabedoria — bardos estudiosos, peritos em mil tópicos.\n\nFeatures por nível:\n• Nv 3 — Proficiências Bônus: ganha proficiência em 3 perícias à sua escolha.\n• Nv 3 — Palavras Cortantes: como reação quando uma criatura a 18m faz teste de ataque/atributo/dano, gasta 1 Inspiração de Bardo pra subtrair o dado do resultado dela (a criatura é imune se não pode ouvir ou se é imune a enfeitiçado).\n• Nv 6 — Segredos Mágicos Adicionais: aprende 2 magias de qualquer classe (incluindo truques). Contam como magias de bardo.\n• Nv 14 — Habilidades Inigualáveis: pode adicionar metade do bônus de proficiência (round down) em qualquer teste de habilidade que ainda não tenha proficiência.",
      valor: "O Colégio do Valor é a tradição dos bardos-guerreiros — música que ecoa de batalha em batalha.\n\nFeatures por nível:\n• Nv 3 — Proficiências de Combate: ganha proficiência em armaduras médias, escudos e armas marciais.\n• Nv 3 — Inspiração de Combate: aliado com Inspiração de Bardo pode usá-la pra somar à CA contra um ataque OU somar ao dano de uma jogada de arma.\n• Nv 6 — Ataque Extra: ao usar a ação Atacar, faz dois ataques em vez de um.\n• Nv 14 — Aprovação da Batalha: pode usar Inspiração de Bardo como ação bônus em si mesmo pra ganhar +1 CA até início do próximo turno.",
    },
  },

  /* ── DRUIDA ─────────────────────────────────────────────── */
  druida: {
    druid_circle: {
      terra: "O Círculo da Terra é a tradição de místicos sábios que tiram poder da própria terra — magias adicionais conforme o bioma escolhido.\n\nFeatures por nível:\n• Nv 2 — Truque Bônus: aprende 1 truque de druida adicional.\n• Nv 2 — Recuperação Natural: durante descanso curto pode recuperar espaços de magia até metade do nível de druida (round up). Só 1×/dia.\n• Nv 3 — Magias do Círculo: aprende 2 magias de nível 1 baseadas no Terreno escolhido (ártico/costa/deserto/floresta/grama/montanha/pântano/Subterrâneo). Magias adicionais nos nv 5, 7 e 9 conforme tabela do PHB p.69.\n• Nv 6 — Passos da Terra: passar por terreno difícil natural (vegetação, etc.) sem gastar movimento extra; também passa sem deixar rastros e sem ativar armadilhas naturais.\n• Nv 10 — Vínculo com a Terra: imune a dano venenoso e doenças. Não precisa comer/beber.\n• Nv 14 — Refúgio da Natureza: como ação, lança Refúgio das Plantas (Plant Form) em si mesmo (1×/desc. longo).",
      lua: "O Círculo da Lua é a tradição de druidas-guerreiros que dominam Forma Selvagem para batalha — assumem formas predatórias devastadoras.\n\nFeatures por nível:\n• Nv 2 — Forma de Combate: pode usar Forma Selvagem como ação bônus (em vez de ação). Pode transformar-se em qualquer besta com CR igual ao nível de druida / 3 (round down, mín. 1) no nv 2 — escalas mais altas em nv 6.\n• Nv 2 — Combate Primal: usa Forma Selvagem como ação bônus + magias adicionais permitidas em forma.\n• Nv 6 — Golpes Primais: ataques em Forma Selvagem contam como mágicos pra superar resistências.\n• Nv 10 — Forma Elemental: pode lançar Forma Elemental usando Forma Selvagem (sem gastar slots).\n• Nv 14 — Mil Formas: pode lançar Mudar de Forma à vontade.",
    },
  },

  /* ── FEITICEIRO ─────────────────────────────────────────── */
  feiticeiro: {
    sorcerous_origin: {
      linhagem_draconico: "Sua magia vem do sangue de um dragão ancestral — escamas começam a brotar, garras crescem, força inata desperta.\n\nFeatures por nível:\n• Nv 1 — Ancestralidade Dracônica: escolhe um dragão ancestral (cromático ou metálico). Define o tipo de dano (negro=ácido; azul/bronze=raio; verde=veneno; vermelho/dourado=fogo; branco/prata=frio; latão=fogo; cobre=ácido). Dobra o bônus de proficiência em testes de Carisma com dragões.\n• Nv 1 — Resiliência Dracônica: ganha +1 PV/nível e CA = 13 + mod. DES (apenas se desarmado).\n• Nv 6 — Magia Elemental: ao conjurar magia que cause dano do seu tipo dracônico, gasta 1 ponto de feitiçaria pra ganhar bônus = mod. CAR ao dano.\n• Nv 14 — Asas Dracônicas: como ação bônus, manifesta asas espectrais. Velocidade de voo = velocidade normal.\n• Nv 18 — Presença Dracônica: como ação, gasta 5 pontos de feitiçaria pra emanar aura intimidante por 1 min. Criaturas a 18m fazem TR de Sabedoria; falha = amedrontadas ou enfeitiçadas (à escolha).",
      magia_selvagem: "Sua magia é caótica, imprevisível, conectada ao próprio Caos. Cada feitiço pode disparar efeitos selvagens.\n\nFeatures por nível:\n• Nv 1 — Surto Selvagem: após conjurar uma magia de nv 1+, o Mestre pode pedir 1d20; se rolar 1, rola na tabela de Surto Selvagem (efeito aleatório imediato).\n• Nv 1 — Sorte do Caos: ao falhar TR/ataque/teste de habilidade, pode repetir 1×/desc. longo.\n• Nv 6 — Curvar a Sorte: como reação, gasta 2 pontos de feitiçaria pra somar 1d4 a um teste/TR/ataque de outra criatura.\n• Nv 14 — Caos Controlado: ao rolar na tabela de Surto Selvagem, rola 2× e escolhe o resultado.\n• Nv 18 — Surto Espiritual: pode forçar Surto Selvagem como ação bônus, mas não recebe pontos de feitiçaria por isso.",
    },
  },

  /* ── MAGO (8 escolas) ─────────────────────────────────────── */
  mago: {
    arcane_tradition: {
      abjuracao: "Escola de Abjuração — proteção, dissipar magia, banir, contra-feitiçaria. Magos que defendem.\n\nFeatures por nível:\n• Nv 2 — Escriba Abjurador: copiar magias de Abjuração custa metade.\n• Nv 2 — Salvaguarda Arcana: ao conjurar uma magia de Abjuração de nv 1+, cria um escudo com PV temporários = 2× nível da magia + mod. INT. Recarrega quando lança outra Abjuração.\n• Nv 6 — Salvaguarda Aprimorada: escudo agora também concede vantagem em TRs contra magias.\n• Nv 10 — Resistência Mágica: ganha vantagem em TRs contra magias.\n• Nv 14 — Anti-Magia Espectral: 1×/desc. longo pode lançar Dissipar Magia ou Contra-Feitiço sem gastar slot.",
      conjuracao: "Escola de Conjuração — invocar criaturas e objetos, teleporte, criação. Magos que materializam.\n\nFeatures por nível:\n• Nv 2 — Escriba Conjurador: copiar magias de Conjuração custa metade.\n• Nv 2 — Conjuração Menor: como ação, cria um objeto inanimado de até 3kg em mão livre ou espaço a até 3m. Some após 1h.\n• Nv 6 — Conjuração Benigna: criaturas invocadas têm +PV = 2× nível da magia.\n• Nv 10 — Foco Conjurador: pode usar reação pra teleportar até 9m após conjurar magia.\n• Nv 14 — Conjuração Fiel: invocações duram o dobro.",
      adivinhacao: "Escola de Adivinhação — prever, ver através do tempo, descobrir. Magos que sabem.\n\nFeatures por nível:\n• Nv 2 — Escriba Adivinhador: copiar magias de Adivinhação custa metade.\n• Nv 2 — Presciência: após desc. longo, rola 2d20 e guarda os resultados. Pode usar 1× cada como substituto pra qualquer d20 que você ou criatura visível a 9m rolar.\n• Nv 6 — Recarga: pode recuperar 1 slot de magia de nv 1-4 quando lança uma magia de Adivinhação de mesmo nível.\n• Nv 10 — Cara Decidida: gasta 1 dado de Presciência pra forçar criatura a refazer um TR.\n• Nv 14 — Visão da Verdade: 1×/desc. longo gasta 1 dado de Presciência pra lançar Adivinhação Maior.",
      encantamento: "Escola de Encantamento — encantar mentes, alterar emoções. Magos que controlam.\n\nFeatures por nível:\n• Nv 2 — Escriba Encantador: copiar magias de Encantamento custa metade.\n• Nv 2 — Olhar Hipnótico: como ação, foca em criatura a 1,5m. Ela faz TR de Sabedoria; falha = velocidade 0 e incapacitada por 1 turno. Pode estender no próximo turno se mantiver olhar (gasta ação).\n• Nv 6 — Memória Instável: quando uma criatura erra um TR contra Encantamento sua, pode apagar a memória do ataque com reação.\n• Nv 10 — Encantamento Dividido: ao conjurar magia de Encantamento de nv 1+ visando 1 criatura, pode visar 2.\n• Nv 14 — Encantamento Definitivo: 1×/desc. longo, pode lançar Sugestão como ação livre + truque.",
      evocacao: "Escola de Evocação — bolas de fogo, raios, dano. Magos que destroem.\n\nFeatures por nível:\n• Nv 2 — Escriba Evocador: copiar magias de Evocação custa metade.\n• Nv 2 — Reformar Magia: ao conjurar magia de Evocação de área (cone, cubo, esfera, linha), pode proteger até 1+nv da magia criaturas amigas no efeito (não sofrem dano).\n• Nv 6 — Evocador Atento: ao conjurar magia de dano, soma mod. INT ao dano de UMA criatura escolhida.\n• Nv 10 — Magia Empoderada: rola novamente 1d8 de dano de evocação 1×/turno.\n• Nv 14 — Sobrecarga: 1×/desc. longo lança magia de dano com nível +2 (sem gastar slot maior).",
      ilusao: "Escola de Ilusão — disfarce, miragem, engano. Magos que confundem.\n\nFeatures por nível:\n• Nv 2 — Escriba Ilusionista: copiar magias de Ilusão custa metade.\n• Nv 2 — Ilusão Aprimorada: efeitos de ilusão duram 5× mais. Pode lançar Imagem Menor como truque.\n• Nv 6 — Ilusão Maleável: como ação, modifica imagem ilusória (sua) ao longo da duração — sem precisar recriar.\n• Nv 10 — Ilusões Reais: parte da ilusão fica real (até 1m). Causa dano físico até dissipada.\n• Nv 14 — Eu Ilusório: como reação ao ser alvo de ataque, transforma você em ilusão por 1 turno (o ataque erra).",
      necromancia: "Escola de Necromancia — manipular morte, animar cadáveres. Magos que dominam o limiar.\n\nFeatures por nível:\n• Nv 2 — Escriba Necromante: copiar magias de Necromancia custa metade.\n• Nv 2 — Sustento Cadavérico: ao matar criatura com magia de Necromancia de nv 1+, ganha PV temporários = 2× nv da magia.\n• Nv 6 — Comando Necromântico: criaturas mortas-vivas que você anima recebem +CR e seguem seus comandos por 24h em vez de 1 dia.\n• Nv 10 — Resistência Inerte: ganha resistência a dano necrótico e máximo de PV de necróticos não pode ser reduzido.\n• Nv 14 — Senhor dos Mortos-Vivos: ao animar criatura, pode adicionar mod. INT ao máximo de mortos-vivos sob seu controle.",
      transmutacao: "Escola de Transmutação — mudar forma, polimorfismo, alterar propriedades. Magos que reescrevem.\n\nFeatures por nível:\n• Nv 2 — Escriba Transmutador: copiar magias de Transmutação custa metade.\n• Nv 2 — Pedra de Transmutação: cria pedra que carrega 1 efeito (escolhe na criação): visão no escuro, +3m velocidade, proficiência em Constituição, ou resistência a um dano elemental. Recria após desc. longo.\n• Nv 6 — Transmutação Aprimorada: pode dar a pedra a outra criatura (em vez de ficar com você).\n• Nv 10 — Senhor da Forma: pode lançar Polimorfismo em si mesmo como reação ao ser atacado.\n• Nv 14 — Mestre Transmutador: 1×/desc. longo gasta a pedra para um efeito poderoso: cura Maior, dissipação de doença, polimorfismo permanente OU restauração de juventude (regride 3d10 anos).",
    },
  },

  /* ── MONGE ─────────────────────────────────────────────── */
  monge: {
    monastic_tradition: {
      mao_aberta: "O Caminho da Mão Aberta é a tradição monástica clássica — golpes brutais que canalizam ki em técnicas devastadoras.\n\nFeatures por nível:\n• Nv 3 — Técnicas da Mão Aberta: quando acerta com Golpe Marcial, pode escolher 1 efeito: alvo cai prono OU é empurrado 4,5m OU não pode reagir até fim do próximo turno seu.\n• Nv 6 — Cura Mística: como ação, gasta 1 ki + nível em PV (cura a si mesmo).\n• Nv 11 — Manipulação do Ki: usa 1 ação pra entrar em transe de 1 min — silêncio mágico, ataque adicional ou perceber sem visão.\n• Nv 17 — Cair como Trovão: como ação, gasta 3 ki. Cada criatura a 4,5m faz TR de Constituição; falha = 10d10 dano necrótico (metade se sucesso). Você sofre dano necrótico igual ao máximo que seria recebido por uma criatura. Não pode usar se já estiver com PV ≤ 0.",
      sombra: "O Caminho da Sombra é a tradição monástica das técnicas furtivas — ninjas que se movem entre as sombras.\n\nFeatures por nível:\n• Nv 3 — Artes das Sombras: pode gastar 2 ki pra lançar Escuridão, Pés Macios, Visão no Escuro ou Caminhos das Sombras. Aprende o truque Truque Menor.\n• Nv 6 — Passos das Sombras: enquanto em área pouco iluminada/escuridão, como ação bônus pode teleportar até 18m pra outra área pouco iluminada/escuridão. Ganha vantagem no próximo ataque do turno.\n• Nv 11 — Manto da Sombra: enquanto em pouca luz/escuridão, fica invisível até se mover ou atacar.\n• Nv 17 — Mestre Oportunista: pode gastar 1 ki pra ganhar vantagem em ataque contra criatura que já tenha sido atacada por outro aliado no turno.",
      quatro_elementos: "O Caminho dos Quatro Elementos é a tradição monástica que canaliza fogo, água, ar e terra através do ki — magia elemental.\n\nFeatures por nível:\n• Nv 3 — Disciplina Elemental: aprende 1 disciplina elemental + magia Truque Menor adaptado. Ganha mais disciplinas em nv 6, 11, 17.\n• Nv 3 — Ki Elemental: pode gastar ki pra alimentar disciplinas (escala com nível da disciplina conjurada).\n\nDisciplinas elementais (PHB p.83) incluem:\n• Punho da Tempestade Sem Fim (nv 3): empurra criatura como Onda Trovejante.\n• Fôlego do Inverno (nv 5): congela criatura em cubo.\n• Chamejar da Fênix (nv 11): pequena Bola de Fogo.\n• Onda Apocalíptica (nv 17): grande Bola de Fogo.\n\nA escolha das disciplinas ainda é manual — anote em Notas qual escolheu por nível.",
    },
  },

  /* ── PATRULHEIRO ───────────────────────────────────────── */
  patrulheiro: {
    ranger_archetype: {
      cacador: "O Caçador é o patrulheiro dos campos de batalha — caça monstros e criaturas específicas com técnicas treinadas.\n\nFeatures por nível:\n• Nv 3 — Presa do Caçador: escolhe UMA técnica (manual no campo Notas até picker):\n  - Matador de Colosso: +1d8 dano contra criatura ferida (1×/turno).\n  - Assassino de Gigantes: vantagem em ataques contra Grandes ou maiores.\n  - Caçador de Hordas: +1 dano em alvos que estejam em conflito com aliado.\n• Nv 7 — Táticas Defensivas: escolhe UMA defesa:\n  - Manada Furiosa: vantagem em TRs contra ser amedrontado.\n  - Ataque Múltiplo: desvantagem em ataques contra você quando criaturas a 1,5m forem múltiplas.\n  - Veredas Espinhosas: criaturas que te ferem sofrem 1d6 dano corte.\n• Nv 11 — Ataques Múltiplos: escolhe UMA opção:\n  - Volley: lança um ataque à distância em todas criaturas em 3m de um ponto.\n  - Whirlwind Attack: ataque corpo a corpo contra todas criaturas a 1,5m.\n• Nv 15 — Defesa Superior: escolhe UMA passiva avançada (Evasão, Stand Against the Tide, Uncanny Dodge).",
      mestre_das_bestas: "O Mestre das Bestas é o patrulheiro acompanhado por uma fera companheira — vínculo místico de amor e batalha.\n\nFeatures por nível:\n• Nv 3 — Companheiro Animal: ganha uma besta de CR ≤ 1/4, Pequena ou menor, que ele treina (anote em Notas: tipo de besta + características). A besta segue suas ordens (ataca, defende, segue, etc.). Pode usar ação pra comandá-la atacar.\n• Nv 7 — Treinamento Exemplar: a besta age no SEU turno e usa seu bônus de proficiência em ataques.\n• Nv 11 — Treinamento Avançado: pode comandar a besta a fazer 2 ataques quando você usa Ataque Extra.\n• Nv 15 — Maestria: a besta tem vantagem em TRs contra magias.",
    },
  },

  /* ── LADINO ──────────────────────────────────────────── */
  ladino: {
    roguish_archetype: {
      gatuno: "O Gatuno é o ladino clássico — esgueirar-se, roubar bolsos, escalar muralhas, vencer com furtividade.\n\nFeatures por nível:\n• Nv 3 — Mãos Rápidas: pode usar a ação bônus de Astúcia pra fazer um teste de Prestidigitação, usar uma ferramenta de ladrão para desativar armadilha/abrir fechadura, ou pegar/usar/passar um objeto.\n• Nv 3 — Segundas Histórias: ao saltar em movimento, salta uma distância adicional = mod. DES. Pode escalar sem reduzir velocidade.\n• Nv 9 — Treinamento Suplementar: ganha proficiência em uma perícia/ferramenta + Especialização nessa perícia.\n• Nv 13 — Uso de Itens Mágicos: ignora restrições de classe/raça/alinhamento em itens mágicos.\n• Nv 17 — Reflexos Felinos: como reação ao ataque, faz mais um Ataque Furtivo (1×/turno extra).",
      assassino: "O Assassino é o ladino do veneno e da emboscada — golpes silenciosos que matam em segundos.\n\nFeatures por nível:\n• Nv 3 — Treinamento de Assassino: proficiência com kit de venenos e kit de disfarce.\n• Nv 3 — Assassinato: tem vantagem em ataques contra criaturas que ainda não tomaram turno. Qualquer acerto contra criatura surpreendida é crítico automático.\n• Nv 9 — Infiltrador Letal: pode estabelecer falsas identidades crível (3 a 7 dias). Pode imitar voz, escrita e comportamento.\n• Nv 13 — Imitar Tomada: como ação, ao ler uma criatura por 1h, pode imitar perfeitamente seu jeito (vantagem em testes pra se passar por ela).\n• Nv 17 — Golpe Mortal: na primeira rodada de combate, qualquer dano causado a criatura surpreendida é o DOBRO.",
      arcano: "O Trapaceiro Arcano combina astúcia com magia arcana de Mago — pequenas magias de utilidade e dano.\n\nMecânica de Conjuração:\n• Inteligência é a habilidade de conjuração.\n• CD = 8 + prof + INT; ataque mágico = prof + INT.\n• Aprende magias APENAS da escola de Encantamento ou Ilusão (com 1 exceção a cada subida).\n\nMagias conhecidas: 3 truques + 3 magias nv 1 (nv 3) → escala conforme tabela do Mago dividida em 1/3.\n\nFeatures por nível:\n• Nv 3 — Conjuração Trapaceira: aprende 3 truques (1 deve ser Mão Mágica) + 3 magias de nv 1 (1 fora da escola).\n• Nv 3 — Mão Mágica Versátil: o truque Mão Mágica pode realizar ações furtivas a 9m (Prestidigitação, Furtividade).\n• Nv 9 — Magico Trapaceiro: pode usar Ataque Furtivo em ataques mágicos (1×/turno).\n• Nv 13 — Mago Verdadeiro: pode lançar uma magia de nv 1-4 como ação bônus.\n• Nv 17 — Encantamento Definitivo: como ação, aplica Sugestão sobre criatura a 9m (sem custo de slot, 1×/desc. curto).",
    },
  },
}

const json = JSON.parse(fs.readFileSync(FILE, 'utf8'))

let updated = 0
let skipped = 0
let missing = 0

for (const [cls, byChoice] of Object.entries(ENRICHMENTS)) {
  const classData = json[cls]
  if (!classData) { console.error(`! classe não encontrada: ${cls}`); continue }
  for (const [choiceId, byValue] of Object.entries(byChoice)) {
    const choice = classData.choices?.find(c => c.id === choiceId)
    if (!choice) { console.error(`! choice não encontrada: ${cls}.${choiceId}`); continue }
    for (const [value, newDesc] of Object.entries(byValue)) {
      const opt = choice.options?.find(o => o.value === value)
      if (!opt) { console.error(`! option não encontrada: ${cls}.${choiceId}.${value}`); missing++; continue }
      if ((opt.desc ?? '').length >= 500) {
        // já enriquecida em commit anterior
        skipped++
        continue
      }
      opt.desc = newDesc
      updated++
    }
  }
}

fs.writeFileSync(FILE, JSON.stringify(json, null, 2) + '\n', 'utf8')
console.log(`Atualizadas: ${updated} | Já enriquecidas (skipped): ${skipped} | Missing: ${missing}`)

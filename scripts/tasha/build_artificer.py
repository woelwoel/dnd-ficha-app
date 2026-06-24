"""Estrutura a classe Artífice do Caldeirão de Tasha nos schemas do app.

Gera TRÊS arquivos, todos carimbados com `source: "tasha"` (exceto o de
choices, que não tem esse campo — mesmo schema do phb-class-choices-pt.json):
  - public/srd-data/tasha-classes-pt.json            (array, schema de phb-classes-pt.json)
  - public/srd-data/tasha-class-progression-pt.json  (objeto, schema de phb-class-progression-pt.json)
  - public/srd-data/tasha-class-choices-pt.json      (objeto, schema de phb-class-choices-pt.json)

Entrada: texto extraído via extract_text.py das páginas 0-indexadas 7-12 do PDF
(tabela "O Artífice" + "Características do Artífice" + nível 5/9/15 das quatro
especializações, usadas apenas para os marcadores de subclasse genéricos) e
das páginas 12-18 (capítulo "Especializações de Artífice" completo, usado pra
montar o arquivo de choices).

A DESCRIÇÃO de cada característica de nível é parseada direto do texto extraído
(fiel à fonte): ancoramos nos nomes das características EM SEQUÊNCIA (mesma
técnica de build_feats.py) e juntamos linhas quebradas em parágrafo. O mapa de
nível -> características é fixo (verificado contra a tabela "O Artífice").

As 4 especializações (Alquimista, Armeiro, Atirador, Ferreiro de Batalha) são
parseadas ancorando no marcador "Característica de Nº nível de <subclasse>"
que segue imediatamente cada nome de característica — mesma técnica acima,
mas usada pra atribuir cada bloco à sua subclasse e nível (3/5/9/15).

Uso:
    python scripts/tasha/build_artificer.py "<caminho-do-pdf>"
"""
import json
import re
import sys
from pathlib import Path

import fitz  # pymupdf

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_CLASSES = REPO_ROOT / "public" / "srd-data" / "tasha-classes-pt.json"
OUT_PROGRESSION = REPO_ROOT / "public" / "srd-data" / "tasha-class-progression-pt.json"
OUT_CHOICES = REPO_ROOT / "public" / "srd-data" / "tasha-class-choices-pt.json"

NOISE = re.compile(r"^\s*$|^\d+\s*$|^Opções de Personagens\s*$|^-----\s*p\.\d+\s*-----\s*$")

SKILL_CHOICES = {
    "count": 2,
    "from": [
        "Arcanismo",
        "História",
        "Investigação",
        "Medicina",
        "Natureza",
        "Percepção",
        "Prestidigitação",
    ],
}

# Ordem em que as características de nível aparecem na seção "Características
# do Artífice" (texto corrido, não a tabela). Usada como âncora sequencial,
# igual à técnica de build_feats.py. Mapeia nome-anchor -> nível.
FEATURE_ORDER = [
    ("Engenharia Mágica", 1),
    ("Conjuração", 1),
    ("Infundir Item", 2),
    ("Especialização de Artífice", 3),
    ("A ferramenta certa para o trabalho", 3),
    ("Aumento no Valor de Atributo", 4),
    ("Maestria em Ferramenta", 6),
    ("Lampejo de Genialidade", 7),
    ("Perito em Itens Mágicos", 10),
    ("Item de armazenar magia", 11),
    ("Versado em itens mágicos", 14),
    # O PDF tem um erro de digitação aqui ("Mastria" em vez de "Maestria") e
    # também rotula o cabeçalho como "14º nível" (copiado do parágrafo
    # anterior) — mas a tabela "O Artífice" confirma que esta característica
    # pertence ao 18º nível. Ancoramos no texto literal (com o typo) e
    # corrigimos o nome exibido no JSON de saída.
    ("Mastria em itens mágicos", 18),
    ("Alma do Artífice", 20),
]

# Nomes de característica cujo texto-âncora (literal do PDF) difere do nome
# correto a ser exibido no JSON de saída. A tabela "O Artífice" usa Title Case
# para os nomes de característica; a prosa de "Características do Artífice"
# é inconsistente (ora Title Case, ora sentence case, e com 1 typo). Aqui só
# normalizamos capitalização/typo — o TEXTO da descrição não é alterado.
NAME_FIXUPS = {
    "Item de armazenar magia": "Item de Armazenar Magia",
    "Versado em itens mágicos": "Versado em Itens Mágicos",
    "Mastria em itens mágicos": "Maestria em Itens Mágicos",
}

# "Aumento no Valor de Atributo" se repete nos níveis 8/12/16/19 com a MESMA
# descrição do nv4 (mesmo texto da característica, igual ao padrão do PHB).
ASI_REPEAT_LEVELS = [8, 12, 16, 19]

# Níveis que recebem "Característica de Especialização de Artífice" (subclass
# marker, sem escolha — a escolha já foi feita no nv3). Resumo de cada uma das
# 4 especializações nesse nível, extraído fielmente da seção "Especializações
# de Artífice" (pág. 12-14 do PDF, 0-indexado 12-14/13-15).
SUBCLASS_FEATURE_DESC = {
    5: (
        "Você recebe a característica de 5º nível da sua Especialização de Artífice "
        "(Alquimista: Sábio Alquímico — bônus de Inteligência em rolagens de cura ou "
        "dano ácido/ígneo/necrótico/venenoso ao usar suprimentos de alquimista; "
        "Armeiro: Ataque Extra — atacar duas vezes com a ação Atacar; Atirador: Arma "
        "de Fogo Arcana — transformar varinha/cajado/vara em foco que soma 1d8 ao dano "
        "de magias de artífice; Ferreiro de Batalha: Ataque Extra — atacar duas vezes "
        "com a ação Atacar)."
    ),
    9: (
        "Você recebe a característica de 9º nível da sua Especialização de Artífice "
        "(Alquimista: Reagentes Restauradores — elixires concedem PV temporários, "
        "Restauração Menor sem gastar espaço de magia; Armeiro: Modificações da "
        "Armadura — Armadura Arcana ganha itens extras infundíveis; Atirador: Canhão "
        "Explosivo — dano do Canhão Místico aumenta e ele pode detonar; Ferreiro de "
        "Batalha: Pulso Arcano — canalizar dano ou cura extra ao acertar com arma "
        "mágica ou pelo Defensor de Aço)."
    ),
    15: (
        "Você recebe a característica de 15º nível da sua Especialização de Artífice "
        "(Alquimista: Maestria Química — resistência a dano ácido/venenoso, imunidade "
        "a envenenado, Restauração Maior e Cura Completa sem espaço de magia; Armeiro: "
        "Armadura Perfeita — benefício extra conforme o modelo de armadura; Atirador: "
        "Posição Fortificada — meia cobertura perto do canhão e até dois canhões "
        "simultâneos; Ferreiro de Batalha: Defensor Aprimorado — Pulso Arcano sobe "
        "para 4d6 e Defensor de Aço ganha +2 CA e contra-ataque no Defletir Ataque)."
    ),
}

ASI_DESC = (
    "Aumente um valor de habilidade à sua escolha em 2, ou dois valores diferentes "
    "em 1 cada (máximo 20). Com aprovação do Mestre, pode escolher um talento no lugar."
)

CANTRIPS_KNOWN = [2, 2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 4, 4, 4]

PROF_BY_LEVEL = (
    [2] * 4 + [3] * 4 + [4] * 4 + [5] * 4 + [6] * 4
)

SUMMARY = (
    "Inventores arcanos que infundem objetos comuns com magia, transformando "
    "ferramentas e armaduras em maravilhas mecânicas e místicas."
)

# Especializações de Artífice (escolha de subclasse no nível 3). Slugs/nomes
# verificados contra o texto da fan-translation (NÃO usa "Artilheiro" nem
# "Armoreiro" — ver marcadores literais abaixo).
SUBCLASS_SLUGS = {
    "alquimista": "Alquimista",
    "atirador": "Atirador",
    "armeiro": "Armeiro",
    "ferreiro de batalha": "Ferreiro de Batalha",
}

# Ordem de aparição no PDF (capítulo "Especializações de Artífice", páginas
# 0-indexadas 12-18). Usada para fatiar o texto por subclasse (cada subclasse
# vai do seu nome de título até o título da próxima, ou até "Infusões de
# Artífice" para a última).
SUBCLASS_ORDER = ["alquimista", "armeiro", "atirador", "ferreiro de batalha"]

# Marca o fim do capítulo de especializações (começa a seção de Infusões, que
# não é uma característica de subclasse e pertence a uma fase futura).
INFUSIONS_HEADER = "Infusões de Artífice"

# Marcador que segue imediatamente o nome de cada característica de subclasse:
# "Característica de Nº nível de <subclasse>." (casing do "de"/subclasse varia
# no PDF: "Alquimista", "armeiro", "atirador", "ferreiro de batalha" — todos
# tolerados via regex case-insensitive).
SUBCLASS_FEATURE_MARKER = re.compile(
    r"^Característica de (\d+)[ºo°]\s+nível de ([^.\n]+?)\.?\s*$", re.IGNORECASE
)

# O bloco de "Pulso Arcano" (Ferreiro de Batalha, nv 9) atravessa uma quebra
# de página do PDF que tem, no rodapé/lateral da página 16, o sidebar de
# estatísticas do "Defensor de Aço" (bloco de criatura, não prosa da
# característica). A extração de texto lineariza esse sidebar NO MEIO do
# corpo de "Pulso Arcano". Excisamos pelo par de âncoras estáveis abaixo
# (a linha-título do sidebar "Defensor de Aço" seguida logo por "Construto
# Médio" o distingue da característica de mesmo nome no nível 3; o fim do
# sidebar é a última linha da reação "Defletir Ataque").
STATBLOCK_START = "Defensor de Aço"
STATBLOCK_START_CONFIRM = "Construto Médio"
STATBLOCK_END = "não o defensor."


def strip_embedded_statblock(block: list[str]) -> list[str]:
    """Remove o sidebar de stat-block do Defensor de Aço, se presente no bloco."""
    for i, ln in enumerate(block):
        if ln == STATBLOCK_START and i + 1 < len(block) and block[i + 1] == STATBLOCK_START_CONFIRM:
            for j in range(i, len(block)):
                if block[j] == STATBLOCK_END:
                    return block[:i] + block[j + 1:]
            # Marcador de início encontrado mas não o de fim — não corta às
            # cegas; deixa para o parser falhar visivelmente no sanity-check
            # em vez de produzir uma descrição truncada silenciosamente.
            break
    return block


# A tabela "Canhões Místicos" (dentro da característica "Canhão Místico", nv 3
# de Atirador) é uma tabela de 2 colunas (Canhão / Ativação) cuja extração
# linear do PDF quebra os nomes das entradas em várias linhas (ex: "Lança-" +
# "Chamas") e cria um glitch de justificação herdado do PDF original ("Cada a
# / criatura" → "Cada criatura", com um "a" solto da quebra de linha). Em vez
# de juntar essas linhas cruas (preservando o glitch), reconstruímos as 3
# entradas nomeadas como uma lista legível, mantendo o texto de cada efeito
# 100% literal (apenas a costura de linha é corrigida, igual ao join_body
# normal faz para o resto da prosa).
CANNON_TABLE_HEADER = "Canhões Místicos"
CANNON_ENTRIES = [
    ("Lança-Chamas", ["Lança-", "Chamas"]),
    ("Força de Balista", ["Força", "de", "Balista"]),
    ("Protetor", ["Protetor"]),
]


def rebuild_cannon_table(block: list[str]) -> list[str]:
    """Se o bloco contém a tabela Canhões Místicos, substitui-a por prosa limpa."""
    if CANNON_TABLE_HEADER not in block:
        return block
    header_idx = block.index(CANNON_TABLE_HEADER)
    pre = block[:header_idx]
    table_lines = block[header_idx + 1:]  # após o título da tabela
    # A primeira linha da tabela é o cabeçalho de coluna "Canhão Ativação".
    if table_lines and table_lines[0] == "Canhão Ativação":
        table_lines = table_lines[1:]

    full_text = " ".join(table_lines)
    full_text = re.sub(r"\s+", " ", full_text).strip()
    # Corrige o glitch de justificação herdado do PDF ("Cada a criatura").
    full_text = full_text.replace("Cada a criatura", "Cada criatura")

    entries_desc = []
    remaining = full_text
    boundaries = []
    for name, name_lines in CANNON_ENTRIES:
        joined_name = " ".join(name_lines)
        # Nome pode aparecer com ou sem hífen colado ("Lança- Chamas" vs "Lança-Chamas").
        candidates = [joined_name, joined_name.replace("- ", "-")]
        pos = None
        for cand in candidates:
            pos = remaining.find(cand)
            if pos != -1:
                boundaries.append((pos, len(cand), name))
                break
        if pos is None:
            raise SystemExit(f"Entrada da tabela Canhões Místicos não encontrada: {name!r}")
    boundaries.sort()
    for i, (pos, length, name) in enumerate(boundaries):
        seg_start = pos + length
        seg_end = boundaries[i + 1][0] if i + 1 < len(boundaries) else len(remaining)
        effect = remaining[seg_start:seg_end].strip(" .") + "."
        entries_desc.append(f"{name}: {effect}")

    summary = "Tipos de Canhão Místico (escolhidos ao criar o canhão): " + "; ".join(entries_desc)
    return pre + [summary]


def extract_pages(pdf_path: str, a: int, b: int) -> str:
    doc = fitz.open(pdf_path)
    chunks = []
    for pno in range(a, b + 1):
        if 0 <= pno < len(doc):
            chunks.append(doc[pno].get_text())
            chunks.append(f"\n\n----- p.{pno} -----\n\n")
    return "".join(chunks)


def clean_lines(raw: str) -> list[str]:
    out = []
    for ln in raw.splitlines():
        if NOISE.match(ln):
            continue
        out.append(ln.strip())
    return out


def join_body(lines: list[str]) -> str:
    text = " ".join(lines)
    return re.sub(r"\s+", " ", text).strip()


def parse_fulldescription(raw: str) -> str:
    """Texto introdutório da classe (intro fluff até 'Criando um Artífice')."""
    lines = clean_lines(raw)
    start = lines.index("Artífice") + 1
    # Esse índice é o segundo "Artífice" (título da seção), o primeiro é o nome
    # da classe isolado na primeira linha extraída da página.
    end = None
    for i in range(start, len(lines)):
        if lines[i] == "Criando um Artífice":
            end = i
            break
    body = lines[start:end] if end else lines[start:]
    return join_body(body)


FEATURES_PROSE_MARKER = (
    "Como um artífice, você adquire as seguintes características"
)


def parse_features(raw: str) -> dict[int, list[dict]]:
    """Ancora nas características de classe EM SEQUÊNCIA (igual a build_feats.py).

    A busca começa DEPOIS da tabela "O Artífice" (que repete os mesmos nomes de
    característica em formato de coluna) — do contrário os nomes ficariam
    ancorados nas células da tabela em vez da prosa real da seção
    "Características do Artífice".
    """
    lines = clean_lines(raw)
    table_end = next(
        i for i, ln in enumerate(lines) if ln.startswith(FEATURES_PROSE_MARKER)
    )
    starts = []
    search_from = table_end
    for name, level in FEATURE_ORDER:
        found = False
        for i in range(search_from, len(lines)):
            if lines[i] == name:
                starts.append((name, level, i))
                search_from = i + 1
                found = True
                break
        if not found:
            raise SystemExit(f"Ancora nao encontrada (fora de ordem?): {name!r}")

    by_level: dict[int, list[dict]] = {lvl: [] for lvl in range(1, 21)}
    for k, (name, level, idx) in enumerate(starts):
        end = starts[k + 1][2] if k + 1 < len(starts) else len(lines)
        block = lines[idx + 1:end]
        # A lista de truques/magias do Artífice (tabela de referência) aparece
        # encravada no corpo de "Especialização de Artífice", entre essa
        # característica e "A ferramenta certa para o trabalho". É uma tabela
        # paralela, não prosa da característica — corta o bloco a partir dela.
        if "Truques (Círculo 0)" in block:
            block = block[:block.index("Truques (Círculo 0)")]
        # "Alma do Artífice" é a última âncora; sem próxima âncora de nível,
        # o bloco vai até o fim das páginas extraídas e capturaria o capítulo
        # "Especializações de Artífice" (Alquimista, Armeiro, ...) que vem a
        # seguir no livro. Esse capítulo pertence a uma fase futura (conteúdo
        # de subclasse), não à característica de 20º nível — corta antes dele.
        if "Especializações de Artífice" in block:
            block = block[:block.index("Especializações de Artífice")]
        body = []
        for ln in block:
            # Descarta a linha de rótulo "Característica de Nº nível de artífice."
            if re.match(r"^Característica de \d+", ln, re.IGNORECASE):
                continue
            body.append(ln)
        desc = join_body(body)
        display_name = NAME_FIXUPS.get(name, name)
        feature = {"name": display_name, "desc": desc}
        by_level[level].append(feature)

    return by_level


def parse_subclass_intros(raw: str) -> dict[str, str]:
    """Extrai o parágrafo de sabor (flavor text) de cada subclasse.

    Cada subclasse abre com: [título] [citação de Tasha terminando em
    "... Tasha"] [parágrafo descritivo da subclasse] [primeira característica].
    Retornamos apenas o parágrafo descritivo (sem a citação em si, que é
    decoração de livro, não descrição mecânica/temática da subclasse).
    """
    lines = clean_lines(raw)
    chapter_start = next(i for i, ln in enumerate(lines) if ln == "Alquimista")
    chapter_end = next(
        (i for i, ln in enumerate(lines) if ln == INFUSIONS_HEADER), len(lines)
    )
    lines = lines[chapter_start:chapter_end]

    title_idxs = {
        ln: i for i, ln in enumerate(lines)
        if ln in ("Alquimista", "Armeiro", "Atirador", "Ferreiro de Batalha")
    }
    intros = {}
    for title, t_idx in title_idxs.items():
        quote_end = next(
            j for j in range(t_idx + 1, min(t_idx + 8, len(lines)))
            if lines[j].endswith("Tasha")
        )
        # Para de coletar o parágrafo na primeira linha que é o nome de uma
        # característica (i.e., a linha seguinte é o marcador-padrão).
        para_end = next(
            j for j in range(quote_end + 1, len(lines))
            if SUBCLASS_FEATURE_MARKER.match(lines[j + 1]) if j + 1 < len(lines)
        )
        intros[title] = join_body(lines[quote_end + 1:para_end])
    return intros


def parse_subclasses(raw: str) -> dict[str, dict[int, list[dict]]]:
    """Ancora nas características de subclasse via o marcador-padrão.

    Cada característica é: [linha NOME] seguida imediatamente por
    [linha "Característica de Nº nível de <subclasse>."]. Varremos o texto
    completo do capítulo "Especializações de Artífice" procurando esse par de
    linhas em sequência (a técnica usada em parse_features() não serve aqui
    porque os NOMES das características variam por subclasse — não há uma
    lista fixa de âncoras conhecida de antemão).

    O corpo de cada característica vai da linha após o marcador até a próxima
    âncora de característica encontrada (de qualquer subclasse) ou até o
    cabeçalho "Infusões de Artífice" (fim do capítulo de especializações).

    Retorna: {slug_subclasse: {nivel: [{"name":..., "desc":...}, ...]}}
    """
    lines = clean_lines(raw)

    # Recorta o texto a partir do título da primeira subclasse (descarta a
    # característica de 20º nível do Artífice base e qualquer cauda anterior
    # que tenha sobrado da extração das páginas vizinhas).
    chapter_start = next(i for i, ln in enumerate(lines) if ln == "Alquimista")
    chapter_end = next(
        (i for i, ln in enumerate(lines) if ln == INFUSIONS_HEADER), len(lines)
    )
    lines = lines[chapter_start:chapter_end]

    # Títulos de subclasse (linha isolada com o nome da subclasse, ex.
    # "Armeiro") marcam o início de cada seção. A última característica de
    # cada subclasse (15º nível) não tem uma próxima âncora de característica
    # DENTRO da mesma subclasse — sem um corte extra aqui, o corpo dela
    # vazaria para o título + texto de sabor (flavor text) da PRÓXIMA
    # subclasse, que aparece imediatamente depois no texto corrido. Usamos os
    # títulos como cortes adicionais (além das âncoras de característica).
    subclass_title_idxs = [
        i for i, ln in enumerate(lines)
        if ln in ("Alquimista", "Armeiro", "Atirador", "Ferreiro de Batalha")
    ]

    anchors = []  # (slug, level, name, idx_da_linha_de_nome)
    for i in range(len(lines) - 1):
        m = SUBCLASS_FEATURE_MARKER.match(lines[i + 1])
        if not m:
            continue
        level = int(m.group(1))
        subclass_raw = m.group(2).strip().lower()
        slug = next(
            (s for s in SUBCLASS_SLUGS if s == subclass_raw or subclass_raw.startswith(s)),
            None,
        )
        if slug is None:
            raise SystemExit(
                f"Marcador de subclasse não reconhecido: {lines[i+1]!r} "
                f"(token extraído: {subclass_raw!r})"
            )
        name = lines[i]
        anchors.append((slug, level, name, i))

    by_subclass: dict[str, dict[int, list[dict]]] = {
        slug: {3: [], 5: [], 9: [], 15: []} for slug in SUBCLASS_SLUGS
    }

    for k, (slug, level, name, idx) in enumerate(anchors):
        # Corpo: da linha seguinte ao marcador (idx+2) até a próxima âncora
        # de NOME (idx do próximo item), ou fim do capítulo. Para a ÚLTIMA
        # característica de uma subclasse (normalmente nv 15), não há próxima
        # âncora de característica DENTRO da mesma subclasse — o próximo
        # título de subclasse (se vier antes) também é um corte válido, do
        # contrário o corpo vazaria pro flavor text da próxima subclasse.
        body_start = idx + 2
        next_anchor_end = anchors[k + 1][3] if k + 1 < len(anchors) else len(lines)
        next_title_end = next((t for t in subclass_title_idxs if t > idx), len(lines))
        body_end = min(next_anchor_end, next_title_end)
        block = lines[body_start:body_end]

        # A característica "Magias de <Subclasse>" (nv 3) tem um texto
        # descritivo seguido por uma tabela de referência (nível -> magias)
        # que repete o título "Magias de <Subclasse>" antes das linhas da
        # tabela. A tabela é mecânica de subclasse a ser modelada na tarefa
        # A6 (lista de magias), não prosa de característica — mantemos só o
        # texto descritivo e cortamos a partir do título repetido da tabela.
        table_header = f"Magias de {SUBCLASS_SLUGS[slug]}"
        if table_header in block:
            block = block[:block.index(table_header)]

        block = strip_embedded_statblock(block)
        block = rebuild_cannon_table(block)

        body = []
        for ln in block:
            if SUBCLASS_FEATURE_MARKER.match(ln):
                continue
            body.append(ln)
        desc = join_body(body)
        by_subclass[slug][level].append({"name": name, "desc": desc})

    return by_subclass


# Slug interno (chave de SUBCLASS_SLUGS / by_subclass, usado pra casar com o
# marcador do PDF) -> slug "value" exposto no JSON de choices (hifenizado,
# conforme convenção do app: ver phb-class-choices-pt.json).
SUBCLASS_VALUE_SLUG = {
    "alquimista": "alquimista",
    "atirador": "atirador",
    "armeiro": "armeiro",
    "ferreiro de batalha": "ferreiro-de-batalha",
}


def format_subclass_desc(intro: str, features_by_level: dict[int, list[dict]]) -> str:
    """Monta o `desc` no MESMO estilo das subclasses do PHB (ver phb-class-choices-pt.json,
    ex. druida/clérigo): parágrafo de sabor + bloco "Features por nível:" com
    bullets "• Nv N — Nome: resumo.". O resumo de cada bullet é uma versão
    condensada do texto completo (que já está fielmente preservado no arquivo
    de progression); aqui priorizamos legibilidade no mesmo nível de detalhe
    usado pelos bullets do PHB.
    """
    bullets = []
    for level in (3, 5, 9, 15):
        for feat in features_by_level.get(level, []):
            bullets.append(f"• Nv {level} — {feat['name']}: {feat['desc']}")
    return intro + "\n\nFeatures por nível:\n" + "\n".join(bullets)


def build_choices_entry(
    intros: dict[str, str], subclass_features: dict[str, dict[int, list[dict]]]
) -> dict:
    options = []
    for slug in SUBCLASS_ORDER:
        title = SUBCLASS_SLUGS[slug]
        desc = format_subclass_desc(intros[title], subclass_features[slug])
        options.append({
            "value": SUBCLASS_VALUE_SLUG[slug],
            "name": title,
            "desc": desc,
        })

    return {
        "artifice": {
            "choices": [
                {
                    "level": 3,
                    "id": "artificer_specialization",
                    "featureName": "Especialização de Artífice",
                    "prompt": "Escolha sua Especialização de Artífice",
                    "options": options,
                }
            ]
        }
    }


def build_class_entry(full_description: str, features_by_level: dict[int, list[dict]]) -> dict:
    level1 = features_by_level[1]
    return {
        "index": "artifice",
        "name": "Artífice",
        "hit_die": 8,
        "saving_throws": ["Constituição", "Inteligência"],
        "armor_proficiencies": ["Armaduras leves, armaduras médias, escudos"],
        "weapon_proficiencies": ["Armas simples"],
        "skill_choices": SKILL_CHOICES,
        "spellcasting_ability": "Inteligência",
        "summary": SUMMARY,
        "fullDescription": full_description,
        "topics": [{"title": f["name"], "desc": f["desc"]} for f in level1],
        "level1_features": [{"name": f["name"], "desc": f["desc"]} for f in level1],
        "gold_formula": "5d4 × 10",
        "source": "tasha",
    }


def build_progression_entry(features_by_level: dict[int, list[dict]]) -> dict:
    levels = []
    for lvl in range(1, 21):
        feats = []
        for f in features_by_level.get(lvl, []):
            entry = {"name": f["name"], "desc": f["desc"]}
            if f["name"] == "Engenharia Mágica":
                pass
            if f["name"] == "Conjuração":
                entry["category"] = "magia"
            if f["name"] == "Infundir Item":
                entry["category"] = "magia"
            feats.append(entry)

        # Nível 4 já recebeu o texto real (parseado do PDF via FEATURE_ORDER).
        # Níveis 8/12/16/19 repetem a MESMA característica sem reimprimir o
        # texto no livro — usamos a mesma descrição do nv4 (igual ao padrão
        # do PHB, conferido em clerigo/druida/guerreiro).
        if lvl in ASI_REPEAT_LEVELS:
            feats.append({"name": "Aumento no Valor de Atributo", "desc": ASI_DESC})

        if lvl in SUBCLASS_FEATURE_DESC:
            feats.append({
                "name": "Característica de Especialização de Artífice",
                "desc": SUBCLASS_FEATURE_DESC[lvl],
                "subclass": True,
            })

        if lvl == 3:
            # "Especialização de Artífice" é a escolha de subclasse — marca choice_id/subclass.
            for f in feats:
                if f["name"] == "Especialização de Artífice":
                    f["choice_id"] = "artificer_specialization"
                    f["subclass"] = True

        levels.append({"level": lvl, "prof": PROF_BY_LEVEL[lvl - 1], "features": feats})

    return {
        "artifice": {
            "index": "artifice",
            "name": "Artífice",
            "hit_die": 8,
            "primary_ability": "Inteligência",
            "saving_throws": ["Constituição", "Inteligência"],
            "armor_proficiencies": ["Leve", "Média", "Escudos"],
            "weapon_proficiencies": ["Simples"],
            "tool_proficiencies": [
                "Ferramentas de ladrão",
                "Ferramentas de funileiro",
                "Um tipo de ferramenta de artesão à sua escolha",
            ],
            "skill_choices": SKILL_CHOICES,
            "cantrips_known": CANTRIPS_KNOWN,
            "levels": levels,
        }
    }


def main():
    if len(sys.argv) != 2:
        raise SystemExit("uso: python build_artificer.py <caminho-do-pdf>")
    pdf_path = sys.argv[1]

    intro_raw = extract_pages(pdf_path, 7, 7)
    features_raw = extract_pages(pdf_path, 8, 12)
    subclasses_raw = extract_pages(pdf_path, 12, 18)

    full_description = parse_fulldescription(intro_raw)
    features_by_level = parse_features(features_raw)
    subclass_intros = parse_subclass_intros(subclasses_raw)
    subclass_features = parse_subclasses(subclasses_raw)

    class_entry = build_class_entry(full_description, features_by_level)
    progression = build_progression_entry(features_by_level)
    choices = build_choices_entry(subclass_intros, subclass_features)

    OUT_CLASSES.write_text(
        json.dumps([class_entry], ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    OUT_PROGRESSION.write_text(
        json.dumps(progression, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    OUT_CHOICES.write_text(
        json.dumps(choices, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Escrito: {OUT_CLASSES}")
    print(f"Escrito: {OUT_PROGRESSION}")
    print(f"Escrito: {OUT_CHOICES}")


if __name__ == "__main__":
    main()

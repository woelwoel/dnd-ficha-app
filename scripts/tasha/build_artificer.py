"""Estrutura a classe Artífice do Caldeirão de Tasha nos schemas do app.

Gera DOIS arquivos, ambos carimbados com `source: "tasha"`:
  - public/srd-data/tasha-classes-pt.json            (array, schema de phb-classes-pt.json)
  - public/srd-data/tasha-class-progression-pt.json  (objeto, schema de phb-class-progression-pt.json)

Entrada: texto extraído via extract_text.py das páginas 0-indexadas 7-12 do PDF
(tabela "O Artífice" + "Características do Artífice" + nível 5/9/15 das quatro
especializações, usadas apenas para os marcadores de subclasse genéricos).

A DESCRIÇÃO de cada característica de nível é parseada direto do texto extraído
(fiel à fonte): ancoramos nos nomes das características EM SEQUÊNCIA (mesma
técnica de build_feats.py) e juntamos linhas quebradas em parágrafo. O mapa de
nível -> características é fixo (verificado contra a tabela "O Artífice").

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

    full_description = parse_fulldescription(intro_raw)
    features_by_level = parse_features(features_raw)

    class_entry = build_class_entry(full_description, features_by_level)
    progression = build_progression_entry(features_by_level)

    OUT_CLASSES.write_text(
        json.dumps([class_entry], ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    OUT_PROGRESSION.write_text(
        json.dumps(progression, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Escrito: {OUT_CLASSES}")
    print(f"Escrito: {OUT_PROGRESSION}")


if __name__ == "__main__":
    main()

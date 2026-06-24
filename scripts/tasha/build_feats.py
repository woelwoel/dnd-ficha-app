"""Estrutura os talentos do Caldeirão de Tasha no schema de feats do app.

Entrada (stdin): texto extraído das páginas de talentos por extract_text.py.
Saída (stdout): JSON no formato de public/srd-data/phb-feats-pt.json, com cada
item carimbado `source: "tasha"`.

A DESCRIÇÃO de cada talento é parseada direto do texto extraído (fiel à fonte):
ancoramos nos nomes dos talentos EM SEQUÊNCIA (evita falso-positivo no corpo) e
juntamos as linhas quebradas em parágrafo. `prereq` e `attrBonus` são metadados
estruturados (exigem interpretação) num dicionário por nome.

Os 15 talentos da seção (em ordem alfabética no livro):
"""
import json
import re
import sys
import unicodedata

# Ordem em que os talentos aparecem na seção. Usada como âncora sequencial.
FEAT_ORDER = [
    "Adepto Metamágico",
    "Adepto Místico",
    "Chef",
    "Envenenador",
    "Esmagador",
    "Especializado em Perícia",
    "Iniciado Artífice",
    "Iniciado em Combate",
    "Lacerador",
    "Perfurador",
    "Pistoleiro",
    "Telecinético",
    "Telepático",
    "Tocado pelas Fadas",
    "Tocado pelas Sombras",
]

# Metadados estruturados por talento (interpretação das regras).
# attrBonus: { choices: [keys], amount } — alimenta a sub-escolha do FeatPicker.
# prereq: forma do phb-feats-pt.json (types: spellcasting | proficiency | ...).
ALL_ATTRS = ["str", "dex", "con", "int", "wis", "cha"]
META = {
    "Adepto Metamágico": {"prereq": {"type": "spellcasting"}},
    "Adepto Místico": {"prereq": {"type": "spellcasting"}},
    "Chef": {"attrBonus": {"choices": ["con", "wis"], "amount": 1}},
    "Envenenador": {},  # não concede ASI
    "Esmagador": {"attrBonus": {"choices": ["str", "con"], "amount": 1}},
    "Especializado em Perícia": {"attrBonus": {"choices": ALL_ATTRS, "amount": 1}},
    "Iniciado Artífice": {},  # não concede ASI
    "Iniciado em Combate": {"prereq": {"type": "proficiency", "proficiency": "martial-weapons"}},
    "Lacerador": {"attrBonus": {"choices": ["str", "dex"], "amount": 1}},
    "Perfurador": {"attrBonus": {"choices": ["str", "dex"], "amount": 1}},
    "Pistoleiro": {"attrBonus": {"choices": ["dex"], "amount": 1}},
    "Telecinético": {"attrBonus": {"choices": ["int", "wis", "cha"], "amount": 1}},
    "Telepático": {"attrBonus": {"choices": ["int", "wis", "cha"], "amount": 1}},
    "Tocado pelas Fadas": {"attrBonus": {"choices": ["int", "wis", "cha"], "amount": 1}},
    "Tocado pelas Sombras": {"attrBonus": {"choices": ["int", "wis", "cha"], "amount": 1}},
}

NOISE = re.compile(r"^\s*$|^\d+\s*$|^Opções de Personagens\s*$|^-----\s*p\.\d+\s*-----\s*$")


def slug(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def clean_lines(raw: str) -> list[str]:
    out = []
    for ln in raw.splitlines():
        if NOISE.match(ln):
            continue
        out.append(ln.strip())
    return out


def join_body(lines: list[str]) -> str:
    """Junta linhas quebradas em texto corrido, colapsando espaços."""
    text = " ".join(lines)
    return re.sub(r"\s+", " ", text).strip()


def parse_feats(raw: str) -> list[dict]:
    lines = clean_lines(raw)
    # Acha o índice de início de cada talento, ancorando EM SEQUÊNCIA.
    starts = []
    search_from = 0
    for name in FEAT_ORDER:
        for i in range(search_from, len(lines)):
            if lines[i] == name:
                starts.append((name, i))
                search_from = i + 1
                break
        else:
            raise SystemExit(f"Âncora não encontrada (fora de ordem?): {name!r}")

    feats = []
    for k, (name, idx) in enumerate(starts):
        end = starts[k + 1][1] if k + 1 < len(starts) else len(lines)
        block = lines[idx + 1:end]
        # Separa linha(s) de pré-requisito do corpo.
        body = []
        for ln in block:
            if ln.lower().startswith("pré-requisito"):
                continue  # prereq vem estruturado do META
            body.append(ln)
        feat = {
            "index": slug(name),
            "name": name,
            "desc": join_body(body),
            "source": "tasha",
        }
        meta = META.get(name, {})
        if "prereq" in meta:
            feat["prereq"] = meta["prereq"]
        if "attrBonus" in meta:
            feat["attrBonus"] = meta["attrBonus"]
        feats.append(feat)
    return feats


if __name__ == "__main__":
    raw = sys.stdin.buffer.read().decode("utf-8")
    feats = parse_feats(raw)
    sys.stdout.reconfigure(encoding="utf-8")
    json.dump(feats, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")

"""Estrutura os talentos raciais do Guia de Xanathar no schema de feats do app.

Entrada (stdin): texto extraído das páginas de talentos por extract_text.py
(pymupdf --pages 70-72 nesta edição do PDF).
Saída (stdout): JSON no formato de public/srd-data/phb-feats-pt.json, com cada
item carimbado `source: "xanathar"`.

A DESCRIÇÃO de cada talento é parseada direto do texto extraído (fiel à fonte);
`prereq` (tipo race, novo no XGE) e `attrBonus` são metadados estruturados num
dicionário por nome. Diferenças em relação à esteira do Tasha:

- As âncoras de título vêm em CAIXA ALTA e com OCR ruidoso ("BoASORTE",
  "FORTlTUDE ANÃ", "FÚRIA ÜRC", "TELEPORTE DAS f ADAS") → o match é fuzzy
  (difflib sobre letras normalizadas) + exige linha majoritariamente maiúscula
  (evita casar com a tabela-resumo, que repete os nomes em título-case).
- Normalização mecânica de OCR: `l` no lugar de `1` antes de dígito (ld4→1d4).
- OCR quebrado não-mecânico (glifos exóticos) é corrigido NA CURADORIA manual
  do JSON gerado, não aqui — o script é só o bootstrap fiel.
"""
import difflib
import json
import re
import sys
import unicodedata

# Ordem alfabética em que os talentos aparecem na seção (nomes desta tradução).
FEAT_ORDER = [
    "Agachamento Ágil",
    "Alta Magia Drow",
    "Boa Sorte",
    "Chamas de Phlegethos",
    "Constituição Infernal",
    "Couro de Dragão",
    "Desvanecer",
    "Fortitude Anã",
    "Fúria Orc",
    "Magia do Elfo da Floresta",
    "Precisão Élfica",
    "Prodígio",
    "Segunda Chance",
    "Teleporte das Fadas",
    "Temor Dracônico",
]

# Metadados estruturados por talento (interpretação das regras do PDF).
# races: códigos de raça/sub-raça do app (phb-races-pt.json).
# "Agachamento Ágil" = "Anão ou Raças Pequenas" → lista explícita (decisão da spec).
# "Segunda Chance": o PDF traduz só CON/CAR (o original inglês inclui DES) —
# seguimos o PDF; divergência marcada pra revisão com o dono.
META = {
    "Agachamento Ágil":          {"races": ["anao", "halfling", "gnomo"], "attr": ["str", "dex"]},
    "Alta Magia Drow":           {"races": ["elfo-negro-drow"]},
    "Boa Sorte":                 {"races": ["halfling"]},
    "Chamas de Phlegethos":      {"races": ["tiefling"], "attr": ["int", "cha"]},
    "Constituição Infernal":     {"races": ["tiefling"], "attr": ["con"]},
    "Couro de Dragão":           {"races": ["draconato"], "attr": ["str", "con", "cha"]},
    "Desvanecer":                {"races": ["gnomo"], "attr": ["dex", "int"]},
    "Fortitude Anã":             {"races": ["anao"], "attr": ["con"]},
    "Fúria Orc":                 {"races": ["meio-orc"], "attr": ["str", "con"]},
    "Magia do Elfo da Floresta": {"races": ["elfo-da-floresta"]},
    "Precisão Élfica":           {"races": ["elfo", "meio-elfo"], "attr": ["dex", "int", "wis", "cha"]},
    "Prodígio":                  {"races": ["meio-elfo", "meio-orc", "humano"]},
    "Segunda Chance":            {"races": ["halfling"], "attr": ["con", "cha"]},
    "Teleporte das Fadas":       {"races": ["alto-elfo"], "attr": ["int", "cha"]},
    "Temor Dracônico":           {"races": ["draconato"], "attr": ["str", "con", "cha"]},
}

NOISE = re.compile(
    r"^\s*$|^\d+\s*$|^-----\s*p\.\d+\s*-----\s*$|^CAP[ÍI1l]TULO"
)


def slug(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def letters(s: str) -> str:
    """Só letras ascii minúsculas — base da comparação fuzzy de âncoras."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z]", "", s.lower())


def mostly_upper(s: str) -> bool:
    ls = [c for c in s if c.isalpha()]
    if not ls:
        return False
    return sum(1 for c in ls if c.isupper()) / len(ls) >= 0.6


def is_anchor(line: str, name: str) -> bool:
    """Título de seção: linha curta, majoritariamente maiúscula, fuzzy-igual ao nome."""
    if len(line) > 45 or not mostly_upper(line):
        return False
    a, b = letters(line), letters(name)
    if not a or not b:
        return False
    return difflib.SequenceMatcher(None, a, b).ratio() >= 0.8


def clean_lines(raw: str) -> list[str]:
    out = []
    for ln in raw.splitlines():
        if NOISE.match(ln.strip()):
            continue
        out.append(ln.strip())
    return out


def fix_ocr(text: str) -> str:
    """Correções mecânicas seguras de OCR."""
    text = re.sub(r"\bl(?=\d)", "1", text)          # ld4 → 1d4, l50 → 150
    text = text.replace("Meio-Ore", "Meio-Orc").replace("Meio-ore", "Meio-orc")
    return text


def join_body(lines: list[str]) -> str:
    """Junta linhas quebradas em texto corrido (bullets viram '• ' inline)."""
    text = " ".join(lines)
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"([a-zà-úç,;])- ([a-zà-úç])", r"\1\2", text)  # hifenização de quebra
    return fix_ocr(text)


def parse_feats(raw: str) -> list[dict]:
    lines = clean_lines(raw)
    starts = []
    search_from = 0
    for name in FEAT_ORDER:
        for i in range(search_from, len(lines)):
            if is_anchor(lines[i], name):
                starts.append((name, i))
                search_from = i + 1
                break
        else:
            raise SystemExit(f"Âncora não encontrada (fora de ordem?): {name!r}")

    feats = []
    for k, (name, idx) in enumerate(starts):
        end = starts[k + 1][1] if k + 1 < len(starts) else len(lines)
        block = lines[idx + 1:end]
        body = []
        for ln in block:
            low = letters(ln)
            if low.startswith("prerequisito") or low.startswith("prrequisito"):
                continue  # prereq vem estruturado do META
            body.append(ln)
        meta = META[name]
        feat = {
            "index": slug(name),
            "name": name,
            "desc": join_body(body),
            "source": "xanathar",
            "prereq": {"type": "race", "races": meta["races"]},
        }
        if "attr" in meta:
            feat["attrBonus"] = {"choices": meta["attr"], "amount": 1}
        feats.append(feat)
    return feats


if __name__ == "__main__":
    raw = sys.stdin.buffer.read().decode("utf-8")
    feats = parse_feats(raw)
    sys.stdout.reconfigure(encoding="utf-8")
    json.dump(feats, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")

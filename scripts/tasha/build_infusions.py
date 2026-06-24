"""Estrutura o catálogo de Infusões de Artífice do Caldeirão de Tasha.

Saída: public/srd-data/tasha-infusions-pt.json (array), cada item carimbado
`source: "tasha"`.

Entrada: texto extraído via extract_text.py das páginas 0-indexadas 18-21 do
PDF (capítulo "Infusões de Artífice" completo — começa com a introdução do
capítulo e a primeira infusão "Afiador Mental", termina com a última
infusão "Servo Homúnculo" e seu bloco de estatísticas, imediatamente antes
do capítulo "Bárbaro").

ANCORAGEM: cada infusão tem uma linha `Item: <tipo de item>` (a âncora mais
confiável — sempre presente, exceto em "Replicar Item Mágico", tratada como
caso especial abaixo). O NOME da infusão é a linha imediatamente acima de
`Item:`, A MENOS que haja uma linha `Pré-requisito:` entre o nome e o
`Item:` — nesse caso o nome é a linha acima do `Pré-requisito:`. Subimos a
partir de `Item:` pulando uma linha opcional de `Pré-requisito:` até achar
o nome (mesma técnica descrita na tarefa).

CASOS ESPECIAIS:
  - "Replicar Item Mágico" não tem linha `Item:` (a infusão replica um item
    de uma das 4 tabelas "Itens Replicáveis", não um único tipo de item
    fixo). Ancoramos seu início pelo nome (linha logo após "Foco Arcano
    Aprimorado" terminar) e seu fim no início da próxima âncora (`Item:` de
    "Servo Homúnculo"). As 4 tabelas de itens replicáveis (nome do item +
    coluna Sim/Não de sintonização) são reconstruídas em prosa legível
    (mesma técnica de rebuild_cannon_table em build_artificer.py), em vez de
    preservar as linhas cruas alternadas (nome/Sim/Não) que ficariam
    incompreensíveis fora do layout de tabela do PDF.
  - "Servo Homúnculo" (última infusão do capítulo) tem um bloco de
    estatísticas da criatura encravado no meio/fim do corpo da descrição
    (sidebar "Servo Homúnculo" / "Construto Minúsculo" / ... / "Canalizar
    Magia"). Excisamos esse bloco pelo par de âncoras estáveis (início:
    título do sidebar seguido por "Construto Minúsculo"; fim: última linha
    da reação "Canalizar Magia") — mesma técnica de
    strip_embedded_statblock em build_artificer.py.

Uso:
    python scripts/tasha/build_infusions.py "<caminho-do-pdf>"
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

import fitz  # pymupdf

REPO_ROOT = Path(__file__).resolve().parents[2]
OUT_PATH = REPO_ROOT / "public" / "srd-data" / "tasha-infusions-pt.json"

PAGES = (18, 21)

NOISE = re.compile(r"^\s*$|^\d+\s*$|^Opções de Personagens\s*$|^-----\s*p\.\d+\s*-----\s*$")

CHAPTER_HEADER = "Infusões de Artífice"

PREREQ_RE = re.compile(r"^Pré-requisito:\s*(\d+)[ºo°]\s+nível de artífice", re.IGNORECASE)
ITEM_RE = re.compile(r"^Item:\s*(.*)$")

DEFAULT_PREREQ = 2

# "Replicar Item Mágico" não tem linha `Item:` — tratada como caso especial
# (ver REPLICATE_ITEM_NAME abaixo). As 4 tabelas de itens replicáveis usam
# esse cabeçalho de coluna fixo, removido antes de reconstruir a prosa.
REPLICATE_ITEM_NAME = "Replicar Item Mágico"
REPLICABLE_TABLE_HEADER_RE = re.compile(
    r"^Itens Replicáveis \((\d+)[ºo°]\s+nível de artífice\)$"
)
REPLICABLE_COLUMN_HEADERS = ["Item Mágico", "Sintonização"]

# Bloco de estatísticas do Servo Homúnculo (sidebar encravado no fim do
# capítulo). Mesma técnica de strip_embedded_statblock em build_artificer.py.
STATBLOCK_START = "Servo Homúnculo"
STATBLOCK_START_CONFIRM = "Construto Minúsculo"
STATBLOCK_END = "de você para isso."


def slug(name: str) -> str:
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def normalize_glyphs(text: str) -> str:
    """Corrige artefatos de glifo do PDF fan-translation (reprodutível):
    - dígito '1' renderizado como 'l' em notação de dado: 'ld8' -> '1d8'
    - bônus '+ l' -> '+1' e bônus '+ 1' (com espaço espúrio) -> '+1'
    - quebras espúrias: 'meia- luz' -> 'meia-luz', 'suasferramentas' -> 'suas ferramentas'
    """
    text = re.sub(r"\bl(d\d)", r"1\1", text)   # ld8/ld6/ld4 -> 1d8/...
    text = re.sub(r"\+ l\b", "+1", text)        # "+ l" -> "+1"
    # "de/para + N" ou "+ N de/para" -> "+N" (notação de bônus com espaço
    # espúrio do PDF; ex.: "bônus de + 1", "aumenta para +\n2", "ganha + 1 de
    # bônus"). Restrito ao contexto "de"/"para" adjacente (antes OU depois),
    # pra não tocar somas em prosa como "modificador de inteligência + 5
    # vezes seu nível" (statblock do homúnculo), onde "de" não é adjacente.
    text = re.sub(r"\b(de|para) \+ (\d)\b", r"\1 +\2", text)
    text = re.sub(r"\+ (\d)\b(?= (?:de|para)\b)", r"+\1", text)
    text = text.replace("meia- luz", "meia-luz")
    text = text.replace("suasferramentas", "suas ferramentas")
    return text


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
    return normalize_glyphs(re.sub(r"\s+", " ", text).strip())


def strip_embedded_statblock(block: list[str]) -> list[str]:
    """Remove o sidebar de stat-block do Servo Homúnculo, se presente no bloco."""
    for i, ln in enumerate(block):
        if ln == STATBLOCK_START and i + 1 < len(block) and block[i + 1] == STATBLOCK_START_CONFIRM:
            for j in range(i, len(block)):
                if block[j].endswith(STATBLOCK_END):
                    return block[:i] + block[j + 1:]
            raise SystemExit(
                "Bloco de estatísticas do Servo Homúnculo: marcador de início "
                "encontrado mas não o de fim — ajuste STATBLOCK_END."
            )
    return block


def rebuild_replicable_tables(block: list[str]) -> list[str]:
    """Reconstrói as 4 tabelas 'Itens Replicáveis (Nº nível)' em prosa legível.

    Cada tabela no texto extraído aparece como: título, 2 cabeçalhos de
    coluna ("Item Mágico", "Sintonização"), depois N pares de linhas
    alternadas (nome do item / "Sim" ou "Não"). Reconstituímos cada tabela
    como uma lista "Nome (requer sintonização)" / "Nome" separada por nível.
    """
    out = []
    i = 0
    while i < len(block):
        m = REPLICABLE_TABLE_HEADER_RE.match(block[i])
        if not m:
            out.append(block[i])
            i += 1
            continue
        level = m.group(1)
        i += 1
        # Pula cabeçalhos de coluna, se presentes.
        while i < len(block) and block[i] in REPLICABLE_COLUMN_HEADERS:
            i += 1
        entries = []
        while i < len(block) and not REPLICABLE_TABLE_HEADER_RE.match(block[i]):
            name = block[i]
            i += 1
            if i >= len(block) or block[i] not in ("Sim", "Não"):
                raise SystemExit(
                    f"Tabela Itens Replicáveis ({level}º nível): esperava Sim/Não "
                    f"após {name!r}, achou {block[i] if i < len(block) else '<fim>'!r}"
                )
            attune = block[i]
            i += 1
            label = f"{name} (requer sintonização)" if attune == "Sim" else name
            entries.append(label)
        out.append(f"Itens Replicáveis ({level}º nível de artífice): " + "; ".join(entries) + ".")
    return out


def find_anchors(lines: list[str]) -> list[tuple[str, int | None, int, int]]:
    """Acha cada infusão ancorando em `Item:` (subindo por Pré-requisito/Nome).

    Retorna lista de (nome, prereq_ou_None, idx_da_linha_de_nome, idx_da_linha_item).
    A linha de `Item:` em si pode se estender por mais de uma linha (ver
    consume_item_text) — idx_da_linha_item marca só a PRIMEIRA linha.
    """
    anchors = []
    for i, ln in enumerate(lines):
        if not ITEM_RE.match(ln):
            continue
        # Sobe a partir de Item: pulando um Pré-requisito opcional.
        j = i - 1
        prereq = None
        if j >= 0 and PREREQ_RE.match(lines[j]):
            prereq = int(PREREQ_RE.match(lines[j]).group(1))
            j -= 1
        name_idx = j
        name = lines[name_idx]
        anchors.append((name, prereq, name_idx, i))
    return anchors


def consume_item_text(lines: list[str], item_line_idx: int) -> tuple[str, int]:
    """Junta a(s) linha(s) da cláusula `Item: ...`.

    A cláusula `Item:` nem sempre termina em ponto final no PDF (ex.: "Item:
    Uma armadura (requer sintonização)" sem ponto) — não dá pra ancorar no
    ponto final. O sinal confiável é a CAPITALIZAÇÃO da linha seguinte: o
    corpo da descrição sempre começa com letra maiúscula (nova frase);
    quando a cláusula `Item:` é quebrada por largura de página em duas
    linhas (ex. "Arma Bumerangue", "Disparo Recorrente"), a linha de
    continuação começa em minúscula (meio de frase: "arremesso.", "munição
    (requer sintonização)"). Continuamos consumindo enquanto a próxima linha
    começar em minúscula.

    Retorna (texto_do_item_sem_prefixo, idx_da_proxima_linha_apos_a_clausula).
    """
    buf = [ITEM_RE.match(lines[item_line_idx]).group(1)]
    i = item_line_idx
    while i + 1 < len(lines) and lines[i + 1][:1].islower():
        i += 1
        buf.append(lines[i])
    i += 1
    text = join_body(buf)
    return text, i


def parse_infusions(raw: str) -> list[dict]:
    lines = clean_lines(raw)
    chapter_start = next(i for i, ln in enumerate(lines) if ln == CHAPTER_HEADER)
    lines = lines[chapter_start:]

    anchors = find_anchors(lines)
    if not anchors:
        raise SystemExit("Nenhuma âncora `Item:` encontrada no texto extraído.")

    # "Replicar Item Mágico" não tem `Item:` — insere uma âncora sintética
    # entre "Foco Arcano Aprimorado" (última âncora antes dela) e "Servo
    # Homúnculo" (primeira âncora depois), localizando seu nome pela linha.
    replicate_name_idx = next(
        (i for i, ln in enumerate(lines) if ln == REPLICATE_ITEM_NAME), None
    )
    if replicate_name_idx is None:
        raise SystemExit(f"Infusão sem Item: não encontrada: {REPLICATE_ITEM_NAME!r}")

    infusions = []
    for k, (name, prereq, name_idx, item_idx) in enumerate(anchors):
        item_text, body_start = consume_item_text(lines, item_idx)
        body_end = anchors[k + 1][2] if k + 1 < len(anchors) else len(lines)
        # "Replicar Item Mágico" não tem âncora `Item:` própria — se o nome
        # dela cai dentro do intervalo do corpo desta infusão (ela vem
        # imediatamente antes de "Servo Homúnculo" no texto, ou seja, dentro
        # do range cujo próximo Item: anchor é o de "Servo Homúnculo"),
        # encurta o corpo aqui para não vazar pro texto dela.
        if body_start <= replicate_name_idx < body_end:
            body_end = replicate_name_idx
        block = lines[body_start:body_end]
        block = strip_embedded_statblock(block)
        desc = join_body(block)
        requires_attunement = "requer sintoniz" in item_text.lower()
        infusions.append({
            "index": slug(name),
            "name": name,
            "prereq": prereq if prereq is not None else DEFAULT_PREREQ,
            "itemType": item_text,
            "requiresAttunement": requires_attunement,
            "desc": desc,
            "source": "tasha",
        })
        # Insere "Replicar Item Mágico" logo após a infusão cuja âncora de
        # Item: vem imediatamente antes dela no texto (k é o índice da
        # âncora anterior; o nome dela está em name_idx < replicate_name_idx
        # < próxima âncora). O corpo dela vai até a linha de NOME da próxima
        # infusão (não até a linha `Item:` dela, que vem depois do nome).
        next_name_idx = anchors[k + 1][2] if k + 1 < len(anchors) else len(lines)
        if name_idx < replicate_name_idx < next_name_idx:
            rep_body = lines[replicate_name_idx + 1:next_name_idx]
            rep_body = rebuild_replicable_tables(rep_body)
            rep_desc = join_body(rep_body)
            infusions.append({
                "index": slug(REPLICATE_ITEM_NAME),
                "name": REPLICATE_ITEM_NAME,
                "prereq": DEFAULT_PREREQ,
                "itemType": (
                    "Variável — você replica um item mágico específico escolhido "
                    "entre as tabelas Itens Replicáveis (ou um item mágico comum, "
                    "exceto poções ou pergaminhos); sintonização depende do item "
                    "replicado"
                ),
                "requiresAttunement": False,
                "desc": rep_desc,
                "source": "tasha",
            })

    return infusions


def main():
    if len(sys.argv) != 2:
        raise SystemExit("uso: python build_infusions.py <caminho-do-pdf>")
    pdf_path = sys.argv[1]

    raw = extract_pages(pdf_path, *PAGES)
    infusions = parse_infusions(raw)

    OUT_PATH.write_text(
        json.dumps(infusions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Escrito: {OUT_PATH} ({len(infusions)} infusões)")


if __name__ == "__main__":
    main()

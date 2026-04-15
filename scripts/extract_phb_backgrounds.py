"""
Extrai os 13 antecedentes do PHB PT-BR.
Saída: public/srd-data/phb-backgrounds-pt.json

Uso: python scripts/extract_phb_backgrounds.py
"""

import fitz, re, json, unicodedata, os

PDF_PATH   = r"C:\Users\gvfar\OneDrive\RPG BIGBIG\dd-5e-livro-do-jogador-fundo-branco-biblioteca-elfica.pdf"
OUTPUT     = os.path.join(os.path.dirname(__file__), "..", "public", "srd-data", "phb-backgrounds-pt.json")
PAGE_START = 127   # 0-indexed  (livro pág 128)
PAGE_END   = 142   # inclusive   (livro pág 143)
COLUMN_SPLIT = 297

KNOWN_BACKGROUNDS = [
    "ACÓLITO", "ARTESÃO DE GUILDA", "ARTISTA", "CHARLATÃO", "CRIMINOSO",
    "EREMITA", "FORASTEIRO", "HERÓI DO POVO", "MARINHEIRO", "NOBRE",
    "ÓRFÃO", "SÁBIO", "SOLDADO",
]

def slugify(name):
    n = unicodedata.normalize("NFD", name)
    n = "".join(c for c in n if unicodedata.category(c) != "Mn")
    n = n.lower()
    n = re.sub(r"[^a-z0-9\s-]", "", n)
    return re.sub(r"\s+", "-", n.strip())

def extract_columns(page):
    blocks = page.get_text("blocks")
    left, right = [], []
    for b in blocks:
        if b[6] != 0: continue
        t = b[4].strip()
        if not t: continue
        (left if b[0] < COLUMN_SPLIT else right).append((b[1], t))
    left.sort(); right.sort()
    return "\n".join(t for _, t in left) + "\n" + "\n".join(t for _, t in right)

def clean(text):
    return re.sub(r"\s+", " ", text).strip()

def parse_table(lines, start_idx):
    """Parseia tabela d6/d8/d10/d12 que começa em start_idx.
    Retorna (entries_list, next_idx)."""
    entries = []
    i = start_idx
    n = len(lines)
    # Pular linha de header (ex: 'Traço de Personalidade')
    if i < n and not lines[i].strip().lstrip("d0-9").strip().isdigit():
        i += 1
    current_num = None
    current_text = []
    while i < n:
        line = lines[i].strip()
        # Linha é só um número → começa nova entrada
        if re.match(r"^\d+$", line):
            if current_num is not None and current_text:
                entries.append(clean(" ".join(current_text)))
            current_num = int(line)
            current_text = []
        # Próxima tabela (d6, d8, d10...)
        elif re.match(r"^d\d+$", line):
            break
        # Seção de antecedente nova
        elif any(line.upper() == bg for bg in KNOWN_BACKGROUNDS):
            break
        elif line:
            current_text.append(line)
        i += 1
    if current_num is not None and current_text:
        entries.append(clean(" ".join(current_text)))
    return entries, i

def extract_text_all_pages(doc):
    lines = []
    for p in range(PAGE_START, PAGE_END + 1):
        for ln in extract_columns(doc[p]).splitlines():
            ln = ln.strip()
            if ln and not re.match(r"^\d{2,3}$", ln):  # remover apenas nº de página
                lines.append(ln)
    return lines

def parse_backgrounds(lines):
    backgrounds = []
    n = len(lines)
    i = 0

    # Localizar inícios de antecedentes
    bg_starts = []
    for idx, line in enumerate(lines):
        upper = line.strip().upper()
        if upper in KNOWN_BACKGROUNDS:
            bg_starts.append((idx, line.strip()))

    for bi, (start, name) in enumerate(bg_starts):
        end = bg_starts[bi + 1][0] if bi + 1 < len(bg_starts) else n
        seg = lines[start + 1:end]

        bg = {
            "index": slugify(name),
            "name": name.title() if name != "ÓRFÃO" else "Órfão",
            "description": "",
            "skill_proficiencies": [],
            "tool_proficiencies": [],
            "languages": "",
            "equipment": "",
            "feature": {"name": "", "desc": ""},
            "personality_traits": [],
            "ideals": [],
            "bonds": [],
            "flaws": [],
        }
        # Corrigir capitalização especial
        name_map = {
            "ACÓLITO": "Acólito", "ARTESÃO DE GUILDA": "Artesão de Guilda",
            "ARTISTA": "Artista", "CHARLATÃO": "Charlatão",
            "CRIMINOSO": "Criminoso", "EREMITA": "Eremita",
            "FORASTEIRO": "Forasteiro", "HERÓI DO POVO": "Herói do Povo",
            "MARINHEIRO": "Marinheiro", "NOBRE": "Nobre",
            "ÓRFÃO": "Órfão", "SÁBIO": "Sábio", "SOLDADO": "Soldado",
        }
        bg["name"] = name_map.get(name.upper(), name.title())

        desc_lines = []
        j = 0
        ns = len(seg)

        # --- descrição até primeiro campo de proficiência ---
        while j < ns:
            line = seg[j].strip()
            if re.match(r"^Profici[eê]ncia\s+em\s+Per[ií]cias", line, re.I):
                break
            if re.match(r"^CARACTER[ÍI]STICA:", line, re.I):
                break
            if re.match(r"^CARACTER[ÍI]STICAS\s+SUGERIDAS", line, re.I):
                break
            if not re.match(r"^d\d+", line):
                desc_lines.append(line)
            j += 1
        bg["description"] = clean(" ".join(desc_lines))

        # --- campos fixos ---
        while j < ns:
            line = seg[j].strip()

            m = re.match(r"^Profici[eê]ncia\s+em\s+Per[ií]cias\s*:\s*(.+)", line, re.I)
            if m:
                skills_text = m.group(1)
                j += 1
                # Continuar lendo se a linha terminar em vírgula (quebra de bloco)
                while j < ns and skills_text.rstrip().endswith(","):
                    skills_text += " " + seg[j].strip()
                    j += 1
                bg["skill_proficiencies"] = [s.strip() for s in skills_text.split(",") if s.strip()]
                continue

            m = re.match(r"^Profici[eê]ncia\s+em\s+Ferramenta\w*\s*:\s*(.+)", line, re.I)
            if m:
                tools_text = m.group(1)
                j += 1
                while j < ns and tools_text.rstrip().endswith(","):
                    tools_text += " " + seg[j].strip()
                    j += 1
                bg["tool_proficiencies"] = [s.strip() for s in tools_text.split(",") if s.strip()]
                continue

            m = re.match(r"^Idioma\w*\s*:\s*(.+)", line, re.I)
            if m:
                bg["languages"] = m.group(1).strip()
                j += 1; continue

            m = re.match(r"^Equipamento\s*:\s*(.+)", line, re.I)
            if m:
                eq_parts = [m.group(1)]
                j += 1
                while j < ns and not re.match(
                    r"^(CARACTER[ÍI]STICA|Profici[eê]ncia|d\d+|CARACTER[ÍI]STICAS\s+SUGERIDAS)",
                    seg[j].strip(), re.I):
                    eq_parts.append(seg[j].strip())
                    j += 1
                bg["equipment"] = clean(" ".join(eq_parts))
                continue

            m = re.match(r"^CARACTER[ÍI]STICA\s*:\s*(.+)", line, re.I)
            if m:
                feat_name = m.group(1).strip()
                feat_desc = []
                j += 1
                while j < ns and not re.match(
                    r"^(CARACTER[ÍI]STICAS\s+SUGERIDAS|d\d+)",
                    seg[j].strip(), re.I):
                    feat_desc.append(seg[j].strip())
                    j += 1
                bg["feature"] = {
                    "name": feat_name,
                    "desc": clean(" ".join(feat_desc))
                }
                continue

            # Tabelas d8/d6
            m_table = re.match(r"^(d\d+)$", line)
            if m_table:
                j += 1
                # próxima linha: header (ex: 'Traço de Personalidade')
                header = seg[j].strip() if j < ns else ""
                j += 1
                entries, j = parse_table(seg, j)
                hl = header.lower()
                if "tra" in hl and "personalidade" in hl:
                    bg["personality_traits"] = entries
                elif "ideal" in hl:
                    bg["ideals"] = entries
                elif "v[íi]nculo" in hl.replace("í","i"):
                    bg["bonds"] = entries
                elif "vinculo" in hl:
                    bg["bonds"] = entries
                elif "defeito" in hl:
                    bg["flaws"] = entries
                continue

            j += 1

        backgrounds.append(bg)
        print(f"  + {bg['name']} | perícias: {bg['skill_proficiencies']} | traços: {len(bg['personality_traits'])}".encode("ascii","replace").decode())

    return backgrounds


if __name__ == "__main__":
    doc = fitz.open(PDF_PATH)
    print(f"Extraindo antecedentes (pág {PAGE_START+1}–{PAGE_END+1})...\n")
    lines = extract_text_all_pages(doc)
    bgs = parse_backgrounds(lines)

    out = os.path.abspath(OUTPUT)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(bgs, f, ensure_ascii=False, indent=2)

    print(f"\n{'-'*50}")
    print(f"OK: {len(bgs)} antecedentes extraidos")
    print(f"Salvo em: {out}")

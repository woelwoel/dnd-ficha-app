"""
Extrai as 9 raças do PHB PT-BR com seus traços raciais e sub-raças.
Saída: public/srd-data/phb-races-pt.json

Uso: python scripts/extract_phb_races.py
"""

import fitz, re, json, unicodedata, os

PDF_PATH   = r"C:\Users\gvfar\OneDrive\RPG BIGBIG\dd-5e-livro-do-jogador-fundo-branco-biblioteca-elfica.pdf"
OUTPUT     = os.path.join(os.path.dirname(__file__), "..", "public", "srd-data", "phb-races-pt.json")
PAGE_START = 16    # 0-indexed (livro pág 17)
PAGE_END   = 42    # inclusive (livro pág 43)
COLUMN_SPLIT = 297

RACE_NAMES = [
    "ANÃO", "ELFO", "HALFLING", "HUMANO",
    "DRACONATO", "GNOMO", "MEIO-ELFO", "MEIO-ORC", "TIEFLING",
]

SUBRACE_NAMES = [
    "ANÃO DA COLINA", "ANÃO DA MONTANHA", "DUERGAR",
    "ALTO ELFO", "ELFO DA FLORESTA", "ELFO NEGRO (DROW)",
    "PÉS LEVES", "ROBUSTO",
    "GNOMO DA FLORESTA", "GNOMO DAS ROCHAS",
    "TRAÇOS RACIAIS ALTERNATIVOS",
]

def slugify(name):
    n = unicodedata.normalize("NFD", name)
    n = "".join(c for c in n if unicodedata.category(c) != "Mn")
    n = n.lower()
    n = re.sub(r"[^a-z0-9\s-]", "", n)
    return re.sub(r"\s+", "-", n.strip())

def clean(text):
    return re.sub(r"\s+", " ", text).strip()

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

def get_all_lines(doc):
    lines = []
    for p in range(PAGE_START, PAGE_END + 1):
        for ln in extract_columns(doc[p]).splitlines():
            ln = ln.strip()
            if ln and not re.match(r"^\d{1,3}$", ln):
                lines.append(ln)
    return lines

def is_race_name(line):
    return line.strip().upper() in RACE_NAMES

def is_subrace_name(line):
    return line.strip().upper() in SUBRACE_NAMES

def parse_traits(seg):
    """Parseia bloco de traços raciais. Retorna lista de {name, desc}."""
    traits = []
    # Cada traço começa com 'Nome do Traço. Descrição...' em uma linha
    # ou 'Nome do Traço.' na linha, seguido de descrição
    i = 0
    ns = len(seg)
    while i < ns:
        line = seg[i].strip()
        # Traço: linha que começa com palavra(s) em Title Case seguida de ponto
        m = re.match(r"^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.]{2,60})\.\s*(.*)", line)
        if m and not re.match(r"^(Sub-raça|Idiomas?)\.", line):
            name = m.group(1).strip()
            desc_parts = [m.group(2).strip()] if m.group(2).strip() else []
            i += 1
            while i < ns:
                nxt = seg[i].strip()
                # Para se encontrar próximo traço
                if re.match(r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.]{2,60}\.", nxt):
                    break
                if is_subrace_name(nxt) or is_race_name(nxt):
                    break
                if re.match(r"^(TRAÇOS RACIAIS|CAPÍTULO)", nxt.upper()):
                    break
                if nxt:
                    desc_parts.append(nxt)
                i += 1
            traits.append({"name": name, "desc": clean(" ".join(desc_parts))})
        else:
            i += 1
    return traits

def parse_races(lines):
    n = len(lines)
    races = []

    # Encontrar inícios de raças
    race_starts = []
    for idx, line in enumerate(lines):
        if is_race_name(line):
            race_starts.append((idx, line.strip()))

    name_map = {
        "ANÃO": "Anão", "ELFO": "Elfo", "HALFLING": "Halfling",
        "HUMANO": "Humano", "DRACONATO": "Draconato", "GNOMO": "Gnomo",
        "MEIO-ELFO": "Meio-Elfo", "MEIO-ORC": "Meio-Orc", "TIEFLING": "Tiefling",
    }

    for ri, (start, name) in enumerate(race_starts):
        end = race_starts[ri + 1][0] if ri + 1 < len(race_starts) else n
        seg = lines[start + 1:end]
        ns = len(seg)

        race = {
            "index": slugify(name),
            "name": name_map.get(name.upper(), name.title()),
            "description": "",
            "ability_bonuses": [],
            "speed": 9,
            "size": "Médio",
            "traits": [],
            "subraces": [],
        }

        # --- descrição (até 'TRAÇOS RACIAIS') ---
        desc_lines = []
        traits_start = ns
        for j, line in enumerate(seg):
            if re.match(r"^TRAÇOS RACIAIS", line.upper()):
                traits_start = j + 1
                break
            desc_lines.append(line)
        race["description"] = clean(" ".join(desc_lines))

        # --- traços + sub-raças ---
        traits_seg = seg[traits_start:]
        # Separar sub-raças
        subrace_positions = []
        for j, line in enumerate(traits_seg):
            if is_subrace_name(line):
                subrace_positions.append(j)

        main_traits_seg = traits_seg[:subrace_positions[0]] if subrace_positions else traits_seg
        race["traits"] = parse_traits(main_traits_seg)

        # Extrair bônus de habilidade e deslocamento dos traços
        for t in race["traits"]:
            if "Aumento" in t["name"] and "Habilidade" in t["name"]:
                for bonus_match in re.finditer(r"(\w+)\s+aumenta\s+em\s+(\d+)", t["desc"]):
                    race["ability_bonuses"].append({
                        "ability": bonus_match.group(1),
                        "bonus": int(bonus_match.group(2))
                    })
            if "Deslocamento" in t["name"] or "deslocamento base" in t["desc"]:
                m = re.search(r"(\d+[,.]?\d*)\s*metro", t["desc"])
                if m:
                    race["speed"] = float(m.group(1).replace(",", "."))
            if "Tamanho" in t["name"]:
                for sz in ["Médio", "Pequeno", "Grande"]:
                    if sz in t["desc"]:
                        race["size"] = sz

        # Sub-raças
        subrace_map = {
            "ANÃO DA COLINA": "Anão da Colina", "ANÃO DA MONTANHA": "Anão da Montanha",
            "DUERGAR": "Duergar",
            "ALTO ELFO": "Alto Elfo", "ELFO DA FLORESTA": "Elfo da Floresta",
            "ELFO NEGRO (DROW)": "Elfo Negro (Drow)",
            "PÉS LEVES": "Pés Leves (Halfling)", "ROBUSTO": "Robusto (Halfling)",
            "GNOMO DA FLORESTA": "Gnomo da Floresta", "GNOMO DAS ROCHAS": "Gnomo das Rochas",
            "TRAÇOS RACIAIS ALTERNATIVOS": "Humano Variante",
        }
        for si, sr_pos in enumerate(subrace_positions):
            sr_end = subrace_positions[si + 1] if si + 1 < len(subrace_positions) else len(traits_seg)
            sr_name = traits_seg[sr_pos].strip()
            sr_seg = traits_seg[sr_pos + 1:sr_end]

            # Desc da sub-raça: linhas antes dos traços
            sr_desc_lines = []
            sr_trait_start = len(sr_seg)
            for sj, sline in enumerate(sr_seg):
                if re.match(r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.]{2,60}\.", sline):
                    sr_trait_start = sj
                    break
                sr_desc_lines.append(sline)

            sr_traits = parse_traits(sr_seg[sr_trait_start:])
            sr_bonuses = []
            for t in sr_traits:
                if "Aumento" in t["name"] and "Habilidade" in t["name"]:
                    for bm in re.finditer(r"(\w+)\s+aumenta\s+em\s+(\d+)", t["desc"]):
                        sr_bonuses.append({"ability": bm.group(1), "bonus": int(bm.group(2))})

            race["subraces"].append({
                "index": slugify(sr_name),
                "name": subrace_map.get(sr_name.upper(), sr_name.title()),
                "description": clean(" ".join(sr_desc_lines)),
                "ability_bonuses": sr_bonuses,
                "traits": sr_traits,
            })

        races.append(race)
        sub_names = [s["name"] for s in race["subraces"]]
        print(f"  + {race['name']} | tracos: {len(race['traits'])} | subraças: {sub_names}".encode("ascii","replace").decode())

    return races


if __name__ == "__main__":
    doc = fitz.open(PDF_PATH)
    print(f"Extraindo racas (pag {PAGE_START+1}-{PAGE_END+1})...\n")
    lines = get_all_lines(doc)
    races = parse_races(lines)

    out = os.path.abspath(OUTPUT)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(races, f, ensure_ascii=False, indent=2)

    print(f"\n{'-'*50}")
    print(f"OK: {len(races)} racas extraidas")
    print(f"Salvo em: {out}")

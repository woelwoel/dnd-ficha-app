"""
Extrai as 12 classes do PHB PT-BR com características de nível 1.
Saída: public/srd-data/phb-classes-pt.json

Uso: python scripts/extract_phb_classes.py
"""

import fitz, re, json, unicodedata, os

PDF_PATH   = r"C:\Users\gvfar\OneDrive\RPG BIGBIG\dd-5e-livro-do-jogador-fundo-branco-biblioteca-elfica.pdf"
OUTPUT     = os.path.join(os.path.dirname(__file__), "..", "public", "srd-data", "phb-classes-pt.json")
PAGE_START = 44    # 0-indexed (livro pág 45)
PAGE_END   = 119   # inclusive (livro pág 120)
COLUMN_SPLIT = 297

CLASS_NAMES = [
    "BÁRBARO", "BARDO", "BRUXO", "CLÉRIGO", "DRUIDA",
    "FEITICEIRO", "GUERREIRO", "LADINO", "MAGO",
    "MONGE", "PALADINO", "PATRULHEIRO",
]

NAME_MAP = {
    "BÁRBARO": "Bárbaro", "BARDO": "Bardo", "BRUXO": "Bruxo",
    "CLÉRIGO": "Clérigo", "DRUIDA": "Druida", "FEITICEIRO": "Feiticeiro",
    "GUERREIRO": "Guerreiro", "LADINO": "Ladino", "MAGO": "Mago",
    "MONGE": "Monge", "PALADINO": "Paladino", "PATRULHEIRO": "Patrulheiro",
}

INDEX_MAP = {
    "BÁRBARO": "barbaro", "BARDO": "bardo", "BRUXO": "bruxo",
    "CLÉRIGO": "clerigo", "DRUIDA": "druida", "FEITICEIRO": "feiticeiro",
    "GUERREIRO": "guerreiro", "LADINO": "ladino", "MAGO": "mago",
    "MONGE": "monge", "PALADINO": "paladino", "PATRULHEIRO": "patrulheiro",
}

SPELLCASTING_MAP = {
    "BÁRBARO": None, "GUERREIRO": None, "LADINO": None, "MONGE": None,
    "BARDO": "Carisma", "BRUXO": "Carisma", "FEITICEIRO": "Carisma",
    "CLÉRIGO": "Sabedoria", "DRUIDA": "Sabedoria", "PALADINO": "Sabedoria",
    "PATRULHEIRO": "Sabedoria", "MAGO": "Inteligência",
}

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

def _strip_accents(s):
    import unicodedata as _ud
    n = _ud.normalize("NFD", s)
    return "".join(c for c in n if _ud.category(c) != "Mn").upper()

# Versão sem acentos dos nomes de classe para comparação
CLASS_NAMES_NORM = [_strip_accents(c) for c in CLASS_NAMES]

def is_class_name(line):
    s = line.strip()
    # Só aceitar ALL_CAPS (s == s.upper() descarta "Clérigo", aceita "CLÉRIGO")
    return s == s.upper() and _strip_accents(s) in CLASS_NAMES_NORM

def parse_features(seg):
    """Parseia características de classe. Retorna lista de {name, desc}."""
    features = []
    i = 0
    ns = len(seg)
    while i < ns:
        line = seg[i].strip()
        # Característica: linha em Title Case seguida de ponto
        m = re.match(r"^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.]{2,60})\.\s*(.*)", line)
        if m:
            name = m.group(1).strip()
            # Ignorar linhas que parecem ser continuação de texto
            if re.match(r"^(Você|O|A |As |Os |Seu|Sua|Quando|Durante|Se |Para |Com |Em )", name):
                i += 1
                continue
            desc_parts = [m.group(2).strip()] if m.group(2).strip() else []
            i += 1
            while i < ns:
                nxt = seg[i].strip()
                if re.match(r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.]{2,60}\.", nxt):
                    break
                if is_class_name(nxt):
                    break
                if re.match(r"^(CAPÍTULO|APÊNDICE)", nxt.upper()):
                    break
                if nxt:
                    desc_parts.append(nxt)
                i += 1
            features.append({"name": name, "desc": clean(" ".join(desc_parts))})
        else:
            i += 1
    return features

def parse_classes(lines):
    n = len(lines)
    classes = []

    # Encontrar inícios de classes
    class_starts = []
    for idx, line in enumerate(lines):
        if is_class_name(line):
            class_starts.append((idx, line.strip()))

    for ci, (start, name) in enumerate(class_starts):
        end = class_starts[ci + 1][0] if ci + 1 < len(class_starts) else n
        seg = lines[start + 1:end]
        ns = len(seg)
        upper = name.upper()

        cls = {
            "index": INDEX_MAP.get(upper, name.lower()),
            "name": NAME_MAP.get(upper, name.title()),
            "description": "",
            "hit_die": 8,
            "saving_throws": [],
            "armor_proficiencies": [],
            "weapon_proficiencies": [],
            "skill_choices": {"count": 2, "from": []},
            "spellcasting_ability": SPELLCASTING_MAP.get(upper),
            "level1_features": [],
        }

        # HIT DIE defaults por classe
        hit_die_map = {
            "BÁRBARO": 12, "BARDO": 8, "BRUXO": 8, "CLÉRIGO": 8,
            "DRUIDA": 8, "FEITICEIRO": 6, "GUERREIRO": 10, "LADINO": 8,
            "MAGO": 6, "MONGE": 8, "PALADINO": 10, "PATRULHEIRO": 10,
        }
        cls["hit_die"] = hit_die_map.get(upper, 8)

        # --- descrição (até 'PONTOS DE VIDA' ou 'PROFICIÊNCIAS') ---
        desc_lines = []
        j = 0
        prof_start = ns
        for j, line in enumerate(seg):
            if re.match(r"^PONTOS DE VIDA", line.upper()):
                prof_start = j
                break
            if re.match(r"^PROFICIÊNCIAS$", line.upper()):
                prof_start = j
                break
            # Pular tabela de progressão (números, colunas)
            if re.match(r"^\d+\b", line) and len(line) < 40:
                continue
            desc_lines.append(line)
        cls["description"] = clean(" ".join(desc_lines))

        # --- Pontos de vida e proficiências ---
        features_start = prof_start
        j = prof_start
        while j < ns:
            line = seg[j].strip()

            # Dado de vida
            m = re.match(r"Dado de Vida\s*:\s*1d(\d+)", line, re.I)
            if m:
                cls["hit_die"] = int(m.group(1))
                j += 1; continue

            # Testes de resistência
            m = re.match(r"Testes? de Resist[êe]ncia\s*:\s*(.+)", line, re.I)
            if m:
                saves = [s.strip() for s in m.group(1).split(",")]
                cls["saving_throws"] = saves
                j += 1; continue

            # Armaduras
            m = re.match(r"Armaduras?\s*:\s*(.+)", line, re.I)
            if m:
                cls["armor_proficiencies"] = [m.group(1).strip()]
                j += 1; continue

            # Armas
            m = re.match(r"Armas?\s*:\s*(.+)", line, re.I)
            if m:
                cls["weapon_proficiencies"] = [m.group(1).strip()]
                j += 1; continue

            # Perícias
            m = re.match(r"Per[íi]cias\s*:\s*Escolha\s+(\d+)", line, re.I)
            if m:
                cls["skill_choices"]["count"] = int(m.group(1))
                # Coletar lista de perícias das linhas seguintes
                skills_text = line
                j += 1
                while j < ns:
                    nxt = seg[j].strip()
                    if re.match(r"^(EQUIPAMENTO|[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{4,})", nxt):
                        break
                    skills_text += " " + nxt
                    j += 1
                # Extrair lista após "dentre"
                from_m = re.search(r"dentre\s*:?\s*(.+)", skills_text, re.I | re.S)
                if from_m:
                    skills_raw = from_m.group(1)
                    skills_list = [s.strip().rstrip(".") for s in re.split(r",\s*|\s+e\s+", skills_raw) if s.strip()]
                    cls["skill_choices"]["from"] = skills_list
                continue

            # Equipamento inicial — pular, não precisamos
            if re.match(r"^EQUIPAMENTO$", line.upper()):
                # Avançar até a primeira característica (linha Title Case + ponto)
                j += 1
                while j < ns:
                    nxt = seg[j].strip()
                    if re.match(r"^[A-ZÁÉÍÓÚÂÊÔÃÕÇ][^.]{2,60}\.", nxt):
                        features_start = j
                        break
                    j += 1
                break

            j += 1

        # --- Características de nível 1 ---
        feat_seg = seg[features_start:]
        cls["level1_features"] = parse_features(feat_seg)

        classes.append(cls)
        saves_str = ", ".join(cls["saving_throws"]) if cls["saving_throws"] else "?"
        print(f"  + {cls['name']} | d{cls['hit_die']} | saves: {saves_str} | feats: {len(cls['level1_features'])}".encode("ascii","replace").decode())

    return classes


if __name__ == "__main__":
    doc = fitz.open(PDF_PATH)
    print(f"Extraindo classes (pag {PAGE_START+1}-{PAGE_END+1})...\n")
    lines = get_all_lines(doc)
    classes = parse_classes(lines)

    out = os.path.abspath(OUTPUT)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(classes, f, ensure_ascii=False, indent=2)

    print(f"\n{'-'*50}")
    print(f"OK: {len(classes)} classes extraidas")
    print(f"Salvo em: {out}")

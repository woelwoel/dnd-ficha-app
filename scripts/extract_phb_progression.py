"""
Extrai a progressão de nível das 12 classes do PDF de resumo PT-BR.
Usa análise espacial: marcadores de nível ficam ~5 unidades ABAIXO do início da feature.

Saída: public/srd-data/phb-class-progression-pt.json
Uso:   python scripts/extract_phb_progression.py
"""

import fitz, re, json, os

PDF_PATH  = r"C:\Users\gvfar\OneDrive\RPG BIGBIG\dd-5e-resumo-das-classes-biblioteca-elfica (1).pdf"
SRD_FILE  = os.path.join(os.path.dirname(__file__), "..", "public", "srd-data", "5e-SRD-Levels.json")
OUTPUT    = os.path.join(os.path.dirname(__file__), "..", "public", "srd-data", "phb-class-progression-pt.json")

CLASS_PAGES = {
    "barbaro":    [0, 1],
    "bardo":      [3, 4, 5],
    "bruxo":      [6, 7, 8],
    "clerigo":    [12, 13, 14],
    "druida":     [18, 19, 20],
    "feiticeiro": [22, 23, 24, 25],
    "guerreiro":  [26, 27, 28],
    "ladino":     [30, 31, 32],
    "mago":       [34, 35, 36],
    "monge":      [40, 41, 42],
    "paladino":   [44, 45, 46],
    "patrulheiro":[49, 50, 51],
}
SRD_INDEX = {
    "barbaro":"barbarian","bardo":"bard","bruxo":"warlock",
    "clerigo":"cleric","druida":"druid","feiticeiro":"sorcerer",
    "guerreiro":"fighter","ladino":"rogue","mago":"wizard",
    "monge":"monk","paladino":"paladin","patrulheiro":"ranger",
}
CLASS_NAMES = {
    "barbaro":"Bárbaro","bardo":"Bardo","bruxo":"Bruxo",
    "clerigo":"Clérigo","druida":"Druida","feiticeiro":"Feiticeiro",
    "guerreiro":"Guerreiro","ladino":"Ladino","mago":"Mago",
    "monge":"Monge","paladino":"Paladino","patrulheiro":"Patrulheiro",
}
PROF_BONUS = {1:2,2:2,3:2,4:2,5:3,6:3,7:3,8:3,9:4,10:4,
              11:4,12:4,13:5,14:5,15:5,16:5,17:6,18:6,19:6,20:6}

def clean(t):
    return re.sub(r"\s+", " ", t).strip()

# ─────────────────────────────────────────────────────────────
# Coleta blocos relevantes de todas as páginas da classe
# Retorna lista de dict {y_abs, x0, text, is_level_marker, level_num}
# ─────────────────────────────────────────────────────────────
def collect_blocks(doc, pages):
    PAGE_H = 842
    blocks = []
    for pi, p_idx in enumerate(pages):
        page = doc[p_idx]
        for b in page.get_text("blocks"):
            if b[6] != 0: continue
            t = b[4].strip()
            if not t: continue
            x0, y0 = b[0], b[1]
            if y0 < 10 or y0 > 758: continue
            y_abs = pi * PAGE_H + y0

            # Detectar marcador de nível puro: "N°" ou "Nº"
            lvl_m = re.match(r"^(\d{1,2})[°º]$", t.strip())
            is_lm = lvl_m is not None
            lvl_n = int(lvl_m.group(1)) if is_lm else None

            # Ignorar linhas de tabela de stats (x<110, começa com digit+level)
            if x0 < 110 and re.match(r"^\d{1,2}[°º]\s*\n?\s*[+\d]", t):
                continue
            # Ignorar cabeçalhos fixos
            if re.match(r"^(N[íi]vel\b|B[oô]nus\b|Dado de Vida|PV \d|PROFICI|EQUIPAMENTO|Desenvolv)", t, re.I):
                continue
            # Ignorar nomes de subclasse (ALL CAPS > 5 chars, não é marcador)
            if t == t.upper() and len(t) > 6 and not is_lm:
                continue

            blocks.append({
                "y": y_abs, "x": x0, "text": t,
                "is_level_marker": is_lm, "level_num": lvl_n,
            })

    # Também tratar blocos onde o marcador está EMBUTIDO ao final do texto
    # ex: "Característica de Caminho\n6°"
    extra = []
    to_remove = set()
    for i, b in enumerate(blocks):
        t = b["text"]
        # Verificar se termina com \nN° ou tem N° inline
        m = re.search(r"\n(\d{1,2})[°º]$", t)
        if m:
            lvl = int(m.group(1))
            text_part = t[:m.start()].strip()
            if text_part:
                extra.append({**b, "text": text_part, "is_level_marker": False, "level_num": None})
            extra.append({**b, "y": b["y"] + 5, "text": m.group(0).strip(),
                          "is_level_marker": True, "level_num": lvl})
            to_remove.add(i)
        # Marcador no início seguido de texto: "6°\ntexto..."
        m2 = re.match(r"^(\d{1,2})[°º]\n(.+)", t, re.S)
        if m2 and not b["is_level_marker"]:
            lvl = int(m2.group(1))
            text_part = m2.group(2).strip()
            extra.append({**b, "text": f"{m2.group(1)}°",
                          "is_level_marker": True, "level_num": lvl})
            extra.append({**b, "y": b["y"] + 6, "text": text_part,
                          "is_level_marker": False, "level_num": None})
            to_remove.add(i)

    blocks = [b for i, b in enumerate(blocks) if i not in to_remove] + extra
    blocks.sort(key=lambda b: (b["y"], b["x"]))
    return blocks

# ─────────────────────────────────────────────────────────────
# Extrai {nível: texto_completo} da lista de blocos
# ─────────────────────────────────────────────────────────────
def blocks_to_levels(blocks):
    """
    Padrão: feature_text (x>=270) aparece ~5 unidades ANTES do marcador de nível.
    Após o marcador vem a continuação da descrição.
    Ex: y=428 "Ataque Descuidado:" → y=433 "2°" → y=441 "corpo a corpo..."
    """
    # Separar marcadores e textos
    level_markers = [(b["y"], b["level_num"]) for b in blocks if b["is_level_marker"]]
    level_markers.sort()

    # Para cada marcador, encontrar o bloco de texto logo ANTES (dentro de 15 unidades)
    # Esse bloco é o INÍCIO da feature para esse nível
    result = {lvl: [] for lvl in range(1, 21)}

    for mi, (y_lm, lvl) in enumerate(level_markers):
        if lvl not in result: continue
        y_next = level_markers[mi + 1][0] if mi + 1 < len(level_markers) else float("inf")

        # Encontrar o marcador para saber seu x (para relativizar a busca de header)
        lm_block = next((b for b in blocks if b["is_level_marker"] and abs(b["y"] - y_lm) < 2), None)
        lm_x = lm_block["x"] if lm_block else 270

        for b in blocks:
            if b["is_level_marker"]: continue
            if b["x"] < 27: continue

            y = b["y"]
            t = b["text"]

            # Cabeçalho: y logo antes do marcador E x > x do marcador (feature fica à direita do número)
            is_header = (y_lm - 15 <= y <= y_lm + 3) and (b["x"] > lm_x - 10)
            if is_header:
                result[lvl].insert(0, clean(t))

            # Conteúdo após marcador até o cabeçalho do próximo nível
            elif y_lm + 3 < y < y_next - 15:
                result[lvl].append(clean(t))

    return result

# ─────────────────────────────────────────────────────────────
# Parseia texto de um nível em lista de features {name, desc}
# ─────────────────────────────────────────────────────────────
def parse_features(texts):
    """
    Encontra padrões 'Nome da Feature: descrição' no texto.
    Um nome de feature: começa em posição de frase (após '.', newline ou início),
    é Title Case, não contém ':', e tem entre 3 e 60 caracteres.
    """
    full = " ".join(texts)
    features = []

    # Padrão: Nome de feature = TitleCase até ':', após início de frase ou espaço após ponto
    # Ex: "Fúria: desc..." ou "Ataque Descuidado: desc..." ou "Can. do Descanso (d6): desc..."
    FEAT_PATTERN = re.compile(
        r"(?:^|(?<=\. )|(?<=\n))([A-ZÁÉÍÓÚÂÊÔÃÕÇ][a-záéíóúâêôãõçA-Z][^:.\n]{1,55}(?:\([^)]{1,20}\))?)\s*:",
    )

    positions = []
    for m in FEAT_PATTERN.finditer(full):
        name = clean(m.group(1))
        # Filtrar nomes que são obviamente não-features
        if len(name) < 3 or len(name) > 60: continue
        if re.search(r"\d{2}|,$", name): continue
        positions.append((m.start(), m.end(), name))

    for i, (start, end, name) in enumerate(positions):
        desc_end = positions[i + 1][0] if i + 1 < len(positions) else len(full)
        desc = clean(full[end:desc_end])
        features.append({"name": name, "desc": desc})

    # Fallback: texto sem feature identificável
    if not features and full.strip():
        features.append({"name": clean(full.strip()[:60]), "desc": ""})

    return features

# ─────────────────────────────────────────────────────────────
# Carrega dados do SRD (spell slots + class_specific)
# ─────────────────────────────────────────────────────────────
def load_srd():
    with open(SRD_FILE, encoding="utf-8") as f:
        data = json.load(f)
    result = {}
    for e in data:
        result[(e["class"]["index"], e["level"])] = e
    return result

# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────
def main():
    doc = fitz.open(PDF_PATH)
    srd = load_srd()
    output = {}

    for index, name in CLASS_NAMES.items():
        print(f"  {name}...", end=" ", flush=True)
        blocks      = collect_blocks(doc, CLASS_PAGES[index])
        lvl_texts   = blocks_to_levels(blocks)
        srd_key     = SRD_INDEX[index]

        levels_list = []
        for lvl in range(1, 21):
            texts    = lvl_texts.get(lvl, [])
            features = parse_features(texts) if texts else []

            srd_e = srd.get((srd_key, lvl), {})
            slots = None
            if "spellcasting" in srd_e:
                sp = srd_e["spellcasting"]
                slots = [sp.get(f"spell_slots_level_{i}", 0) for i in range(1, 10)]

            entry = {
                "level":            lvl,
                "proficiency_bonus": PROF_BONUS[lvl],
                "features":         features,
            }
            if slots:
                entry["spell_slots"] = slots
            if srd_e.get("class_specific"):
                entry["class_specific"] = srd_e["class_specific"]

            levels_list.append(entry)

        # Pós-processamento: limpar features com lixo
        for lvl_entry in levels_list:
            clean_feats = []
            for f in lvl_entry["features"]:
                name = f["name"]
                # Ignorar "Nada" (níveis sem feature nova)
                if re.match(r"^Nada\b", name, re.I): continue
                # Truncar nomes que têm conteúdo de subclasse (ALL_CAPS após texto)
                m = re.search(r"\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ]{3,}\s*\d+", name)
                if m: name = clean(name[:m.start()])
                # Truncar nomes muito longos (provavelmente lixo)
                if len(name) > 60: name = name[:57] + "..."
                if name:
                    clean_feats.append({"name": name, "desc": f["desc"]})
            lvl_entry["features"] = clean_feats

        output[index] = {"index": index, "name": name, "levels": levels_list}

        total = sum(len(l["features"]) for l in levels_list)
        has_slots = any("spell_slots" in l for l in levels_list)
        print(f"{total} feat | slots={'sim' if has_slots else 'nao'}".encode("ascii","replace").decode())

    out = os.path.abspath(OUTPUT)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\nSalvo: {out}")

if __name__ == "__main__":
    print("Extraindo progressao de classes...\n")
    main()

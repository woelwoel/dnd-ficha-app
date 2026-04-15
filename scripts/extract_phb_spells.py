"""
Extrai todas as magias do Livro do Jogador D&D 5e (PHB PT-BR) e gera um JSON
compatível com o app dnd-ficha-app.

Uso:
    python scripts/extract_phb_spells.py

Saída:
    public/srd-data/phb-spells-pt.json
"""

import fitz  # pymupdf
import re
import json
import unicodedata
import os

PDF_PATH = r"C:\Users\gvfar\OneDrive\RPG BIGBIG\dd-5e-livro-do-jogador-fundo-branco-biblioteca-elfica.pdf"
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "public", "srd-data", "phb-spells-pt.json")

# Páginas de descrições das magias (0-indexed): 213 a 314
SPELL_START_PAGE = 213
SPELL_END_PAGE   = 314  # inclusive

# Largura da página ≈ 595. Separador de colunas ≈ x=297
COLUMN_SPLIT = 297

# ── Padrões ──────────────────────────────────────────────────────────────────

# Linha de nível/escola: "2° nível de encantamento" ou "Truque de transmutação"
LEVEL_PATTERN = re.compile(
    r'^(Truque|(\d+)[°º]?\s*n[íi]vel)\s+de\s+([a-záéíóúâêôãõç\s]+?)(\s*\(ritual\))?$',
    re.IGNORECASE
)

FIELD_PATTERNS = {
    'casting_time': re.compile(r'^Tempo\s+de\s+Conjura[çc][aã]o\s*:\s*(.+)$', re.IGNORECASE),
    'range':        re.compile(r'^Alcance\s*:\s*(.+)$', re.IGNORECASE),
    'components':   re.compile(r'^Componentes\s*:\s*(.+)$', re.IGNORECASE),
    'duration':     re.compile(r'^Dura[çc][aã]o\s*:\s*(.+)$', re.IGNORECASE),
}

HIGHER_LEVEL_PATTERN = re.compile(r'^Em\s+N[íi]veis\s+Superiores\.?\s*(.*)', re.IGNORECASE | re.DOTALL)

# Linha de nome de magia: todas em caixa alta, sem ser número de página
SPELL_NAME_PATTERN = re.compile(r'^[A-ZÁÉÍÓÚÂÊÔÃÕÇÑÜ][A-ZÁÉÍÓÚÂÊÔÃÕÇÑÜ\s/\'\-]{2,}$')

# Cabeçalhos e rodapés para ignorar
NOISE_PATTERNS = [
    re.compile(r'^\d+\s*$'),                        # número de página
    re.compile(r'^CAPÍTULO\s+\d+', re.IGNORECASE),
    re.compile(r'^PARTE\s+\d+', re.IGNORECASE),
    re.compile(r'^MAGIAS\s+DE\s+', re.IGNORECASE),  # listas por classe
    re.compile(r'^LISTA\s+DE\s+', re.IGNORECASE),
    re.compile(r'^TRUQUES\s*\(', re.IGNORECASE),
    re.compile(r'^\d+[°º]\s+NÍVEL', re.IGNORECASE), # cabeçalhos de seção de lista
]


# ── Funções auxiliares ────────────────────────────────────────────────────────

def slugify(name: str) -> str:
    """Converte nome para slug: 'Bola de Fogo' → 'bola-de-fogo'"""
    name = unicodedata.normalize('NFD', name)
    name = ''.join(c for c in name if unicodedata.category(c) != 'Mn')
    name = name.lower()
    name = re.sub(r'[^a-z0-9\s-]', '', name)
    name = re.sub(r'\s+', '-', name.strip())
    return name


def is_noise(line: str) -> bool:
    return any(p.match(line.strip()) for p in NOISE_PATTERNS)


def extract_columns(page) -> str:
    """Extrai texto da página separando as duas colunas corretamente."""
    blocks = page.get_text("blocks")  # (x0, y0, x1, y1, text, block_no, block_type)
    left_blocks  = []
    right_blocks = []

    for b in blocks:
        if b[6] != 0:  # ignorar blocos não-texto (imagens)
            continue
        x0 = b[0]
        y0 = b[1]
        text = b[4].strip()
        if not text:
            continue
        if x0 < COLUMN_SPLIT:
            left_blocks.append((y0, text))
        else:
            right_blocks.append((y0, text))

    left_blocks.sort(key=lambda x: x[0])
    right_blocks.sort(key=lambda x: x[0])

    combined = [t for _, t in left_blocks] + [t for _, t in right_blocks]
    return '\n'.join(combined)


def parse_level_line(line: str):
    """
    Parseia linha como '2° nível de encantamento (ritual)' ou 'Truque de transmutação'.
    Retorna (level_int, school_str, is_ritual) ou None.
    """
    m = LEVEL_PATTERN.match(line.strip())
    if not m:
        return None
    if m.group(1).lower() == 'truque':
        level = 0
    else:
        level = int(m.group(2))
    school = m.group(3).strip().lower()
    ritual = bool(m.group(4))
    return level, school, ritual


def parse_components(raw: str):
    """
    'V, S, M (um sino de prata)' → components='V, S, M', material='um sino de prata'
    """
    m = re.match(r'^([VSM,\s]+?)\s*\((.+)\)\s*$', raw.strip(), re.DOTALL)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return raw.strip(), ''


# ── Extração principal ────────────────────────────────────────────────────────

def extract_spells(pdf_path: str) -> list:
    doc = fitz.open(pdf_path)
    total_pages = len(doc)

    # Coletar todo o texto das páginas de magias
    all_lines = []
    for page_idx in range(SPELL_START_PAGE, min(SPELL_END_PAGE + 1, total_pages)):
        page_text = extract_columns(doc[page_idx])
        for line in page_text.split('\n'):
            line = line.strip()
            if line:
                all_lines.append(line)

    spells = []
    i = 0
    n = len(all_lines)

    # Ignorar linhas antes da primeira magia real
    # (cabeçalhos como "DESCRIÇÕES DAS MAGIAS", "As magias apresentadas...")
    while i < n and not SPELL_NAME_PATTERN.match(all_lines[i]):
        i += 1

    while i < n:
        line = all_lines[i]

        # ── Detectar nome da magia ────────────────────────────────────────
        if not SPELL_NAME_PATTERN.match(line) or is_noise(line):
            i += 1
            continue

        # Candidato a nome de magia — verificar se a próxima linha não-vazia é nível/escola
        name_candidate = line.strip().title()
        j = i + 1
        while j < n and not all_lines[j].strip():
            j += 1

        if j >= n:
            break

        level_data = parse_level_line(all_lines[j])
        if level_data is None:
            # Não é um nome de magia — pode ser sub-título ou texto decorativo
            i += 1
            continue

        level, school, ritual = level_data
        i = j + 1

        # ── Coletar campos da magia ───────────────────────────────────────
        spell = {
            'index': slugify(name_candidate),
            'name': name_candidate,
            'level': level,
            'school': school,
            'ritual': ritual,
            'casting_time': '',
            'range': '',
            'components': '',
            'material': '',
            'duration': '',
            'concentration': False,
            'desc': '',
            'higher_level': '',
            'source': 'PHB-PT',
        }

        desc_lines = []
        higher_lines = []
        in_higher = False
        fields_found = set()

        while i < n:
            current = all_lines[i].strip()

            # Parar se encontrar próxima magia
            if (SPELL_NAME_PATTERN.match(current)
                    and not is_noise(current)
                    and i + 1 < n
                    and parse_level_line(all_lines[i + 1]) is not None):
                break

            # Tentar campos fixos
            matched_field = False
            for field, pattern in FIELD_PATTERNS.items():
                m = pattern.match(current)
                if m and field not in fields_found:
                    value = m.group(1).strip()
                    # Componentes podem continuar na próxima linha (material longo)
                    if field == 'components':
                        # Agrupar continuação do material (linhas sem ":" que não são campo)
                        while (i + 1 < n
                               and not any(p.match(all_lines[i+1]) for p in FIELD_PATTERNS.values())
                               and not SPELL_NAME_PATTERN.match(all_lines[i+1])
                               and '(' in value and ')' not in value):
                            i += 1
                            value += ' ' + all_lines[i].strip()
                        spell['components'], spell['material'] = parse_components(value)
                    else:
                        spell[field] = value
                    fields_found.add(field)
                    matched_field = True
                    break

            if not matched_field and not is_noise(current) and current:
                # Verificar "Em Níveis Superiores"
                m_higher = HIGHER_LEVEL_PATTERN.match(current)
                if m_higher:
                    in_higher = True
                    rest = m_higher.group(1).strip()
                    if rest:
                        higher_lines.append(rest)
                elif in_higher:
                    higher_lines.append(current)
                elif len(fields_found) >= 3:  # temos pelo menos tempo+alcance+duração
                    desc_lines.append(current)

            i += 1

        spell['desc'] = ' '.join(desc_lines).strip()
        spell['higher_level'] = ' '.join(higher_lines).strip()
        spell['concentration'] = 'concentra' in spell['duration'].lower()

        # Só adicionar se tiver os campos mínimos
        if spell['casting_time'] and spell['range'] and spell['duration']:
            spells.append(spell)
            print(f"  + {spell['name']} (nivel {spell['level']}, {spell['school']})".encode('ascii', 'replace').decode())

    return spells


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print(f"Abrindo PDF: {PDF_PATH}")
    print(f"Páginas de magias: {SPELL_START_PAGE + 1} a {SPELL_END_PAGE + 1}\n")

    spells = extract_spells(PDF_PATH)

    # Remover duplicatas por index
    seen = set()
    unique = []
    for s in spells:
        if s['index'] not in seen:
            seen.add(s['index'])
            unique.append(s)

    # Ordenar alfabeticamente
    unique.sort(key=lambda s: s['name'])

    out_path = os.path.abspath(OUTPUT_PATH)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(unique, f, ensure_ascii=False, indent=2)

    print(f"\n{'-'*50}")
    print(f"OK: {len(unique)} magias extraidas")
    print(f"Salvo em: {out_path}")

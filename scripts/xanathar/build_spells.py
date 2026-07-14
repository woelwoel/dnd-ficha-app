"""Estrutura as 95 magias do capítulo 3 do XGE no schema de phb-spells-pt.json.

BOOTSTRAP ONE-SHOT: gera o rascunho de `xanathar-spells-pt.json`. Depois de
gerado, o JSON é CURADO À MÃO (alguns `desc` têm OCR de scripts exóticos que
destruíram palavras inteiras — reconstruídas na curadoria). NÃO re-rode por cima
do JSON curado; as correções manuais seriam perdidas.


Uso:
    python scripts/xanathar/extract_text.py "<pdf>" --pages 130-190 -o _spells.txt
    python scripts/xanathar/build_spells.py _spells.txt classes.json > out.json

- `classes.json`: { "<Nome Canônico>": ["bardo", ...] } — mapa de classes por
  magia, derivado das listas de classe do próprio capítulo (esteira à parte).
- O segmentador acha cada magia pela linha de nível ("N° nível de <escola>" /
  "Truque de <escola>"), tolerante ao OCR ("rúvel", '1 " nível', "9ª nível").
- OCR ruidoso no corpo é só normalizado superficialmente aqui; a fidelidade
  fina (dados de dano etc.) é conferida na CURADORIA manual do JSON + na
  curadoria de mecânicas (spell-mechanics-pt.json).
"""
import re, sys, json, unicodedata

SCHOOLS = {
    'transmuta': 'transmutação', 'evoca': 'evocação', 'conjura': 'conjuração',
    'abjura': 'abjuração', 'encantamento': 'encantamento', 'adivinha': 'adivinhação',
    'ilus': 'ilusão', 'necromancia': 'necromancia',
}

# 95 nomes canônicos EM ORDEM ALFABÉTICA (== ordem do segmentador).
CANON = """Abraço Terrestre de Maximilian|Absorver Elementos|Agarrão da Terra|Arma Sagrada|Ataque do Vento de Aço|Aurora|Bafo de Dragão|Bosque de Druida|Catapulta|Causar Medo|Cerimônia|Chamado Infernal|Chuva de Bolas de Neve de Snilloc|Controlar Chamas|Controlar os Ventos|Coroa de Estrelas|Criar Fogueira|Criar Homúnculo|Dança Macabra|Destruição Elemental|Diabo da Poeira|Dispersão|Dragão Ilusório|Encontrar Montaria Maior|Enervação|Enfeitiçar Monstro|Erupção de Terra|Escrita Celeste|Escuridão Enlouquecedora|Esfera Aquosa|Esfera Cáustica|Esfera Tempestuosa|Espinho Mental|Espírito Curativo|Estática Sináptica|Evaporação de Abi-Dalzim|Faca de Gelo|Flechas Flamejantes|Fortalecimento de Perícia|Fortaleza Poderosa|Gaiola da Alma|Golpe de Zephyr|Golpe Trovejante|Grito Psíquico|Guardião da Natureza|Imolação|Infestação|Infestar de Inimigos|Inundação de Energia Negativa|Invocar Demônio Maior|Invocar Demônios Menores|Invulnerabilidade|Ira da Natureza|Laço|Lâmina Sombria|Lufada|Manto de Chamas|Manto de Gelo|Manto de Pedra|Manto de Vento|Maremoto|Metamorfose em Massa|Meteoros Momentâneos de Melf|Moldar Água|Moldar Terra|Muralha de Água|Muralha de Areia|Ossos da Terra|Palavra de Poder Dor|Palavra do Esplendor|Parede de Luz|Passo Distante|Passo Trovejante|Pedra Encantada|Pequeno Servo|Picada Congelante|Pirotecnia|Prisão Mental|Proteção Primordial|Queimadura de Aganazzar|Raio de Caos|Redemoinho|Resplendor Enjoativo|Selvageria Primitiva|Soar os Mortos|Sombra de Transtorno|Soneca|Templo dos Deuses|Transferência de Vida|Transformação de Tenser|Transmutar Pedra|Tremor de Terra|Vendaval|Vento Protetor|Vínculo com a Besta""".split('|')


def fold(s):
    return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode()


def slugify(name):
    s = fold(name).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s


LVL_RE = re.compile(
    r'(\d)\s*["ºª°"]?\s*(?:n[íi]vel|r[úu]vel|nfvel|nivel)\s+de\s+(\w+)'
    r'|(truque)\s+de\s+(\w+)', re.I)


def school_of(word):
    w = fold(word).lower()
    for k, v in SCHOOLS.items():
        if w.startswith(k):
            return v
    return None


_PUNCT = set(" .,;:!?()\"'’•%°ºª+×&/–—-\n\t")


def strip_exotic(text):
    """Remove glifos de OCR fora do latino (armênio/cirílico/kannada/µ/·/§…),
    preservando letras latinas acentuadas, dígitos e pontuação."""
    out = []
    for c in text:
        if c in _PUNCT or c.isdigit():
            out.append(c)
        else:
            out.append(c if unicodedata.name(c, '').startswith('LATIN') else ' ')
    return ''.join(out)


def fix_dice(text):
    """Normaliza notação de dado com ruído de OCR (l->1, I->1, O->0, espaços):
    "6d l 0"->"6d10", "ldlO"->"1d10", "4d 10"->"4d10"."""
    def repl(m):
        a = m.group(1).replace('l', '1').replace('I', '1').replace('O', '0').replace(' ', '')
        b = m.group(2).replace('l', '1').replace('I', '1').replace('O', '0').replace(' ', '')
        return f"{a}d{b}"
    # g2 só engole um 2º dígito (e o espaço interno) se ele existir — assim
    # "1d6 de" não perde o espaço antes de "de", mas "6d l 0" vira "6d10".
    return re.sub(r'\b([\dlIO]{1,2})\s*d\s*([\dlIO](?:\s?[\dlIO])?)\b', repl, text)


def clean_body(text):
    # Remove rodapé corrente "CAPÍTULO N (MAGIAS)" (e variantes OCR "CAefcULO ,1
    # MAGUS") que vaza no meio da coluna por causa da ordem de leitura.
    text = re.sub(r'C[AÀ][A-Za-zÀ-ú\'’.]{1,5}LO\s*,?\s*\d?\s*(?:MAGI\w+|MAGUS)?', ' ', text)
    # Remove nomes de magia vizinhos vazados (runs de 2+ palavras ALL-CAPS —
    # não ocorrem legitimamente na prosa das descrições).
    text = re.sub(r'\b[A-ZÀ-Ú]{2,}(?:\s+[A-ZÀ-Ú]{2,})+\b', ' ', text)
    # Junta dígitos separados por espaço ("1 8"->"18", "1 , 5"->"1,5").
    text = re.sub(r'(?<=\d)\s*,\s*(?=\d)', ',', text)
    text = fix_dice(text)
    text = re.sub(r'(?<=\d) +(?=\d)', '', text)
    # Cola ordinal solto ("1 º"->"1º", "2 °"->"2°").
    text = re.sub(r'(\d)\s+([ºª°])', r'\1\2', text)
    # 'l' usado como '1' em dados/custos ("ld4"->"1d4", "l pp"->"1 pp").
    text = re.sub(r'\bl(?=d\d)', '1', text)
    text = re.sub(r'\bl(?=\s*(?:pp|po|pc)\b)', '1', text)
    # 'O' usado como '0' em "cai para O pontos (de vida)".
    text = re.sub(r'\bO(?=\s+pontos\b)', '0', text)
    text = strip_exotic(text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text


def is_noise(l):
    s = l.strip()
    if not s:
        return True
    if s.startswith('-----'):
        return True
    if re.fullmatch(r'\d{1,3}', s):        # número de página solto
        return True
    u = fold(s).upper()
    if 'CAPITULO' in u and 'MAGIA' in u:   # rodapé "CAPÍTULO 3 MAGIAS"
        return True
    return False


def parse_spell(name, body_lines):
    slug = slugify(name)
    entry = {'index': slug, 'name': name}
    # 1) linha de nível
    lvl_i = next(i for i, l in enumerate(body_lines) if LVL_RE.search(l))
    m = LVL_RE.search(body_lines[lvl_i])
    if m.group(3):  # truque
        entry['level'] = 0
        entry['school'] = school_of(m.group(4))
    else:
        entry['level'] = int(m.group(1))
        entry['school'] = school_of(m.group(2))
    entry['ritual'] = bool(re.search(r'ritual', body_lines[lvl_i], re.I))

    # 2) bloco de metadados rotulado (do pós-nível ao 1º parágrafo do corpo)
    labels = [
        ('casting', r'Tempo de Conjura'), ('range', r'Alcance'),
        ('components', r'Componentes'), ('duration', r'Dura[çc]',),
    ]
    fields = {}
    rest = body_lines[lvl_i + 1:]
    # localizar índice de cada rótulo
    idxs = {}
    for key, pat in labels:
        for i, l in enumerate(rest):
            if re.match(r'\s*' + pat, l, re.I):
                idxs[key] = i
                break
    order = sorted(idxs.items(), key=lambda kv: kv[1])
    for n, (key, start) in enumerate(order):
        end = order[n + 1][1] if n + 1 < len(order) else start + 1
        chunk = ' '.join(x.strip() for x in rest[start:end])
        chunk = re.sub(r'^[^:]*:\s*', '', chunk).strip()
        fields[key] = chunk
    entry['casting_time'] = clean_body(fields.get('casting', ''))
    entry['range'] = clean_body(fields.get('range', ''))
    dur = clean_body(fields.get('duration', ''))
    entry['duration'] = dur
    entry['concentration'] = bool(re.search(r'concentra', dur, re.I))
    # componentes: separa letras V/S/M do material entre parênteses
    comp = fields.get('components', '')
    mat_m = re.search(r'\(([^)]*)\)', comp)
    entry['material'] = clean_body(mat_m.group(1)) if mat_m else ''
    letters = re.findall(r'\b([VSM])\b', re.sub(r'\([^)]*\)', '', comp))
    entry['components'] = ', '.join(dict.fromkeys(letters))

    # 3) corpo = tudo após o fim do bloco de metadados
    dur_start = idxs.get('duration', -1)
    body = rest[dur_start + 1:]
    body = [l for l in body if not is_noise(l)]
    full = clean_body(' '.join(body))
    # separa "Em Níveis Superiores." para higher_level
    hl = ''
    hm = re.search(r'Em N[íi]veis Superiores\.?\s*', full, re.I)
    if hm:
        hl = full[hm.end():].strip()
        full = full[:hm.start()].strip()
    entry['desc'] = full
    entry['higher_level'] = hl
    entry['source'] = 'xanathar'
    return entry


def main():
    raw = open(sys.argv[1], encoding='utf-8').read().split('\n')
    class_map = json.load(open(sys.argv[2], encoding='utf-8'))
    start = next(i for i, l in enumerate(raw) if l.strip() == 'DESCRIÇÃO DE MAGIAS')

    # marcadores de início (== segmentador validado)
    def is_lvl(l):
        s = l.strip()
        return len(s) < 70 and LVL_RE.search(s)
    starts = [i for i in range(start + 1, len(raw)) if is_lvl(raw[i])]
    assert len(starts) == len(CANON), f"{len(starts)} != {len(CANON)}"

    # início do CABEÇALHO de cada magia (linha do nome, logo antes da linha de nível):
    # pula ruído (marcadores de página, números) e a própria linha do nome.
    def header_start(si):
        h = si - 1
        while h > start and is_noise(raw[h]):
            h -= 1
        return h                          # linha do nome (all-caps)

    hstarts = [header_start(si) for si in starts]

    # fim do capítulo de magias: 1º "APÊNDICE" após a última magia (limita a
    # última entrada, senão ela engoliria os apêndices/tabelas do resto do PDF).
    chapter_end = next(
        (i for i in range(starts[-1], len(raw))
         if re.match(r'\s*AP[ÊE]NDIC', raw[i], re.I)), len(raw))

    spells = []
    for n, si in enumerate(starts):
        # corpo vai da linha de nível até ANTES do cabeçalho da próxima magia
        # (evita herdar o nome all-caps do vizinho no fim de desc/higher_level).
        end = hstarts[n + 1] if n + 1 < len(starts) else chapter_end
        block = raw[si:end]
        name = CANON[n]
        e = parse_spell(name, block)
        e['classes'] = class_map.get(name, [])
        spells.append(e)

    out = sys.argv[3] if len(sys.argv) > 3 else None
    if out:
        with open(out, 'w', encoding='utf-8') as f:
            json.dump(spells, f, ensure_ascii=False, indent=2)
            f.write('\n')
        print(f"OK: {len(spells)} magias -> {out}")
    else:
        sys.stdout.reconfigure(encoding='utf-8')
        json.dump(spells, sys.stdout, ensure_ascii=False, indent=2)


if __name__ == '__main__':
    main()

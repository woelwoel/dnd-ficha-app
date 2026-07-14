"""Estrutura os 48 itens mágicos comuns do XGE no schema de *-magic-items-pt.json.

Uso:
    python scripts/xanathar/extract_text.py "<pdf>" --pages 0-141 -o full.txt
    python scripts/xanathar/build_items.py full.txt public/srd-data/xanathar-magic-items-pt.json

- Segmenta pela linha de raridade ("<Categoria>, comum ..."); o nome vem da
  lista canônica ordenada (headers all-caps do PDF são OCR-ruidosos).
- Reusa os limpadores de OCR de build_spells (strip_exotic/fix_dice/clean_body).
- BOOTSTRAP ONE-SHOT: cura o JSON à mão depois; não re-rode por cima.
"""
import re, sys, json, unicodedata
from build_spells import clean_body, fold, slugify

# 48 nomes canônicos, na ordem alfabética do PDF (== ordem do segmentador).
NAMES = [
    "Amuleto do Fragmento Negro", "Amuleto Relógio", "Armadura Ardente",
    "Armadura Brilhante", "Armadura da Libertação", "Bengala do Veterano",
    "Bolsa Conveniente de Especiarias de Heward", "Boneca Falante",
    "Botas de Pegadas Falsas", "Cachimbo dos Monstros de Fumaça",
    "Cadeado da Enganação", "Cajado Canoro", "Cajado da Ornamentação",
    "Cajado das Flores", "Caneca da Sobriedade", "Capa da Ondulação",
    "Capa de Muitas Modas", "Chapéu da Feitiçaria", "Chapéu dos Vermes",
    "Chave Misteriosa", "Chifre do Alarme Silencioso", "Corda do Reparo",
    "Dado do Charlatão", "Elmo do Horror", "Escudo da Expressão",
    "Esfera da Direção", "Esfera do Tempo", "Espada Lunar", "Flecha Inquebrável",
    "Gota de Nutrição", "Gota de Refrescância", "Grimório Duradouro",
    "Instrumento da Escrita", "Instrumento de Ilusões", "Mastro da Diminuição",
    "Mastro da Pescaria", "Munição Colossal", "Olho de Ersatz",
    "Perfume do Encantamento", "Roupas do Remendo", "Rubi do Mago da Guerra",
    "Trombeta da Audição", "Varinha Carrancuda", "Varinha da Pirotecnia",
    "Varinha da Regência", "Varinha Sorridente", "Vaso do Despertar",
    "Vela das Profundezas",
]

# noun inicial da linha de raridade → categoria do app.
CAT = {
    'item maravilhoso': 'item-maravilhoso', 'armadura': 'armadura',
    'arma': 'arma', 'cajado': 'cajado', 'varinha': 'varinha', 'anel': 'anel',
    'poção': 'pocao', 'manto': 'manto', 'botas': 'botas',
}


def category_of(rarity_line):
    head = fold(rarity_line.split(',')[0]).strip().lower()
    head = re.sub(r'\s*\(.*$', '', head)          # tira "(qualquer)" etc.
    return CAT.get(head, 'item-maravilhoso')


def main():
    raw = open(sys.argv[1], encoding='utf-8').read().split('\n')
    out = sys.argv[2]

    def sq(s): return re.sub(r'\s+', '', s).upper()
    # header da seção é ALL-CAPS (evita a entrada do sumário em Title Case).
    start = next(i for i, l in enumerate(raw)
                 if 'ITENSMÁGICOSCOMUNS' in sq(l) and not re.search(r'[a-zà-ÿ]', l))
    end = next(i for i in range(start + 1, len(raw))
               if re.search(r'CRIA\s*N?\s*DO\s+ITENS', raw[i], re.I))

    def is_noise(l):
        s = l.strip()
        return (not s or s.startswith('-----') or re.fullmatch(r'\d{1,3}', s)
                or ('CAP' in fold(s).upper() and 'TULO' in fold(s).upper()))

    # linhas de raridade ("..., comum") delimitam os itens.
    rar = [i for i in range(start + 1, end)
           if re.search(r',\s*comum', raw[i], re.I) and len(raw[i].strip()) < 90]
    assert len(rar) == len(NAMES), f"{len(rar)} != {len(NAMES)}"

    items = []
    for n, ri in enumerate(rar):
        rarity_line = raw[ri].strip()
        body_end = (rar[n + 1] - 1) if n + 1 < len(rar) else end
        # recua o body_end até antes do cabeçalho (nome all-caps) do próximo item
        while body_end > ri and is_noise(raw[body_end]):
            body_end -= 1
        if n + 1 < len(rar):
            # o header do próximo item fica logo antes da próxima linha de raridade
            h = rar[n + 1] - 1
            while h > ri and is_noise(raw[h]):
                h -= 1
            body_end = h - 1
        desc = clean_body(' '.join(raw[ri + 1:body_end + 1]))
        # a cláusula de sintonização pode quebrar linha ("(requer sintonização\n
        # por um bruxo)") — a cauda vaza no início do desc; corta até o ")".
        if '(' in rarity_line and ')' not in rarity_line and ')' in desc[:60]:
            desc = desc.split(')', 1)[1].strip()
        name = NAMES[n]
        items.append({
            "index": slugify(name),
            "name": name,
            "category": category_of(rarity_line),
            "rarity": "comum",
            "requiresAttunement": bool(re.search(r'sintoniza', rarity_line, re.I)),
            "description": desc,
        })

    with open(out, 'w', encoding='utf-8') as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print(f"OK: {len(items)} itens -> {out}")


if __name__ == '__main__':
    main()

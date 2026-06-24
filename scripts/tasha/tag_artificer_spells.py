"""Marca as magias da Lista de Magias do Artífice (Tasha, pág. da classe) com
'artifice' no campo `classes` das magias existentes em public/srd-data.

A lista do Artífice é composta majoritariamente de magias que já existem no
catálogo (PHB). Este script casa por NOME (normalizado) e adiciona 'artifice'
ao array `classes`. Magias que não existem no catálogo (ex.: magias exclusivas
do Tasha ainda não importadas) são reportadas e ficam de fora — entram quando o
catálogo crescer.

Reprodutível: rodar de novo é idempotente (não duplica 'artifice').

Uso: python scripts/tasha/tag_artificer_spells.py
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

REPO = Path(__file__).resolve().parents[2]
SPELL_FILES = [
    REPO / "public" / "srd-data" / "phb-spells-pt.json",
    REPO / "public" / "srd-data" / "tasha-spells-pt.json",  # pode não existir
]

# Lista de Magias do Artífice (Caldeirão de Tasha). Nomes como no livro.
ARTIFICER_SPELLS = [
    # Truques (Círculo 0)
    "Acudir os Moribundos", "Bolha Ácida", "Chicote de Espinhos", "Chicote Elétrico",
    "Criar Fogueira", "Golpe Trovejante", "Lâmina da Chama Esverdeada", "Lâmina Estrondosa",
    "Luz", "Luzes Dançantes", "Mãos Mágicas", "Mensagem", "Orientação", "Pedra Encantada",
    "Picada Congelante", "Prestidigitação", "Raio de Fogo", "Raio de Gelo", "Rajada Venenosa",
    "Reparar", "Resistência", "Rompante de Espadas", "Toque Chocante",
    # 1º Círculo
    "Absorver Elementos", "Alarme", "Beberagem Cáustica de Tasha", "Catapulta",
    "Curar Ferimentos", "Detectar Magia", "Disfarçar-se", "Fogo das Fadas", "Graxa",
    "Identificar", "Laço", "Passos Largos", "Purificar Alimentos e Bebidas", "Queda Suave",
    "Retirada Acelerada", "Salto", "Santuário", "Vitalidade Vazia",
    # 2º Círculo
    "Alterar-se", "Aprimorar Atributo", "Arma Mágica", "Aumentar/Reduzir", "Auxílio",
    "Boca Encantada", "Chama Contínua", "Corda Extradimensional", "Escalada de Aranha",
    "Escrita Celeste", "Esquentar Metal", "Invisibilidade", "Levitação", "Pirotecnia",
    "Proteção Contra Veneno", "Restauração Menor", "Teia", "Tranca Arcana", "Turvar",
    "Ver o Invisível", "Visão no Escuro",
    # 3º Círculo
    "Arma Elemental", "Caminhar Sobre as Águas", "Celeridade", "Criar Comida e Água",
    "Dissipar Magia", "Flechas Flamejantes", "Fortaleza Intelectual", "Glifo de Proteção",
    "Pequeno Servo", "Piscar", "Proteção Contra Energia", "Respirar na Água", "Revivificar",
    "Soneca", "Voo",
    # 4º Círculo
    "Arca Secreta de Leomund", "Cão Fiel de Mordenkainen", "Destruição Elemental",
    "Esfera Resiliente de Otiluke", "Fabricar", "Invocar Construto", "Moldar Rochas",
    "Movimentação Livre", "Olho Arcano", "Pele-rocha", "Santuário Particular de Mordenkainen",
    # 5º Círculo
    "Animar Objetos", "Aprimorar Perícia", "Criação", "Mão de Bigby", "Muralha de Pedra",
    "Restauração Maior", "Transmutar Pedra",
]


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def main():
    wanted = {norm(n): n for n in ARTIFICER_SPELLS}
    matched, missing = set(), set(wanted.keys())

    for path in SPELL_FILES:
        if not path.exists():
            continue
        spells = json.loads(path.read_text(encoding="utf-8"))
        changed = False
        for sp in spells:
            key = norm(sp.get("name", ""))
            if key in wanted:
                classes = sp.setdefault("classes", [])
                if "artifice" not in classes:
                    classes.append("artifice")
                    changed = True
                matched.add(key)
                missing.discard(key)
        if changed:
            path.write_text(json.dumps(spells, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"Atualizado: {path.name}")

    print(f"\nMarcadas com 'artifice': {len(matched)} de {len(wanted)}")
    if missing:
        print("\nFALTAM no catálogo (não marcadas):")
        for k in sorted(missing):
            print("  -", wanted[k])


if __name__ == "__main__":
    main()

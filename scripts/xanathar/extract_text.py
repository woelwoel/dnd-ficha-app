"""Extrai texto do PDF do Caldeirão de Tasha como UTF-8 limpo.

Descoberta (2026-06-24): o PDF fan-translation extrai acentuação CORRETA via
pymupdf (codepoints Latin-1: ç=U+00E7, ã=U+00E3, etc.). O `�` que aparece em
terminais é só artefato de renderização (Git Bash não desenha UTF-8); o dado é
íntegro. Portanto NÃO há etapa de reparo de acento — basta garantir saída UTF-8.

Uso:
    python scripts/tasha/extract_text.py "<caminho-do-pdf>" --pages 78-82 -o out.txt
"""
import argparse
import fitz  # pymupdf


def extract(pdf_path, pages=None):
    doc = fitz.open(pdf_path)
    if pages:
        a, b = pages.split("-")
        rng = range(int(a), int(b) + 1)
    else:
        rng = range(len(doc))
    chunks = []
    for pno in rng:
        if 0 <= pno < len(doc):
            chunks.append(doc[pno].get_text())
            chunks.append(f"\n\n----- p.{pno} -----\n\n")
    return "".join(chunks)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--pages", default=None, help="intervalo 0-indexado, ex: 78-82")
    ap.add_argument("-o", "--out", default=None, help="arquivo de saída (UTF-8); default stdout")
    args = ap.parse_args()
    text = extract(args.pdf, args.pages)
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            f.write(text)
    else:
        import sys
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stdout.write(text)


if __name__ == "__main__":
    main()

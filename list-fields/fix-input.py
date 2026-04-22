"""
fix-input.py  —  Repara el input.pdf para que fill.py genere apariencias correctas.

Problemas que corrige:
  1. /Rect con coordenadas invertidas  → las normaliza a [llx, lly, urx, ury]
     fill.py calcula width = x2-x1 y height = y2-y1 sin abs(). Si las
     coordenadas llegan al revés (ej. [urx, ury, llx, lly]), el BBox queda
     con valores negativos y el texto se renderiza fuera del área visible.

  2. /AP streams existentes            → los elimina
     Así fill.py parte de cero y no hay apariencias viejas que interfieran.

  3. /NeedAppearances                  → lo activa en el AcroForm
     Fallback: los visores PDF regeneran la apariencia a partir de /V y /DA
     aunque el AP stream generado por fill.py tenga algún problema menor.

Uso:
  python fix-input.py                        # input.pdf  → input-fixed.pdf
  python fix-input.py mi.pdf                 # mi.pdf     → input-fixed.pdf
  python fix-input.py mi.pdf salida.pdf      # mi.pdf     → salida.pdf
"""

import sys
from pdfrw import PdfReader, PdfWriter, PdfObject, PdfArray, PdfName


def normalize_rect(rect):
    """
    Convierte el Rect en [llx, lly, urx, ury] con llx<=urx y lly<=ury.
    Devuelve (lista_normalizada, fue_modificado).
    """
    try:
        vals = [float(v) for v in rect]
    except Exception:
        return None, False   # no se pudo parsear, dejar como está

    if len(vals) != 4:
        return None, False

    x1, y1, x2, y2 = vals
    llx, urx = min(x1, x2), max(x1, x2)
    lly, ury = min(y1, y2), max(y1, y2)

    modified = (llx != x1 or lly != y1 or urx != x2 or ury != y2)
    return [llx, lly, urx, ury], modified


def fix_pdf(input_path: str, output_path: str):
    print(f"Leyendo: {input_path}")
    reader = PdfReader(input_path)

    stats = {
        "widgets":      0,
        "rect_fixed":   0,   # coordenadas normalizadas
        "ap_cleared":   0,   # AP streams eliminados
    }

    for page_num, page in enumerate(reader.pages, 1):
        if not page.Annots:
            continue

        for annot in page.Annots:
            if annot.Subtype != PdfName.Widget:
                continue

            stats["widgets"] += 1
            field_name = str(annot.T or "").strip("()")

            # ── 1. Normalizar /Rect ───────────────────────────────────
            if annot.Rect:
                normalized, was_inverted = normalize_rect(annot.Rect)
                if normalized is not None:
                    # Siempre reescribir como valores directos (resuelve
                    # también el caso de referencias indirectas en el Rect)
                    annot.Rect = PdfArray(
                        [PdfObject(str(round(v, 4))) for v in normalized]
                    )
                    if was_inverted:
                        stats["rect_fixed"] += 1
                        print(f"  [RECT] '{field_name}' p.{page_num}: "
                              f"[{', '.join(f'{v:.1f}' for v in [float(x) for x in annot.Rect])}]")

            # ── 2. Eliminar /AP stream existente ─────────────────────
            if annot.AP is not None:
                annot.AP = None
                stats["ap_cleared"] += 1

    # ── 3. Activar /NeedAppearances en AcroForm ──────────────────────
    if reader.Root.AcroForm:
        reader.Root.AcroForm.NeedAppearances = PdfObject("true")

    writer = PdfWriter()
    writer.trailer = reader.trailer
    writer.write(output_path)

    # ── Resumen ───────────────────────────────────────────────────────
    print()
    print("─" * 60)
    print(f"  Widgets procesados : {stats['widgets']}")
    print(f"  Rects corregidos   : {stats['rect_fixed']}  (coordenadas invertidas)")
    print(f"  APs eliminados     : {stats['ap_cleared']}  (apariencias viejas)")
    print(f"  NeedAppearances    : True")
    print("─" * 60)
    print(f"Guardado en: {output_path}")


if __name__ == "__main__":
    input_path  = sys.argv[1] if len(sys.argv) > 1 else "input.pdf"
    output_path = sys.argv[2] if len(sys.argv) > 2 else "input-fixed.pdf"

    fix_pdf(input_path, output_path)

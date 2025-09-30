import sys
import os
import json
from pypdf import PdfReader
from pypdf.generic import IndirectObject, NameObject
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LTChar

# Valores por defecto
DEFAULT_INPUT_PDF = "input.pdf"
DEFAULT_COMBINED_JSON = "fields_and_labels.json"
DEFAULT_FIELDS_EXAMPLE_JSON = "fields_example.json"

def extract_form_fields_and_labels(input_pdf):
    reader = PdfReader(input_pdf)
    fields_info = []
    fields_example = {}

    # Iterar páginas para localizar widgets
    for page_number, page in enumerate(reader.pages, start=1):
        annots = page.get("/Annots")
        if not annots:
            continue

        if isinstance(annots, IndirectObject):
            annots = annots.get_object()

        for annot in annots:
            if isinstance(annot, IndirectObject):
                annot = annot.get_object()

            field_name = annot.get("/T")
            rect = annot.get("/Rect")
            field_type = annot.get("/FT")

            if rect is not None and isinstance(rect, IndirectObject):
                rect = rect.get_object()

            if rect and isinstance(rect, list) and len(rect) == 4:
                x0, y0, x1, y1 = [float(v) for v in rect]
                x, y = min(x0, x1), min(y0, y1)
                width, height = abs(x1 - x0), abs(y1 - y0)
            else:
                x = y = width = height = None

            # Info completa para el JSON combinado
            fields_info.append({
                "field": str(field_name) if field_name else None,
                "page": page_number,
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "type": str(field_type) if field_type else None
            })

            # Valor de ejemplo para fields_example.json
            if field_name:
                if field_type == "/Btn":  # checkbox o radio
                    fields_example[str(field_name)] = "/"
                else:
                    fields_example[str(field_name)] = f"Ejemplo de {field_name}"

    # Extraer etiquetas de texto con pdfminer
    labels_info = []
    for page_number, layout in enumerate(extract_pages(input_pdf), start=1):
        for element in layout:
            if isinstance(element, LTTextContainer):
                for text_line in element:
                    if any(isinstance(obj, LTChar) for obj in text_line):
                        text = text_line.get_text().strip()
                        if text:
                            labels_info.append({
                                "text": text,
                                "page": page_number,
                                "x": text_line.bbox[0],
                                "y": text_line.bbox[1],
                                "width": text_line.bbox[2] - text_line.bbox[0],
                                "height": text_line.bbox[3] - text_line.bbox[1]
                            })

    return fields_info, labels_info, fields_example


def main():
    # Parámetros opcionales
    args = sys.argv[1:]
    input_pdf = args[0] if len(args) > 0 else DEFAULT_INPUT_PDF
    combined_json = args[1] if len(args) > 1 else DEFAULT_COMBINED_JSON
    fields_example_json = args[2] if len(args) > 2 else DEFAULT_FIELDS_EXAMPLE_JSON

    if not os.path.isfile(input_pdf):
        print(f"[ERROR] El archivo {input_pdf} no existe.")
        sys.exit(1)

    print(f"[INFO] Procesando {input_pdf} ...")

    fields, labels, fields_example = extract_form_fields_and_labels(input_pdf)

    # Guardar JSON de campos y etiquetas
    combined_data = {"fields": fields, "labels": labels}
    with open(combined_json, "w", encoding="utf-8") as f:
        json.dump(combined_data, f, indent=4, ensure_ascii=False)
    print(f"[OK] JSON combinado exportado a {combined_json} (fields: {len(fields)}, labels: {len(labels)})")

    # Guardar JSON de valores de ejemplo de campos
    with open(fields_example_json, "w", encoding="utf-8") as f:
        json.dump(fields_example, f, indent=4, ensure_ascii=False)
    print(f"[OK] JSON de ejemplo exportado a {fields_example_json} (campos: {len(fields_example)})")


if __name__ == "__main__":
    main()

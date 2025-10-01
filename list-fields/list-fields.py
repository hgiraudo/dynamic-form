import sys
import os
import json
import re
from pypdf import PdfReader, PdfWriter
from pypdf.generic import IndirectObject, TextStringObject, NameObject

# Valores por defecto
DEFAULT_INPUT_PDF = "input.pdf"
DEFAULT_MODIFIED_PDF = "input-modified.pdf"
DEFAULT_OUTPUT_PDF = "output.pdf"
DEFAULT_COMBINED_JSON = "combined.json"
DEFAULT_FIELDS_EXAMPLE_JSON = "fields_example.json"
DEFAULT_LOG_FILE = "field_verification.log"
DEFAULT_SANITIZE_NAMES = False  # Controla si se modifican o no los nombres de campos

def sanitize_field_name(name):
    if not name:
        return None
    name = re.sub(r'#\d+$', '', name)
    name = re.sub(r'[^a-zA-Z0-9_]', '_', name)
    return name

def sanitize_pdf_fields(input_pdf, output_pdf, sanitize_names=True):
    reader = PdfReader(input_pdf)
    writer = PdfWriter()
    field_values = {}

    for page_number, page in enumerate(reader.pages, start=1):
        annots = page.get("/Annots")
        if not annots:
            writer.add_page(page)
            continue
        if isinstance(annots, IndirectObject):
            annots = annots.get_object()

        for annot_index, annot in enumerate(annots, start=1):
            if isinstance(annot, IndirectObject):
                annot = annot.get_object()
            field_name = annot.get("/T")
            field_type = annot.get("/FT")
            rect = annot.get("/Rect")

            if field_name:
                original_name = str(field_name)
                if sanitize_names:
                    sanitized_name = sanitize_field_name(original_name)
                    annot.update({"/T": TextStringObject(sanitized_name)})
                    field_key = sanitized_name
                else:
                    field_key = original_name

                if field_type == "/Tx":
                    field_values[field_key] = f"Ejemplo de {field_key}"
                elif field_type == "/Btn":
                    field_values[field_key] = "/"

        writer.add_page(page)

    if "/AcroForm" in reader.trailer["/Root"]:
        writer._root_object.update({
            NameObject("/AcroForm"): reader.trailer["/Root"]["/AcroForm"]
        })

    with open(output_pdf, "wb") as f:
        writer.write(f)

    return field_values

def extract_form_fields(input_pdf):
    reader = PdfReader(input_pdf)
    fields_info = []
    fields_example = {}

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
            field_type = annot.get("/FT")
            rect = annot.get("/Rect")

            if rect and isinstance(rect, list) and len(rect) == 4:
                x0, y0, x1, y1 = [float(v) for v in rect]
                x, y = min(x0, x1), min(y0, y1)
                width, height = abs(x1 - x0), abs(y1 - y0)
            else:
                x = y = width = height = None

            fields_info.append({
                "field": str(field_name) if field_name else None,
                "page": page_number,
                "x": x,
                "y": y,
                "width": width,
                "height": height,
                "type": str(field_type) if field_type else None
            })

            if field_name:
                if field_type == "/Btn":
                    fields_example[str(field_name)] = "/"
                else:
                    fields_example[str(field_name)] = f"Ejemplo de {field_name}"

    return fields_info, fields_example

def verify_fields(output_pdf, expected_values, log_file):
    reader = PdfReader(output_pdf)
    log_lines = []

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
            field_value = annot.get("/V")  # valor guardado en el PDF

            expected_value = expected_values.get(field_name)
            status = "OK" if field_value == expected_value else "MISMATCH"
            log_lines.append(f"Page {page_number}, Field '{field_name}': "
                             f"Expected='{expected_value}', Actual='{field_value}' --> {status}")

    with open(log_file, "w", encoding="utf-8") as f:
        f.write("\n".join(log_lines))
    print(f"[OK] Verificación de campos guardada en {log_file}")

def main():
    # Leer argumentos de línea de comandos
    sanitize_names = DEFAULT_SANITIZE_NAMES
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower()
        if arg in ['true', '1', 'yes', 'sanitize']:
            sanitize_names = True
        elif arg in ['false', '0', 'no', 'nossanitize']:
            sanitize_names = False

    input_pdf = DEFAULT_INPUT_PDF
    combined_json = DEFAULT_COMBINED_JSON
    fields_example_json = DEFAULT_FIELDS_EXAMPLE_JSON

    print(f"[INFO] Sanitizar nombres de campos: {sanitize_names}")

    # Paso 1: sanitizar nombres (o no) y generar dict de valores
    field_values = sanitize_pdf_fields(input_pdf, DEFAULT_MODIFIED_PDF, sanitize_names)

    # Paso 2: abrir PDF modificado y actualizar valores campo por campo
    reader = PdfReader(DEFAULT_MODIFIED_PDF)
    writer = PdfWriter()

    for page in reader.pages:
        writer.add_page(page)

    # Copiar AcroForm si existe
    if "/AcroForm" in reader.trailer["/Root"]:
        writer._root_object.update({
            NameObject("/AcroForm"): reader.trailer["/Root"]["/AcroForm"]
        })

    # Actualizar cada página individualmente
    for page_num, page in enumerate(writer.pages):
        try:
            writer.update_page_form_field_values(page, field_values)
        except Exception as e:
            print(f"Advertencia al actualizar página {page_num + 1}: {e}")

    with open(DEFAULT_OUTPUT_PDF, "wb") as f:
        writer.write(f)

    # Paso 3: extraer campos para JSON
    fields_info, fields_example = extract_form_fields(DEFAULT_OUTPUT_PDF)
    combined_data = {"fields": fields_info, "labels": []}
    with open(combined_json, "w", encoding="utf-8") as f:
        json.dump(combined_data, f, indent=4, ensure_ascii=False)
    with open(fields_example_json, "w", encoding="utf-8") as f:
        json.dump(fields_example, f, indent=4, ensure_ascii=False)

    # Paso 4: verificar valores guardados
    verify_fields(DEFAULT_OUTPUT_PDF, field_values, DEFAULT_LOG_FILE)

if __name__ == "__main__":
    main()

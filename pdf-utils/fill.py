import sys
import os
import json
import subprocess
from pypdf import PdfReader
from pypdf.generic import IndirectObject, NameObject
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextContainer, LTTextLine

# Valores por defecto
DEFAULT_INPUT_PDF = "input.pdf"
DEFAULT_OUTPUT_PDF = "output.pdf"
DEFAULT_COMBINED_JSON = "fields_and_labels.json"
DEFAULT_FIELDS_EXAMPLE_JSON = "fields_example.json"
DEFAULT_UNFILLED_LOG = "unfilled_fields.log"

def extract_form_fields_and_labels(input_pdf):
    reader = PdfReader(input_pdf)
    fields_info = []
    fields_example = {}

    # Iterar páginas para localizar widgets
    global_tab_index = 0  # Contador global para todos los campos

    for page_number, page in enumerate(reader.pages, start=1):
        annots = page.get("/Annots")
        if not annots:
            continue

        if isinstance(annots, IndirectObject):
            annots = annots.get_object()

        for annot_index, annot in enumerate(annots):
            if isinstance(annot, IndirectObject):
                annot = annot.get_object()

            field_name = annot.get("/T")
            field_type = annot.get("/FT")

            # Radio buttons: el widget en /Annots no tiene /T; el nombre está en el campo padre
            if not field_name and "/Parent" in annot:
                parent = annot["/Parent"]
                if isinstance(parent, IndirectObject):
                    parent = parent.get_object()
                field_name = parent.get("/T")
                if not field_type:
                    field_type = parent.get("/FT")

            rect = annot.get("/Rect")

            # Obtener tab index
            tab_index = None
            if "/StructParent" in annot:
                # Si tiene StructParent, usarlo
                tab_index = int(annot.get("/StructParent"))
            elif field_type:
                # Si es un campo de formulario, asignar índice secuencial
                tab_index = global_tab_index
                global_tab_index += 1

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
                "type": str(field_type) if field_type else None,
                "tabIndex": tab_index
            })

            # Valor de ejemplo para fields_example.json
            if field_name:
                field_name_str = str(field_name)
                # Si el campo incluye la palabra "fecha" → poner ejemplo de fecha
                if "fecha" in field_name_str.lower():
                    fields_example[field_name_str] = "01-01-2001"
                elif field_type == "/Btn":  # checkbox o radio
                    fields_example[field_name_str] = "/"
                else:
                    fields_example[field_name_str] = field_name_str


    # Extraer etiquetas de texto con pdfminer
    labels_info = []
    for page_number, layout in enumerate(extract_pages(input_pdf), start=1):
        for element in layout:
            if isinstance(element, LTTextContainer):
                # Filtrar solo líneas de texto
                for text_line in element:
                    if isinstance(text_line, LTTextLine):
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


def verify_filled_fields(output_pdf, expected_values, log_file):
    """Verifica qué campos no se llenaron correctamente en el PDF de salida."""
    if not os.path.exists(output_pdf):
        print(f"[ADVERTENCIA] No se encontró {output_pdf} para verificar")
        return

    reader = PdfReader(output_pdf)
    unfilled_fields = []
    total_fields = 0

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
            field_value = annot.get("/V")  # Valor actual en el PDF

            if field_name:
                field_name_str = str(field_name)
                total_fields += 1

                # Verificar si el campo debería tener un valor
                if field_name_str in expected_values:
                    expected = expected_values[field_name_str]

                    # Comparar valores
                    actual = str(field_value) if field_value else None

                    # Campo no llenado o vacío
                    if not actual or actual == "None" or actual == "":
                        unfilled_fields.append({
                            "page": page_number,
                            "field": field_name_str,
                            "expected": expected,
                            "actual": actual
                        })

    # Escribir log
    with open(log_file, "w", encoding="utf-8") as f:
        f.write("=" * 80 + "\n")
        f.write("REPORTE DE CAMPOS NO LLENADOS CORRECTAMENTE\n")
        f.write("=" * 80 + "\n\n")
        f.write(f"Total de campos procesados: {total_fields}\n")
        f.write(f"Campos no llenados: {len(unfilled_fields)}\n\n")

        if unfilled_fields:
            f.write("CAMPOS QUE REQUIEREN ATENCIÓN:\n")
            f.write("-" * 80 + "\n\n")

            for field in unfilled_fields:
                f.write(f"Página: {field['page']}\n")
                f.write(f"Campo: {field['field']}\n")
                f.write(f"Valor esperado: {field['expected']}\n")
                f.write(f"Valor actual: {field['actual']}\n")
                f.write(f"Sugerencia: Verificar que el nombre del campo coincida exactamente\n")
                f.write("-" * 80 + "\n\n")
        else:
            f.write("¡Todos los campos se llenaron correctamente!\n")

    if unfilled_fields:
        print(f"[ADVERTENCIA] {len(unfilled_fields)} campos no se llenaron correctamente")
        print(f"[INFO] Ver detalles en {log_file}")
    else:
        print(f"[OK] Todos los campos se llenaron correctamente")


def process_one(input_pdf, output_pdf, combined_json, fields_example_json, unfilled_log):
    print(f"[INFO] Procesando {input_pdf} ...")

    fields, labels, fields_example = extract_form_fields_and_labels(input_pdf)

    combined_data = {"fields": fields, "labels": labels}
    with open(combined_json, "w", encoding="utf-8") as f:
        json.dump(combined_data, f, indent=4, ensure_ascii=False)
    print(f"[OK] JSON combinado  -> {combined_json} (fields: {len(fields)}, labels: {len(labels)})")

    with open(fields_example_json, "w", encoding="utf-8") as f:
        json.dump(fields_example, f, indent=4, ensure_ascii=False)
    print(f"[OK] JSON de ejemplo -> {fields_example_json} (campos: {len(fields_example)})")

    print(f"[INFO] Generando PDF de salida ...")
    fill_script = os.path.join(os.path.dirname(__file__), "..", "backend", "fill.py")

    try:
        result = subprocess.run(
            ["python", fill_script, input_pdf, fields_example_json, output_pdf],
            capture_output=True,
            text=True,
            timeout=60
        )
        if result.returncode == 0:
            print(f"[OK] PDF de salida     -> {output_pdf}")
            print(f"[INFO] Verificando campos llenados ...")
            verify_filled_fields(output_pdf, fields_example, unfilled_log)
        else:
            print(f"[ERROR] Error al generar PDF: {result.stderr}")
    except subprocess.TimeoutExpired:
        print(f"[ERROR] Timeout al generar PDF")
    except FileNotFoundError:
        print(f"[ERROR] No se encontro el script fill.py en {fill_script}")
    except Exception as e:
        print(f"[ERROR] Error inesperado: {e}")


def main():
    args = sys.argv[1:]

    if args:
        # Modo archivo único
        input_pdf = args[0]
        if not os.path.isfile(input_pdf):
            print(f"[ERROR] El archivo {input_pdf} no existe.")
            sys.exit(1)
        stem = os.path.splitext(input_pdf)[0]
        process_one(
            input_pdf,
            output_pdf          = f"{stem}-output.pdf",
            combined_json       = args[1] if len(args) > 1 else DEFAULT_COMBINED_JSON,
            fields_example_json = args[2] if len(args) > 2 else DEFAULT_FIELDS_EXAMPLE_JSON,
            unfilled_log        = DEFAULT_UNFILLED_LOG,
        )
    else:
        # Modo batch: procesar todos los PDF del directorio (excepto los -output)
        pdfs = sorted(
            f for f in os.listdir(".")
            if f.lower().endswith(".pdf") and not f.lower().endswith("-output.pdf")
        )
        if not pdfs:
            print("[ERROR] No se encontraron archivos PDF en el directorio.")
            sys.exit(1)
        print(f"[INFO] {len(pdfs)} archivo(s) encontrado(s): {', '.join(pdfs)}\n")
        for pdf in pdfs:
            stem = os.path.splitext(pdf)[0]
            print(f"{'=' * 60}")
            process_one(
                pdf,
                output_pdf          = f"{stem}-output.pdf",
                combined_json       = f"{stem}-fields_and_labels.json",
                fields_example_json = f"{stem}-fields_example.json",
                unfilled_log        = f"{stem}-unfilled.log",
            )
            print()


if __name__ == "__main__":
    main()

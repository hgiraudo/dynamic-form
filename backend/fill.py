# fill.py
import sys
import json
import os
import unicodedata
from pdfrw import PdfReader, PdfWriter, PdfDict, PdfName, PdfString

def normalize_text(value):
    """Elimina acentos y reemplaza 'ñ' por 'n'."""
    if not isinstance(value, str):
        return value
    value = value.replace("ñ", "n").replace("Ñ", "N")
    nfkd_form = unicodedata.normalize('NFKD', value)
    return "".join([c for c in nfkd_form if not unicodedata.combining(c)])

def extract_font_info(annot):
    """Extrae información de la fuente del campo original."""
    font_name = "Helvetica"
    font_size = 10

    # Intentar obtener el Default Appearance (DA) del campo
    if hasattr(annot, 'DA') and annot.DA:
        da_string = str(annot.DA)
        # Buscar el tamaño de fuente (patrón: "número Tf")
        import re
        size_match = re.search(r'(\d+(?:\.\d+)?)\s+Tf', da_string)
        if size_match:
            font_size = float(size_match.group(1))
        # Buscar el nombre de la fuente (patrón: "/FontName")
        font_match = re.search(r'/([A-Za-z0-9\-]+)', da_string)
        if font_match:
            font_name = font_match.group(1)

    return font_name, font_size

def generate_appearance(annot, value, field_type):
    """Genera un flujo de apariencia con texto en color negro para los campos de formulario."""
    appearance = PdfDict()
    appearance.Type = PdfName.XObject
    appearance.Subtype = PdfName.Form
    appearance.FormType = 1

    rect = annot.Rect or [0, 0, 100, 20]
    try:
        x1, y1, x2, y2 = [float(x) for x in rect]
        width, height = x2 - x1, y2 - y1
        appearance.BBox = [0, 0, width, height]
    except Exception as e:
        print(f"Advertencia: No se pudo procesar el rectángulo de {annot.T or 'desconocido'}: {e}")
        width, height = 100, 20
        appearance.BBox = [0, 0, width, height]

    # Extraer información de fuente original o usar Helvetica por defecto
    original_font_name, original_font_size = extract_font_info(annot)

    # Mapear fuentes comunes a fuentes estándar
    font_mapping = {
        'Helv': 'Helvetica',
        'Arial': 'Helvetica',
        'ArialMT': 'Helvetica',
        'Arial-Bold': 'Helvetica-Bold',
        'Arial-BoldMT': 'Helvetica-Bold',
        'TimesNewRoman': 'Times-Roman',
        'TimesNewRomanPS': 'Times-Roman',
        'TimesNewRomanPSMT': 'Times-Roman',
        'CourierNew': 'Courier',
        'Cour': 'Courier',
        'TiRo': 'Times-Roman',
    }

    base_font = font_mapping.get(original_font_name, original_font_name)

    # Asegurar que usamos una de las 14 fuentes estándar de PDF
    standard_fonts = ['Helvetica', 'Helvetica-Bold', 'Helvetica-Oblique', 'Helvetica-BoldOblique',
                     'Times-Roman', 'Times-Bold', 'Times-Italic', 'Times-BoldItalic',
                     'Courier', 'Courier-Bold', 'Courier-Oblique', 'Courier-BoldOblique',
                     'Symbol', 'ZapfDingbats']

    if base_font not in standard_fonts:
        # Log solo cuando se usa fuente no estándar
        field_name = annot.T[1:-1] if annot.T else 'unknown'
        print(f"  Advertencia - Campo '{field_name}': fuente '{original_font_name}' no estándar, usando Helvetica")
        base_font = 'Helvetica'

    appearance.Resources = PdfDict(
        Font=PdfDict(
            F1=PdfDict(
                Type=PdfName.Font,
                Subtype=PdfName.Type1,
                BaseFont=PdfName(base_font)
            )
        )
    )

    if field_type == PdfName.Btn:  # Checkbox
        if value == '/':
            stream = f"q 0 0 0 RG 0 0 0 rg 2 w {width/4} {height/4} m {width/2} {height/8} l {3*width/4} {3*height/4} l S Q".encode()
            appearance.stream = stream
            annot.AS = PdfName.Yes
            annot.V = PdfName.Yes
        else:
            annot.AS = PdfName.Off
            annot.V = PdfName.Off
            appearance.stream = b"q Q"
    else:  # Campo de texto
        # Usar el tamaño de fuente original si existe
        if original_font_size and original_font_size > 0:
            font_size = original_font_size
        else:
            font_size = min(12, max(8, height * 0.6))

        y_pos = (height - font_size) / 2
        value_norm = normalize_text(value)
        escaped_value = str(value_norm).replace('(', r'\(').replace(')', r'\)').replace('\\', r'\\')
        stream = f"q 0 0 0 rg BT /F1 {font_size} Tf 2 {y_pos} Td ({escaped_value}) Tj ET Q".encode()
        appearance.stream = stream
        annot.V = PdfString.encode(value_norm)

    annot.AP = PdfDict(N=appearance)
    annot.F = 4  # Bandera de impresión

def fill_pdf(input_pdf, input_json, output_pdf):
    try:
        print(f"[DEBUG] PDF entrada: {os.path.abspath(input_pdf)}")
        print(f"[DEBUG] JSON entrada: {os.path.abspath(input_json)}")
        print(f"[DEBUG] PDF salida: {os.path.abspath(output_pdf)}")

        with open(input_json, "r", encoding="utf-8") as f:
            data = json.load(f)

        reader = PdfReader(input_pdf)
        writer = PdfWriter()

        for page in reader.pages:
            if page.Annots:
                for annot in page.Annots:
                    if annot.Subtype == PdfName.Widget and annot.T:
                        field_name = annot.T[1:-1]
                        if field_name in data:
                            value = data[field_name]
                            field_type = annot.FT
                            if field_type == PdfName.Btn:
                                if value == '/':
                                    annot.V = PdfName.Yes
                                    annot.AS = PdfName.Yes
                                else:
                                    annot.V = PdfName.Off
                                    annot.AS = PdfName.Off
                            else:
                                value_norm = normalize_text(value)
                                annot.V = PdfString.encode(str(value_norm))
                            generate_appearance(annot, value, field_type)
            writer.addpage(page)

        writer.write(output_pdf)
        print(f"PDF generado: {output_pdf}")

    except Exception as e:
        print(f"Error al procesar el PDF: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Uso: python fill.py input.pdf data.json output.pdf")
        sys.exit(1)

    INPUT_PDF = os.path.abspath(sys.argv[1])
    INPUT_JSON = os.path.abspath(sys.argv[2])
    OUTPUT_PDF = os.path.abspath(sys.argv[3])

    fill_pdf(INPUT_PDF, INPUT_JSON, OUTPUT_PDF)

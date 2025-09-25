# fill.py
import sys
import json
import os
from pdfrw import PdfReader, PdfWriter, PdfDict, PdfName, PdfString

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

    appearance.Resources = PdfDict(
        Font=PdfDict(
            F1=PdfDict(
                Type=PdfName.Font,
                Subtype=PdfName.Type1,
                BaseFont=PdfName.Helvetica
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
        font_size = min(12, max(8, height * 0.6))
        y_pos = (height - font_size) / 2
        escaped_value = str(value).replace('(', r'\(').replace(')', r'\)').replace('\\', r'\\')
        stream = f"q 0 0 0 rg BT /F1 {font_size} Tf 2 {y_pos} Td ({escaped_value}) Tj ET Q".encode()
        appearance.stream = stream
        appearance.Length = len(stream)
        annot.V = PdfString.encode(value)

    annot.AP = PdfDict(N=appearance)
    annot.F = 4  # Bandera de impresión

def fill_and_flatten_pdf(input_pdf, input_json, output_pdf, flatten=False):
    try:
        print(f"[DEBUG] Directorio actual: {os.getcwd()}")
        print(f"[DEBUG] PDF entrada: {os.path.abspath(input_pdf)}")
        print(f"[DEBUG] JSON entrada: {os.path.abspath(input_json)}")
        print(f"[DEBUG] PDF salida: {os.path.abspath(output_pdf)}")

        with open(input_json, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        print(f"Datos a rellenar: {len(data)} campos cargados.")

        reader = PdfReader(input_pdf)
        writer = PdfWriter()

        fields_in_pdf = set()
        fields_filled = set()

        for page in reader.pages:
            if page.Annots:
                for annot in page.Annots:
                    if annot.Subtype == PdfName.Widget and annot.T:
                        field_name = annot.T[1:-1]
                        fields_in_pdf.add(field_name)
                        if field_name in data:
                            fields_filled.add(field_name)
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
                                annot.V = PdfString.encode(str(value))
                            generate_appearance(annot, value, field_type)
                            if flatten:
                                annot.F = 4
                                annot.Ff = 1
                                if hasattr(annot, 'Parent'):
                                    annot.Parent = None
                            else:
                                annot.F = 4
                                try:
                                    if annot.Ff is not None:
                                        annot.Ff = None
                                except AttributeError:
                                    pass
            writer.addpage(page)

        if flatten and hasattr(reader, 'Root') and hasattr(reader.Root, 'AcroForm'):
            reader.Root.AcroForm = None
        
        writer.write(output_pdf)

        # 🔹 Generar log comparativo
        fields_in_input_only = set(data.keys()) - fields_in_pdf
        fields_in_pdf_only = fields_in_pdf - set(data.keys())
        fields_in_both = fields_in_pdf & set(data.keys())

        log = {
            "fields_in_json_and_pdf": sorted(list(fields_in_both)),
            "fields_in_json_not_in_pdf": sorted(list(fields_in_input_only)),
            "fields_in_pdf_not_in_json": sorted(list(fields_in_pdf_only))
        }

        # 🔹 Guardar log en un archivo JSON en la misma carpeta que el PDF de salida
        log_path = os.path.splitext(output_pdf)[0] + "_log.json"
        with open(log_path, "w", encoding="utf-8") as log_file:
            json.dump(log, log_file, indent=4, ensure_ascii=False)

        print(f"Log generado en {log_path}")
        print("\n===== LOG DE CAMPOS =====")
        print(json.dumps(log, indent=4, ensure_ascii=False))
        print("=========================\n")

        if flatten:
            print(f"PDF aplanado generado en {output_pdf}")
        else:
            print(f"PDF editable generado en {output_pdf}")

    except Exception as e:
        print(f"Error al procesar el PDF: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Uso: python fill.py input.pdf data.json output.pdf [flatten]")
        sys.exit(1)

    INPUT_PDF = os.path.abspath(sys.argv[1])
    INPUT_JSON = os.path.abspath(sys.argv[2])
    OUTPUT_PDF = os.path.abspath(sys.argv[3])
    flatten = len(sys.argv) > 4 and sys.argv[4].lower() in ['true', '1', 'flatten', 'flat']

    fill_and_flatten_pdf(INPUT_PDF, INPUT_JSON, OUTPUT_PDF, flatten)

# -*- coding: utf-8 -*-
"""
Genera el PDF rellenable de "Formulario de Inscripción" de la Universidad
Hispanoamericana (UH). 2 páginas.
Run: python scripts/generate-uh-template.py
Output: frontend/public/forms/uh/inscripcion/template.pdf
Los nombres de campo (/T) DEBEN coincidir con `name` en formConfig.json.
"""
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader, simpleSplit
from reportlab.lib.colors import HexColor, Color

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UH = os.path.join(ROOT, "frontend", "public", "forms", "uh")
OUT_DIR = os.path.join(UH, "inscripcion")
os.makedirs(OUT_DIR, exist_ok=True)
OUT = os.path.join(OUT_DIR, "template.pdf")
LOGO_WHITE = os.path.join(UH, "logo-white.png")

BLUE = HexColor("#0373D3")
DARKBLUE = HexColor("#1957A6")
SKY = HexColor("#2699FB")
GRAY_LINE = HexColor("#C7CDD1")
GRAY_TEXT = HexColor("#3F4A52")
LIGHT_BG = HexColor("#EEF4FC")

W, H = letter  # 612 x 792
LEFT = 48
RIGHT = W - 48
COLW = 252
C1 = LEFT
C2 = LEFT + COLW + 12  # 312
FIELD_H = 20

c = canvas.Canvas(OUT, pagesize=letter)
af = c.acroForm


def draw_header(subtitle):
    band_h = 80
    c.setFillColor(BLUE)
    c.rect(0, H - band_h, W, band_h, fill=1, stroke=0)
    c.setFillColor(SKY)
    c.rect(0, H - band_h - 3, W, 3, fill=1, stroke=0)
    logo = ImageReader(LOGO_WHITE)
    lw, lh = logo.getSize()
    disp_h = 38
    disp_w = lw * disp_h / lh
    c.drawImage(logo, LEFT, H - band_h + (band_h - disp_h) / 2 + 2,
                width=disp_w, height=disp_h, mask="auto")
    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(Color(1, 1, 1))
    c.drawRightString(RIGHT, H - 36, "Formulario de Inscripción")
    c.setFont("Helvetica", 8.5)
    c.drawRightString(RIGHT, H - 51, subtitle)
    return H - band_h - 18


def label(x, y, text, size=8):
    c.setFont("Helvetica-Bold", size)
    c.setFillColor(GRAY_TEXT)
    c.drawString(x, y, text)


def textfield(name, x, y, w, h=FIELD_H):
    af.textfield(name=name, value="", x=x, y=y - h, width=w, height=h,
                 borderColor=GRAY_LINE, fillColor=Color(1, 1, 1),
                 textColor=HexColor("#111111"), borderWidth=1, forceBorder=True,
                 fontName="Helvetica", fontSize=9, tooltip=name)


def section(y, text):
    c.setFillColor(DARKBLUE)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(LEFT, y, text)
    c.setStrokeColor(SKY)
    c.setLineWidth(1.4)
    c.line(LEFT, y - 5, RIGHT, y - 5)
    return y - 22


def two_col(y, l1, n1, l2, n2):
    label(C1, y, l1); textfield(n1, C1, y - 6, COLW)
    if l2:
        label(C2, y, l2); textfield(n2, C2, y - 6, COLW)
    return y - 46


def full(y, lab, name, h=FIELD_H):
    label(C1, y, lab); textfield(name, C1, y - 6, RIGHT - LEFT, h)
    return y - (h + 26)


# ============================ PÁGINA 1 ============================
y = draw_header("Estudiante de nuevo ingreso")

# nota
c.setFillColor(LIGHT_BG)
c.roundRect(LEFT, y - 22, RIGHT - LEFT, 28, 5, fill=1, stroke=0)
c.setFont("Helvetica-Oblique", 7.8)
c.setFillColor(GRAY_TEXT)
note = ("Complete todos los campos con sus datos reales. La informacion sera utilizada "
        "unicamente para su proceso de admision e inscripcion en la Universidad Hispanoamericana.")
for i, ln in enumerate(simpleSplit(note, "Helvetica-Oblique", 7.8, RIGHT - LEFT - 20)):
    c.drawString(LEFT + 10, y - 5 - i * 9, ln)
y -= 34

y = section(y, "Datos personales")
y = two_col(y, "Nombre completo", "Nombre completo", "Cedula / Identificacion", "Identificacion")
y = two_col(y, "Fecha de nacimiento", "Fecha de nacimiento", "Nacionalidad", "Nacionalidad")
y = two_col(y, "Sexo", "Sexo", "Estado civil", "Estado civil")

y = section(y - 4, "Datos de contacto")
y = two_col(y, "Correo electronico", "Correo", "Numero de telefono", "Telefono")
y = two_col(y, "Provincia", "Provincia", "Canton", "Canton")
y = full(y, "Direccion exacta", "Direccion", h=40)

c.setFont("Helvetica", 7)
c.setFillColor(GRAY_LINE)
c.drawCentredString(W / 2, 28, "Universidad Hispanoamericana  -  Pagina 1 de 2")

c.showPage()

# ============================ PÁGINA 2 ============================
y = draw_header("Datos academicos y consentimiento")

y = section(y, "Datos academicos")
y = two_col(y, "Nivel / Programa", "Nivel", "Carrera de interes", "Carrera")
y = two_col(y, "Sede", "Sede", "Modalidad", "Modalidad")
y = two_col(y, "Periodo de ingreso", "Periodo de ingreso", "Colegio de procedencia", "Colegio de procedencia")
y = two_col(y, "Ano de egreso del colegio", "Ano de egreso", None, None)

# consentimiento
y = section(y - 4, "Consentimiento de tratamiento de datos")
consent = (
    "De conformidad con la Ley N.o 8968, Ley de Proteccion de la Persona frente al Tratamiento "
    "de sus Datos Personales y su reglamento, autorizo de manera libre, expresa e informada a la "
    "Universidad Hispanoamericana a recopilar, almacenar y tratar mis datos personales "
    "suministrados en este formulario, con el fin exclusivo de gestionar mi proceso de admision, "
    "matricula y demas tramites academicos y administrativos derivados de mi condicion de "
    "estudiante. Declaro conocer que podre ejercer mis derechos de acceso, rectificacion, "
    "actualizacion y eliminacion conforme a la normativa vigente en Costa Rica."
)
c.setFont("Helvetica", 7.6)
c.setFillColor(GRAY_TEXT)
lines = simpleSplit(consent, "Helvetica", 7.6, RIGHT - LEFT)
for i, ln in enumerate(lines):
    c.drawString(LEFT, y - i * 9.6, ln)
y -= len(lines) * 9.6 + 12

af.checkbox(name="Consentimiento", x=LEFT, y=y - 12, size=12, checked=False,
            buttonStyle="check", borderColor=BLUE, fillColor=Color(1, 1, 1),
            borderWidth=1, tooltip="Consentimiento")
c.setFont("Helvetica-Bold", 8)
c.setFillColor(DARKBLUE)
c.drawString(LEFT + 20, y - 9.5, "Acepto el consentimiento de tratamiento de datos personales.")
y -= 50

# firma (cuadro de OneSpan se apoya sobre la linea, justo arriba del rotulo)
SIG_BOX_W = 230
SIG_BOX_H = 44
SIG_LINE_Y = 92
c.setStrokeColor(GRAY_LINE)
c.setLineWidth(1)
c.line(LEFT, SIG_LINE_Y, LEFT + SIG_BOX_W, SIG_LINE_Y)
c.setFont("Helvetica", 8)
c.setFillColor(GRAY_TEXT)
c.drawString(LEFT, SIG_LINE_Y - 11, "Firma del solicitante")

c.setFont("Helvetica", 7)
c.setFillColor(GRAY_LINE)
c.drawCentredString(W / 2, 28, "Universidad Hispanoamericana  -  Pagina 2 de 2")

c.save()

onespan_top = H - (SIG_LINE_Y + SIG_BOX_H)
print("PDF generado:", OUT)
print("Firma (pagina 2 = index 1): left=%g top=%g width=%g height=%g"
      % (LEFT, onespan_top, SIG_BOX_W, SIG_BOX_H))

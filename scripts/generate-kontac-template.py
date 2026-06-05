# -*- coding: utf-8 -*-
"""
Generates the branded fillable PDF template for the Kontac "Formulario de Aplicante".
Run: python scripts/generate-kontac-template.py
Output: frontend/public/forms/kontac/solicitud-empleo/template.pdf
Field names (AcroForm /T) MUST match the `name` of each field in formConfig.json.
"""
import os
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.utils import ImageReader
from reportlab.lib.colors import HexColor, Color
from reportlab.lib.utils import simpleSplit

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KONTAC = os.path.join(ROOT, "frontend", "public", "forms", "kontac")
OUT_DIR = os.path.join(KONTAC, "solicitud-empleo")
os.makedirs(OUT_DIR, exist_ok=True)
OUT = os.path.join(OUT_DIR, "template.pdf")
LOGO_WHITE = os.path.join(KONTAC, "logo-white.png")

TEAL = HexColor("#087D77")
TURQ = HexColor("#10E5DA")
GRAY_LINE = HexColor("#C7CDD1")
GRAY_TEXT = HexColor("#4A5358")
LIGHT_BG = HexColor("#F2FBFA")

W, H = letter  # 612 x 792
c = canvas.Canvas(OUT, pagesize=letter)
af = c.acroForm

LEFT = 48
RIGHT = W - 48
COLW = 252
C1 = LEFT
C2 = LEFT + COLW + 12  # 312

FIELD_H = 20
LABEL_DY = 4  # gap between label baseline area and field

def label(x, y, text, size=8):
    c.setFont("Helvetica-Bold", size)
    c.setFillColor(GRAY_TEXT)
    c.drawString(x, y, text)

def textfield(name, x, y, w, value=""):
    af.textfield(
        name=name, value=value, x=x, y=y - FIELD_H, width=w, height=FIELD_H,
        borderColor=GRAY_LINE, fillColor=Color(1, 1, 1), textColor=HexColor("#111111"),
        borderWidth=1, forceBorder=True, fontName="Helvetica", fontSize=9,
        tooltip=name,
    )

def field_block(x, y, w, lab, name):
    """label above, text field below; returns next y."""
    label(x, y, lab)
    textfield(name, x, y - 6, w)
    return y - 6 - FIELD_H

# ---------------- Header band ----------------
band_h = 84
c.setFillColor(TEAL)
c.rect(0, H - band_h, W, band_h, fill=1, stroke=0)
# thin turquoise accent line under band
c.setFillColor(TURQ)
c.rect(0, H - band_h - 3, W, 3, fill=1, stroke=0)

# white logo
logo = ImageReader(LOGO_WHITE)
lw, lh = logo.getSize()
disp_h = 40
disp_w = lw * disp_h / lh
c.drawImage(logo, LEFT, H - band_h + (band_h - disp_h) / 2 + 4, width=disp_w, height=disp_h,
            mask="auto")
# title on the right
c.setFont("Helvetica-Bold", 15)
c.setFillColor(Color(1, 1, 1))
c.drawRightString(RIGHT, H - 38, "Formulario de Aplicante")
c.setFont("Helvetica", 8.5)
c.drawRightString(RIGHT, H - 54, "Solicitud de empleo")

# ---------------- Vigencia note ----------------
y = H - band_h - 22
c.setFillColor(LIGHT_BG)
c.roundRect(LEFT, y - 22, RIGHT - LEFT, 28, 5, fill=1, stroke=0)
c.setFont("Helvetica-Oblique", 7.6)
c.setFillColor(GRAY_TEXT)
note = ("Nota: Su aplicacion estara vigente por un periodo de 30 dias. En caso de querer llenar "
        "nuevamente el formulario debera hacerlo despues de este tiempo.")
for i, line in enumerate(simpleSplit(note, "Helvetica-Oblique", 7.6, RIGHT - LEFT - 20)):
    c.drawString(LEFT + 10, y - 5 - i * 9, line)

# ---------------- Section: Datos del aplicante ----------------
def section(y, text):
    c.setFillColor(TEAL)
    c.setFont("Helvetica-Bold", 10.5)
    c.drawString(LEFT, y, text)
    c.setStrokeColor(TURQ)
    c.setLineWidth(1.4)
    c.line(LEFT, y - 5, RIGHT, y - 5)
    return y - 22

y = section(y - 36, "Datos del aplicante")

rows = [
    ("Cedula", "Cedula", "Nombre completo", "Nombre completo"),
    ("Numero de telefono", "Telefono", "Correo electronico", "Correo"),
    ("Pais", "Pais", "Provincia", "Provincia"),
    ("Canton", "Canton", "Disponibilidad", "Disponibilidad"),
    ("Aspiracion salarial", "Aspiracion salarial", "Nivel de ingles", "Nivel de ingles"),
]
for l1, n1, l2, n2 in rows:
    label(C1, y, l1); textfield(n1, C1, y - 6, COLW)
    label(C2, y, l2); textfield(n2, C2, y - 6, COLW)
    y -= 46

# Sede (full width)
label(C1, y, "En cual de nuestras sedes prefieres trabajar?")
textfield("Sede", C1, y - 6, RIGHT - LEFT)
y -= 46

# ---------------- Section: Herramientas de Office ----------------
y = section(y - 2, "Manejo de herramientas de Office")
office = ["Word", "Power Point", "Excel", "Outlook"]
cbx = LEFT
cb_size = 12
c.setFont("Helvetica", 9)
slot = (RIGHT - LEFT) / 4
for i, opt in enumerate(office):
    x = LEFT + i * slot
    af.checkbox(name=opt, x=x, y=y - cb_size, size=cb_size, checked=False,
                buttonStyle="check", borderColor=GRAY_LINE, fillColor=Color(1, 1, 1),
                borderWidth=1, tooltip=opt)
    c.setFillColor(GRAY_TEXT)
    c.setFont("Helvetica", 9)
    c.drawString(x + cb_size + 6, y - cb_size + 2.5, opt)
y -= 30
label(C1, y, "Otros")
textfield("Otros", C1, y - 6, RIGHT - LEFT)
y -= 44

# ---------------- Section: Consentimiento ----------------
y = section(y, "Clausula de consentimiento de tratamiento de datos")
consent = (
    "De conformidad con la Ley N.o 8968, Ley de Proteccion de la Persona frente al Tratamiento de "
    "sus Datos Personales y su reglamento, autorizo de manera libre, expresa, informada e "
    "inequivoca a Kontac Digital Solutions para recopilar, almacenar, utilizar y tratar mis datos "
    "personales suministrados mediante el presente formulario, exclusivamente para fines "
    "relacionados con procesos administrativos, laborales, de gestion interna y cualquier otro "
    "derivado de la relacion laboral. Asimismo, declaro conocer que podre ejercer mis derechos de "
    "acceso, rectificacion, actualizacion o eliminacion de mis datos personales conforme a la "
    "normativa vigente en Costa Rica."
)
c.setFont("Helvetica", 7.4)
c.setFillColor(GRAY_TEXT)
lines = simpleSplit(consent, "Helvetica", 7.4, RIGHT - LEFT)
for i, line in enumerate(lines):
    c.drawString(LEFT, y - i * 9.2, line)
y -= len(lines) * 9.2 + 10

# consent checkbox
af.checkbox(name="Consentimiento", x=LEFT, y=y - 12, size=12, checked=False,
            buttonStyle="check", borderColor=TEAL, fillColor=Color(1, 1, 1),
            borderWidth=1, tooltip="Consentimiento")
c.setFont("Helvetica-Bold", 8)
c.setFillColor(TEAL)
c.drawString(LEFT + 20, y - 9.5, "Acepto la clausula de consentimiento de tratamiento de datos.")
y -= 40

# ---------------- Signature area ----------------
sig_box_h = 46
sig_top = y                      # reportlab y of top of signature zone
c.setStrokeColor(GRAY_LINE)
c.setLineWidth(1)
c.line(LEFT, y - sig_box_h, LEFT + 230, y - sig_box_h)
c.setFont("Helvetica", 8)
c.setFillColor(GRAY_TEXT)
c.drawString(LEFT, y - sig_box_h - 11, "Firma del aplicante")

# footer
c.setFont("Helvetica", 6.5)
c.setFillColor(GRAY_LINE)
c.drawCentredString(W / 2, 28, "Kontac Digital Solutions  -  Costa Rica")

c.save()
print("PDF generado:", OUT)
print("Signature zone reportlab top y =", round(sig_top, 1),
      "=> OneSpan top =", round(H - sig_top, 1))
print("Lowest content y (footer) = 28")

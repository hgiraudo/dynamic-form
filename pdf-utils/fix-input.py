"""
fix-input.py  —  Diagnostica y repara problemas estructurales en formularios PDF.

Detecta y corrige (con confirmación del usuario) los siguientes problemas:

  1. RECT INVERTIDO
     El /Rect de un widget tiene coordenadas en el orden incorrecto
     (ej. urx < llx o ury < lly). fill.py calcula width/height sin abs(),
     por lo que el BBox queda negativo y el texto se renderiza fuera del área.
     → Normaliza a [llx, lly, urx, ury].

  2. AP STREAMS EXISTENTES
     El widget tiene un /AP stream viejo que puede interferir con el que
     genera fill.py.
     → Los elimina para que fill.py parta de cero.

  3. NEEDAPPEARANCES
     El AcroForm no tiene /NeedAppearances = true. Sin esto, algunos visores
     no regeneran las apariencias a partir de /V y /DA cuando el AP stream
     tiene algún problema menor.
     → Lo activa.

  4. CAMPO TipoDeTramiteApertura DUPLICADO
     Existen dos entradas de TipoDeTramiteApertura en el AcroForm. Una de
     ellas es un duplicado residual de ediciones previas y su kid tiene el
     flag /removed. fill.py puede fallar al intentar marcarla porque no sabe
     cuál de las dos usar.
     → Elimina todas las instancias de TipoDeTramiteApertura (se asume que
       si querés el campo de Apertura fue re-agregado correctamente aparte).

  5. PADRE ANÓNIMO (campo sin nombre envolviendo otros campos)
     Algunos campos están agrupados bajo un nodo padre sin /T (sin nombre).
     Muchas librerías (pypdf, pdfrw) sólo buscan campos en el nivel raíz del
     AcroForm. Al encontrar el nodo sin nombre como entrada raíz, no pueden
     acceder a los campos reales que están adentro.
     → Elimina el nodo anónimo y promueve sus hijos como campos de nivel raíz.

  6. CAMPO DE TEXTO CON /Rect EN EL HIJO EN VEZ DEL PADRE
     El campo tiene /T en el padre pero el /Rect (la posición en la página)
     solo está en el widget hijo. pypdf y pdfrw buscan el /Rect en el mismo
     objeto que contiene el /T, así que no pueden escribir el valor en la
     posición correcta.
     → Fusiona padre e hijo: mueve /Rect y las propiedades de widget al
       padre, elimina la estructura de /Kids.
     Nota: sólo aplica a campos con exactamente 1 hijo. Los campos con
     múltiples hijos (mismo campo en varias páginas) se respetan.

  7. CHECKBOX CON FLAG DE PUSHBUTTON (Ff = 32768)
     El campo tiene /FT = /Btn pero su flag Ff tiene el bit de pushbutton
     activado (valor 32768). Un pushbutton no guarda estado on/off, por lo
     que scripts que intentan escribir True, /Yes o /1 fallan silenciosamente.
     → Pone Ff = 0 (checkbox estándar). No modifica los streams de apariencia.

  8. CHECKBOX CON KID DUPLICADO O HUÉRFANO
     El campo checkbox tiene 2 o más kids pero alguno es un duplicado
     (mismo idnum referenciado dos veces) o tiene el flag /removed (residuo
     de ediciones). Esto hace que el viewer muestre el campo como
     "NombreCampo#1", y fill.py puede escribir en el kid equivocado.
     → Conserva sólo el kid válido (el que aparece en las anotaciones de
       página y no tiene /removed).

  9. ANOTACIÓN NO-WIDGET CON /T (ej. "cespaña")
     Existe una anotación de tipo distinto a /Widget (ej. /Square, /Text)
     que tiene un nombre /T. Algunos editores de PDF la muestran como un
     campo de formulario con ese nombre, lo que confunde a fill.py.
     → La elimina.

  10. CHECKBOX CON /Opt INCORRECTO
     El campo checkbox tiene una entrada /Opt (propia de listas desplegables
     o radio buttons) con valores que no coinciden con los estados reales del
     campo en /AP/N. Algunas librerías (pdfrw, pypdf) usan /Opt[0] para
     determinar el checked_value y escriben ese valor en /V y /AS. Si /Opt[0]
     no coincide con la clave en /AP/N (ej. /Opt=['0','0'] pero AP/N='/1'),
     el valor se escribe pero el viewer no encuentra la apariencia y no muestra
     nada. También se agrega el estado '/Off' a /AP/N si falta, para que el
     viewer sepa cómo renderizar el campo cuando está desmarcado.
     → Elimina /Opt del campo y agrega '/Off' a /AP/N si falta.

Uso:
  python fix-input.py                        # input.pdf  → input-fixed.pdf
  python fix-input.py mi.pdf                 # mi.pdf     → input-fixed.pdf
  python fix-input.py mi.pdf salida.pdf      # mi.pdf     → salida.pdf
  python fix-input.py mi.pdf --auto          # aplica todos los fixes sin preguntar
"""

import sys
import re
from pypdf import PdfReader, PdfWriter
from pypdf.generic import (
    ArrayObject, NameObject, NumberObject, BooleanObject, StreamObject
)


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def resolve(obj):
    return obj.get_object() if hasattr(obj, 'get_object') else obj


def rect_vals(rect):
    try:
        return [float(str(resolve(r))) for r in rect]
    except Exception:
        return None


def field_name(field_obj):
    t = field_obj.get('/T')
    if t is None:
        return None
    try:
        return str(t)
    except Exception:
        return repr(t)


def ap_n_states(kid_obj):
    ap = kid_obj.get('/AP')
    if not ap:
        return []
    ap_obj = resolve(ap)
    n = ap_obj.get('/N') if hasattr(ap_obj, 'get') else None
    if not n:
        return []
    n_obj = resolve(n)
    if hasattr(n_obj, 'keys'):
        return list(n_obj.keys())
    return []


def kid_in_page(kid_idnum, pages):
    for page in pages:
        if '/Annots' not in page:
            continue
        for ar in page['/Annots']:
            if ar.idnum == kid_idnum:
                return True
    return False


def ask(prompt, auto):
    if auto:
        print(f"  → [auto] {prompt.split('?')[0].strip()}: SÍ")
        return True
    resp = input(f"  {prompt} [s/N]: ").strip().lower()
    return resp in ('s', 'si', 'sí', 'y', 'yes')


# ──────────────────────────────────────────────────────────────────────────────
# Detection
# ──────────────────────────────────────────────────────────────────────────────

def detect_issues(reader):
    """
    Returns a dict of detected issues, each a list of affected items.
    """
    issues = {
        'inverted_rects':    [],   # (page_num, annot_ref, field_name, vals)
        'ap_streams':        [],   # (page_num, annot_ref, field_name)
        'apertura_dupes':    [],   # field_ref
        'anon_parents':      [],   # (parent_ref, [child_field_refs])
        'broken_text':       [],   # (field_ref, kid_ref) — 1 kid, Rect on kid only
        'wrong_ff':          [],   # field_ref
        'dup_kids':          [],   # (field_ref, [bad_kid_refs])
        'non_widget_annots': [],   # (page_num, annot_ref, decoded_T)
        'wrong_opt':         [],   # field_ref — checkbox with bad /Opt
    }

    acroform = reader.trailer['/Root']['/AcroForm']
    fields = acroform['/Fields']
    pages = reader.pages

    # ── Fields-level checks ──────────────────────────────────────────────────
    anon_parent_ids = {}  # idnum → (parent_ref, [child_refs])

    for field_ref in fields:
        field = resolve(field_ref)
        t = field_name(field)

        # 4. TipoDeTramiteApertura duplicates
        if t and 'TipoDeTramiteApertura' in t:
            issues['apertura_dupes'].append(field_ref)

        # 5. Anonymous parent nodes
        pr = field.get('/Parent')
        if pr:
            parent = resolve(pr)
            if parent.get('/T') is None:
                pid = pr.idnum
                if pid not in anon_parent_ids:
                    anon_parent_ids[pid] = (pr, [])
                anon_parent_ids[pid][1].append(field_ref)

        # 6. Broken text field (Rect only on single kid)
        ft = str(field.get('/FT', ''))
        if ft == '/Tx':
            rect = field.get('/Rect')
            kids = field.get('/Kids')
            if rect is None and kids and len(kids) == 1:
                kid = resolve(kids[0])
                if kid.get('/Rect') is not None and kid.get('/Subtype') is not None:
                    issues['broken_text'].append((field_ref, kids[0]))

        # 7. Checkbox with pushbutton flag
        ft_btn = str(field.get('/FT', ''))
        ff = field.get('/Ff')
        if ft_btn == '/Btn' and ff is not None:
            try:
                if int(str(ff)) & 65536:  # bit 17 = pushbutton
                    issues['wrong_ff'].append(field_ref)
            except ValueError:
                pass

        # 8. Duplicate / orphan kids on checkbox
        ft_btn2 = str(field.get('/FT', ''))
        kids2 = field.get('/Kids')
        if ft_btn2 == '/Btn' and kids2 and len(kids2) >= 2:
            idnums = [k.idnum for k in kids2]
            bad_kids = []
            seen = set()
            for k in kids2:
                kid_obj = resolve(k)
                has_removed = NameObject('/removed') in kid_obj
                is_dup = k.idnum in seen
                if has_removed or is_dup:
                    bad_kids.append(k)
                else:
                    seen.add(k.idnum)
            if bad_kids:
                issues['dup_kids'].append((field_ref, bad_kids))

        # 10. Checkbox with /Opt that doesn't match AP/N states
        ft_opt = str(field.get('/FT', ''))
        ff_opt = field.get('/Ff')
        opt = field.get('/Opt')
        if ft_opt == '/Btn' and opt is not None:
            # Only checkboxes (Ff=0), not radio buttons or pushbuttons
            try:
                ff_val = int(str(ff_opt)) if ff_opt is not None else 0
            except ValueError:
                ff_val = 0
            is_checkbox = (ff_val == 0)
            if is_checkbox:
                # Get AP/N checked state from first kid
                kids_opt = field.get('/Kids')
                ap_states = []
                if kids_opt:
                    kid_obj = resolve(kids_opt[0])
                    ap_states = ap_n_states(kid_obj)
                checked_states = [s for s in ap_states if s != '/Off']
                opt_vals = [str(o) for o in opt]
                # Flag if /Opt values don't match AP/N checked state,
                # OR if /Opt exists at all on a checkbox (it shouldn't)
                issues['wrong_opt'].append(field_ref)

    issues['anon_parents'] = list(anon_parent_ids.values())

    # ── Page-annotation checks ───────────────────────────────────────────────
    for page_num, page in enumerate(pages, 1):
        if '/Annots' not in page:
            continue
        for annot_ref in page['/Annots']:
            annot = resolve(annot_ref)
            subtype = str(annot.get('/Subtype', ''))

            if subtype == '/Widget':
                t = annot.get('/T')
                fname = field_name(annot) if t else '(sin nombre)'

                # 1. Inverted Rect
                rect = annot.get('/Rect')
                if rect:
                    vals = rect_vals(rect)
                    if vals and len(vals) == 4:
                        x1, y1, x2, y2 = vals
                        if x1 > x2 or y1 > y2:
                            issues['inverted_rects'].append(
                                (page_num, annot_ref, fname, vals))

                # 2. Existing AP streams
                if annot.get('/AP') is not None:
                    issues['ap_streams'].append((page_num, annot_ref, fname))

            else:
                # 9. Non-widget annotation with /T
                t = annot.get('/T')
                if t is not None:
                    try:
                        decoded = str(t)
                    except Exception:
                        decoded = repr(t)
                    issues['non_widget_annots'].append(
                        (page_num, annot_ref, decoded))

    return issues


# ──────────────────────────────────────────────────────────────────────────────
# Report
# ──────────────────────────────────────────────────────────────────────────────

def report_issues(issues):
    total = sum(len(v) for v in issues.values())
    if total == 0:
        print("\n✓ No se detectaron problemas estructurales.")
        return False

    print(f"\n{'═'*62}")
    print(f"  Se detectaron {total} problema(s) en {sum(1 for v in issues.values() if v)} categoría(s)")
    print(f"{'═'*62}")

    if issues['inverted_rects']:
        print(f"\n[1] RECT INVERTIDO — {len(issues['inverted_rects'])} widget(s)")
        print("    El /Rect tiene coordenadas en orden incorrecto (x1>x2 o y1>y2).")
        print("    fill.py calcula width/height = x2-x1 / y2-y1 sin abs(), lo que")
        print("    produce un BBox negativo y el texto aparece fuera del área visible.")
        for page_num, _, fname, vals in issues['inverted_rects'][:5]:
            print(f"    • Pág {page_num}: '{fname}' → {[round(v,1) for v in vals]}")
        if len(issues['inverted_rects']) > 5:
            print(f"    … y {len(issues['inverted_rects'])-5} más")

    if issues['ap_streams']:
        count = len(issues['ap_streams'])
        unique = len(set(fname for _, _, fname in issues['ap_streams']))
        print(f"\n[2] AP STREAMS EXISTENTES — {count} widget(s) en {unique} campo(s)")
        print("    Los widgets tienen /AP streams de apariencia previos que pueden")
        print("    sobreescribir o interferir con los que genera fill.py.")

    if issues['apertura_dupes']:
        print(f"\n[4] TipoDeTramiteApertura DUPLICADO — {len(issues['apertura_dupes'])} entrada(s)")
        print("    Hay más de una entrada de TipoDeTramiteApertura en el AcroForm.")
        print("    fill.py no sabe cuál usar y puede fallar al intentar marcarla.")
        for fr in issues['apertura_dupes']:
            f = resolve(fr)
            kids = f.get('/Kids')
            print(f"    • '{field_name(f)}' — {len(kids) if kids else 0} kid(s)")

    if issues['anon_parents']:
        print(f"\n[5] PADRE ANÓNIMO — {len(issues['anon_parents'])} grupo(s)")
        print("    Algunos campos están dentro de un nodo padre sin nombre (/T).")
        print("    pypdf y pdfrw sólo buscan en el nivel raíz del AcroForm; los campos")
        print("    anidados en un nodo sin nombre quedan invisibles para fill.py.")
        for _, children in issues['anon_parents']:
            names = [field_name(resolve(c)) for c in children]
            print(f"    • Grupo: {names}")

    if issues['broken_text']:
        print(f"\n[6] RECT EN HIJO EN VEZ DEL PADRE — {len(issues['broken_text'])} campo(s)")
        print("    El campo tiene /T en el padre pero /Rect sólo en el widget hijo.")
        print("    pypdf/pdfrw buscan /Rect en el objeto con /T y no lo encuentran,")
        print("    así que escriben el valor pero no pueden renderizarlo en pantalla.")
        for fr, _ in issues['broken_text']:
            print(f"    • '{field_name(resolve(fr))}'")

    if issues['wrong_ff']:
        print(f"\n[7] CHECKBOX CON FLAG PUSHBUTTON — {len(issues['wrong_ff'])} campo(s)")
        print("    El campo tiene /FT=/Btn con Ff=32768 (flag de pushbutton activo).")
        print("    Un pushbutton no guarda estado on/off. Scripts que escriben True,")
        print("    '/Yes' o '/1' fallan silenciosamente porque el campo los ignora.")
        for fr in issues['wrong_ff']:
            print(f"    • '{field_name(resolve(fr))}'")

    if issues['dup_kids']:
        print(f"\n[8] KID DUPLICADO U HUÉRFANO EN CHECKBOX — {len(issues['dup_kids'])} campo(s)")
        print("    El campo tiene 2 o más kids pero alguno es un duplicado (mismo")
        print("    idnum) o tiene el flag /removed (residuo de ediciones previas).")
        print("    El viewer muestra el campo como 'Nombre#1' y fill.py puede")
        print("    escribir en el kid equivocado, sin efecto visible.")
        for fr, bad in issues['dup_kids']:
            t = field_name(resolve(fr))
            all_kids = resolve(fr).get('/Kids')
            print(f"    • '{t}': {len(all_kids)} kids total, {len(bad)} a eliminar")

    if issues['non_widget_annots']:
        print(f"\n[9] ANOTACIÓN NO-WIDGET CON /T — {len(issues['non_widget_annots'])} anotación(es)")
        print("    Hay anotaciones (tipo /Square, /Text, etc.) con un nombre /T.")
        print("    Algunos editores las muestran como campos de formulario, lo que")
        print("    confunde a fill.py y puede causar errores al iterar campos.")
        for page_num, _, decoded in issues['non_widget_annots']:
            print(f"    • Pág {page_num}: '{decoded}'")

    if issues['wrong_opt']:
        print(f"\n[10] CHECKBOX CON /Opt INCORRECTO — {len(issues['wrong_opt'])} campo(s)")
        print("     El campo checkbox tiene /Opt (propio de listas/radio buttons) con")
        print("     valores que pueden no coincidir con los estados reales en /AP/N.")
        print("     pdfrw y pypdf usan /Opt[0] como checked_value al llenar: si /Opt[0]")
        print("     no coincide con la clave en /AP/N (ej. /Opt=['0'] pero AP/N='/1'),")
        print("     el valor se escribe pero el viewer no encuentra la apariencia y no")
        print("     muestra nada. Además falta el estado '/Off' en /AP/N.")
        for fr in issues['wrong_opt']:
            field = resolve(fr)
            t = field_name(field)
            opt = field.get('/Opt')
            opt_vals = [str(o) for o in opt] if opt else []
            kids = field.get('/Kids')
            ap_states = []
            if kids:
                kid_obj = resolve(kids[0])
                ap_states = ap_n_states(kid_obj)
            checked = [s for s in ap_states if s != '/Off']
            match = opt_vals and checked and (f'/{opt_vals[0]}' == checked[0])
            print(f"     • '{t}': /Opt={opt_vals}, AP/N checked={checked} "
                  f"{'(coincide pero /Opt no debería estar)' if match else '← MISMATCH'}")

    return True


# ──────────────────────────────────────────────────────────────────────────────
# Fixes
# ──────────────────────────────────────────────────────────────────────────────

def apply_fixes(writer, issues, auto):
    pages = writer.pages
    acroform = writer._root_object[NameObject('/AcroForm')]
    fields   = acroform[NameObject('/Fields')]
    applied  = []

    # Build idnum → writer-object-ref mapping.
    # detect_issues stores refs from the READER. After clone_document_from_reader(),
    # the writer has its own copies of every PDF object (same idnum, different Python
    # instance). Modifying a reader object has NO effect on what the writer serializes.
    # We must resolve every ref through this map to get the writer's copy.
    w_map = {}

    def _collect(obj_list):
        for ref in obj_list:
            w_map[ref.idnum] = ref
            obj = ref.get_object()
            kids = obj.get('/Kids')
            if kids:
                _collect(kids)

    _collect(fields)
    for _page in pages:
        if '/Annots' in _page:
            _collect(_page[NameObject('/Annots')])

    def w_resolve(ref):
        """Return the writer's version of ref (looked up by idnum)."""
        mapped = w_map.get(ref.idnum, ref)
        return mapped.get_object()

    # ── 1. Inverted Rects ────────────────────────────────────────────────────
    if issues['inverted_rects']:
        if ask(f"¿Corregir {len(issues['inverted_rects'])} Rect(s) invertido(s)?", auto):
            for _, annot_ref, fname, vals in issues['inverted_rects']:
                annot = w_resolve(annot_ref)
                x1, y1, x2, y2 = vals
                normalized = [min(x1,x2), min(y1,y2), max(x1,x2), max(y1,y2)]
                annot[NameObject('/Rect')] = ArrayObject(
                    [NumberObject(round(v, 4)) for v in normalized])
            applied.append(f"1. {len(issues['inverted_rects'])} Rect(s) normalizados")

    # ── 2. AP streams ────────────────────────────────────────────────────────
    if issues['ap_streams']:
        if ask(f"¿Eliminar {len(issues['ap_streams'])} AP stream(s) existente(s)?", auto):
            for _, annot_ref, _ in issues['ap_streams']:
                annot = w_resolve(annot_ref)
                if NameObject('/AP') in annot:
                    del annot[NameObject('/AP')]
            applied.append(f"2. {len(issues['ap_streams'])} AP stream(s) eliminados")

    # ── 3. NeedAppearances (always, if any fix applied or asked) ─────────────
    if ask("¿Activar /NeedAppearances en el AcroForm?", auto):
        acroform[NameObject('/NeedAppearances')] = BooleanObject(True)
        applied.append("3. /NeedAppearances activado")

    # ── 4. TipoDeTramiteApertura duplicates ──────────────────────────────────
    if issues['apertura_dupes']:
        if ask(f"¿Eliminar {len(issues['apertura_dupes'])} entrada(s) de TipoDeTramiteApertura?", auto):
            apertura_ids = set(fr.idnum for fr in issues['apertura_dupes'])
            new_fields = [f for f in fields
                          if f.idnum not in apertura_ids]
            removed_annots = 0
            for page in pages:
                if '/Annots' not in page:
                    continue
                new_annots = []
                for ar in page[NameObject('/Annots')]:
                    annot = w_resolve(ar)
                    t = str(annot.get('/T', ''))
                    pr = annot.get('/Parent')
                    parent_is_apertura = (pr and pr.idnum in apertura_ids)
                    if 'TipoDeTramiteApertura' in t or parent_is_apertura:
                        removed_annots += 1
                    else:
                        new_annots.append(ar)
                page[NameObject('/Annots')] = ArrayObject(new_annots)
            acroform[NameObject('/Fields')] = ArrayObject(new_fields)
            applied.append(
                f"4. {len(issues['apertura_dupes'])} TipoDeTramiteApertura eliminado(s), "
                f"{removed_annots} anotación(es) de página")

    # Refresh fields reference after possible removal
    fields = acroform[NameObject('/Fields')]

    # ── 5. Anonymous parent nodes ────────────────────────────────────────────
    if issues['anon_parents']:
        total_children = sum(len(c) for _, c in issues['anon_parents'])
        if ask(f"¿Corregir {len(issues['anon_parents'])} nodo(s) padre anónimo(s) "
               f"(liberando {total_children} campo(s))?", auto):
            anon_ids = set()
            for parent_ref, children in issues['anon_parents']:
                anon_ids.add(parent_ref.idnum)
                for child_ref in children:
                    child = w_resolve(child_ref)
                    if NameObject('/Parent') in child:
                        del child[NameObject('/Parent')]
            new_fields = []
            replaced = set()
            anon_map = {pr.idnum: children for pr, children in issues['anon_parents']}
            for fr in fields:
                if fr.idnum in anon_ids:
                    if fr.idnum not in replaced:
                        new_fields.extend(anon_map[fr.idnum])
                        replaced.add(fr.idnum)
                else:
                    new_fields.append(fr)
            acroform[NameObject('/Fields')] = ArrayObject(new_fields)
            fields = acroform[NameObject('/Fields')]
            applied.append(
                f"5. {len(issues['anon_parents'])} nodo(s) anónimo(s) eliminado(s), "
                f"{total_children} campo(s) promovidos")

    # ── 6. Broken text fields ────────────────────────────────────────────────
    if issues['broken_text']:
        if ask(f"¿Fusionar {len(issues['broken_text'])} campo(s) de texto "
               f"con /Rect sólo en el hijo?", auto):
            ref_keys = ['/F', '/MK', '/Subtype', '/Type']
            ref_values = {}
            for fr in fields:
                f = w_resolve(fr)
                if (str(f.get('/FT','')) == '/Tx'
                        and f.get('/Rect') is not None
                        and f.get('/Subtype') is not None):
                    for k in ref_keys:
                        if k in f and k not in ref_values:
                            ref_values[k] = f[k]
                    if len(ref_values) == len(ref_keys):
                        break

            kid_ids_to_replace = {}
            for parent_ref, kid_ref in issues['broken_text']:
                parent = w_resolve(parent_ref)
                kid    = w_resolve(kid_ref)
                parent[NameObject('/Rect')] = kid[NameObject('/Rect')]
                if NameObject('/P') in kid:
                    parent[NameObject('/P')] = kid[NameObject('/P')]
                for k, v in ref_values.items():
                    parent[NameObject(k)] = v
                if NameObject('/Kids') in parent:
                    del parent[NameObject('/Kids')]
                if NameObject('/Parent') in kid:
                    del kid[NameObject('/Parent')]
                kid_ids_to_replace[kid_ref.idnum] = w_map.get(parent_ref.idnum, parent_ref)

            for page in pages:
                if '/Annots' not in page:
                    continue
                new_annots = []
                for ar in page[NameObject('/Annots')]:
                    if ar.idnum in kid_ids_to_replace:
                        new_annots.append(kid_ids_to_replace[ar.idnum])
                    else:
                        new_annots.append(ar)
                page[NameObject('/Annots')] = ArrayObject(new_annots)

            applied.append(f"6. {len(issues['broken_text'])} campo(s) de texto fusionados")

    # ── 7. Wrong Ff (pushbutton → checkbox) ──────────────────────────────────
    if issues['wrong_ff']:
        if ask(f"¿Corregir Ff en {len(issues['wrong_ff'])} checkbox(s) "
               f"(pushbutton → checkbox)?", auto):
            for fr in issues['wrong_ff']:
                field = w_resolve(fr)
                field[NameObject('/Ff')] = NumberObject(0)
            applied.append(f"7. {len(issues['wrong_ff'])} checkbox(s) corregidos (Ff=0)")

    # ── 8. Duplicate / orphan kids ───────────────────────────────────────────
    if issues['dup_kids']:
        if ask(f"¿Eliminar kids duplicados/huérfanos en "
               f"{len(issues['dup_kids'])} checkbox(s)?", auto):
            for fr, bad_kids in issues['dup_kids']:
                field = w_resolve(fr)
                kids  = field.get('/Kids')
                seen  = set()
                new_kids = []
                for k in kids:
                    kid = w_resolve(k)
                    has_removed = NameObject('/removed') in kid
                    is_dup = k.idnum in seen
                    if has_removed or is_dup:
                        continue
                    seen.add(k.idnum)
                    new_kids.append(k)
                field[NameObject('/Kids')] = ArrayObject(new_kids)
            total_bad = sum(len(b) for _, b in issues['dup_kids'])
            applied.append(
                f"8. {total_bad} kid(s) eliminado(s) en {len(issues['dup_kids'])} campo(s)")

    # ── 9. Non-widget annotations with /T ────────────────────────────────────
    if issues['non_widget_annots']:
        names = [dec for _, _, dec in issues['non_widget_annots']]
        if ask(f"¿Eliminar {len(issues['non_widget_annots'])} anotación(es) "
               f"no-widget con /T ({', '.join(repr(n) for n in names)})?", auto):
            target_ids = set(ar.idnum for _, ar, _ in issues['non_widget_annots'])
            for page in pages:
                if '/Annots' not in page:
                    continue
                new_annots = [ar for ar in page[NameObject('/Annots')]
                              if ar.idnum not in target_ids]
                page[NameObject('/Annots')] = ArrayObject(new_annots)
            applied.append(
                f"9. {len(issues['non_widget_annots'])} anotación(es) no-widget eliminada(s)")

    # ── 10. Checkbox with wrong /Opt ─────────────────────────────────────────
    if issues['wrong_opt']:
        if ask(f"¿Eliminar /Opt incorrecto en {len(issues['wrong_opt'])} checkbox(s) "
               f"y agregar '/Off' a AP/N?", auto):
            fixed_opt = 0
            for fr in issues['wrong_opt']:
                field = w_resolve(fr)
                if NameObject('/Opt') in field:
                    del field[NameObject('/Opt')]
                kids = field.get('/Kids')
                if kids:
                    for kr in kids:
                        kid = w_resolve(kr)
                        ap  = kid.get('/AP')
                        if ap:
                            ap_obj = resolve(ap)
                            n = ap_obj.get('/N') if hasattr(ap_obj, 'get') else None
                            if n:
                                n_obj = resolve(n)
                                if hasattr(n_obj, 'keys') and NameObject('/Off') not in n_obj:
                                    off_stream = StreamObject()
                                    off_stream._data = b''
                                    off_stream[NameObject('/Length')] = NumberObject(0)
                                    n_obj[NameObject('/Off')] = off_stream
                fixed_opt += 1
            applied.append(
                f"10. /Opt eliminado y '/Off' agregado en {fixed_opt} checkbox(s)")

    return applied


# ──────────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────────

def fix_pdf(input_path: str, output_path: str, auto: bool):
    print(f"\nLeyendo: {input_path}")
    reader = PdfReader(input_path)

    print("Detectando problemas…")
    issues = detect_issues(reader)

    has_issues = report_issues(issues)

    if not has_issues:
        print("No hay nada que corregir.")
        return

    print(f"\n{'─'*62}")
    print("A continuación se preguntará por cada corrección.")
    print("Respondé 's' para aplicarla o Enter para omitirla.")
    print(f"{'─'*62}\n")

    writer = PdfWriter()
    writer.clone_document_from_reader(reader)

    applied = apply_fixes(writer, issues, auto)

    if not applied:
        print("\nNo se aplicó ninguna corrección.")
        return

    with open(output_path, 'wb') as f:
        writer.write(f)

    print(f"\n{'═'*62}")
    print("  CORRECCIONES APLICADAS")
    print(f"{'═'*62}")
    for line in applied:
        print(f"  ✓ {line}")
    print(f"{'─'*62}")
    print(f"  Guardado en: {output_path}")
    print(f"{'═'*62}\n")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if a != '--auto']
    auto = '--auto' in sys.argv

    input_path  = args[0] if len(args) > 0 else "input.pdf"
    output_path = args[1] if len(args) > 1 else "input-fixed.pdf"

    fix_pdf(input_path, output_path, auto)

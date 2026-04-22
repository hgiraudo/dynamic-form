# Resumen Técnico del Repositorio

## Stack

- **Frontend**: React 19 + Vite 7, Tailwind CSS 4, CoreUI 5, framer-motion, react-input-mask
- **Backend**: Node.js + Express 4, multer, axios, dotenv
- **PDF**: Python + pdfrw (fill.py) — llena AcroForm fields con texto y checkmarks
- **Firma digital**: OneSpan ESL (sandbox.esignlive.com)
- **Infra**: AWS EC2, nginx (HTTPS), nohup para deploy persistente

## Estructura de Carpetas

```
dynamic-form/
├── frontend/src/
│   ├── components/
│   │   ├── forms/WizardForm.jsx      ← componente principal (multi-step)
│   │   ├── ButtonGroup.jsx
│   │   └── layout/Layout.jsx
│   ├── config/
│   │   ├── formConfig.json           ← FUENTE DE VERDAD del formulario (15 pasos)
│   │   ├── appConfig.json
│   │   └── pdfConfig.json            ← ruta del PDF template
│   ├── branding/
│   │   ├── brandConfig.js            ← nombre empresa, logos, filename descarga
│   │   ├── brandColors.css
│   │   └── brandFonts.css
│   └── utils/
│       ├── fieldMappers.js           ← (legacy) transformaciones antes del PDF
│       ├── fieldFormatters.js        ← formatter CUIT
│       ├── utils.js                  ← helpers de fecha
│       └── buildTransactionJson.js  ← payload para OneSpan
├── backend/
│   ├── server.js                     ← Express app, 4 endpoints
│   ├── fill.py                       ← script Python: llena PDF con pdfrw
│   └── test/datos.json               ← datos de prueba
├── shared/
│   ├── config.general.js             ← ÚNICA fuente de puertos/URLs (frontend + backend)
│   └── get-config.js                 ← helper bash-compatible
└── list-fields/
    ├── list-fields.py                ← extrae nombres de fields del PDF
    └── fix-input.py                  ← utilidad de corrección
```

## Endpoints del Backend

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/fill-pdf | Recibe PDF + JSON, spawnea fill.py, devuelve PDF lleno |
| POST | /api/sign | Proxy a OneSpan para crear transacción de firma |
| POST | /api/getSigningUrl | Obtiene URL de firma por packageId |
| GET | /api/health | Health check |

- OneSpan API key viaja en header `X-OneSpan-API-Key` (desde el frontend)
- Archivos guardados en `backend/saved/` con timestamps

## Configuración del Formulario (formConfig.json)

Cada step tiene: `title`, `description`, `icon`, `fields[]`

Propiedades de campo más importantes:
- `type`: text, date, email, tel, textarea, checkbox, button-group, info, subtitle
- `visibleIf`: visibilidad condicional según valor de otro campo
- `enabledIf`: habilitación condicional
- `syncTo`: copia automática a otro campo
- `derivedFields`: campos calculados con expresiones JS
- `optionFields`: campos ocultos por opción de button-group
- `formatter`: aplica formatter (ej: "cuitFormatter")
- `default`: valor inicial ("today" para fechas)

## Patrones Clave

1. **Config-driven forms**: Toda la lógica del form está en `formConfig.json`, no en componentes
2. **fieldMappers (legacy)**: Funcionalidad migrada a propiedades declarativas en formConfig.json (`syncTo`, `derivedFields`, `optionFields`)
3. **Branding centralizado**: `brandConfig.js` controla nombre, logos y filename — un solo cambio para rebrandear
4. **Config compartida**: `shared/config.general.js` importado tanto por frontend (Vite) como por backend (Node.js) — cambiar puertos solo ahí
5. **Multi-frontend**: Un backend, múltiples frontends con distintas API keys de OneSpan

## Puertos y URLs

- Frontend: `8080`
- Backend: `4000`
- OneSpan: `https://sandbox.esignlive.com/api/packages`

## Flujo de Datos

```
Usuario llena WizardForm
  → fieldMappers + derivedFields transforman datos
  → POST /api/fill-pdf (PDF template + JSON)
  → fill.py llena AcroForm fields
  → PDF lleno devuelto al frontend
  → POST /api/sign (payload OneSpan + API key en header)
  → POST /api/getSigningUrl (packageId)
  → Usuario redirigido a OneSpan para firmar
```

## fill.py — Lógica Principal

- Lee PDF con pdfrw, itera anotaciones buscando widget names
- Normaliza texto: quita acentos, ñ→n (`normalize_text`)
- Genera appearance streams: texto en Helvetica 8-12pt según alto del campo
- Checkboxes: dibuja "/" si el valor es "/"
- Modo flatten: elimina interactividad del AcroForm (PDF estático)
- CLI: `python fill.py input.pdf data.json output.pdf [flatten]`

## Deploy EC2

```bash
./start-production.sh   # inicia con nohup (sobrevive SSH disconnect)
./stop-production.sh    # detiene servicios
tail -f logs/backend.log
tail -f logs/frontend.log
```

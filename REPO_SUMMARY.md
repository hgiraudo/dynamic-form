# Smart Forms — Dynamic Form System

**Why:** Financial/legal document platform for Argentine companies (Allaria, Banco Occidente) — multi-step forms that fill PDFs and trigger OneSpan e-signatures.

**Stack:** React 19 + Vite (frontend) → Express (backend) → Python fill.py (PDF) → OneSpan API (signatures). Deployed via Docker on AWS EC2.

**How to apply:** All new features should follow the config-driven pattern: add JSON properties to `formConfig.json` rather than hardcoding logic in components.

---

## Directory Structure

```
dynamic-form/
├── frontend/src/
│   ├── App.jsx                          Route definitions; subdomain-aware routing
│   ├── components/
│   │   ├── forms/
│   │   │   ├── FormLoader.jsx           Fetches 4 JSON configs, sets title/favicon; accepts companyOverride prop
│   │   │   ├── WizardForm.jsx           Main form engine (desktop + mobile)
│   │   │   ├── MobileReview.jsx         Mobile accordion review screen
│   │   │   ├── PhoneInputField.jsx      SVG country flag + phone format (react-phone-number-input, es locale, default AR)
│   │   │   ├── MaskedInputField.jsx     Generic digit mask (# = digit) + blur validation + blocks non-digit keys
│   │   │   └── DateInputField.jsx       DD/MM/YYYY masked input + hidden native date picker via showPicker()
│   │   ├── HomePage.jsx                 Lists all companies from registry.json
│   │   ├── CompanyPage.jsx              /:company route; accepts companyId prop for subdomain mode
│   │   ├── CompanySection.jsx           Company logo + form cards grid; accepts basePath prop for subdomain links
│   │   └── DocsPage.jsx                 Auto-generated prefill API docs; accepts companyOverride prop
│   └── utils/
│       ├── fieldFormatters.js           thousandsFormatter (cuitFormatter removed — use mask instead)
│       ├── utils.js                     formatDateDDMMYYYY, parseDateDDMMYYYY
│       ├── subdomain.js                 getCompanyFromHostname() — maps subdomain prefix to company ID
│       ├── buildTransactionJson.js      OneSpan transaction payload builder
│       └── fieldMappers.js              (legacy, mostly replaced by optionFields)
├── frontend/public/forms/
│   ├── registry.json                    Company + form catalog
│   ├── allaria/
│   │   ├── brand.json
│   │   └── persona-juridica/            formConfig + pdfConfig + appConfig + PDF
│   └── banco-occidente/
│       ├── brand.json
│       └── apertura-de-cuenta/          formConfig + pdfConfig + appConfig + PDF
├── backend/
│   ├── server.js                        Express — fill, sign, applications, prefill
│   ├── fill.py                          Python + pdfrw: fills PDF fields from JSON
│   ├── applications/                    Draft JSONs (persisted via Docker volume)
│   └── saved/                           Completed application PDFs (Docker volume)
└── shared/config.general.js             Single source of truth for ports and API paths
```

---

## Routes

```
/                         → HomePage (all companies)
/:company                 → CompanyPage (forms of one company)
/:company/:form           → FormLoader → WizardForm
/:company/:form/docs      → DocsPage (auto-generated API docs)
```

---

## Config Files per Form

| File | Purpose |
|------|---------|
| `formConfig.json` | Steps, fields, types, validation rules |
| `pdfConfig.json` | `{ title, templatePdf }` |
| `appConfig.json` | `{ showJsonOnRevision }` |
| `brand.json` | `{ name, downloadFilename, logos: {white, color}, favicon }` |

**FormLoader** fetches all four in parallel, sets `document.title` and favicon, then renders `WizardForm`.

---

## formConfig.json — All Supported Field Properties

```json
{
  "name": "FieldName",
  "label": "Display label",
  "type": "text|email|tel|date|textarea|checkbox|button-group|info|comment|subtitle|group",
  "placeholder": "ej. Arroyito S.A.",
  "default": "today | false | 'value'",
  "disabled": true,

  "mask": "##-########-#",            // digit mask (# = one digit, rest = literals) — use instead of cuitFormatter
  "formatter": "thousandsFormatter",  // function in fieldFormatters.js

  "visibleIf": { "field": "otherField", "value": "specificValue" },
  "enabledIf":  { "field": "otherField", "value": "specificValue" },
  // value: "" means "show/enable when dependency is non-empty"

  "exclusiveGroup": "groupName",      // checkbox behaves as radio button
  "syncTo": "OtherFieldName",         // auto-copy value to another field on change
  "derivedFields": [                  // compute fields from this field's value
    { "name": "FieldUser", "value": "email.split('@')[0]" }
  ],
  "optionFields": [                   // for button-group: set fields per option index
    { "FieldA": "/" },
    { "FieldB": "/" }
  ],

  "hideOnRevision": true,             // skip in final review step
  "options": ["Opt A", "Opt B"],      // for button-group / exclusiveGroup
  "rows": 3,                          // for textarea
  "content": "Text to display"        // for info/comment/subtitle types
}
```

---

## Field Types

| Type | Component | Notes |
|------|-----------|-------|
| `text` | `<input type="text">` | Uses `formatter` if defined |
| `email` | `<input type="email">` | Supports `derivedFields` for user/domain split |
| `tel` | `PhoneInputField` | Country flag (SVG, not emoji) + auto-format via `react-phone-number-input`; default AR |
| `date` | `DateInputField` | Masked text input (always DD/MM/YYYY) + hidden `<input type="date">` opened via `showPicker()` on calendar icon click |
| `textarea` | `<textarea>` | `rows` prop controls height |
| `checkbox` | `<input type="checkbox">` | With `exclusiveGroup` → renders as `<input type="radio">` |
| `button-group` | buttons | Single-select, supports `optionFields` |
| `info` | styled div | Read-only block; hidden in revision unless `hideOnRevision:false` |
| `comment` | text | Smaller read-only text |
| `subtitle` | heading | Section header within a step |
| `group` | heading | Visual group separator |

---

## Date Handling

- **Internal storage:** `DD/MM/YYYY` (slashes)
- **Display:** `DateInputField` — mask `##/##/####` + calendar via `showPicker()`
- **"today" default:** `formatDateDDMMYYYY(new Date().toISOString().split('T')[0])`
- **On load (backward compat):** `parseDateDDMMYYYY` handles `YYYY-MM-DD` (browser old), `DD-MM-YYYY` (app old), and `DD/MM/YYYY` (current)
- **PDF export:** dates go to PDF as `DD/MM/YYYY` (no conversion needed since that's the stored format)

---

## Data Flow

1. User fills form → `formData` state (raw values)
2. `handleChangeWithFormatter(field, value)` — applies `formatter`, `syncTo`, `derivedFields`
3. `handleChange(name, value, field)` — raw set; with `exclusiveGroup` clears siblings
4. **Save:** POST `formData` to `/api/applications` → returns UUID → stored in URL `?app=<id>`
5. **Load:** GET `/api/applications/:id` → `handleImport()` normalizes dates + checkboxes
6. **Export/PDF:** `getMappedFormData()` → applies `optionFields`, converts checkboxes (`true`→`"/"`, `false`→`""`), applies `syncTo` and `derivedFields`
7. **Sign:** `buildTransactionJson` builds OneSpan payload → POST `/api/sign` → get `packageId` → POST `/api/getSigningUrl` → redirect to signing UI

---

## Backend Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/fill-pdf` | Fill PDF template with JSON data (via fill.py) |
| POST | `/api/sign` | Create OneSpan package (requires `X-OneSpan-API-Key` header) |
| POST | `/api/getSigningUrl` | Get signing URL for packageId |
| GET | `/api/applications/:id` | Load saved draft |
| POST | `/api/applications` | Create new draft → `{ id }` |
| PUT | `/api/applications/:id` | Overwrite existing draft |
| POST | `/api/prefill/:company/:form` | Create pre-filled application → `{ id, url }` |

**Security:** OneSpan API key is never stored in backend; frontend passes it via `X-OneSpan-API-Key` header on every request. Backend returns 401 if missing.

---

## Docker / Deployment

- **`docker-compose.yml`:** frontend + backend + nginx reverse proxy
- **Volumes:** `./backend/applications` and `./backend/saved` are bind-mounted so data persists across container restarts
- **`start-production.sh`:** nohup-based deploy for EC2 (survives SSH disconnect)
- **EC2 auto-detection:** scripts detect public IP via IMDSv2 and set `VITE_BACKEND_URL` automatically

---

## Subdomain Routing

Each company has its own subdomain that shows only its forms (no company picker, no back link to homepage).

| Subdomain | Company |
|-----------|---------|
| `allaria.formularios.biz` | Allaria |
| `bancocci.formularios.biz` | Banco Occidente |
| `formularios.biz` | All companies (default) |

**How it works:**
- `frontend/src/utils/subdomain.js` — `getCompanyFromHostname(hostname)` maps subdomain prefixes via `SUBDOMAIN_MAP`. Returns `null` when no matching subdomain (3+ hostname parts required).
- `App.jsx` — calls `getCompanyFromHostname(window.location.hostname)` at startup. If a subdomain is detected, renders `/:form` and `/:form/docs` routes and passes the company as a prop; otherwise renders the full `/:company/:form` route set.
- `FormLoader.jsx`, `DocsPage.jsx` — accept `companyOverride` prop (replaces `useParams().company`).
- `CompanyPage.jsx` — accepts `companyId` prop; hides "Todos los formularios" back link in subdomain mode.
- `CompanySection.jsx` — accepts `basePath` prop (`""` in subdomain mode, `undefined`/default in normal mode); adjusts form link paths and hides "Ver todos" in subdomain mode.
- `nginx/nginx.conf` — `server_name` includes `allaria.formularios.biz bancocci.formularios.biz`.

**Cloudflare DNS:** Two A records pointing `allaria` and `bancocci` at EC2 IP `18.220.111.23`.

**Testing locally:** Use `lvh.me` — a public domain that resolves to `127.0.0.1` (all subdomains too). No config changes needed.
- `http://allaria.lvh.me:3000` → Allaria only
- `http://bancocci.lvh.me:3000` → Banco Occidente only
- `http://localhost:3000` → all companies

**To add a new subdomain:** add an entry to `SUBDOMAIN_MAP` in `subdomain.js`, add the subdomain to `server_name` in `nginx.conf`, and add the A record in Cloudflare.

---

## Adding a New Form

1. Create `frontend/public/forms/<company>/<form>/` with `formConfig.json`, `pdfConfig.json`, `appConfig.json`, PDF template
2. Add company `brand.json` if new company (logos + favicon)
3. Add entry to `frontend/public/forms/registry.json`
4. No frontend rebuild needed — configs are fetched at runtime

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing a dynamic form system for legal document processing. The application supports multiple companies, each with their own branded forms. It fills PDF forms with user data and integrates with OneSpan e-signature service for digital signing.

**Architecture**: Frontend (React + Vite) → Backend (Node.js/Express) → Python script (pdfrw) → OneSpan API

## Repository Structure

- `frontend/` - React application with Vite
- `frontend/public/forms/` - Per-company form assets (configs, PDFs, brand)
- `frontend/public/img/` - Shared static assets (OneSpan logo, favicon)
- `backend/` - Express server with PDF processing
- `shared/` - Shared configuration between frontend and backend
- `logs/` - Log files for production processes (backend.log, frontend.log, PIDs)
- `deploy.sh` - **Main deploy script**: git pull + cleanup + docker compose up --build
- `scripts/` - All other shell scripts (startup, stop, set-apikey, cleanup, etc.)
- `scripts/cleanup.sh` - Frees disk space (Docker, logs, /tmp, generated PDFs)
- `scripts/set-apikey.sh` - Manage OneSpan API keys interactively
- `scripts/start-production.sh` - Production deployment (nohup, survives SSH disconnection)
- `scripts/stop-production.sh` - Stop production services

## Development Commands

### Starting the Application

**Production deployment** (recommended for AWS EC2 - survives SSH disconnection):
```bash
# Detiene procesos existentes e inicia frontend y backend en producción
./scripts/start-production.sh

# Detiene todos los servicios
./scripts/stop-production.sh

# Ver logs en tiempo real
tail -f logs/backend.log
tail -f logs/frontend.log
```

**Development mode** (requires active terminal):
```bash
# Terminal 1 - Backend
./start-backend-dev.sh

# Terminal 2 - Frontend
./start-frontend-dev.sh
```

**Manual start**:
```bash
# Backend
cd backend
npm install
npm run dev        # Development with nodemon
# or
npm start          # Production

# Frontend
cd frontend
npm install
npm run dev        # Development server
npm run build      # Production build
npm run lint       # Run ESLint
npm preview        # Preview production build
```

### Python Dependency

Backend requires Python installed with `pdfrw` library for PDF manipulation:
```bash
pip install pdfrw
```

The Python script location is configured in `shared/config.general.js` (currently: `backend/fill.py`)

## Configuration System

### Shared Configuration (`shared/config.general.js`)

**SINGLE SOURCE OF TRUTH** for all ports and endpoints. Both frontend and backend import this configuration:
- **Centralized ports**: Frontend (3000), Backend (4000) - defined in `FRONTEND_PORT` and `BACKEND_PORT`
- **Environment detection**: Automatically detects EC2 vs local development
- **Backend URL resolution**: Uses `localhost` in browser, `0.0.0.0` in server
- Backend API endpoints
- Python executable and script paths
- OneSpan API base URL

**Important**: All startup scripts read from this centralized config via `shared/get-config.js`. To change ports, modify **only** `shared/config.general.js`.

### Config Helper (`shared/get-config.js`)

Node.js script that reads `config.general.js` and exports values in bash-compatible format. Used by all startup scripts to ensure consistency.

### Environment Variables

Backend uses `backend/.env`:
- `PORT` - Server port (default: 4000)
- `HOST` - Server host (default: 0.0.0.0 or EC2 internal IP)
- `ONESPAN_API_KEY_DEFAULT` - Fallback OneSpan API key used when no company-specific key is found
- `ONESPAN_API_KEY_{COMPANY}` - Per-company key (e.g. `ONESPAN_API_KEY_ALLARIA`, `ONESPAN_API_KEY_BANCO_OCCIDENTE`). The company name comes from the URL slug, uppercased with hyphens replaced by underscores.

Frontend uses `frontend/.env`:
- `VITE_BACKEND_URL` - Backend API URL (required for API calls)

**API key resolution** (`resolveApiKey` in `server.js`): the frontend sends an `X-Company` header with the company slug. The backend looks up `ONESPAN_API_KEY_{COMPANY}` first, then falls back to `ONESPAN_API_KEY_DEFAULT`. The key never leaves the server.

**Managing keys**: use `./scripts/set-apikey.sh` to view and update keys interactively without editing `.env` manually.

## Form Asset Structure

Each company's forms live under `frontend/public/forms/{company}/`:

```
frontend/public/forms/
  {company}/
    brand.json                    # Company branding (colors, logos, favicon)
    {form}/
      formConfig.json             # SINGLE config file (form + PDF + app settings)
      transactionConfig.json      # Optional: OneSpan signature placement
      template.pdf                # PDF template to fill
```

### `brand.json` schema

```json
{
  "name": "Company Name",
  "logos": {
    "white": "/forms/{company}/logo-white.svg",
    "color": "/forms/{company}/logo-color.svg"
  },
  "favicon": "/forms/{company}/favicon.ico",
  "colors": {
    "primary": "#055020",
    "secondary": "#08732E"
  },
  "poweredBy": {
    "logo": "/img/snappybits-logo.png",
    "url": "https://www.snappybits.com/",
    "label": "SnappyBits"
  }
}
```

The `colors` object sets CSS variables `--color-brand-primary` and `--color-brand-secondary` at runtime via JavaScript. These drive all branded UI colors (header background, buttons, accents).

`poweredBy` is optional. When present, a small logo link appears in the top-right action bar and as a footer strip at the bottom of every page of the form (desktop and mobile).

**Note**: `downloadFilename` and OneSpan API keys are NOT in `brand.json`. `downloadFilename` lives in each `formConfig.json`; API keys live in `backend/.env`.

### `formConfig.json` schema

`formConfig.json` is the **single source of truth** for each form. It previously was split across three files (`formConfig.json` + `pdfConfig.json` + `appConfig.json`) — those have been merged. The combined structure:

```json
{
  "title": "Form Title",
  "templatePdf": "/forms/{company}/{form}/template.pdf",
  "showJsonOnRevision": false,
  "downloadFilename": "output-filename",
  "transactionSigners": [
    { "firstName": "FormFieldName", "lastName": "FormFieldName", "email": "FormFieldName" }
  ],
  "derivedFields": [...],
  "excludeGroups": [...],
  "globalDerivedFields": [...],
  "syncPairs": [...],
  "steps": [
    {
      "type": "welcome",
      "title": "Bienvenido",
      "icon": "cilHome",
      "fields": []
    },
    {
      "title": "Step Title",
      "fields": [
        {
          "name": "pdfFieldName",
          "label": "Human label",
          "type": "text|date|email|tel|checkbox|button-group|select|textarea|info",
          "required": true,
          "placeholder": "ej. example",
          "default": "Default value",
          "defaultCountry": "HN",
          "mapper": "mapperFunctionName",
          "formatter": "thousandsFormatter",
          "optionFields": [{"GroupName": "OptionValue"}, ...]
        }
      ]
    }
  ]
}
```

Key top-level properties:
- `downloadFilename` — base name for exported JSON files (without extension). Required per form.
- `transactionSigners` — optional array that maps form fields to OneSpan signer data. Each entry: `{ "firstName": "FieldName", "lastName": "FieldName", "email": "FieldName" }`. `lastName` is optional — if omitted, the last word of the `firstName` field value is used as last name. When absent, `buildTransactionJson` falls back to the Allaria convention (`Firmante{n}Nombre` / `Firmante{n}Apellido` / `Firmante{n}Email` + `NumeroFirmantes`).

Key step properties:
- `type: "welcome"` — the step renders as an intro/welcome screen instead of a field list. It is excluded from the review page and from demo data generation. Has `fields: []`. Works on both desktop (WizardForm) and mobile (MobileReview). **Standard on all forms — always the first step.**

Key field properties:
- `optionFields` — for radio button groups in PDF: maps `{"AcroFormGroupName": "OptionValue"}`. Values are normalized (accents removed) before matching.
- `defaultCountry` — for `tel` fields: ISO country code for the default phone flag (e.g., `"HN"` for Honduras, `"AR"` for Argentina).
- `default` — pre-selected value for `button-group` fields.
- `mapper` — name of a function in `fieldMappers.js` to transform data before PDF generation.
- `formatter` — name of a function in `fieldFormatters.js` applied on every keystroke (e.g. `thousandsFormatter` for integer amounts with comma separator).

### `transactionConfig.json` schema

Optional. Defines OneSpan signature placement:

```json
{
  "signers": [
    {
      "role": "Signer1",
      "approvals": [
        {
          "page": 0,
          "width": 265,
          "top": 80,
          "height": 59,
          "left": 99
        }
      ]
    }
  ]
}
```

## Core Architecture

### Frontend

**Subdomain detection** (`frontend/src/utils/subdomain.js`):
- `SUBDOMAIN_MAP` maps subdomain → company slug (e.g. `"allaria" → "allaria"`, `"banco-occidente" → "banco-occidente"`)
- `getCompanyFromHostname` parses `window.location.hostname`; returns the company slug or `null`
- When a subdomain is detected, `App.jsx` uses shorter routes (`/:form` instead of `/:company/:form`)
- To add a new subdomain, add an entry to `SUBDOMAIN_MAP` and add it to `server_name` in `nginx/nginx.conf`

**Routing** (`App.jsx`):
- On root domain (`formularios.biz`): `/` → `HomePage`, `/:company/:form` → `WizardForm`
- On subdomain (`allaria.formularios.biz`): `/` → `CompanyPage`, `/:form` → `WizardForm`
- `/:company/:form/docs` or `/:form/docs` — `DocsPage`: API documentation for the prefill endpoint

**Main Components**:
- `HomePage.jsx` — OneSpan-branded landing page; fetches `registry.json`; applies OneSpan colors (`#003F50`) and favicon
- `CompanySection.jsx` — Renders one company's forms on the home/company page. If the company has a `subdomain` field in `registry.json` and the current host is not localhost, links point to `{subdomain}.{basedomain}` instead of `/{company}`.
- `CompanyPage.jsx` — Per-company page; fetches `brand.json`; applies company colors/favicon
- `FormLoader.jsx` — Fetches `formConfig.json`, `brand.json`, `transactionConfig.json`; applies brand; renders `WizardForm`
- `WizardForm.jsx` — Multi-step form wizard (main form logic, desktop)
- `MobileReview.jsx` — Accordion-based mobile UI. Renders all steps including welcome steps (which get a special intro layout instead of form fields).
- `PdfPreviewModal.jsx` — Modal that renders a filled PDF using react-pdf (pdfjs). Triggered by the "Vista previa" button in the review step; calls `/api/fill-pdf` with `responseType=base64` and displays the result page by page.
- `DocsPage.jsx` — Auto-generated API documentation from `formConfig.json`

**Dynamic Branding**:
Each page component applies brand at mount time:
1. `document.documentElement.style.setProperty('--color-brand-primary', ...)` — drives all branded CSS
2. Favicon refresh: remove all existing `<link rel="icon">` elements, then create a new one with `?v=Date.now()` (required to bypass aggressive browser favicon caching)

**Configuration-Driven Forms**:
- Form fields are dynamically rendered based on `formConfig.json`
- Supports: `text`, `date`, `email`, `tel`, `select`, `checkbox`, `button-group`, `textarea`, `info`, `comment`, `subtitle`, `spacer`
- Step type `"welcome"` renders an intro screen (no fields); excluded from review and demo data. Standard on all forms — always first step.

**Field Mapping System** (`frontend/src/utils/fieldMappers.js`):
- Transforms form data before sending to backend/PDF
- Example: `tipoDeTramiteMapper` converts single selection into multiple PDF fields
- Example: `emailMapper` splits email into username and domain parts
- Mappers are referenced by name in `formConfig.json`

**Field Formatters** (`frontend/src/utils/fieldFormatters.js`):
- Applied on every keystroke via `formatter` field property
- `thousandsFormatter` — strips non-digits and formats with comma separator (e.g. `1500000` → `1,500,000`). Used for integer money amounts in Lempiras.
- `cbuFormatter`, `cuitFormatter` — Argentina-specific formats

**Demo data easter egg**: triple-click on the sidebar company logo shows a modal that loads `demoData.json` from the form's public directory (`/forms/{company}/{form}/demoData.json`). Falls back to `buildDemoData(formConfig)` if the file doesn't exist.

**Utilities**:
- `buildTransactionJson.js` - Constructs OneSpan transaction payload. Supports `transactionSigners` mapping from `formConfig` or the legacy `Firmante{n}*` field convention.
- `fieldFormatters.js` - Input field formatting helpers (`thousandsFormatter`, `cbuFormatter`, `cuitFormatter`)
- `subdomain.js` - `SUBDOMAIN_MAP` and `getCompanyFromHostname()` for subdomain-based routing
- `utils.js` - General utilities

### Backend

**Main Server** (`backend/server.js`):

Three primary endpoints:

1. `POST /api/fill-pdf` - Fill PDF with form data
   - Accepts: multipart/form-data with PDF and JSON files
   - Spawns Python script to fill PDF using pdfrw
   - Returns: PDF file or base64 encoded PDF
   - Saves files to `backend/saved/` with timestamps

2. `POST /api/sign` - Create OneSpan signature transaction
   - Forwards transaction JSON to OneSpan API
   - Reads company from `X-Company` header; resolves API key from `backend/.env` via `resolveApiKey()`
   - Returns 401 if no key is configured for the company

3. `POST /api/getSigningUrl` - Get signing URL for a package
   - Fetches signing URL from OneSpan for specific packageId
   - Reads company from `X-Company` header; resolves API key from `backend/.env`
   - Returns 401 if no key is configured for the company
   - Returns URL for signer to access signature interface

4. `GET /api/health` - Health check endpoint

**PDF Processing** (`backend/fill.py`):
- Python script using pdfrw library
- Fills PDF form fields from JSON data (text fields via `page.Annots`)
- Fills radio button groups via AcroForm tree traversal (radio kids have no `/T`, only reachable via `AcroForm.Fields`)
- Normalizes text (removes accents, replaces ñ) — both field data and radio option names are normalized before matching
- Generates appearance streams for form fields
- Supports flatten mode (makes fields non-editable)
- **Font sizing**: `min(9, max(6, height * 0.5))`. For fields taller than 20pt (textarea-like), text is anchored near the top (`y = height - font_size - 3`) to avoid overlapping horizontal lines drawn mid-field in the PDF template. For shorter fields, text is vertically centered.

**Radio button filling** (`fill_radio_groups` in `fill.py`):
- Traverses `reader.Root./AcroForm./Fields` to find button groups (`FT=/Btn` and `Ff & 0x4000`)
- Normalizes data value and each kid's AP/N option name before comparison
- Sets matching kid's `AS` to the option name, parent's `V` to option name; non-matching kids set to `/Off`

### Data Flow

1. User fills form in frontend (WizardForm)
2. Field mappers transform data according to PDF field names
3. Frontend sends PDF template + JSON data to `/api/fill-pdf`
4. Backend spawns Python script to fill PDF (text fields + radio groups)
5. Filled PDF returned to frontend
6. Frontend sends transaction data + `X-Company` header to `/api/sign`
7. Backend resolves the OneSpan API key from `backend/.env` and forwards request to OneSpan; receives packageId
8. Frontend requests signing URL via `/api/getSigningUrl` (with `X-Company` header)
9. User redirected to OneSpan signing interface

## Key Technical Patterns

### Adding a New Form

1. Create directory: `frontend/public/forms/{company}/{form}/`
2. Create `formConfig.json` with `title`, `templatePdf`, `showJsonOnRevision`, `downloadFilename`, and `steps`
   - Always add a `{ "type": "welcome", "title": "Bienvenido", "icon": "cilHome", "fields": [] }` as the **first step** — it is standard on all forms
3. Place PDF template in the same directory
4. Optionally add `transactionConfig.json` for OneSpan signature placement
5. Ensure `frontend/public/forms/{company}/brand.json` exists with `colors`
6. Add form to `frontend/public/forms/registry.json`

### Adding a New Company

1. Create directory: `frontend/public/forms/{company}/`
2. Create `brand.json` with `name`, `logos`, `favicon`, and `colors`
3. Place logo and favicon files in the directory
4. Add the company and its forms to `frontend/public/forms/registry.json` (optionally with `"subdomain"`)
5. Add the OneSpan API key to `backend/.env` as `ONESPAN_API_KEY_{COMPANY}` (run `./scripts/set-apikey.sh`)
6. If using a subdomain: add the subdomain entry to `SUBDOMAIN_MAP` in `frontend/src/utils/subdomain.js`, add it to `server_name` in `nginx/nginx.conf`, and create the DNS record in Cloudflare pointing to the same IP as the other subdomains

### Field Mappers

Mappers transform form data before PDF generation. They receive `(formData, fieldName)` and return modified `formData` object. Common uses:
- Split single field into multiple PDF fields
- Transform checkbox groups into individual fields with "/" markers
- Copy representative data to signer fields

### Radio Button Groups in PDFs

PDFs with radio buttons (Ff=49152) require special handling:
- Radio button kids are not directly in `page.Annots` with a `/T` field name
- The parent group field is only reachable via the AcroForm fields tree
- Use `optionFields` in `formConfig.json` to map the group name to option values
- Both sides (data value and PDF option name) are normalized before matching

### Docker Deployment (production)

The production environment runs with Docker Compose (three containers: `nginx`, `frontend`, `backend`).

```
nginx/nginx.conf        # Outer nginx: routes by Host header → frontend:80 or backend:4000
frontend/Dockerfile     # Multi-stage: node:20-alpine builds dist/, nginx:alpine serves it
frontend/nginx.conf     # Inner nginx: SPA fallback + correct MIME types (.mjs → application/javascript)
backend/Dockerfile      # Node.js server
docker-compose.yml      # Wires services together; backend/.env loaded via volume
```

**Typical deploy workflow** (SSH into server):
```bash
./deploy.sh   # git pull + docker compose up -d --build
```

Or manually:
```bash
git pull origin main
docker compose up -d --build
```

`nginx/nginx.conf` is mounted as a **volume** — a `docker compose restart nginx` is enough to apply changes to it (no rebuild needed). Changes to frontend source or `frontend/nginx.conf` require `--build`.

**What requires a rebuild vs. just `git pull`**:
| Change | Action needed on server |
|--------|------------------------|
| `frontend/src/**` (React code) | `./deploy.sh` (full rebuild) |
| `frontend/nginx.conf` | `./deploy.sh` (full rebuild) |
| `nginx/nginx.conf` | `git pull && docker compose restart nginx` |
| `frontend/public/forms/**` (JSON, PDF, images) | `git pull` only — served statically, no rebuild |
| `backend/**` | `./deploy.sh` (full rebuild) |
| `backend/.env` | `docker compose restart backend` |

**Verify nginx config is loaded**:
```bash
docker exec nginx nginx -T | grep server_name
```

### AWS EC2 Deployment (legacy / nohup)

**Production Deployment** (`scripts/start-production.sh`):
- Kills any existing frontend/backend processes on configured ports
- Starts both services with `nohup` (survives SSH disconnection)
- Detects EC2 IPs automatically (public IP for frontend → backend communication)
- Creates/updates .env files with correct IPs
- Redirects logs to `logs/backend.log` and `logs/frontend.log`
- Saves PIDs to `logs/backend.pid` and `logs/frontend.pid`
- Services continue running after you close SSH session

**Development Deployment** (`start-*-dev.sh`):
- Detects EC2 internal/public IP using IMDSv2 metadata service
- Configures HOST and PORT environment variables from `shared/config.general.js`
- Creates/updates .env files automatically
- Installs dependencies if needed
- Requires active terminal (process dies if terminal closes)

## Multi-Company Architecture

OneSpan API keys are stored per-company in `backend/.env` and never sent to the browser. The frontend identifies the company via the URL slug (`/:company/...`) and sends it as the `X-Company` header; the backend resolves the key internally.

**Adding a new company's key**:
```bash
./scripts/set-apikey.sh   # interactive — select "Agregar nueva empresa"
```
Or manually in `backend/.env`:
```
ONESPAN_API_KEY_NUEVA_EMPRESA="Basic <token>"
```
The key name must match the URL slug uppercased with hyphens replaced by underscores (`nueva-empresa` → `NUEVA_EMPRESA`).

## File Locations

- PDF templates: `frontend/public/forms/{company}/{form}/template.pdf` (served statically)
- Demo data: `frontend/public/forms/{company}/{form}/demoData.json` (loaded on triple-click of sidebar logo)
- Generated PDFs: Saved to `backend/saved/` with timestamps
- Static assets: `frontend/public/img/` (OneSpan logo, favicon, SnappyBits logo, etc.)
- Subdomain map: `frontend/src/utils/subdomain.js`
- Outer nginx config: `nginx/nginx.conf` (server_name list, proxy rules)
- Inner nginx config: `frontend/nginx.conf` (SPA fallback, MIME types)

## Important Notes

- Backend expects Python to be available in PATH
- All API calls use shared configuration from `shared/config.general.js`
- Timestamps format: `YYYY-MM-DD HH.MM.SS` (dots instead of colons for filename compatibility)
- OneSpan sandbox URL: `https://sandbox.esignlive.com/api/packages`
- `formConfig.json` is now the single form config — there are no separate `pdfConfig.json` or `appConfig.json` files
- PDF field names with accents or special characters work correctly: pdfrw decodes Latin-1 to Unicode code points that match JSON UTF-8 keys

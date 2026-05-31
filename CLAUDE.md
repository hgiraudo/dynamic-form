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
- `start-production.sh` - **Production deployment script** (nohup, survives SSH disconnection)
- `stop-production.sh` - **Stop production services** script
- `start-backend-dev.sh` - Development backend script
- `start-frontend-dev.sh` - Development frontend script
- `start-backend-prod.sh` - Production backend script (requires active terminal)
- `start-frontend-prod.sh` - Production frontend script (requires active terminal)

## Development Commands

### Starting the Application

**Production deployment** (recommended for AWS EC2 - survives SSH disconnection):
```bash
# Detiene procesos existentes e inicia frontend y backend en producción
./start-production.sh

# Detiene todos los servicios
./stop-production.sh

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

### Private Configuration (`backend/config.private.js`)

**DEPRECATED**: This file is no longer used for OneSpan API keys. OneSpan API keys are now managed in the frontend.

### Environment Variables

Backend uses `.env` file:
- `PORT` - Server port (default: 4000)
- `HOST` - Server host (default: 0.0.0.0 or EC2 internal IP)

Frontend uses `.env` file:
- `VITE_BACKEND_URL` - Backend API URL (required for API calls)
- `VITE_ONESPAN_API_KEY` - OneSpan API authorization key (passed to backend in request headers)

**Important**: The OneSpan API key is now configured in the frontend and passed to the backend via the `X-OneSpan-API-Key` header. This allows multiple frontend instances to share a single backend while using different API keys.

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
  }
}
```

The `colors` object sets CSS variables `--color-brand-primary` and `--color-brand-secondary` at runtime via JavaScript. These drive all branded UI colors (header background, buttons, accents).

### `formConfig.json` schema

`formConfig.json` is the **single source of truth** for each form. It previously was split across three files (`formConfig.json` + `pdfConfig.json` + `appConfig.json`) — those have been merged. The combined structure:

```json
{
  "title": "Form Title",
  "templatePdf": "/forms/{company}/{form}/template.pdf",
  "showJsonOnRevision": false,
  "downloadFilename": "output.pdf",
  "derivedFields": [...],
  "excludeGroups": [...],
  "globalDerivedFields": [...],
  "syncPairs": [...],
  "steps": [
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
          "optionFields": [{"GroupName": "OptionValue"}, ...]
        }
      ]
    }
  ]
}
```

Key field properties:
- `optionFields` — for radio button groups in PDF: maps `{"AcroFormGroupName": "OptionValue"}`. Values are normalized (accents removed) before matching.
- `defaultCountry` — for `tel` fields: ISO country code for the default phone flag (e.g., `"HN"` for Honduras, `"AR"` for Argentina).
- `default` — pre-selected value for `button-group` fields.
- `mapper` — name of a function in `fieldMappers.js` to transform data before PDF generation.

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

**Routing** (`App.jsx`):
- `/` — `HomePage`: OneSpan-branded landing with all available companies/forms
- `/:company` — `CompanyPage`: Lists forms for one company (applies company brand)
- `/:company/:form` — `FormLoader` → `WizardForm`: The form itself
- `/:company/:form/docs` — `DocsPage`: API documentation for the prefill endpoint

**Main Components**:
- `HomePage.jsx` — OneSpan-branded landing page; fetches `registry.json`; applies OneSpan colors (`#003F50`) and favicon
- `CompanyPage.jsx` — Per-company page; fetches `brand.json`; applies company colors/favicon
- `FormLoader.jsx` — Fetches `formConfig.json`, `brand.json`, `transactionConfig.json`; applies brand; renders `WizardForm`
- `WizardForm.jsx` — Multi-step form wizard (main form logic)
- `DocsPage.jsx` — Auto-generated API documentation from `formConfig.json`

**Dynamic Branding**:
Each page component applies brand at mount time:
1. `document.documentElement.style.setProperty('--color-brand-primary', ...)` — drives all branded CSS
2. Favicon refresh: remove all existing `<link rel="icon">` elements, then create a new one with `?v=Date.now()` (required to bypass aggressive browser favicon caching)

**Configuration-Driven Forms**:
- Form fields are dynamically rendered based on `formConfig.json`
- Supports: `text`, `date`, `email`, `tel`, `select`, `checkbox`, `button-group`, `textarea`, `info`, `comment`, `subtitle`, `spacer`

**Field Mapping System** (`frontend/src/utils/fieldMappers.js`):
- Transforms form data before sending to backend/PDF
- Example: `tipoDeTramiteMapper` converts single selection into multiple PDF fields
- Example: `emailMapper` splits email into username and domain parts
- Mappers are referenced by name in `formConfig.json`

**Utilities**:
- `buildTransactionJson.js` - Constructs OneSpan transaction payload
- `fieldFormatters.js` - Input field formatting helpers
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
   - Requires `X-OneSpan-API-Key` header (provided by frontend)
   - Returns 401 if API key header is missing

3. `POST /api/getSigningUrl` - Get signing URL for a package
   - Fetches signing URL from OneSpan for specific packageId
   - Requires `X-OneSpan-API-Key` header (provided by frontend)
   - Returns 401 if API key header is missing
   - Returns URL for signer to access signature interface

4. `GET /api/health` - Health check endpoint

**PDF Processing** (`backend/fill.py`):
- Python script using pdfrw library
- Fills PDF form fields from JSON data (text fields via `page.Annots`)
- Fills radio button groups via AcroForm tree traversal (radio kids have no `/T`, only reachable via `AcroForm.Fields`)
- Normalizes text (removes accents, replaces ñ) — both field data and radio option names are normalized before matching
- Generates appearance streams for form fields
- Supports flatten mode (makes fields non-editable)

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
6. Frontend sends transaction data + OneSpan API key to `/api/sign` (via `X-OneSpan-API-Key` header)
7. Backend forwards request to OneSpan and receives packageId
8. Frontend requests signing URL via `/api/getSigningUrl` (with API key in header)
9. User redirected to OneSpan signing interface

## Key Technical Patterns

### Adding a New Form

1. Create directory: `frontend/public/forms/{company}/{form}/`
2. Create `formConfig.json` with `title`, `templatePdf`, `showJsonOnRevision`, `downloadFilename`, and `steps`
3. Place PDF template in the same directory
4. Optionally add `transactionConfig.json` for OneSpan signature placement
5. Ensure `frontend/public/forms/{company}/brand.json` exists with `colors`
6. Add form to `frontend/public/forms/registry.json`

### Adding a New Company

1. Create directory: `frontend/public/forms/{company}/`
2. Create `brand.json` with `name`, `logos`, `favicon`, and `colors`
3. Place logo and favicon files in the directory
4. Add the company and its forms to `frontend/public/forms/registry.json`

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

### AWS EC2 Deployment

**Production Deployment** (`start-production.sh`):
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

**Important**:
- Use `start-production.sh` for persistent deployment on EC2
- Use `start-*-dev.sh` for development with hot-reload
- Always stop production services with `stop-production.sh` before redeploying

## Multi-Frontend Architecture

This application supports multiple frontend instances sharing a single backend server. Each frontend can use a different OneSpan API key.

**Setup**:
1. Deploy one backend instance using `start-backend-prod.sh` or `start-production.sh`
2. Deploy multiple frontend instances in different directories
3. Each frontend should:
   - Configure `VITE_BACKEND_URL` to point to the shared backend
   - Configure `VITE_ONESPAN_API_KEY` with their specific API key
   - Be built/started using `start-frontend-prod.sh` or similar

**Security Note**: Each frontend passes its API key to the backend via the `X-OneSpan-API-Key` header. The backend validates that the header is present before forwarding requests to OneSpan.

## File Locations

- PDF templates: `frontend/public/forms/{company}/{form}/template.pdf` (served statically)
- Generated PDFs: Saved to `backend/saved/` with timestamps
- Test data: `frontend/src/test-data/`
- Static assets: `frontend/public/img/` (OneSpan logo, favicon, etc.)

## Important Notes

- Backend expects Python to be available in PATH
- All API calls use shared configuration from `shared/config.general.js`
- Timestamps format: `YYYY-MM-DD HH.MM.SS` (dots instead of colons for filename compatibility)
- OneSpan sandbox URL: `https://sandbox.esignlive.com/api/packages`
- `formConfig.json` is now the single form config — there are no separate `pdfConfig.json` or `appConfig.json` files
- PDF field names with accents or special characters work correctly: pdfrw decodes Latin-1 to Unicode code points that match JSON UTF-8 keys

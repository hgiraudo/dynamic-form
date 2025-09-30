# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing a dynamic form system for legal document processing (Persona Jurídica forms). The application fills PDF forms with user data and integrates with OneSpan e-signature service for digital signing.

**Architecture**: Frontend (React + Vite) → Backend (Node.js/Express) → Python script (pdf-lib) → OneSpan API

## Repository Structure

- `frontend/` - React application with Vite
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

Contains sensitive credentials (NOT committed to git):
- OneSpan API keys

### Environment Variables

Backend uses `.env` file:
- `PORT` - Server port (default: 4000)
- `HOST` - Server host (default: 0.0.0.0 or EC2 internal IP)
- `ONESPAN_API_KEY` - OneSpan API authorization key

Frontend uses `.env` file:
- `VITE_BACKEND_URL` - Backend API URL (required for API calls)

## Core Architecture

### Frontend

**Main Components**:
- `App.jsx` - Root component, renders WizardForm
- `WizardForm.jsx` - Multi-step form wizard (main form logic)
- `frontend/src/components/layout/` - Layout components
- `frontend/src/components/forms/` - Form components

**Configuration-Driven Forms**:
- `formConfig.json` - Defines all form steps, fields, types, and mappers
- Form fields are dynamically rendered based on this JSON structure
- Supports: text, date, select, checkbox, button-group, and more

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
   - Requires ONESPAN_API_KEY in headers

3. `POST /api/getSigningUrl` - Get signing URL for a package
   - Fetches signing URL from OneSpan for specific packageId
   - Returns URL for signer to access signature interface

4. `GET /api/health` - Health check endpoint

**PDF Processing** (`backend/fill.py`):
- Python script using pdfrw library
- Fills PDF form fields from JSON data
- Normalizes text (removes accents, replaces ñ)
- Generates appearance streams for form fields
- Supports flatten mode (makes fields non-editable)

### Data Flow

1. User fills form in frontend (WizardForm)
2. Field mappers transform data according to PDF field names
3. Frontend sends PDF template + JSON data to `/api/fill-pdf`
4. Backend spawns Python script to fill PDF
5. Filled PDF returned to frontend
6. Frontend sends transaction data to `/api/sign` (OneSpan)
7. Backend receives packageId from OneSpan
8. Frontend requests signing URL via `/api/getSigningUrl`
9. User redirected to OneSpan signing interface

## Key Technical Patterns

### Configuration-Driven Forms

Form structure is entirely defined in `formConfig.json`. To add a new field:
1. Add field definition to appropriate step in `formConfig.json`
2. Optionally create mapper in `fieldMappers.js` if transformation needed
3. Form automatically renders and processes the field

### Field Mappers

Mappers transform form data before PDF generation. They receive `(formData, fieldName)` and return modified `formData` object. Common uses:
- Split single field into multiple PDF fields
- Transform checkbox groups into individual fields with "/" markers
- Copy representative data to signer fields

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

## File Locations

- PDF templates: Upload handled by multer to `backend/uploads/`
- Generated PDFs: Saved to `backend/saved/` with timestamps
- Test data: `frontend/src/test-data/`

## Important Notes

- Backend expects Python to be available in PATH
- All API calls use shared configuration from `shared/config.general.js`
- Timestamps format: `YYYY-MM-DD HH.MM.SS` (dots instead of colons for filename compatibility)
- OneSpan sandbox URL: `https://sandbox.esignlive.com/api/packages`
#!/bin/bash
# Muestra y actualiza las API keys de OneSpan en backend/.env
# Uso: ./set-apikey.sh

set -e

ENV_FILE="backend/.env"

source "$(dirname "$0")/lib/check-deps.sh"
require_python
PYTHON="$PYTHON_CMD"

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ No se encontró $ENV_FILE"
    exit 1
fi

# ── Mostrar claves actuales ──────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  API Keys de OneSpan — estado actual (backend/.env)"
echo "═══════════════════════════════════════════════════════════"
echo ""

NAMES=()
idx=1

while IFS= read -r line; do
    if [[ "$line" =~ ^ONESPAN_API_KEY_([A-Z_]+)= ]]; then
        name="${BASH_REMATCH[1]}"
        raw_value=$(echo "$line" | sed "s/^ONESPAN_API_KEY_${name}=//; s/^\"//; s/\"$//")
        raw_token=$(echo "$raw_value" | sed 's/^Basic //')

        if [ -z "$raw_token" ]; then
            display="(vacía)"
        elif [ ${#raw_token} -gt 30 ]; then
            display="${raw_token:0:20}...${raw_token: -8}"
        else
            display="$raw_token"
        fi

        if [ "$name" = "DEFAULT" ]; then
            label="DEFAULT  (fallback para empresas sin clave propia)"
        else
            label=$(echo "$name" | tr '_' '-' | tr '[:upper:]' '[:lower:]')
        fi

        echo "  [$idx] $label"
        echo "       🔑 $display"
        echo ""
        NAMES+=("$name")
        idx=$((idx + 1))
    fi
done < "$ENV_FILE"

NEW_IDX=$idx
echo "  [$NEW_IDX] Agregar clave para una nueva empresa"
echo ""

# ── Selección ────────────────────────────────────────────────────────────────

read -p "Seleccioná qué clave actualizar [1-$NEW_IDX]: " SELECTION

if ! [[ "$SELECTION" =~ ^[0-9]+$ ]] || [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt "$NEW_IDX" ]; then
    echo "❌ Selección inválida."
    exit 1
fi

IS_NEW=false
if [ "$SELECTION" -eq "$NEW_IDX" ]; then
    read -p "Nombre de la empresa (ej: nuevo-banco): " COMPANY_INPUT
    if [ -z "$COMPANY_INPUT" ]; then
        echo "❌ El nombre no puede estar vacío."
        exit 1
    fi
    TARGET_NAME=$(echo "$COMPANY_INPUT" | tr '-' '_' | tr '[:lower:]' '[:upper:]')
    IS_NEW=true
else
    TARGET_NAME="${NAMES[$((SELECTION - 1))]}"
fi

# Leer valor actual (solo el token, sin "Basic ")
CURRENT_TOKEN=$($PYTHON - "$ENV_FILE" "$TARGET_NAME" << 'PYEOF'
import sys, re
env_file, name = sys.argv[1], sys.argv[2]
with open(env_file) as f:
    content = f.read()
m = re.search(rf'^ONESPAN_API_KEY_{re.escape(name)}=["\']?(.*?)["\']?\s*$', content, re.MULTILINE)
if m:
    val = m.group(1).strip('"\'').strip()
    print(val.replace('Basic ', '', 1).strip())
PYEOF
)

# ── Pedir nueva clave ─────────────────────────────────────────────────────────

echo ""
echo "  ℹ️  Ingresá solo el token. El script agrega 'Basic ' automáticamente."
if [ -n "$CURRENT_TOKEN" ]; then
    echo "  ℹ️  Dejá vacío para mantener el valor actual."
fi
echo ""
read -p "Nueva API Key (sin 'Basic '): " NEW_KEY_RAW

if [ -z "$NEW_KEY_RAW" ]; then
    if [ -n "$CURRENT_TOKEN" ]; then
        echo ""
        echo "ℹ️  Sin cambios. Saliendo."
        echo ""
        exit 0
    else
        echo "❌ La clave no puede estar vacía."
        exit 1
    fi
fi

if [ "$NEW_KEY_RAW" = "$CURRENT_TOKEN" ]; then
    echo ""
    echo "ℹ️  Sin cambios. Saliendo."
    echo ""
    exit 0
fi

NEW_KEY_FULL="Basic $NEW_KEY_RAW"

# ── Escribir en backend/.env ──────────────────────────────────────────────────

$PYTHON - "$ENV_FILE" "$TARGET_NAME" "$NEW_KEY_FULL" "$IS_NEW" << 'PYEOF'
import sys, re

env_file, name, new_key, is_new = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4] == 'true'

with open(env_file) as f:
    content = f.read()

pattern = rf'^ONESPAN_API_KEY_{re.escape(name)}=.*$'
replacement = f'ONESPAN_API_KEY_{name}="{new_key}"'

if re.search(pattern, content, re.MULTILINE):
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE)
elif is_new:
    content = content.rstrip('\n') + f'\nONESPAN_API_KEY_{name}="{new_key}"\n'
else:
    print(f"❌ No se encontró ONESPAN_API_KEY_{name} en el archivo.", file=sys.stderr)
    sys.exit(1)

with open(env_file, 'w') as f:
    f.write(content)
PYEOF

# ── Resumen ───────────────────────────────────────────────────────────────────

KEY_LEN=${#NEW_KEY_FULL}
if [ $KEY_LEN -gt 30 ]; then
    KEY_DISPLAY="${NEW_KEY_FULL:0:20}...${NEW_KEY_FULL: -8}"
else
    KEY_DISPLAY="$NEW_KEY_FULL"
fi

echo ""
echo "✅ Clave actualizada en $ENV_FILE"
echo ""
echo "   🏢 Empresa : $(echo "$TARGET_NAME" | tr '_' '-' | tr '[:upper:]' '[:lower:]')"
echo "   🔑 Clave   : $KEY_DISPLAY"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  La clave vive en el backend — no requiere rebuild."
echo "  Reiniciá el backend para que tome efecto:"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Detectar si Docker está corriendo con el contenedor backend
DOCKER_RUNNING=false
if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^backend$"; then
        DOCKER_RUNNING=true
    fi
fi

if [ "$DOCKER_RUNNING" = true ]; then
    echo "🐳 Se detectó el contenedor Docker 'backend' corriendo."
    echo ""
    read -p "   ¿Reiniciarlo ahora? [S/n]: " RESTART
    RESTART="${RESTART:-S}"
    if [[ "$RESTART" =~ ^[Ss]$ ]]; then
        echo ""
        echo "🔄 Reiniciando contenedor backend..."
        docker compose restart backend
        echo ""
        echo "✅ Backend reiniciado con la nueva API Key."
    else
        echo ""
        echo "  Para aplicar el cambio manualmente:"
        echo ""
        echo "     docker compose restart backend"
    fi
else
    echo "  Si usás producción (nohup):"
    echo ""
    echo "     ./start-production.sh"
    echo ""
    echo "  Si usás desarrollo:"
    echo ""
    echo "     ./start-backend-dev.sh"
fi
echo ""

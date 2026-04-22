#!/bin/bash
# Muestra y actualiza VITE_ONESPAN_API_KEY en frontend/.env
# Uso: ./set-apikey.sh

set -e

ENV_FILE="frontend/.env"

# Detectar Python disponible
PYTHON=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)
if [ -z "$PYTHON" ]; then
    echo "❌ Python no encontrado"
    exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
    echo "❌ No se encontró $ENV_FILE"
    exit 1
fi

# Leer nombre (comentario antes de la clave) y valor actual
CURRENT_NAME=$(grep -B1 "^VITE_ONESPAN_API_KEY=" "$ENV_FILE" | grep "^#" | sed 's/^#[[:space:]]*//')
CURRENT_KEY=$(grep "^VITE_ONESPAN_API_KEY=" "$ENV_FILE" | sed 's/^VITE_ONESPAN_API_KEY=//; s/^"//; s/"$//')

# Truncar clave para mostrarla sin exponer el valor completo
KEY_LEN=${#CURRENT_KEY}
if [ $KEY_LEN -gt 30 ]; then
    KEY_DISPLAY="${CURRENT_KEY:0:20}...${CURRENT_KEY: -8}"
else
    KEY_DISPLAY="$CURRENT_KEY"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  API Key de OneSpan — valor actual"
echo "═══════════════════════════════════════════════════════════"
echo ""
if [ -n "$CURRENT_NAME" ]; then
    echo "  📛 Nombre : $CURRENT_NAME"
else
    echo "  📛 Nombre : (sin nombre)"
fi
echo "  🔑 Clave  : $KEY_DISPLAY"
echo ""

# Pedir nuevo nombre
read -p "Nuevo nombre mnemotécnico  [Enter = mantener actual]: " NEW_NAME
NEW_NAME="${NEW_NAME:-$CURRENT_NAME}"

# Pedir nueva clave
read -p "Nueva API Key              [Enter = mantener actual]: " NEW_KEY
NEW_KEY="${NEW_KEY:-$CURRENT_KEY}"

echo ""

# Si no hubo cambios, salir
if [ "$NEW_NAME" = "$CURRENT_NAME" ] && [ "$NEW_KEY" = "$CURRENT_KEY" ]; then
    echo "ℹ️  Sin cambios. Saliendo."
    echo ""
    exit 0
fi

# Actualizar el archivo .env con Python (edición segura multilinea)
$PYTHON - "$ENV_FILE" "$NEW_NAME" "$NEW_KEY" << 'PYEOF'
import sys

env_file, new_name, new_key = sys.argv[1], sys.argv[2], sys.argv[3]

with open(env_file, 'r') as f:
    lines = f.readlines()

result = []
i = 0
while i < len(lines):
    line = lines[i]
    # Caso: comentario seguido de VITE_ONESPAN_API_KEY
    if (line.strip().startswith('#') and
            i + 1 < len(lines) and
            lines[i + 1].startswith('VITE_ONESPAN_API_KEY=')):
        result.append(f'# {new_name}\n')
        result.append(f'VITE_ONESPAN_API_KEY="{new_key}"\n')
        i += 2
    # Caso: VITE_ONESPAN_API_KEY sin comentario previo
    elif line.startswith('VITE_ONESPAN_API_KEY='):
        result.append(f'# {new_name}\n')
        result.append(f'VITE_ONESPAN_API_KEY="{new_key}"\n')
        i += 1
    else:
        result.append(line)
        i += 1

with open(env_file, 'w') as f:
    f.writelines(result)
PYEOF

# Mostrar resumen
KEY_NEW_LEN=${#NEW_KEY}
if [ $KEY_NEW_LEN -gt 30 ]; then
    KEY_NEW_DISPLAY="${NEW_KEY:0:20}...${NEW_KEY: -8}"
else
    KEY_NEW_DISPLAY="$NEW_KEY"
fi

echo "✅ API Key actualizada en $ENV_FILE"
echo ""
echo "  📛 Nombre : $NEW_NAME"
echo "  🔑 Clave  : $KEY_NEW_DISPLAY"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ⚠️  VITE_ONESPAN_API_KEY se embebe en el build."
echo "  Para que el cambio tome efecto, reconstruí el frontend:"
echo ""
echo "     ./start-production.sh"
echo ""
echo "  O solo el build si el servidor ya está corriendo:"
echo ""
echo "     cd frontend && npm run build"
echo "═══════════════════════════════════════════════════════════"
echo ""

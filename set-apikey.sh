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

# Leer nombre (comentario antes de la clave) y valor completo almacenado
CURRENT_NAME=$(grep -B1 "^VITE_ONESPAN_API_KEY=" "$ENV_FILE" | grep "^#" | sed 's/^#[[:space:]]*//')
CURRENT_KEY_FULL=$(grep "^VITE_ONESPAN_API_KEY=" "$ENV_FILE" | sed 's/^VITE_ONESPAN_API_KEY=//; s/^"//; s/"$//')

# Quitar el prefijo "Basic " para mostrar y editar solo la parte raw
CURRENT_KEY_RAW=$(echo "$CURRENT_KEY_FULL" | sed 's/^Basic //')

# Truncar para mostrar sin exponer el valor completo
KEY_LEN=${#CURRENT_KEY_RAW}
if [ $KEY_LEN -gt 30 ]; then
    KEY_DISPLAY="${CURRENT_KEY_RAW:0:20}...${CURRENT_KEY_RAW: -8}"
else
    KEY_DISPLAY="$CURRENT_KEY_RAW"
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
echo "             (se guarda como: Basic <clave>)"
echo ""

# Pedir nuevo nombre
read -p "Nuevo nombre mnemotécnico     [Enter = mantener actual]: " NEW_NAME
NEW_NAME="${NEW_NAME:-$CURRENT_NAME}"

# Pedir nueva clave — el usuario ingresa solo el token, sin "Basic "
echo "  ℹ️  Ingresá solo el token. El script agrega 'Basic ' automáticamente."
read -p "Nueva API Key (sin 'Basic ')  [Enter = mantener actual]: " NEW_KEY_RAW
NEW_KEY_RAW="${NEW_KEY_RAW:-$CURRENT_KEY_RAW}"

# Armar el valor completo con el prefijo
NEW_KEY="Basic $NEW_KEY_RAW"

echo ""

# Si no hubo cambios, salir
if [ "$NEW_NAME" = "$CURRENT_NAME" ] && [ "$NEW_KEY_RAW" = "$CURRENT_KEY_RAW" ]; then
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
echo "  Para que el cambio tome efecto hay que reconstruir."
echo "═══════════════════════════════════════════════════════════"
echo ""

# Detectar si Docker está corriendo con el contenedor frontend
DOCKER_RUNNING=false
if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q "^frontend$"; then
        DOCKER_RUNNING=true
    fi
fi

if [ "$DOCKER_RUNNING" = true ]; then
    echo "🐳 Se detectó el contenedor Docker 'frontend' corriendo."
    echo ""
    read -p "   ¿Rebuildearlo ahora? [S/n]: " REBUILD
    REBUILD="${REBUILD:-S}"
    if [[ "$REBUILD" =~ ^[Ss]$ ]]; then
        echo ""
        echo "🔨 Rebuildeando contenedor frontend..."
        docker compose up -d --build frontend
        echo ""
        echo "✅ Contenedor frontend reconstruido con la nueva API Key."
    else
        echo ""
        echo "  Para aplicar el cambio manualmente:"
        echo ""
        echo "     docker compose up -d --build frontend"
    fi
else
    echo "  Si usás Docker:"
    echo ""
    echo "     docker compose up -d --build frontend"
    echo ""
    echo "  Si usás el servidor directo:"
    echo ""
    echo "     ./start-production.sh"
    echo ""
    echo "  O solo el build si el servidor ya está corriendo:"
    echo ""
    echo "     cd frontend && npm run build"
fi
echo ""

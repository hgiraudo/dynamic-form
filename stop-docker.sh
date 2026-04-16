#!/bin/bash

# Script para detener la aplicación Docker
# Uso: ./stop-docker.sh [--volumes]
#   --volumes  También elimina volúmenes (datos persistentes)

echo "🛑 Deteniendo aplicación Docker..."

VOLUMES_FLAG=""
if [[ "$1" == "--volumes" ]]; then
    VOLUMES_FLAG="--volumes"
    echo "⚠️  También se eliminarán los volúmenes"
fi

docker compose down $VOLUMES_FLAG

echo ""
echo "✅ Todos los contenedores detenidos"

#!/bin/bash
# docker-cleanup.sh — Libera espacio eliminando imágenes, contenedores y capas Docker no usadas
set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Docker Cleanup — liberación de espacio en disco"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "📊 Espacio antes de limpiar:"
df -h /
echo ""

echo "🗑️  Eliminando contenedores detenidos..."
docker container prune -f

echo "🗑️  Eliminando imágenes sin usar (dangling)..."
docker image prune -f

echo "🗑️  Eliminando volúmenes no usados..."
docker volume prune -f

echo "🗑️  Eliminando redes no usadas..."
docker network prune -f

echo "🗑️  Eliminando build cache..."
docker builder prune -f

echo ""
echo "📊 Espacio después de limpiar:"
df -h /
echo ""
echo "✅ Limpieza completada."
echo ""

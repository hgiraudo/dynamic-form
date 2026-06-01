#!/bin/bash
# cleanup.sh — Libera espacio en disco: Docker, logs del sistema y PDFs generados
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Cleanup — liberación de espacio en disco"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "📊 Espacio antes de limpiar:"
df -h /
echo ""

# ── Docker ────────────────────────────────────────────────────────────────────
echo "🐳 Docker: eliminando contenedores detenidos..."
docker container prune -f

echo "🐳 Docker: eliminando imágenes sin usar (dangling)..."
docker image prune -f

echo "🐳 Docker: eliminando volúmenes no usados..."
docker volume prune -f

echo "🐳 Docker: eliminando redes no usadas..."
docker network prune -f

echo "🐳 Docker: eliminando build cache..."
docker builder prune -f

echo ""

# ── Logs de Docker ────────────────────────────────────────────────────────────
echo "📋 Truncando logs de contenedores Docker..."
sudo find /var/lib/docker/containers -name "*.log" -exec truncate -s 0 {} \;

# ── Logs del sistema ──────────────────────────────────────────────────────────
echo "📋 Reduciendo journal del sistema a 100 MB..."
sudo journalctl --vacuum-size=100M

# ── Temporales ────────────────────────────────────────────────────────────────
echo "🗑️  Eliminando archivos temporales (/tmp)..."
sudo rm -rf /tmp/*

# ── PDFs generados por la app ─────────────────────────────────────────────────
SAVED_DIR="$SCRIPT_DIR/../backend/saved"
if [ -d "$SAVED_DIR" ]; then
  PDF_COUNT=$(find "$SAVED_DIR" -name "*.pdf" | wc -l)
  echo "📄 Eliminando $PDF_COUNT PDFs en backend/saved/ (los JSON se conservan)..."
  find "$SAVED_DIR" -name "*.pdf" -delete
else
  echo "📄 backend/saved/ no encontrado, omitiendo."
fi

echo ""
echo "📊 Espacio después de limpiar:"
df -h /
echo ""
echo "✅ Limpieza completada."
echo ""

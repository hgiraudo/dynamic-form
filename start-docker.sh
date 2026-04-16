#!/bin/bash

# Script para levantar la aplicación con Docker + Nginx
# Uso: ./start-docker.sh [--build]
#   --build  Fuerza rebuild de las imágenes

set -e

echo "🐳 Iniciando aplicación con Docker..."

# Verificar que Docker esté disponible
if ! command -v docker &> /dev/null; then
    echo "❌ ERROR: Docker no está instalado"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ ERROR: El daemon de Docker no está corriendo"
    exit 1
fi

# Parsear argumentos
BUILD_FLAG=""
if [[ "$1" == "--build" ]]; then
    BUILD_FLAG="--build"
    echo "🔨 Se forzará rebuild de las imágenes"
fi

# Detener contenedores existentes si los hay
echo "🛑 Deteniendo contenedores existentes (si los hay)..."
docker compose down 2>/dev/null || true

# Levantar servicios
echo "🚀 Levantando servicios (nginx + frontend + backend)..."
docker compose up -d $BUILD_FLAG

# Esperar a que el backend esté listo
echo "⏳ Esperando que el backend esté listo..."
for i in {1..30}; do
    if curl -s http://localhost/api/health > /dev/null 2>&1; then
        echo "✅ Backend listo"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  El backend tardó más de lo esperado. Revisá los logs:"
        echo "   docker compose logs backend"
    fi
    sleep 1
done

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ APLICACIÓN INICIADA"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "🌐 URL: http://localhost"
echo "🔌 API: http://localhost/api/health"
echo ""
echo "📝 Ver logs:"
echo "   docker compose logs -f"
echo "   docker compose logs -f backend"
echo "   docker compose logs -f frontend"
echo ""
echo "🛑 Para detener:"
echo "   ./stop-docker.sh"
echo ""

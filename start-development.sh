#!/bin/bash

# Script para levantar backend + frontend en modo DESARROLLO y abrir el navegador
# Uso: ./start-development.sh

set -e  # Salir si hay error

echo "🚀 Iniciando aplicación en modo DESARROLLO..."
echo "⚙️  Usando configuración centralizada de shared/config.general.js"
echo ""

# Leer configuración desde shared/config.general.js
eval $(node shared/get-config.js)

# Obtener las IPs de la instancia de Amazon EC2 usando IMDSv2
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || echo "")

if [ -n "$TOKEN" ]; then
    INTERNAL_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
        http://169.254.169.254/latest/meta-data/local-ipv4 || echo "")
    PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
        http://169.254.169.254/latest/meta-data/public-ipv4 || echo "")
else
    INTERNAL_IP=""
    PUBLIC_IP=""
fi

# Detectar si estamos en EC2 o desarrollo local
if [ -z "$INTERNAL_IP" ]; then
    # Desarrollo local
    INTERNAL_IP="0.0.0.0"
    BACKEND_URL="localhost"
    FRONTEND_URL="localhost"
else
    # EC2
    BACKEND_URL="$PUBLIC_IP"
    FRONTEND_URL="$PUBLIC_IP"
fi

echo "📍 Configuración detectada:"
echo "   Backend: http://$INTERNAL_IP:$BACKEND_PORT"
echo "   Frontend: http://$FRONTEND_URL:$FRONTEND_PORT"
echo "   Backend URL para frontend: http://$BACKEND_URL:$BACKEND_PORT"
echo ""

# ============================================================
# 1. INICIAR BACKEND
# ============================================================
echo "🔧 [1/3] Iniciando backend..."
cd backend

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias del backend..."
    npm install
fi

# Crear/actualizar .env para backend
if [ ! -f ".env" ]; then
    echo "⚙️ Creando archivo .env para backend..."
    cat > .env << EOF
# Backend Environment Variables
PORT=$BACKEND_PORT
HOST=$INTERNAL_IP
NODE_ENV=development
ONESPAN_API_KEY=your_onespan_api_key_here
EOF
    echo "⚠️  IMPORTANTE: Configura ONESPAN_API_KEY en backend/.env"
fi

# Verificar Python y pdfrw
if ! command -v python &> /dev/null; then
    echo "❌ ERROR: Python no está instalado"
    exit 1
fi

if ! python -c "import pdfrw" 2>/dev/null; then
    echo "⚠️  Instalando pdfrw..."
    pip install pdfrw
fi

# Iniciar backend en segundo plano
echo "🏃 Iniciando servidor backend con nodemon..."
export HOST=$INTERNAL_IP
export PORT=$BACKEND_PORT
export NODE_ENV=development
npm run dev > ../logs/backend-dev.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend iniciado (PID: $BACKEND_PID)"
echo ""

cd ..

# ============================================================
# 2. INICIAR FRONTEND
# ============================================================
echo "🌐 [2/3] Iniciando frontend..."
cd frontend

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias del frontend..."
    npm install
fi

# Crear/actualizar .env para frontend
echo "⚙️ Creando/actualizando archivo .env para frontend..."
cat > .env << EOF
# Frontend Environment Variables
PORT=$FRONTEND_PORT
HOST=0.0.0.0
VITE_BACKEND_URL=http://$BACKEND_URL:$BACKEND_PORT
EOF

# Iniciar frontend en segundo plano
echo "🏃 Iniciando servidor frontend con Vite..."
export HOST=0.0.0.0
export PORT=$FRONTEND_PORT
export VITE_BACKEND_URL=http://$BACKEND_URL:$BACKEND_PORT
npm run dev -- --host 0.0.0.0 --port $FRONTEND_PORT > ../logs/frontend-dev.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend iniciado (PID: $FRONTEND_PID)"
echo ""

cd ..

# Guardar PIDs
mkdir -p logs
echo $BACKEND_PID > logs/backend-dev.pid
echo $FRONTEND_PID > logs/frontend-dev.pid

# ============================================================
# 3. ESPERAR Y ABRIR NAVEGADOR
# ============================================================
echo "⏳ [3/3] Esperando que los servicios estén listos..."

# Esperar a que el backend esté listo
echo "   Esperando backend..."
for i in {1..30}; do
    if curl -s http://localhost:$BACKEND_PORT/api/health > /dev/null 2>&1; then
        echo "   ✅ Backend listo"
        break
    fi
    sleep 1
done

# Esperar a que el frontend esté listo (Vite suele tardar un poco)
echo "   Esperando frontend..."
sleep 3

# Detectar el navegador y abrir
FRONTEND_FULL_URL="http://$FRONTEND_URL:$FRONTEND_PORT"
echo ""
echo "🌍 Abriendo navegador en: $FRONTEND_FULL_URL"
echo ""

# Función para abrir el navegador según el sistema operativo
open_browser() {
    local url=$1

    # Detectar sistema operativo
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux (incluyendo EC2)
        if command -v xdg-open &> /dev/null; then
            xdg-open "$url" &> /dev/null &
        elif command -v gnome-open &> /dev/null; then
            gnome-open "$url" &> /dev/null &
        elif command -v firefox &> /dev/null; then
            firefox "$url" &> /dev/null &
        elif command -v google-chrome &> /dev/null; then
            google-chrome "$url" &> /dev/null &
        else
            echo "⚠️  No se pudo detectar un navegador. Abre manualmente: $url"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "$url"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        # Windows (Git Bash, Cygwin, etc.)
        start "$url" || cmd.exe /c start "$url"
    else
        echo "⚠️  Sistema operativo no reconocido. Abre manualmente: $url"
    fi
}

open_browser "$FRONTEND_FULL_URL"

# ============================================================
# INFORMACIÓN FINAL
# ============================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Aplicación iniciada correctamente"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Estado de servicios:"
echo "   Backend  (PID $BACKEND_PID):  http://localhost:$BACKEND_PORT"
echo "   Frontend (PID $FRONTEND_PID): $FRONTEND_FULL_URL"
echo ""
echo "📝 Logs disponibles en:"
echo "   Backend:  tail -f logs/backend-dev.log"
echo "   Frontend: tail -f logs/frontend-dev.log"
echo ""
echo "⛔ Para detener los servicios:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo "   o usa: pkill -f 'node.*nodemon' && pkill -f 'node.*vite'"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Presiona Ctrl+C para mantener los servicios corriendo en segundo plano"
echo "   y volver a la terminal"
echo ""

# Mantener el script corriendo para mostrar logs en tiempo real
tail -f logs/backend-dev.log logs/frontend-dev.log

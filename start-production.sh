#!/bin/bash

# Script para detener todos los procesos y levantar frontend y backend en producción
# Los procesos correrán en background y sobrevivirán al cierre de sesión SSH

set -e

echo "🚀 Iniciando aplicación en modo PRODUCCIÓN..."
echo "⚙️  Usando configuración centralizada de shared/config.general.js"

# Leer configuración desde shared/config.general.js
eval $(node shared/get-config.js)

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  PASO 1: Deteniendo procesos existentes"
echo "═══════════════════════════════════════════════════════════"

# Función para matar procesos en un puerto específico
kill_port() {
    local port=$1
    local pids=$(lsof -ti:$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "🔪 Matando procesos en puerto $port: $pids"
        kill -9 $pids 2>/dev/null || true
        sleep 1
    else
        echo "✅ Puerto $port está libre"
    fi
}

# Matar procesos en los puertos del backend y frontend
kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

# Matar procesos node/npm que contengan "vite" o "nodemon" en el nombre
echo "🔪 Buscando procesos node/npm relacionados con la aplicación..."
pkill -f "vite" 2>/dev/null || true
pkill -f "nodemon" 2>/dev/null || true
sleep 2

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  PASO 2: Iniciando BACKEND en modo producción"
echo "═══════════════════════════════════════════════════════════"

# Obtener IP de EC2 usando IMDSv2
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || echo "")

if [ -n "$TOKEN" ]; then
    INTERNAL_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
        http://169.254.169.254/latest/meta-data/local-ipv4 || echo "")
else
    INTERNAL_IP=""
fi

# Detectar si estamos en EC2 o desarrollo local
if [ -z "$INTERNAL_IP" ]; then
    INTERNAL_IP="0.0.0.0"
fi

# Configurar backend
export HOST=${HOST:-$INTERNAL_IP}
export PORT=$BACKEND_PORT
export NODE_ENV=production

cd backend

# Verificar dependencias
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias del backend..."
    npm ci --production
fi

# Crear .env si no existe
if [ ! -f ".env" ]; then
    echo "⚙️ Creando archivo .env del backend..."
    cat > .env << EOF
# Backend Environment Variables
PORT=$PORT
HOST=$HOST
NODE_ENV=production
EOF
    echo "✅ Archivo .env del backend creado"
fi

# Verificar Python y pdfrw
if ! command -v python &> /dev/null; then
    echo "❌ ERROR: Python no está instalado"
    exit 1
fi

if ! python -c "import pdfrw" 2>/dev/null; then
    echo "⚠️  Advertencia: pdfrw no está instalado. Instalando..."
    pip install pdfrw
fi

# Iniciar backend con nohup
echo "🏃 Iniciando backend en background..."
echo "📍 HOST: $HOST"
echo "🔌 PORT: $PORT"
nohup npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > ../logs/backend.pid
echo "✅ Backend iniciado con PID: $BACKEND_PID"
echo "📝 Logs en: logs/backend.log"

cd ..

# Esperar a que el backend esté listo
echo "⏳ Esperando a que el backend esté listo..."
sleep 5

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  PASO 3: Iniciando FRONTEND en modo producción"
echo "═══════════════════════════════════════════════════════════"

# Obtener IP pública para el frontend
if [ -n "$TOKEN" ]; then
    PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
        http://169.254.169.254/latest/meta-data/public-ipv4 || echo "")
else
    PUBLIC_IP=""
fi

if [ -z "$PUBLIC_IP" ]; then
    BACKEND_URL="localhost"
else
    BACKEND_URL="$PUBLIC_IP"
fi

# Configurar frontend
export HOST=${FRONTEND_HOST:-0.0.0.0}
export PORT=$FRONTEND_PORT
export VITE_BACKEND_URL="http://$BACKEND_URL:$BACKEND_PORT"

cd frontend

# Verificar dependencias
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias del frontend..."
    npm ci --production
fi

# Crear .env solo si no existe
if [ ! -f ".env" ]; then
    echo "⚙️ Creando archivo .env del frontend..."
    cat > .env << EOF
# Frontend Environment Variables
PORT=$PORT
HOST=$HOST
VITE_BACKEND_URL=$VITE_BACKEND_URL
VITE_ONESPAN_API_KEY=your_onespan_api_key_here
EOF
    echo "⚠️  IMPORTANTE: Configura VITE_ONESPAN_API_KEY en frontend/.env"
else
    echo "✅ Archivo .env del frontend ya existe, no se sobrescribirá"
    echo "ℹ️  Para aplicar cambios de VITE_BACKEND_URL, edita manualmente frontend/.env"
fi

# Limpiar caché
if [ -d "node_modules/.vite" ]; then
    echo "🧹 Limpiando caché de Vite..."
    rm -rf node_modules/.vite
fi

# IMPORTANTE: En producción, las variables VITE_* se embeben durante el build
# Por lo tanto, debemos hacer rebuild cada vez que cambia VITE_BACKEND_URL
echo "📦 Generando build de producción con VITE_BACKEND_URL=$VITE_BACKEND_URL..."
rm -rf dist
npm run build

# Iniciar frontend con nohup
echo "🏃 Iniciando frontend en background..."
echo "📍 Frontend HOST: $HOST"
echo "🔌 Frontend PORT: $PORT"
echo "🔗 Backend URL: $VITE_BACKEND_URL"
nohup npm run preview -- --host $HOST --port $PORT > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../logs/frontend.pid
echo "✅ Frontend iniciado con PID: $FRONTEND_PID"
echo "📝 Logs en: logs/frontend.log"

cd ..

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ APLICACIÓN INICIADA EXITOSAMENTE"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📊 Estado de los servicios:"
echo "  • Backend PID: $BACKEND_PID (Puerto $BACKEND_PORT)"
echo "  • Frontend PID: $FRONTEND_PID (Puerto $FRONTEND_PORT)"
echo ""
echo "🌐 URLs de acceso:"
if [ -n "$PUBLIC_IP" ]; then
    echo "  • Frontend: http://$PUBLIC_IP:$FRONTEND_PORT"
    echo "  • Backend:  http://$PUBLIC_IP:$BACKEND_PORT"
else
    echo "  • Frontend: http://localhost:$FRONTEND_PORT"
    echo "  • Backend:  http://localhost:$BACKEND_PORT"
fi
echo ""
echo "📝 Archivos de logs:"
echo "  • Backend:  logs/backend.log"
echo "  • Frontend: logs/frontend.log"
echo ""
echo "🛑 Para detener los servicios, ejecuta:"
echo "   ./stop-production.sh"
echo ""
echo "📊 Para ver los logs en tiempo real:"
echo "   tail -f logs/backend.log"
echo "   tail -f logs/frontend.log"
echo ""
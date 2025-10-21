#!/bin/bash

# Script para levantar el frontend en modo DESARROLLO
# Configurado para Amazon EC2

set -e  # Salir si hay error

echo "🌐 Iniciando frontend en modo DESARROLLO..."
echo "⚙️  Usando configuración centralizada de shared/config.general.js"

# Leer configuración desde shared/config.general.js
eval $(node shared/get-config.js)

# Obtener las IPs de la instancia de Amazon EC2 usando IMDSv2
TOKEN=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || echo "")

if [ -n "$TOKEN" ]; then
    # IP pública para que el navegador del usuario pueda conectarse al backend
    PUBLIC_IP=$(curl -s -H "X-aws-ec2-metadata-token: $TOKEN" \
        http://169.254.169.254/latest/meta-data/public-ipv4 || echo "")
else
    PUBLIC_IP=""
fi

# Detectar si estamos en EC2 o desarrollo local
if [ -z "$PUBLIC_IP" ]; then
    # Desarrollo local - el navegador se conecta a localhost
    BACKEND_URL="localhost"
else
    # EC2 - el navegador necesita la IP pública
    BACKEND_URL="$PUBLIC_IP"
fi

# Configurar variables de entorno (usar valores de config.general.js)
export HOST=${FRONTEND_HOST:-0.0.0.0}
export PORT=$FRONTEND_PORT
export VITE_BACKEND_URL="http://$BACKEND_URL:$BACKEND_PORT"

echo "📍 Frontend HOST: $HOST"
echo "🔌 Frontend PORT: $PORT"
echo "🔗 Backend URL: $VITE_BACKEND_URL"
echo "🌐 Frontend será accesible en: http://$HOST:$PORT"
echo "🔄 Modo desarrollo con hot-reload"

# Cambiar al directorio del frontend
cd frontend

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Verificar si existe .env y crear uno con la IP de EC2
if [ ! -f ".env" ]; then
    echo "⚙️ Creando archivo .env con IP de EC2..."
    cat > .env << EOF
# Frontend Environment Variables
PORT=$PORT
HOST=$HOST
VITE_BACKEND_URL=$VITE_BACKEND_URL
VITE_ONESPAN_API_KEY=your_onespan_api_key_here
EOF
    echo "⚠️  IMPORTANTE: Configura VITE_ONESPAN_API_KEY en frontend/.env"
else
    # Actualizar VITE_BACKEND_URL en .env existente para usar IP de EC2
    echo "⚙️ Actualizando VITE_BACKEND_URL en .env..."
    if grep -q "VITE_BACKEND_URL" .env; then
        sed -i "s|VITE_BACKEND_URL=.*|VITE_BACKEND_URL=$VITE_BACKEND_URL|g" .env
    else
        echo "VITE_BACKEND_URL=$VITE_BACKEND_URL" >> .env
    fi
    # Agregar VITE_ONESPAN_API_KEY si no existe
    if ! grep -q "VITE_ONESPAN_API_KEY" .env; then
        echo "VITE_ONESPAN_API_KEY=your_onespan_api_key_here" >> .env
        echo "⚠️  IMPORTANTE: Configura VITE_ONESPAN_API_KEY en frontend/.env"
    fi
fi

# Iniciar el servidor de desarrollo con Vite
echo "🏃 Iniciando servidor de desarrollo con Vite..."
npm run dev -- --host $HOST --port $PORT
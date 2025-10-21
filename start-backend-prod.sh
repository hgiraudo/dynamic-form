#!/bin/bash

# Script para levantar el backend en modo PRODUCCIÓN
# Configurado para Amazon EC2

set -e  # Salir si hay error

echo "🚀 Iniciando backend en modo PRODUCCIÓN..."
echo "⚙️  Usando configuración centralizada de shared/config.general.js"

# Leer configuración desde shared/config.general.js
eval $(node shared/get-config.js)

# Obtener la IP interna de la instancia de Amazon EC2 usando IMDSv2
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
    # Desarrollo local
    INTERNAL_IP="0.0.0.0"
fi

# Configurar variables de entorno (usar valores de config.general.js)
export HOST=${HOST:-$INTERNAL_IP}
export PORT=$BACKEND_PORT
export NODE_ENV=production

echo "📍 HOST: $HOST"
echo "🔌 PORT: $PORT"
echo "🌐 Backend será accesible en: http://$HOST:$PORT"

# Cambiar al directorio del backend
cd backend

# Verificar si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm ci --production
fi

# Verificar si existe .env y crear uno básico si no existe
if [ ! -f ".env" ]; then
    echo "⚙️ Creando archivo .env básico..."
    cat > .env << EOF
# Backend Environment Variables
PORT=$PORT
HOST=$HOST
NODE_ENV=production
EOF
    echo "✅ Archivo .env del backend creado"
fi

# Verificar que Python esté disponible
if ! command -v python &> /dev/null; then
    echo "❌ ERROR: Python no está instalado"
    exit 1
fi

# Verificar que pdfrw esté instalado
if ! python -c "import pdfrw" 2>/dev/null; then
    echo "⚠️  Advertencia: pdfrw no está instalado. Instalando..."
    pip install pdfrw
fi

# Iniciar el servidor en modo producción
echo "🏃 Iniciando servidor en modo producción..."
npm start
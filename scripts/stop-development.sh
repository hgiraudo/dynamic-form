#!/bin/bash

# Script para detener los servicios de desarrollo

echo "🛑 Deteniendo servicios de desarrollo..."

# Función para detener un proceso por PID file
stop_service() {
    local name=$1
    local pid_file=$2

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "🔪 Deteniendo $name (PID: $pid)..."
            kill $pid 2>/dev/null || kill -9 $pid 2>/dev/null
            rm -f "$pid_file"
            echo "✅ $name detenido"
        else
            echo "⚠️  $name no está corriendo (PID: $pid no existe)"
            rm -f "$pid_file"
        fi
    else
        echo "⚠️  No se encontró archivo PID para $name"
    fi
}

# Verificar dependencias del sistema
source "$(dirname "$0")/lib/check-deps.sh"
require_node

# Leer configuración para obtener puertos
eval $(node shared/get-config.js)

# Detener servicios por PID
stop_service "Backend (dev)" "logs/backend-dev.pid"
stop_service "Frontend (dev)" "logs/frontend-dev.pid"

# Asegurar que los puertos estén libres y matar procesos nodemon/vite
echo ""
echo "🧹 Limpiando procesos de desarrollo y puertos..."

# Matar procesos nodemon y vite específicamente
echo "🔪 Deteniendo procesos nodemon..."
pkill -f 'node.*nodemon' 2>/dev/null && echo "✅ Nodemon detenido" || echo "⚠️  No se encontraron procesos nodemon"

echo "🔪 Deteniendo procesos vite..."
pkill -f 'node.*vite' 2>/dev/null && echo "✅ Vite detenido" || echo "⚠️  No se encontraron procesos vite"

# Función para liberar puerto
kill_port() {
    local port=$1

    # Detectar si estamos en Windows (CYGWIN/MINGW)
    if [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$(uname -s)" == CYGWIN* ]] || [[ "$(uname -s)" == MINGW* ]]; then
        # Windows: usar netstat y taskkill
        local pids=$(netstat -ano | findstr ":$port " | awk '{print $5}' | sort -u | grep -v "^0$" || true)
        if [ -n "$pids" ]; then
            echo "🔪 Matando procesos residuales en puerto $port: $pids"
            for pid in $pids; do
                taskkill //PID $pid //F 2>/dev/null || true
            done
        else
            echo "✅ Puerto $port está libre"
        fi
    else
        # Linux/Mac: usar lsof
        local pids=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "🔪 Matando procesos residuales en puerto $port: $pids"
            kill -9 $pids 2>/dev/null || true
        else
            echo "✅ Puerto $port está libre"
        fi
    fi
}

kill_port $BACKEND_PORT
kill_port $FRONTEND_PORT

echo ""
echo "✅ Todos los servicios de desarrollo han sido detenidos"

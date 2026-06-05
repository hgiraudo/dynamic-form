#!/bin/bash
# Verificación de dependencias del sistema
# Uso: source lib/check-deps.sh

_pkg_manager() {
    if command -v apt-get &>/dev/null; then echo "apt"
    elif command -v dnf &>/dev/null; then echo "dnf"
    elif command -v yum &>/dev/null; then echo "yum"
    elif command -v brew &>/dev/null; then echo "brew"
    else echo "unknown"; fi
}

_node_hint() {
    case "$(_pkg_manager)" in
        apt)     echo "   sudo apt-get install -y nodejs npm" ;;
        dnf|yum) echo "   sudo dnf install -y nodejs npm" ;;
        brew)    echo "   brew install node" ;;
        *)       echo "   Descargá el instalador: https://nodejs.org" ;;
    esac
}

_python_hint() {
    case "$(_pkg_manager)" in
        apt)     echo "   sudo apt-get install -y python3 python3-pip" ;;
        dnf|yum) echo "   sudo dnf install -y python3 python3-pip" ;;
        brew)    echo "   brew install python3" ;;
        *)       echo "   Descargá el instalador: https://www.python.org" ;;
    esac
}

require_node() {
    if ! command -v node &>/dev/null; then
        echo "❌ ERROR: 'node' no está instalado"
        echo "   Instalá Node.js con:"
        _node_hint
        exit 1
    fi
    if ! command -v npm &>/dev/null; then
        echo "❌ ERROR: 'npm' no está instalado"
        echo "   npm se instala junto con Node.js:"
        _node_hint
        exit 1
    fi
    local node_major
    node_major=$(node -e "process.stdout.write(String(process.versions.node.split('.')[0]))")
    if [ "$node_major" -lt 20 ]; then
        echo "❌ ERROR: Node.js $(node --version) es demasiado viejo (se requiere >= 20)"
        echo ""
        echo "   Opciones para actualizar:"
        echo ""
        echo "   1. nvm (recomendado):"
        echo "      curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
        echo "      source ~/.bashrc   # o abrir una terminal nueva"
        echo "      nvm install 20 && nvm use 20"
        echo ""
        case "$(_pkg_manager)" in
            apt)
                echo "   2. NodeSource (instala en el sistema):"
                echo "      curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
                echo "      sudo apt-get install -y nodejs"
                ;;
            dnf|yum)
                echo "   2. NodeSource (instala en el sistema):"
                echo "      curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -"
                echo "      sudo dnf install -y nodejs"
                ;;
        esac
        exit 1
    fi
}

require_python() {
    # Probar cada candidato de forma funcional (ejecutándolo), no solo con
    # 'command -v'. En Windows, 'python'/'python3' suelen resolver a los stubs
    # de alias de ejecución de la Microsoft Store, que no son intérpretes reales:
    # solo imprimen un mensaje y salen con error. El chequeo funcional los descarta.
    local _cmd
    for _cmd in python3 python py python3.13 python3.12 python3.11 python3.10; do
        if command -v "$_cmd" &>/dev/null && "$_cmd" -c "import sys" &>/dev/null; then
            PYTHON_CMD="$_cmd"
            export PYTHON_CMD
            return 0
        fi
    done
    echo "❌ ERROR: Python no está instalado o no es funcional"
    echo "   (en Windows, deshabilitá los alias de ejecución de 'python'/'python3'"
    echo "    en Configuración › Aplicaciones › Alias de ejecución de aplicaciones,"
    echo "    o instalá Python desde https://www.python.org)"
    echo "   Instalá Python con:"
    _python_hint
    exit 1
}

_install_pdfrw() {
    # En Ubuntu/Debian modernos pip está restringido; preferir apt si está disponible
    if [[ "$(_pkg_manager)" == "apt" ]]; then
        if sudo apt-get install -y python3-pdfrw 2>/dev/null; then
            return 0
        fi
    fi

    # Otros sistemas o fallback: intentar pip normal
    local pip_cmd=""
    command -v pip3 &>/dev/null && pip_cmd="pip3"
    command -v pip  &>/dev/null && pip_cmd="${pip_cmd:-pip}"

    if [ -z "$pip_cmd" ]; then
        echo "❌ ERROR: 'pip' no está instalado"
        echo "   Instalá pip con:"
        _python_hint
        exit 1
    fi

    if $pip_cmd install pdfrw 2>/dev/null; then
        return 0
    fi

    # pip bloqueado por entorno administrado externamente (PEP 668); reintentar con flag
    echo "⚠️  pip bloqueado por el sistema. Reintentando con --break-system-packages..."
    if $pip_cmd install --break-system-packages pdfrw; then
        return 0
    fi

    echo "❌ ERROR: No se pudo instalar pdfrw automáticamente"
    echo "   Opciones para instalar manualmente:"
    echo "   1. sudo apt-get install -y python3-pdfrw"
    echo "   2. pip3 install --break-system-packages pdfrw"
    echo "   3. python3 -m venv venv && source venv/bin/activate && pip install pdfrw"
    exit 1
}

require_pdfrw() {
    require_python
    # Check with the detected Python first, then try alternatives
    # (pdfrw may be installed in a different interpreter than the one found first)
    if ! "$PYTHON_CMD" -c "import pdfrw" 2>/dev/null; then
        for _alt in python python3 python3.13 python3.12 python3.11 python3.10; do
            if command -v "$_alt" &>/dev/null && "$_alt" -c "import pdfrw" 2>/dev/null; then
                PYTHON_CMD="$_alt"
                export PYTHON_CMD
                return 0
            fi
        done
        echo "⚠️  'pdfrw' no está instalado. Instalando..."
        _install_pdfrw
    fi
}

require_docker() {
    if ! command -v docker &>/dev/null; then
        echo "❌ ERROR: 'docker' no está instalado"
        echo "   Ejecutá ./setup-aws.sh para instalarlo automáticamente"
        echo "   O instalá manualmente: https://docs.docker.com/get-docker/"
        exit 1
    fi
    if ! docker info &>/dev/null 2>&1; then
        echo "❌ ERROR: El daemon de Docker no está corriendo"
        echo "   Inicialo con: sudo systemctl start docker"
        exit 1
    fi
}

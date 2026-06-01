#!/bin/bash

# =============================================================
#  setup-aws.sh — Preparar instancia AWS EC2 para ejecutar
#  la aplicación con Docker + Nginx
#
#  Compatible con:
#    - Amazon Linux 2
#    - Amazon Linux 2023
#    - Ubuntu 22.04 / 24.04
#
#  Uso:
#    chmod +x setup-aws.sh
#    ./setup-aws.sh
# =============================================================

set -e

# ── Colores ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✅ $1${NC}"; }
info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $1${NC}"; }
err()  { echo -e "${RED}❌ $1${NC}"; exit 1; }

# ── Detectar OS ──────────────────────────────────────────────
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo "$ID $VERSION_ID"
    else
        err "No se pudo detectar el sistema operativo"
    fi
}

read OS_ID OS_VERSION <<< $(detect_os)

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🐳 Setup AWS EC2 — Docker + Docker Compose"
echo "═══════════════════════════════════════════════════════════"
echo ""
info "Sistema detectado: $OS_ID $OS_VERSION"
info "Usuario actual:    $USER"
echo ""

# ── Verificar si Docker ya está instalado ────────────────────
if command -v docker &> /dev/null; then
    DOCKER_VER=$(docker --version)
    ok "Docker ya está instalado: $DOCKER_VER"
    SKIP_DOCKER=true
else
    SKIP_DOCKER=false
fi

# ── Instalar Docker ──────────────────────────────────────────
if [ "$SKIP_DOCKER" = false ]; then
    echo ""
    echo "── Instalando Docker ───────────────────────────────────────"

    case "$OS_ID" in

      amzn)
        if [[ "$OS_VERSION" == "2" ]]; then
            # Amazon Linux 2
            info "Usando Amazon Linux 2..."
            sudo yum update -y
            sudo amazon-linux-extras install docker -y 2>/dev/null || sudo yum install -y docker
        else
            # Amazon Linux 2023
            info "Usando Amazon Linux 2023..."
            sudo dnf update -y
            sudo dnf install -y docker
        fi
        ;;

      ubuntu|debian)
        info "Usando Ubuntu/Debian..."
        sudo apt-get update -y
        sudo apt-get install -y ca-certificates curl gnupg lsb-release

        # Agregar clave GPG oficial de Docker
        sudo install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/${OS_ID}/gpg \
            | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg

        # Agregar repositorio
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
          https://download.docker.com/linux/${OS_ID} \
          $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
          | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

        sudo apt-get update -y
        sudo apt-get install -y \
            docker-ce docker-ce-cli containerd.io \
            docker-buildx-plugin docker-compose-plugin
        ;;

      *)
        err "Sistema operativo no soportado: $OS_ID. Soportados: Amazon Linux 2/2023, Ubuntu, Debian"
        ;;

    esac

    ok "Docker instalado"
fi

# ── Iniciar y habilitar servicio Docker ──────────────────────
echo ""
echo "── Configurando servicio Docker ────────────────────────────"

sudo systemctl start docker
sudo systemctl enable docker
ok "Docker service activo y habilitado en el arranque"

# ── Instalar Docker Compose plugin (si no está) ──────────────
echo ""
echo "── Verificando Docker Compose ──────────────────────────────"

if docker compose version &> /dev/null; then
    COMPOSE_VER=$(docker compose version)
    ok "Docker Compose ya disponible: $COMPOSE_VER"
else
    info "Instalando Docker Compose plugin..."

    # Obtener última versión disponible
    COMPOSE_VERSION=$(curl -fsSL \
        https://api.github.com/repos/docker/compose/releases/latest \
        | grep '"tag_name"' | cut -d'"' -f4)

    if [ -z "$COMPOSE_VERSION" ]; then
        # Fallback a una versión conocida si la API falla
        COMPOSE_VERSION="v2.27.0"
        warn "No se pudo consultar la API de GitHub. Usando versión $COMPOSE_VERSION"
    fi

    info "Versión a instalar: $COMPOSE_VERSION"

    sudo mkdir -p /usr/local/lib/docker/cli-plugins
    sudo curl -SL \
        "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-linux-x86_64" \
        -o /usr/local/lib/docker/cli-plugins/docker-compose
    sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

    ok "Docker Compose $COMPOSE_VERSION instalado"
fi

# ── Agregar usuario al grupo docker ─────────────────────────
echo ""
echo "── Permisos de usuario ─────────────────────────────────────"

if groups "$USER" | grep -q docker; then
    ok "Usuario '$USER' ya está en el grupo docker"
else
    sudo usermod -aG docker "$USER"
    ok "Usuario '$USER' agregado al grupo docker"
    NEEDS_RELOGIN=true
fi

# ── Instalar git (para clonar el repo si hace falta) ─────────
echo ""
echo "── Verificando git ─────────────────────────────────────────"

if command -v git &> /dev/null; then
    ok "git ya está instalado: $(git --version)"
else
    case "$OS_ID" in
      amzn)
        [[ "$OS_VERSION" == "2" ]] && sudo yum install -y git || sudo dnf install -y git ;;
      ubuntu|debian)
        sudo apt-get install -y git ;;
    esac
    ok "git instalado"
fi

# ── Verificación final ───────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  VERIFICACIÓN"
echo "═══════════════════════════════════════════════════════════"

docker --version        && ok "docker    OK" || warn "docker    FALLO"
docker compose version  && ok "compose   OK" || warn "compose   FALLO"
git --version           && ok "git       OK" || warn "git       FALLO"

# ── Instrucciones finales ────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅ SETUP COMPLETO"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ "${NEEDS_RELOGIN:-false}" = true ]; then
    echo -e "${YELLOW}⚠️  IMPORTANTE: Para usar Docker sin sudo debes cerrar sesión"
    echo -e "   y volver a conectarte por SSH. Luego continuá con:${NC}"
    echo ""
else
    echo "Continuá con:"
    echo ""
fi

echo "  # Subir el código al servidor (desde tu máquina local):"
echo "  scp -r . ec2-user@<IP>:~/smart-forms/"
echo ""
echo "  # O clonar desde git:"
echo "  git clone <URL_REPO> ~/smart-forms && cd ~/smart-forms"
echo ""
echo "  # Levantar la aplicación:"
echo "  ./start-docker.sh --build"
echo ""
echo "  # Ver logs:"
echo "  docker compose logs -f"
echo ""

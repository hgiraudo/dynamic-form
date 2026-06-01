#!/bin/bash
# deploy.sh — Pull latest code and rebuild Docker containers
set -e

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Deploy — git pull + docker compose up --build"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "📥 Pulling latest changes..."
git pull origin main

echo ""
echo "🗑️  Liberando espacio en disco..."
bash "$(dirname "$0")/cleanup.sh"

echo ""
echo "🐳 Rebuilding and restarting containers..."
docker compose down
docker compose up -d --build

echo ""
echo "✅ Deploy completado."
echo ""
echo "  Logs en tiempo real:"
echo "    docker compose logs -f"
echo ""

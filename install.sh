#!/usr/bin/env bash
# install.sh — Claw-Omni-OS Full Installation Wizard
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}"
echo "  ██████╗██╗      █████╗ ██╗    ██╗"
echo " ██╔════╝██║     ██╔══██╗██║    ██║"
echo " ██║     ██║     ███████║██║ █╗ ██║"
echo " ██║     ██║     ██╔══██║██║███╗██║"
echo " ╚██████╗███████╗██║  ██║╚███╔███╔╝"
echo "  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝"
echo -e " Claw-Omni-OS » Installation Wizard${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Step 0: Pre-Flight ─────────────────────────────────────────
echo -e "${BOLD}[0/5] Pre-Flight Check${NC}"
if [ -f "./check-env.sh" ]; then
  bash ./check-env.sh || true  # non-fatal, just warn
fi
echo ""

# ── Step 1: Docker ─────────────────────────────────────────────
echo -e "${BOLD}[1/5] Verifying Docker${NC}"
if ! command -v docker &>/dev/null; then
  echo -e "  ${RED}✗${NC} Docker not found. Install from https://docker.com"
  exit 1
fi
echo -e "  ${GREEN}✓${NC} Docker: $(docker --version)"
echo ""

# ── Step 2: GPU Detection ──────────────────────────────────────
echo -e "${BOLD}[2/5] GPU Detection${NC}"
./scripts/gpu-check.sh > gpu_output.txt
if grep -q "HAS_GPU=true" gpu_output.txt; then
  HAS_GPU=true
  GPU_COUNT=1
else
  HAS_GPU=false
  GPU_COUNT=0
fi
rm gpu_output.txt
echo ""

# ── Step 3: Ollama & .env Setup ────────────────────────────────
echo -e "${BOLD}[3/5] Ollama & Environment Setup${NC}"
# Run autonomous manager for discovery and model sync
./scripts/ollama-manager.sh

# Load discovered URL
if [ -f .ollama_discovery ]; then
  OLL_URL=$(grep OLLAMA_BASE_URL .ollama_discovery | cut -d'=' -f2)
  rm .ollama_discovery
else
  # Linux-specific definitive host IP detection for Docker
  HOST_IP=$(ip -4 addr show docker0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n1 || ip route | grep default | awk '{print $3}' | head -n1)
  if [ -n "$HOST_IP" ]; then
    OLL_URL="http://${HOST_IP}:11434"
    echo -e "  ${CYAN}ℹ${NC} Detected host gateway at ${BOLD}${HOST_IP}${NC}. Using for Ollama."
  else
    OLL_URL="http://host.docker.internal:11434"
  fi
fi

if [ ! -f .env ]; then
  echo -e "  ${YELLOW}→${NC}  Creating .env (press Enter to skip optional fields)"
  read -p "  Telegram Bot Token (optional): " TG_TOKEN
  read -p "  Serper.dev API Key (optional): " SERPER_KEY
  
  cat <<EOF > .env
PROJECT_NAME=Megabot-Consolidated
DOMAIN=localhost
TELEGRAM_BOT_TOKEN=${TG_TOKEN}
SERPER_API_KEY=${SERPER_KEY}
OPENAI_API_KEY=sk-placeholder-since-we-use-ollama
OLLAMA_BASE_URL=${OLL_URL}
REDIS_URL=redis://claw-redis:6379/0
POSTGRES_USER=claw
POSTGRES_PASSWORD=claw_password
POSTGRES_DB=claw_db
HAS_GPU=${HAS_GPU}
GPU_COUNT=${GPU_COUNT}
PORT=3000
OPENAI_API_KEY=sk-placeholder-since-we-use-ollama
EOF

  # ── Step 3.5: Dynamic GPU Override ──────────────────────────
  if [ "$HAS_GPU" = "true" ]; then
    echo -e "  ${YELLOW}→${NC}  Generating docker-compose.override.yml for GPU support"
    cat <<EOF > docker-compose.override.yml
services:
  claw-multimodal:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: ${GPU_COUNT}
              capabilities: [gpu]
EOF
  else
    echo -e "  ${YELLOW}→${NC}  CPU Mode detected — ensuring no GPU reservations"
    rm -f docker-compose.override.yml
  fi
  echo -e "  ${GREEN}✓${NC} .env created with Ollama at ${OLL_URL}"
else
  echo -e "  ${GREEN}✓${NC} .env already exists — skipping creation"
  if ! grep -q "OPENAI_API_KEY" .env; then
    echo "OPENAI_API_KEY=sk-placeholder-since-we-use-ollama" >> .env
  fi
fi
echo ""

# ── Step 4: Frontend Build ─────────────────────────────────────
echo -e "${BOLD}[4/5] Frontend Build (Inside Docker)${NC}"
echo -e "  → Skyping local host build (handled by Dockerfile)"
echo ""

# ── Step 5: Docker Compose Up ─────────────────────────────────
echo -e "${BOLD}[5/5] Launching Containers${NC}"
echo -e "  → docker compose up --build -d"
docker compose up --build -d

echo ""
echo -e "${GREEN}${BOLD}═══════════════════════════════════════"
echo -e "  ✅  Claw-Omni-OS is now LIVE!"
echo -e "═══════════════════════════════════════${NC}"
echo -e "  Dashboard   : ${CYAN}http://localhost:3000${NC}"
echo -e "  Core Engine : ${CYAN}http://localhost:8000${NC}"
echo -e "  Health Check: ${CYAN}http://localhost:8000/api/health-check${NC}"
echo ""

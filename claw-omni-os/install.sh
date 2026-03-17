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
if command -v nvidia-smi &>/dev/null; then
  GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -n1)
  echo -e "  ${GREEN}✓${NC} Detected: ${GPU_NAME} — Hardware Acceleration ENABLED"
  HAS_GPU=true
else
  echo -e "  ${YELLOW}⚠${NC}  No NVIDIA GPU detected — CPU fallback mode"
  HAS_GPU=false
fi
echo ""

# ── Step 3: .env Setup ─────────────────────────────────────────
echo -e "${BOLD}[3/5] Environment Configuration${NC}"
if [ ! -f .env ]; then
  echo -e "  ${YELLOW}→${NC}  Creating .env (press Enter to skip optional fields)"
  read -p "  Telegram Bot Token (optional): " TG_TOKEN
  read -p "  Serper.dev API Key (optional): " SERPER_KEY
  read -p "  Ollama URL [http://host.docker.internal:11434]: " OLL_URL
  OLL_URL="${OLL_URL:-http://host.docker.internal:11434}"
  
  cat <<EOF > .env
TELEGRAM_BOT_TOKEN=${TG_TOKEN}
SERPER_API_KEY=${SERPER_KEY}
OLLAMA_BASE_URL=${OLL_URL}
REDIS_URL=redis://claw-redis:6379/0
EOF
  echo -e "  ${GREEN}✓${NC} .env created"
else
  echo -e "  ${GREEN}✓${NC} .env already exists — skipping"
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

#!/usr/bin/env bash
# check-env.sh — Claw-Omni-OS pre-flight validator
# Runs BEFORE docker compose up to verify host dependencies.

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
echo "  ╚═════╝╚══════╝╚═╝  ╚═╝ ╚══╝╚══╝ "
echo -e " Claw-Omni-OS » Pre-Flight Check${NC}"
echo ""

PASS=true

check_command() {
  local cmd=$1
  local label=$2
  if command -v "$cmd" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $label found"
  else
    echo -e "  ${RED}✗${NC} $label not found — install it first!"
    PASS=false
  fi
}

# ── 1. Core Tools ─────────────────────────────────────────────
echo -e "${BOLD}[1/3] Core Tools${NC}"
check_command docker "Docker"

if command -v docker-compose &>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Docker Compose (standalone) found"
elif docker compose version &>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Docker Compose (plugin) found"
else
  echo -e "  ${RED}✗${NC} Docker Compose not found — install it first!"
  PASS=false
fi

check_command git "Git"
echo ""

# ── 2. Ollama Connectivity ───────────────────────────────────
echo -e "${BOLD}[2/3] Ollama Discovery${NC}"
OLLAMA_FOUND=false
for host in "http://localhost:11434" "http://host.docker.internal:11434" "http://127.0.0.1:11434"; do
  if curl -sf --max-time 2 "${host}/api/tags" > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓${NC} Ollama reachable at ${host}"
    OLLAMA_FOUND=true
    break
  fi
done

if [ "$OLLAMA_FOUND" = false ]; then
  echo -e "  ${YELLOW}⚠${NC}  Ollama NOT reachable on port 11434"
  echo -e "     → Start Ollama on host: ${CYAN}ollama serve${NC}"
  echo -e "     → System will still start but LLM calls will fail"
fi
echo ""

# ── 3. GPU Detection ──────────────────────────────────────────
echo -e "${BOLD}[3/3] GPU Detection${NC}"
if command -v nvidia-smi &>/dev/null; then
  GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -n1)
  VRAM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits 2>/dev/null | head -n1)
  echo -e "  ${GREEN}✓${NC} NVIDIA GPU: ${GPU_NAME} (${VRAM}MiB VRAM)"
else
  echo -e "  ${YELLOW}⚠${NC}  No NVIDIA GPU detected — CPU fallback will be used"
fi
echo ""

# ── Final Verdict ─────────────────────────────────────────────
if [ "$PASS" = true ]; then
  echo -e "${GREEN}${BOLD}✅  All checks passed. You are clear for launch!${NC}"
  echo -e "   Run: ${CYAN}docker compose up --build -d${NC}"
else
  echo -e "${RED}${BOLD}❌  Some checks failed. Fix them before proceeding.${NC}"
  exit 1
fi

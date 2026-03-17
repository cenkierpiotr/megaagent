#!/usr/bin/env bash
# scripts/ollama-manager.sh — Autonomous Ollama Lifecycle Manager
# Detects, starts, and updates Ollama locally.

set -e

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}🌀 Ollama Autonomous Manager${NC}"

# ── 1. Detection ──────────────────────────────────────────────
find_ollama_url() {
    # Check common ports/hosts (including user's 14500)
    for port in "14500" "11434"; do
        for host in "localhost" "127.0.0.1" "0.0.0.0"; do
            if curl -sf --max-time 1 "http://${host}:${port}/api/tags" > /dev/null 2>&1; then
                echo "http://localhost:${port}"
                return 0
            fi
        done
    done
    
    # Try to find process and its dynamic port via lsof
    OLLAMA_PID=$(pgrep -x ollama || true)
    if [ -n "$OLLAMA_PID" ]; then
        PORT=$(lsof -nP -i -a -p "$OLLAMA_PID" | grep LISTEN | grep -oE ":[0-9]+" | head -n1 | tr -d ':')
        if [ -n "$PORT" ]; then
            echo "http://localhost:$PORT"
            return 0
        fi
    fi
    
    return 1
}

# ── 2. Startup ───────────────────────────────────────────────
ensure_ollama_running() {
    URL=$(find_ollama_url || true)
    if [ -n "$URL" ]; then
        echo -e "  ${GREEN}✓${NC} Ollama detected at: ${BOLD}${URL}${NC}"
        OLLAMA_BASE_URL=$URL
        return 0
    else
        echo -e "  ${YELLOW}⚠${NC}  Ollama not running. Attempting to start 'ollama serve'..."
        if ! command -v ollama &>/dev/null; then
            echo -e "  ${RED}❌ Error:${NC} Ollama binary not found in PATH."
            echo -e "     Install it from: ${CYAN}https://ollama.com/download${NC}"
            exit 1
        fi
        
        # Start in background using nohup to keep it alive
        nohup ollama serve > /tmp/ollama.log 2>&1 &
        
        # Poll for readiness (max 15 seconds)
        for i in {1..15}; do
            if curl -sf http://localhost:11434/api/tags > /dev/null 2>&1; then
                echo -e "  ${GREEN}✓${NC} Ollama started successfully on dynamic port 11434."
                OLLAMA_BASE_URL="http://localhost:11434"
                return 0
            fi
            sleep 1
        done
        
        echo -e "  ${RED}❌ Error:${NC} Failed to start Ollama automatically."
        echo "     Check logs at /tmp/ollama.log"
        exit 1
    fi
}

# ── 3. Model Synchronization ────────────────────────────────
sync_models() {
    echo -e "  ${CYAN}🔄 Syncing models for Megabot Trinity...${NC}"
    
    # Read models from .env if it exists, otherwise use defaults
    MODELS=("llama3" "codellama" "mistral" "llava")
    
    for model in "${MODELS[@]}"; do
        echo -en "     → pulling ${BOLD}${model}${NC}... "
        if ollama pull "$model" > /dev/null 2>&1; then
            echo -e "${GREEN}OK${NC}"
        else
            echo -e "${RED}FAILED${NC}"
        fi
    done
}

# ── Main ─────────────────────────────────────────────────────
ensure_ollama_running

# Automatically sync models by default to keep the fleet updated
sync_models

# Output for parent script consumption
# Convert localhost/127.0.0.1 to ollama-host (mapped to gateway)
FINAL_URL=$(echo "$OLLAMA_BASE_URL" | sed 's/localhost/ollama-host/' | sed 's/127.0.0.1/ollama-host/')
echo "OLLAMA_BASE_URL=$FINAL_URL" > .ollama_discovery
echo -e "  ${GREEN}✅${NC} Configuration saved to ${BOLD}.ollama_discovery${NC} (URL: ${FINAL_URL})"
echo ""

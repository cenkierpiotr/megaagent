#!/usr/bin/env bash
# scripts/fix-ollama-bridge.sh
# Definitive fix for Ollama-Docker connectivity on Linux

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}🛠️  Megabot: Ollama Connectivity Fixer (Linux)${NC}"

# 1. Check current binding
echo -e "\n🔍 Checking current Ollama binding..."
OLLAMA_LISTEN=$(ss -tulpn | grep ollama | head -n1 || true)

if [ -z "$OLLAMA_LISTEN" ]; then
    echo -e "  ${RED}✗${NC} Ollama process not found! Is it installed?"
else
    echo -e "  Current listen: ${OLLAMA_LISTEN}"
    if echo "$OLLAMA_LISTEN" | grep -q "127.0.0.1"; then
        echo -e "  ${RED}✗ Critical:${NC} Ollama is only listening on 127.0.0.1. Docker containers cannot see it."
    elif echo "$OLLAMA_LISTEN" | grep -q "0.0.0.0"; then
        echo -e "  ${GREEN}✓${NC} Ollama is listening on all interfaces (0.0.0.0). Good."
    fi
fi

# 2. Find Docker Bridge IP
echo -e "\n🔍 Finding Docker Bridge IP..."
DOCKER_IP=$(ip -4 addr show docker0 | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | head -n1 || true)
if [ -n "$DOCKER_IP" ]; then
    echo -e "  ${GREEN}✓${NC} Docker Bridge detected at: ${BOLD}${DOCKER_IP}${NC}"
else
    echo -e "  ${RED}✗${NC} Could not detect docker0 bridge. Is Docker running?"
fi

# 3. Apply Fix Logic
echo -e "\n🛠️  Applying fix..."

# Check if using systemd
if command -v systemctl &>/dev/null && systemctl is-active --quiet ollama; then
    echo -e "  Found Ollama systemd service. Creating override..."
    sudo mkdir -p /etc/systemd/system/ollama.service.d
    echo -e "[Service]\nEnvironment=\"OLLAMA_HOST=0.0.0.0:14500\"" | sudo tee /etc/systemd/system/ollama.service.d/override.conf
    echo -e "  Reloading systemd and restarting Ollama..."
    sudo systemctl daemon-reload
    sudo systemctl restart ollama || true
    echo -e "  ${GREEN}✓${NC} systemd override applied (Port 14500, Host 0.0.0.0)"
else
    echo -e "  Ollama not controlled by systemd or not active. Use this command to start manually:"
    echo -e "  ${BOLD}OLLAMA_HOST=0.0.0.0:14500 ollama serve${NC}"
fi

# 4. UFW check
if command -v ufw &>/dev/null && sudo ufw status | grep -q "Status: active" 2>/dev/null; then
    echo -e "\n🛡️  UFW Firewall detected! Opening port 14500 for ALL Docker networks..."
    # Allowing the entire standard Docker private range 172.16.0.0/12
    sudo ufw allow from 172.16.0.0/12 to any port 14500 comment 'Megabot Ollama Access' || true
    echo -e "  ${GREEN}✓${NC} Firewall rule added for 172.16.0.0/12 range."
fi

echo -e "\n${GREEN}✅ Fixes applied. Try the 'Auto-Detect' button again in the Dashboard!${NC}\n"

#!/usr/bin/env bash
# scripts/debug-connectivity.sh
# Final diagnostic tool to find why Ollama is unreachable

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

echo -e "${CYAN}${BOLD}🕵️  Megabot Connectivity Debugger${NC}"

# 1. Check Processes
echo -e "\n1️⃣  Checking Ollama Process..."
if pgrep -x "ollama" > /dev/null; then
    echo -e "  ${GREEN}✓${NC} Ollama is running."
    ss -tulpn | grep ollama
else
    echo -e "  ${RED}✗${NC} Ollama is NOT running. Run: OLLAMA_HOST=0.0.0.0:14500 ollama serve"
fi

# 2. Check Local Access
echo -e "\n2️⃣  Testing Local Access (Host -> Host)..."
if curl -sf http://localhost:14500/api/tags > /dev/null; then
    echo -e "  ${GREEN}✓${NC} Local access works."
else
    echo -e "  ${RED}✗${NC} Local access FAILED on port 14500. Is it the right port?"
fi

# 3. Check Docker Network Bridge
echo -e "\n3️⃣  Network Infrastructure..."
DOCKER_BRIDGE=$(ip addr show docker0 | grep "inet " | awk '{print $2}' | cut -d/ -f1 || true)
COMPOSE_BRIDGE=$(ip addr | grep -B 2 "br-" | grep "inet " | awk '{print $2}' | cut -d/ -f1 || true)

echo -e "  Default Bridge (docker0): ${DOCKER_BRIDGE:-Not found}"
echo -e "  Compose Bridges: ${COMPOSE_BRIDGE:-None}"

# 4. Check Containers ability to see Host
echo -e "\n4️⃣  Container Connectivity (Probing from within)..."
if [ "$(docker ps -q -f name=claw_web)" ]; then
    echo -e "  Testing reachability from 'claw_web' to host IP(s)..."
    for ip in $DOCKER_BRIDGE $COMPOSE_BRIDGE "172.17.0.1" "172.18.0.1" "172.19.0.1"; do
        echo -n "  → Probing $ip:14500... "
        if docker exec claw_web curl -sf --max-time 2 http://$ip:14500/api/tags > /dev/null 2>&1; then
            echo -e "${GREEN}REACHABLE!${NC} (Use this IP in Dashboard)"
        else
            echo -e "${RED}Refused/Timeout${NC}"
        fi
    done
    
    echo -n "  → Probing 'ollama-host:14500'... "
    if docker exec claw_web curl -sf --max-time 2 http://ollama-host:14500/api/tags > /dev/null 2>&1; then
        echo -e "${GREEN}REACHABLE!${NC}"
    else
        echo -e "${RED}FAILED${NC}"
    fi
else
    echo -e "  ${YELLOW}⚠${NC} claw_web container is not running. Start it with 'docker compose up -d'"
fi

# 5. Check Environment
echo -e "\n5️⃣  Environment Configuration..."
if [ -f .env ]; then
    grep "OLLAMA_BASE_URL" .env
else
    echo -e "  ${RED}✗${NC} .env file missing."
fi

echo -e "\n${CYAN}---------------------------------------------${NC}"
echo -e "Jeśli powyższe testy (Punkt 4) pokazały 'REACHABLE', a Dashboard nadal nie działa,"
echo -e "to problemem jest prawdopodobnie CACHE przeglądarki lub Docker'a."
echo -e "${CYAN}---------------------------------------------${NC}"

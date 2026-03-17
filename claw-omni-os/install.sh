#!/bin/bash

echo "🚀 Starting Claw-Omni-OS Installation Wizard"
echo "------------------------------------------"

# 1. Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# 2. Check for NVIDIA Drivers (Optional)
if command -v nvidia-smi &> /dev/null; then
    echo "✅ NVIDIA GPU Detected. Enabling Hardware Acceleration."
    HAS_GPU=true
else
    echo "🟡 No NVIDIA GPU detected. Falling back to CPU mode."
    HAS_GPU=false
fi

# 3. Setup .env
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    read -p "Enter Telegram Bot Token (optional): " TG_TOKEN
    read -p "Enter Serper.dev API Key (optional): " SERPER_KEY
    
    cat <<EOF > .env
TELEGRAM_BOT_TOKEN=$TG_TOKEN
SERPER_API_KEY=$SERPER_KEY
OLLAMA_BASE_URL=http://host.docker.internal:11434
REDIS_URL=redis://claw-redis:6379/0
EOF
fi

# 4. Pull/Build Containers
echo "Building system containers..."
docker compose build

# 5. Starting Services
echo "Finalizing deployment..."
docker compose up -d

echo "------------------------------------------"
echo "✅ Claw-Omni-OS is now LIVE!"
echo "Dashboard: http://localhost:3000"
echo "Core Engine: Running (Privileged)"

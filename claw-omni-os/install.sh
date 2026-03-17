#!/bin/bash

echo "🚀 Starting Claw-Omni-OS Installation Wizard..."

# Check dependencies
if command -v docker >/dev/null 2>&1; then
    echo "✅ Docker found."
else
    echo "❌ Docker is not installed. Install it with: sudo apt update && sudo apt install docker.io"
    exit 1
fi

if docker compose version >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
    echo "✅ Docker Compose (plugin) found."
elif command -v docker-compose >/dev/null 2>&1; then
    DOCKER_COMPOSE="docker-compose"
    echo "✅ docker-compose (v1) found."
else
    echo "❌ Docker Compose is required. Install it with: sudo apt install docker-compose-v2"
    exit 1
fi

# Initialize .env
if [ ! -f .env ]; then
    echo "📄 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your specific API keys and tokens."
fi

# Create necessary directories
mkdir -p core web gateway shared multimodal logs

echo "✅ Directories initialized."
echo "🐳 To build and start: $DOCKER_COMPOSE up --build -d"
echo "🛠️  Remember to install NVIDIA Container Toolkit for GPU support."

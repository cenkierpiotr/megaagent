#!/bin/bash

echo "🚀 Starting Claw-Omni-OS Installation Wizard..."

# Check dependencies
command -v docker >/dev/null 2>&1 || { echo >&2 "❌ Docker is required but not installed. Aborting."; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo >&2 "❌ docker-compose is required. Aborting."; exit 1; }

# Initialize .env
if [ ! -f .env ]; then
    echo "📄 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your specific API keys and tokens."
fi

# Create necessary directories
mkdir -p core web gateway shared multimodal logs

echo "✅ Directories initialized."
echo "🐳 To build and start: docker-compose up --build -d"
echo "🛠️  Remember to install NVIDIA Container Toolkit for GPU support."

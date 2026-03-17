#!/usr/bin/env bash
# scripts/gpu-check.sh — Robust NVIDIA GPU Detection

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔍 Checking for NVIDIA GPU..."

if command -v nvidia-smi &>/dev/null; then
    # Try to get GPU name to verify it's actually working
    GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -n1)
    if [ -n "$GPU_NAME" ]; then
        echo -e "${GREEN}✅ NVIDIA GPU Detected: ${GPU_NAME}${NC}"
        echo "HAS_GPU=true"
        exit 0
    else
        echo -e "${YELLOW}⚠️  nvidia-smi exists but no GPU found or driver issue.${NC}"
        echo "HAS_GPU=false"
        exit 1
    fi
else
    echo -e "${YELLOW}ℹ️  No NVIDIA GPU detected (nvidia-smi not found). Running in CPU mode.${NC}"
    echo "HAS_GPU=false"
    exit 0
fi

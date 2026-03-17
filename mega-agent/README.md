# Mega Agent (Claw-Omni-OS) 🦾

Autonomous Multimodal AI System integrating CrewAI, OpenHands, and Skyvern.

## 🚀 Key Features
- **Core Orchestrator**: CrewAI agents with shared Redis memory.
- **Multimodal Engine**: Faster-Whisper STT, Piper TTS, Stable Diffusion Vis, and FFmpeg Video.
- **Resource Governor**: VRAM Orchestration (RTX 3060 12GB optimized), Sequential Tasking, and CPU Pinning.
- **Security**: 2FA Web Login + Telegram Push Confirmations.
- **Unified UI**: Next.js Mission Control Dashboard synced with Telegram.

## 🛠️ Installation
1. Ensure **NVIDIA Container Toolkit** is installed.
2. Run the wizard:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```
3. Update `.env` with your API keys.
4. Start the stack:
   ```bash
   docker-compose up --build -d
   ```

## 🧠 Hardware Usage Logic
- **VRAM Control**: Before any multimodal generation, the system triggers `clear_vram_for_multimodal()` which signals Ollama to free up the GPU.
- **Throttling**: Maximum 2 concurrent LLM connections; 1 concurrent heavy multimodal task.

## 📂 Project Structure
- `/core`: CrewAI Agents & Orchestration.
- `/multimodal`: STT/TTS & Video Generation microservice.
- `/gateway`: Telegram Bot API.
- `/web`: Next.js Dashboard.
- `/shared`: Cross-service persistence.

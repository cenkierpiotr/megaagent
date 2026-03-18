import time
import subprocess
import requests
import logging
import os

logging.basicConfig(level=logging.INFO, format='%(asctime)s - watchdog - %(levelname)s - %(message)s')

SERVICES = {
    "claw_core": "http://claw-core:8000/api/health-check",
    "claw_multimodal": "http://claw-multimodal:5001/health",
    "ollama": "http://host.docker.internal:11434/api/tags"
}

def check_service(name, url):
    try:
        response = requests.get(url, timeout=5)
        return response.status_code == 200
    except Exception:
        return False

def restart_container(name):
    logging.warning(f"🚨 Service {name} is down! Attempting restart...")
    try:
        subprocess.run(["docker", "restart", name], check=True)
        # Notify via Telegram (placeholder for bridge call)
        logging.info(f"✅ Service {name} restarted.")
    except Exception as e:
        logging.error(f"❌ Failed to restart {name}: {e}")

if __name__ == "__main__":
    while True:
        for name, url in SERVICES.items():
            if not check_service(name, url):
                restart_container(name)
        time.sleep(30)

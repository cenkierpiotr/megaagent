import os
import redis
import subprocess
import json
import logging

class HardenedGovernor:
    def __init__(self, redis_url):
        self.r = redis.Redis.from_url(redis_url)
        self.gpu_detected = self._check_gpu()
        
    def _check_gpu(self):
        """Check if NVIDIA GPU is available."""
        try:
            subprocess.check_output(['nvidia-smi'], stderr=subprocess.STDOUT)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False

    def get_llm_config(self, task_priority='P2'):
        """
        Returns Ollama config based on GPU availability, task priority, and UI override.
        """
        override = self.r.get('hardware_mode_override')
        if override:
            override = override.decode('utf-8')
            
        use_gpu = self.gpu_detected
        if override == 'cpu':
            use_gpu = False
        elif override == 'gpu':
            use_gpu = True
            
        config = {
            "model": os.getenv("LLM_MODEL", "llama3"),
            "options": {"num_gpu": 1 if use_gpu else 0}
        }
        
        # Graceful Degradation: Switch to lighter model if on CPU
        if not use_gpu:
            config["model"] = os.getenv("LLM_MODEL_LIGHT", "llama3:3b")
            
        return config

    def can_process_batch(self):
        """P3 tasks only run if P1 and P2 queues generated via Redis are empty."""
        p1_count = self.r.llen("queue:P1")
        p2_count = self.r.llen("queue:P2")
        return (p1_count == 0 and p2_count == 0)

    def get_telemetry(self):
        """Collects hardware stats."""
        stats = {"cpu": 0, "vram": "N/A", "temp": "N/A"}
        try:
            # CPU Load
            stats["cpu"] = os.getloadavg()[0] * 10 
            # GPU Stats
            if self.gpu_detected:
                output = subprocess.check_output(
                    ['nvidia-smi', '--query-gpu=memory.used,temperature.gpu', '--format=csv,noheader,nounits'],
                    encoding='utf-8'
                )
                vram_used, temp = output.strip().split(',')
                stats["vram"] = f"{vram_used} MiB"
                stats["temp"] = f"{temp} C"
        except Exception as e:
            logging.error(f"Telemetry error: {e}")
        return stats

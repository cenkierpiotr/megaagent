import os
import psutil
import json
import asyncio
from datetime import datetime

# Optional NVIDIA support
try:
    import pynvml
    HAS_NVML = True
    pynvml.nvmlInit()
except ImportError:
    HAS_NVML = False

class TelemetryCollector:
    def __init__(self, redis_client):
        self.r = redis_client

    def get_stats(self):
        stats = {
            "cpu": psutil.cpu_percent(interval=None),
            "ram": psutil.virtual_memory().percent,
            "vram": "N/A",
            "gpu_util": 0,
            "temp": "N/A",
            "timestamp": datetime.now().isoformat()
        }

        if HAS_NVML:
            try:
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
                util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                
                stats["vram"] = f"{round(mem.used / (1024**3), 1)} GiB / {round(mem.total / (1024**3), 1)} GiB"
                stats["gpu_util"] = util.gpu
                stats["temp"] = f"{temp}°C"
            except Exception as e:
                print(f"GPU Telemetry error: {e}")

        return stats

    async def run_loop(self):
        print("📊 Telemetry Collector Started")
        while True:
            stats = self.get_stats()
            self.r.set('system_telemetry', json.dumps(stats))
            # Also publish for real-time subscribers if needed
            self.r.publish('telemetry_stream', json.dumps(stats))
            await asyncio.sleep(2)

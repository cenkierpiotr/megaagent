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
    def __init__(self, redis_client, governor=None):
        self.r = redis_client
        self.governor = governor

    def get_stats(self):
        # Base CPU/RAM stats
        stats = {
            "cpu": psutil.cpu_percent(interval=None),
            "ram": psutil.virtual_memory().percent,
            "vram": "N/A",
            "gpu_util": 0,
            "temp": "N/A",
            "timestamp": datetime.now().isoformat()
        }

        # Merge with Governor data if available (NVIDIA-SMI based)
        if self.governor:
            gov_stats = self.governor.get_telemetry()
            # gov_stats = {"cpu": "load", "vram": "used", "temp": "temp"}
            stats["vram"] = gov_stats.get("vram", "N/A")
            stats["temp"] = gov_stats.get("temp", "N/A")
            
            # Extract gpu_util if possible or use zero
            # governor logic uses nvidia-smi but doesn't explicitly return 'util' in stats dict yet
            # but we can fallback to NVML for precise util if governor doesn't provide it
        
        if HAS_NVML:
            try:
                handle = pynvml.nvmlDeviceGetHandleByIndex(0)
                util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                stats["gpu_util"] = util.gpu
                if stats["vram"] == 0:
                    mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
                    stats["vram"] = round(mem.used / (1024**2), 0) # MiB
                if stats["temp"] == 0:
                    stats["temp"] = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
            except Exception as e:
                print(f"GPU Telemetry fallback error: {e}")

        return stats

    async def run_loop(self):
        print("📊 Telemetry Collector Started (Governor Integrated)")
        while True:
            stats = self.get_stats()
            self.r.set('system_telemetry', json.dumps(stats))
            self.r.publish('telemetry_stream', json.dumps(stats))
            await asyncio.sleep(2)

import { NextApiRequest, NextApiResponse } from 'next';
import { execSync } from 'child_process';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  let telemetry = {
    cpu: "0%",
    vram: "N/A",
    temp: "N/A",
    status: "Online"
  };

  try {
    // Get CPU Load (Mock/Simple)
    const load = execSync("uptime | awk '{print $10}'").toString().trim();
    telemetry.cpu = `${parseFloat(load) * 10}%`;

    // Attempt to get GPU stats via nvidia-smi
    const gpuInfo = execSync("nvidia-smi --query-gpu=memory.used,temperature.gpu --format=csv,noheader,nounits").toString().trim();
    const [vram, temp] = gpuInfo.split(', ');
    telemetry.vram = `${vram} MiB`;
    telemetry.temp = `${temp} C`;
  } catch (e) {
    // Fallback if nvidia-smi fails
    telemetry.vram = "CPU-ONLY";
  }

  res.status(200).json(telemetry);
}

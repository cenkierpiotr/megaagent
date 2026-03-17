import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function GET() {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  
  try {
    await client.connect();
    
    // In a real scenario, this would fetch from a monitoring service or persistent state
    // For now, we fetch from Redis or return hardware-simulated data if empty
    const telemetryData = await client.get('system_telemetry');
    
    if (telemetryData) {
      return NextResponse.json(JSON.parse(telemetryData));
    }

    // Default/Fallback telemetry logic
    return NextResponse.json({
      cpu: 0,
      ram: 0,
      vram: "N/A",
      temp: "N/A",
      gpu_util: 0,
      status: "waiting"
    });
  } catch (error) {
    return NextResponse.json({ error: 'Telemetry unavailable' }, { status: 500 });
  } finally {
    await client.quit();
  }
}

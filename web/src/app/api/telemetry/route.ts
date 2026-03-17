import { NextResponse } from 'next/server';
import { createClient } from 'redis';

const getRedis = async () => {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  await client.connect();
  return client;
};

export async function GET() {
  let client;
  try {
    client = await getRedis();
    const data = await client.get('hardware_stats');
    if (data) {
      return NextResponse.json(JSON.parse(data.toString()));
    }
    return NextResponse.json({ cpu: 0, ram: 0, vram: 'N/A', temp: 'N/A', gpu_util: 0 });
  } catch {
    return NextResponse.json({ cpu: 0, ram: 0, vram: 'N/A', temp: 'N/A', gpu_util: 0 });
  } finally {
    if (client) await client.disconnect();
  }
}

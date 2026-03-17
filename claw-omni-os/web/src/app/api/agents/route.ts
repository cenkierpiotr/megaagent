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
    const agents = ['manager', 'coder', 'researcher', 'artist'];
    const statusMap: Record<string, object> = {};
    for (const agent of agents) {
      const data = await client.get(`agent_status:${agent}`);
      statusMap[agent] = data ? JSON.parse(data.toString()) : { status: 'Idle', task: '', timestamp: 0 };
    }
    return NextResponse.json(statusMap);
  } catch {
    return NextResponse.json({ manager: { status: 'Idle', task: '' }, coder: { status: 'Idle', task: '' }, researcher: { status: 'Idle', task: '' }, artist: { status: 'Idle', task: '' } });
  } finally {
    if (client) await client.disconnect();
  }
}

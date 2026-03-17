import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function GET() {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  
  try {
    await client.connect();
    const agents = ['manager', 'coder', 'researcher', 'artist'];
    const statusMap: any = {};

    for (const agent of agents) {
      const data = await client.get(`agent_status:${agent}`);
      statusMap[agent] = data ? JSON.parse(data.toString()) : { status: 'Idle', task: '' };
    }

    return NextResponse.json(statusMap);
  } catch (error) {
    return NextResponse.json({ error: 'Agent status unavailable' }, { status: 500 });
  } finally {
    await client.quit();
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  await client.connect();

  try {
    const agents = ['manager', 'coder', 'researcher', 'artist'];
    const statusMap: any = {};

    for (const agent of agents) {
      const data = await client.get(`agent_status:${agent}`);
      statusMap[agent] = data ? JSON.parse(data) : { status: 'Idle', task: '' };
    }

    res.status(200).json(statusMap);
  } finally {
    await client.quit();
  }
}

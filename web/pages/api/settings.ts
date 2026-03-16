import { NextApiRequest, NextApiResponse } from 'next';
import redis from 'redis';

const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379/0'
});

client.on('error', (err) => console.error('Redis Client Error', err));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!client.isOpen) await client.connect();

  if (req.method === 'GET') {
    const mode = await client.get('hardware_mode_override') || 'auto';
    res.status(200).json({ mode });
  } 
  else if (req.method === 'POST') {
    const { mode } = req.body; // 'auto', 'cpu', 'gpu'
    await client.set('hardware_mode_override', mode);
    res.status(200).json({ status: 'success', mode });
  } 
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

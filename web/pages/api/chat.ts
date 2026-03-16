import { NextApiRequest, NextApiResponse } from 'next';
import redis from 'redis';

const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379/0'
});

client.on('error', (err) => console.error('Redis Client Error', err));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!client.isOpen) await client.connect();

  if (req.method === 'POST') {
    const { message } = req.body;
    
    const task = {
        source: "web",
        chat_id: "web_user",
        prompt: message,
        priority: "P2"
    };

    await client.lPush('tasks:p2', JSON.stringify(task));
    res.status(200).json({ status: 'sent', message });
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

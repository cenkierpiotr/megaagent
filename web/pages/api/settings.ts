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
    const model_manager = await client.get('model_manager_override') || 'llama3';
    const model_coder = await client.get('model_coder_override') || 'codellama';
    res.status(200).json({ mode, model_manager, model_coder });
  } 
  else if (req.method === 'POST') {
    const { mode, model_manager, model_coder } = req.body;
    if (mode) await client.set('hardware_mode_override', mode);
    if (model_manager) await client.set('model_manager_override', model_manager);
    if (model_coder) await client.set('model_coder_override', model_coder);
    res.status(200).json({ status: 'success' });
  } 
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

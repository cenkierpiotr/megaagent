import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from 'redis';

const client = createClient({
    url: process.env.REDIS_URL || 'redis://redis:6379/0'
});

client.on('error', (err) => console.error('Redis Client Error', err));

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!client.isOpen) await client.connect();

  if (req.method === 'GET') {
    const mode = await client.get('hardware_mode_override') || 'auto';
    const model_manager = await client.get('model_manager_override') || 'llama3';
    const model_coder = await client.get('model_coder_override') || 'codellama';
    const model_researcher = await client.get('model_researcher_override') || 'mistral';
    const model_artist = await client.get('model_artist_override') || 'llava';
    const ollama_url = await client.get('ollama_base_url_override') || process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
    
    res.status(200).json({ 
      mode, model_manager, model_coder, model_researcher, model_artist, ollama_url 
    });
  } 
  else if (req.method === 'POST') {
    const { mode, model_manager, model_coder, model_researcher, model_artist, ollama_url } = req.body;
    if (mode) await client.set('hardware_mode_override', mode);
    if (model_manager) await client.set('model_manager_override', model_manager);
    if (model_coder) await client.set('model_coder_override', model_coder);
    if (model_researcher) await client.set('model_researcher_override', model_researcher);
    if (model_artist) await client.set('model_artist_override', model_artist);
    if (ollama_url) await client.set('ollama_base_url_override', ollama_url);
    
    res.status(200).json({ status: 'success' });
  } 
  else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';

  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 2000 });
    const models = response.data.models.map((m: any) => m.name);
    res.status(200).json({ status: 'connected', models });
  } catch (error) {
    console.error('Ollama connection failed:', error.message);
    res.status(200).json({ 
      status: 'disconnected', 
      models: ['llama3', 'mistral', 'codellama'],
      error: 'Ollama not reachable'
    });
  }
}

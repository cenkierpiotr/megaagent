import { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';

  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`);
    const models = response.data.models.map((m: any) => m.name);
    res.status(200).json({ models });
  } catch (error) {
    console.error('Error fetching models from Ollama:', error);
    res.status(500).json({ error: 'Failed to fetch models', models: ['llama3', 'llama3:3b', 'mistral'] });
  }
}

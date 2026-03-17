import { NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from 'redis';

export async function GET() {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  
  try {
    await client.connect();
    const overrideUrl = await client.get('ollama_base_url_override');
    const OLLAMA_URL = overrideUrl || process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
    await client.quit();

    const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 3000 });
    const models = response.data.models ? response.data.models.map((m: any) => m.name) : [];
    return NextResponse.json({ status: 'connected', models, url: OLLAMA_URL });
  } catch (error: any) {
    try { await client.quit(); } catch(e) {}
    console.error('Ollama connection failed:', error?.message || error);
    return NextResponse.json({ 
      status: 'disconnected', 
      models: [],
      error: 'Ollama not reachable'
    });
  }
}

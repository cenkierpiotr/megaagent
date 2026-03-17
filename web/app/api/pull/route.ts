import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from 'redis';

export async function POST(req: NextRequest) {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  
  try {
    await client.connect();
    const overrideUrl = await client.get('ollama_base_url_override');
    const OLLAMA_URL = overrideUrl || process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
    await client.quit();

    const { model } = await req.json();
    if (!model) {
      return NextResponse.json({ error: 'Model name is required' }, { status: 400 });
    }

    // Trigger Ollama pull
    axios.post(`${OLLAMA_URL}/api/pull`, { name: model }, { timeout: 1000 }).catch(e => {
        console.error(`Background pull for ${model} failed or timed out:`, e.message);
    });

    return NextResponse.json({ status: 'initiated', message: `Pulling ${model} in background via ${OLLAMA_URL}` });
  } catch (error: any) {
    try { await client.quit(); } catch(e) {}
    return NextResponse.json({ error: 'Failed to initiate pull' }, { status: 500 });
  }
}

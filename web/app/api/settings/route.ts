import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function GET() {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  try {
    await client.connect();
    const mode = await client.get('hardware_mode_override') || 'auto';
    const model_manager = await client.get('model_manager_override') || 'llama3';
    const model_coder = await client.get('model_coder_override') || 'codellama';
    const model_researcher = await client.get('model_researcher_override') || 'mistral';
    const model_artist = await client.get('model_artist_override') || 'llava';
    const ollama_url = await client.get('ollama_base_url_override') || process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
    
    return NextResponse.json({ 
      mode, model_manager, model_coder, model_researcher, model_artist, ollama_url 
    });
  } catch (error) {
    return NextResponse.json({ error: 'Settings unavailable' }, { status: 500 });
  } finally {
    await client.quit();
  }
}

export async function POST(req: NextRequest) {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  try {
    const { mode, model_manager, model_coder, model_researcher, model_artist, ollama_url } = await req.json();
    await client.connect();

    if (mode) await client.set('hardware_mode_override', mode);
    if (model_manager) await client.set('model_manager_override', model_manager);
    if (model_coder) await client.set('model_coder_override', model_coder);
    if (model_researcher) await client.set('model_researcher_override', model_researcher);
    if (model_artist) await client.set('model_artist_override', model_artist);
    if (ollama_url) await client.set('ollama_base_url_override', ollama_url);
    
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  } finally {
    await client.quit();
  }
}

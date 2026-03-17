import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

const getRedis = async () => {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  await client.connect();
  return client;
};

export async function POST(req: NextRequest) {
  let client;
  try {
    client = await getRedis();
    const body = await req.json();
    const { direct_action, capability = 'text', message, prompt, model_manager, model_coder, model_researcher, model_artist, history } = body;

    const task = {
      prompt: direct_action ? prompt : message,
      capability,
      direct_action,
      model_manager: model_manager || 'llama3',
      model_coder: model_coder || 'codellama',
      model_researcher: model_researcher || 'mistral',
      model_artist: model_artist || 'llava',
      history: history || [],
    };

    // VRAM Purge: call Ollama directly as requested
    if (direct_action === 'clear_vram') {
      const ollamaUrl = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
      try {
        await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: model_manager || 'llama3', keep_alive: 0 }),
        });
      } catch {}
      return NextResponse.json({ status: 'vram_purged' });
    }

    // Smart Search: push to priority queue for Skyvern agent
    if (direct_action === 'web_search') {
      await client.lPush('tasks:p1', JSON.stringify({ ...task, capability: 'web_search' }));
      return NextResponse.json({ status: 'queued', queue: 'p1' });
    }

    // Code Audit: push for OpenHands/Coder agent
    if (direct_action === 'code_audit') {
      await client.lPush('tasks:p1', JSON.stringify({ ...task, capability: 'code_audit' }));
      return NextResponse.json({ status: 'queued', queue: 'p1' });
    }

    // General tasks → p2
    await client.lPush('tasks:p2', JSON.stringify(task));
    return NextResponse.json({ status: 'queued', queue: 'p2' });
  } catch (e) {
    return NextResponse.json({ status: 'error', detail: String(e) }, { status: 500 });
  } finally {
    if (client) await client.disconnect();
  }
}

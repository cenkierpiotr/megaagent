import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

const getRedis = async () => {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  await client.connect();
  return client;
};

export async function GET() {
  let client;
  try {
    client = await getRedis();
    const keys = ['mode', 'model_manager', 'model_coder', 'model_researcher', 'model_artist', 'ollama_url'];
    const settings: Record<string, string> = {};
    for (const key of keys) {
      const val = await client.get(`setting:${key}`);
      if (val) settings[key] = val;
    }
    return NextResponse.json(settings);
  } catch {
    return NextResponse.json({});
  } finally {
    if (client) await client.disconnect();
  }
}

export async function POST(req: NextRequest) {
  let client;
  try {
    client = await getRedis();
    const body = await req.json();
    const allowed = ['mode', 'model_manager', 'model_coder', 'model_researcher', 'model_artist', 'ollama_url'];
    for (const key of allowed) {
      if (body[key] !== undefined) {
        await client.set(`setting:${key}`, String(body[key]));
      }
    }
    return NextResponse.json({ status: 'saved' });
  } catch (e) {
    return NextResponse.json({ status: 'error', detail: String(e) }, { status: 500 });
  } finally {
    if (client) await client.disconnect();
  }
}

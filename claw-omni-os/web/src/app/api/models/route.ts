import { NextResponse } from 'next/server';

const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    const models = (data.models || []).map((m: { name: string }) => m.name);
    return NextResponse.json({ models, status: 'connected' });
  } catch {
    return NextResponse.json({ models: [], status: 'disconnected' });
  }
}

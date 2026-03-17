import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
  
  try {
    const { model } = await req.json();
    if (!model) {
      return NextResponse.json({ error: 'Model name is required' }, { status: 400 });
    }

    // Trigger Ollama pull
    // Note: Ollama pull API is long-running. We'll trigger it and return a 202.
    // In a more advanced version, we'd stream the progress.
    axios.post(`${OLLAMA_URL}/api/pull`, { name: model }, { timeout: 1000 }).catch(e => {
        console.error(`Background pull for ${model} failed or timed out:`, e.message);
    });

    return NextResponse.json({ status: 'initiated', message: `Pulling ${model} in background.` });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to initiate pull' }, { status: 500 });
  }
}

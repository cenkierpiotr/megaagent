import { NextResponse } from 'next/server';
import axios from 'axios';

export async function GET() {
  const OLLAMA_URL = process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';

  try {
    const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 2000 });
    const models = response.data.models.map((m: any) => m.name);
    return NextResponse.json({ status: 'connected', models });
  } catch (error: any) {
    console.error('Ollama connection failed:', error?.message || error);
    return NextResponse.json({ 
      status: 'disconnected', 
      models: ['llama3', 'mistral', 'codellama'],
      error: 'Ollama not reachable'
    });
  }
}

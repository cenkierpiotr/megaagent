import { NextResponse } from 'next/server';
import axios from 'axios';

const COMMON_PORTS = [11434, 14500, 11435, 11436, 11437];

export async function GET() {
  const results = [];
  const host = "host.docker.internal";

  // Scan ports in parallel with short timeout
  const scanPromises = COMMON_PORTS.map(async (port) => {
    const url = `http://${host}:${port}`;
    try {
      const response = await axios.get(`${url}/api/tags`, { timeout: 1500 });
      if (response.status === 200) {
        return { url, port, status: 'found', models: response.data.models ? response.data.models.length : 0 };
      }
    } catch (e) {
      // Port not answering or not Ollama
    }
    return null;
  });

  const found = (await Promise.all(scanPromises)).filter(r => r !== null);

  if (found.length > 0) {
    return NextResponse.json({ 
      status: 'success', 
      message: `Found ${found.length} Ollama instance(s)`,
      options: found 
    });
  }

  return NextResponse.json({ 
    status: 'error', 
    message: 'No Ollama instances detected on standard ports (11434-11437, 14500). Ensure OLLAMA_HOST is 0.0.0.0' 
  });
}

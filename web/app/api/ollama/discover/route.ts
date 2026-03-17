import { NextResponse } from 'next/server';
import axios from 'axios';

const COMMON_PORTS = [11434, 14500, 11435, 11436, 11437];

export async function GET() {
  const results = [];
  const logs: string[] = [];
  const hosts = [
    "ollama-host",
    "host.docker.internal", 
    "172.17.0.1", 
    "172.18.0.1", 
    "172.19.0.1", 
    "172.20.0.1",
    "172.21.0.1",
    "172.22.0.1"
  ];

  // Scan ports in parallel with short timeout
  const scanPromises = hosts.flatMap(host => 
    COMMON_PORTS.map(async (port) => {
    const url = `http://${host}:${port}`;
    try {
      const response = await axios.get(`${url}/api/tags`, { timeout: 1500 });
      if (response.status === 200) {
        logs.push(`SUCCESS: ${url}`);
        return { url, port, status: 'found', models: response.data.models ? response.data.models.length : 0 };
      }
    } catch (e: any) {
      logs.push(`FAILED: ${url} (${e.message || 'Error'})`);
    }
    return null;
  }));

  const found = (await Promise.all(scanPromises)).filter(r => r !== null);

  if (found.length > 0) {
    return NextResponse.json({ 
      status: 'success', 
      message: `Found ${found.length} Ollama instance(s)`,
      options: found,
      logs: logs
    });
  }

  return NextResponse.json({ 
    status: 'error', 
    message: 'No Ollama instances detected.',
    logs: logs
  });
}

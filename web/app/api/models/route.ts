import { NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from 'redis';

export async function GET() {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  
  try {
    await client.connect();
    const providersRaw = await client.get('api_providers_override');
    const overrideUrl = await client.get('ollama_base_url_override');
    const defaultUrl = overrideUrl || process.env.OLLAMA_BASE_URL || 'http://host.docker.internal:11434';
    
    let providers = providersRaw ? JSON.parse(providersRaw.toString()) : [];
    if (providers.length === 0) {
      providers = [{ type: 'ollama', url: defaultUrl }];
    }

    let allModels: string[] = [];
    let status = 'disconnected';

    for (const p of providers) {
      try {
        if (p.type === 'ollama') {
          const response = await axios.get(`${p.url}/api/tags`, { timeout: 3000 });
          if (response.data && response.data.models) {
             const models = response.data.models.map((m: any) => m.name);
             allModels.push(...models);
             status = 'connected';
             // Reverse lookup in Redis for core/main.py backends
             for (const m of models) {
               await client.set(`model_provider_map:${m}`, JSON.stringify({ url: p.url, type: 'ollama' }));
             }
          }
        } else if (p.type === 'litellm' || p.type === 'openai') {
          const headers: any = {};
          if (p.apiKey) headers['Authorization'] = `Bearer ${p.apiKey}`;
          
          const response = await axios.get(`${p.url}/v1/models`, { timeout: 3000, headers });
          if (response.data && response.data.data) {
             const models = response.data.data.map((m: any) => m.id);
             allModels.push(...models);
             status = 'connected';
             for (const m of models) {
               await client.set(`model_provider_map:${m}`, JSON.stringify({ url: p.url, type: 'openai', apiKey: p.apiKey || '' }));
             }
          }
        }
      } catch (err: any) {
        console.error(`[API Sync] Failed to fetch models for ${p.type} at ${p.url}:`, err.message);
      }
    }

    await client.quit();
    const uniqueModels = Array.from(new Set(allModels));
    return NextResponse.json({ status, models: uniqueModels });
  } catch (error: any) {
    try { await client.quit(); } catch(e) {}
    return NextResponse.json({ 
      status: 'disconnected', 
      models: [],
      error: error?.message || 'Aggregation failed'
    });
  }
}

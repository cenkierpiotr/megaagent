import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ status: 'error', message: 'URL is required' }, { status: 400 });
    }

    // Clean URL
    const targetUrl = url.trim().replace(/\/$/, "");
    
    // Check if reachable
    const response = await axios.get(`${targetUrl}/api/tags`, { timeout: 4000 });
    
    if (response.status === 200) {
      const modelCount = response.data.models ? response.data.models.length : 0;
      return NextResponse.json({ 
        status: 'success', 
        message: `Connected successfully! Found ${modelCount} models.`,
        models: response.data.models ? response.data.models.map((m: any) => m.name) : []
      });
    }

    return NextResponse.json({ status: 'error', message: `Unexpected response status: ${response.status}` });
  } catch (error: any) {
    let msg = error.message;
    if (error.code === 'ECONNREFUSED') msg = "Connection refused. Is Ollama running and OLLAMA_HOST set to 0.0.0.0?";
    if (error.code === 'ETIMEDOUT' || error.message.includes('timeout')) msg = "Connection timed out. Check firewall and address.";
    
    return NextResponse.json({ 
      status: 'error', 
      message: msg 
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function POST(req: NextRequest) {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  const streamId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const body = await req.json();
    const { message, model_manager, model_coder, model_researcher, model_artist, capability, direct_action, prompt } = body;
    await client.connect();
    
    const task = {
        source: "web",
        chat_id: "web_user",
        stream_id: streamId,
        prompt: direct_action ? prompt : message,
        direct_action: direct_action || null,
        model_manager: model_manager || "llama3",
        model_coder: model_coder || "codellama",
        model_researcher: model_researcher || "mistral",
        model_artist: model_artist || "llava",
        capability: capability || "text",
        priority: direct_action ? "P1" : "P2"
    };

    const queue = direct_action ? 'tasks:p1' : 'tasks:p2';
    await client.lPush(queue, JSON.stringify(task));

    // Streaming implementation
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const subscriber = client.duplicate();
        await subscriber.connect();

        controller.enqueue(encoder.encode(JSON.stringify({ status: 'queued', streamId }) + "\n"));

        await subscriber.subscribe(`chat_status:${streamId}`, (message) => {
          controller.enqueue(encoder.encode(message + "\n"));
        });

        // Loop to check for final result if needed, or rely on PubSub
        // We'll set a timeout for safety
        const timeout = setTimeout(async () => {
          await subscriber.unsubscribe();
          await subscriber.quit();
          controller.close();
        }, 120000); // 2 minutes max
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to initiate chat' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function POST(req: NextRequest) {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  
  try {
    const { message, model_manager, history, capability, direct_action, prompt } = await req.json();
    await client.connect();
    
    const task = {
        source: "web",
        chat_id: "web_user",
        prompt: direct_action ? prompt : message,
        direct_action: direct_action || null,
        model: model_manager || "llama3",
        history: history || [],
        capability: capability || "text",
        priority: direct_action ? "P1" : "P2"
    };

    const queue = direct_action ? 'tasks:p1' : 'tasks:p2';
    await client.lPush(queue, JSON.stringify(task));
    
    return NextResponse.json({ status: 'sent', message: task.prompt });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  } finally {
    await client.quit();
  }
}

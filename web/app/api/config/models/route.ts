import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function GET() {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  try {
    await client.connect();
    const mappings = await client.hGetAll('model_mappings');
    return NextResponse.json(mappings || {});
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 });
  } finally {
    await client.quit();
  }
}

export async function POST(req: NextRequest) {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  try {
    const { manager, coder, researcher, artist } = await req.json();
    await client.connect();
    
    const updates = [];
    if (manager) updates.push(client.hSet('model_mappings', 'manager', manager));
    if (coder) updates.push(client.hSet('model_mappings', 'coder', coder));
    if (researcher) updates.push(client.hSet('model_mappings', 'researcher', researcher));
    if (artist) updates.push(client.hSet('model_mappings', 'artist', artist));
    
    await Promise.all(updates);
    return NextResponse.json({ status: 'success' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save mappings' }, { status: 500 });
  } finally {
    await client.quit();
  }
}

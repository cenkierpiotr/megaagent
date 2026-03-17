import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function GET() {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  
  try {
    await client.connect();
    
    // In a real production app, we would use a more robust pub/sub or websocket.
    // For this consolidation, we'll provide an endpoint that the frontend can poll.
    // However, since we want to see 'results', we might check a list or a specific key.
    // For now, let's just return a placeholder or implement a simple result list if 'core' was updated to push to one.
    
    // Optimization: core/main.py publishes to 'task_results'. 
    // We could have a separate worker pushing to a 'results' list in Redis,
    // or we can just fetch from Postgres if we want persistence.
    
    // For simplicity and alignment with the plan, let's fetch recent logs from Postgres if possible,
    // or just return from a Redis list 'web_results:web_user'.
    
    const results = await client.lRange('web_results:web_user', 0, 10);
    const parsedResults = results.map(r => JSON.parse(r as string));

    return NextResponse.json({ results: parsedResults });
  } catch (error) {
    return NextResponse.json({ error: 'Results unavailable' }, { status: 500 });
  } finally {
    await client.quit();
  }
}

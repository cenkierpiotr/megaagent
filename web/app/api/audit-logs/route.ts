import { NextResponse } from 'next/server';
import { createClient } from 'redis';

export async function GET() {
  const client = createClient({ url: process.env.REDIS_URL || 'redis://redis:6379/0' });
  try {
    await client.connect();
    const rawLogs = await client.lRange('audit_logs', 0, 49);
    const logs = rawLogs.map(l => {
      try { return JSON.parse(l); } catch { return { raw: l }; }
    });
    return NextResponse.json({ logs, count: logs.length });
  } catch (error) {
    return NextResponse.json({ logs: [], count: 0, error: 'Redis unavailable' });
  } finally {
    await client.quit();
  }
}

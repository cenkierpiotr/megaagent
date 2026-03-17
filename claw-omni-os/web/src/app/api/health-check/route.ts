import { NextResponse } from 'next/server';

// Proxy the health-check to the core FastAPI service
export async function GET() {
  const coreUrl = process.env.CORE_URL || 'http://claw-core:8000';
  try {
    const res = await fetch(`${coreUrl}/api/health-check`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ status: 'offline' }, { status: 503 });
  }
}

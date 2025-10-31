import { NextResponse } from 'next/server';

// Disabled. Auth cookies are managed by the backend only.
export async function POST() {
  return new NextResponse('Deprecated endpoint', { status: 410 });
}
